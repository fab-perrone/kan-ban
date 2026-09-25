import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Task, TaskStatus } from '../types';

const STORAGE_KEY_CONFIG = 'supabase_crm_config';
const STORAGE_KEY_TASKS = 'crm_kanban_tasks_local';

export const SQL_SCHEMA_SCRIPT = `-- ==============================================================================
-- CRM KANBAN - SCRIPT COMPLETO COM POLÍTICAS DE ARMAZENAMENTO E RLS ATIVADAS
-- Execute este script no SQL Editor do seu projeto Supabase (Dashboard -> SQL Editor)
-- ==============================================================================

-- 1. EXTENSÃO PARA UUID (caso não esteja ativa)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA DE TAREFAS / OPORTUNIDADES DO CRM
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('Não iniciado', 'Em Andamento', 'Finalizado')),
  priority TEXT NOT NULL DEFAULT 'Média' CHECK (priority IN ('Baixa', 'Média', 'Alta', 'Urgente')),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  deal_value NUMERIC(12, 2) DEFAULT 0,
  due_date DATE,
  tags TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adicionar coluna de anexos caso a tabela já tenha sido criada anteriormente
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 3. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);

-- 4. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DO CAMPO updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.tasks;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. ATIVAÇÃO DO ROW LEVEL SECURITY (RLS) NA TABELA
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS DE SEGURANÇA E ACESSO (CRUD) DA TABELA TASKS
-- 6.1 Política de Leitura (SELECT)
DROP POLICY IF EXISTS "Permitir leitura de tarefas" ON public.tasks;
CREATE POLICY "Permitir leitura de tarefas"
  ON public.tasks
  FOR SELECT
  TO public, anon, authenticated
  USING (true);

-- 6.2 Política de Criação (INSERT)
DROP POLICY IF EXISTS "Permitir inserção de tarefas" ON public.tasks;
CREATE POLICY "Permitir inserção de tarefas"
  ON public.tasks
  FOR INSERT
  TO public, anon, authenticated
  WITH CHECK (
    status IN ('Não iniciado', 'Em Andamento', 'Finalizado')
  );

-- 6.3 Política de Edição e Mudança de Status (UPDATE)
DROP POLICY IF EXISTS "Permitir atualização de tarefas" ON public.tasks;
CREATE POLICY "Permitir atualização de tarefas"
  ON public.tasks
  FOR UPDATE
  TO public, anon, authenticated
  USING (true)
  WITH CHECK (
    status IN ('Não iniciado', 'Em Andamento', 'Finalizado')
  );

-- 6.4 Política de Exclusão (DELETE)
DROP POLICY IF EXISTS "Permitir exclusão de tarefas" ON public.tasks;
CREATE POLICY "Permitir exclusão de tarefas"
  ON public.tasks
  FOR DELETE
  TO public, anon, authenticated
  USING (true);

-- ==============================================================================
-- 7. CONFIGURAÇÃO DO SUPABASE STORAGE (ARMAZENAMENTO DE ARQUIVOS/ANEXOS)
-- ==============================================================================
-- Nota: O RLS em storage.objects já vem ativado por padrão pelo Supabase (proprietário supabase_storage_admin).
-- Não execute "ALTER TABLE storage.objects" para evitar o erro 42501.

-- 7.1 Criar o Bucket de armazenamento para anexos e documentos do CRM
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  true,
  52428800, -- 50MB por arquivo
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 7.2 POLÍTICAS DE ARMAZENAMENTO (STORAGE POLICIES)
-- Leitura pública de anexos do CRM
DROP POLICY IF EXISTS "Permitir visualizacao e download de anexos" ON storage.objects;
CREATE POLICY "Permitir visualizacao e download de anexos"
  ON storage.objects
  FOR SELECT
  TO public, anon, authenticated
  USING (bucket_id = 'task-attachments');

-- Upload de novos anexos no CRM
DROP POLICY IF EXISTS "Permitir upload de anexos de tarefas" ON storage.objects;
CREATE POLICY "Permitir upload de anexos de tarefas"
  ON storage.objects
  FOR INSERT
  TO public, anon, authenticated
  WITH CHECK (bucket_id = 'task-attachments');

-- Atualização e substituição de anexos
DROP POLICY IF EXISTS "Permitir atualizacao de anexos" ON storage.objects;
CREATE POLICY "Permitir atualizacao de anexos"
  ON storage.objects
  FOR UPDATE
  TO public, anon, authenticated
  USING (bucket_id = 'task-attachments')
  WITH CHECK (bucket_id = 'task-attachments');

-- Exclusão de anexos
DROP POLICY IF EXISTS "Permitir exclusao de anexos" ON storage.objects;
CREATE POLICY "Permitir exclusao de anexos"
  ON storage.objects
  FOR DELETE
  TO public, anon, authenticated
  USING (bucket_id = 'task-attachments');

-- ==============================================================================
-- 8. HABILITAR SUPABASE REALTIME (ATUALIZAÇÕES EM TEMPO REAL NO KANBAN)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;
`;

export interface StoredConfig {
  url: string;
  anonKey: string;
}

export function getSavedConfig(): StoredConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler config do localStorage', e);
  }

  return {
    url: envUrl,
    anonKey: envKey,
  };
}

export function saveConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }));
  cachedClient = null; // reset cached client
}

export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY_CONFIG);
  cachedClient = null;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const config = getSavedConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: { persistSession: false },
    });
    return cachedClient;
  } catch (error) {
    console.error('Falha ao inicializar cliente Supabase:', error);
    return null;
  }
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string; tableExists: boolean }> {
  try {
    if (!url || !anonKey) {
      return { success: false, message: 'URL e Anon Key são obrigatórios.', tableExists: false };
    }

    const testClient = createClient(url.trim(), anonKey.trim(), {
      auth: { persistSession: false },
    });

    // Test querying the tasks table
    const { data, error } = await testClient.from('tasks').select('id').limit(1);

    if (error) {
      // Check if it's table not found (Postgres 42P01)
      if (error.code === '42P01' || error.message.toLowerCase().includes('relation "tasks" does not exist') || error.message.toLowerCase().includes('not found')) {
        return {
          success: true,
          tableExists: false,
          message: 'Conectado ao Supabase! Porém a tabela "tasks" ainda não foi criada. Execute o script SQL no editor do Supabase.',
        };
      }
      return {
        success: false,
        tableExists: false,
        message: `Erro ao consultar Supabase: ${error.message}`,
      };
    }

    return {
      success: true,
      tableExists: true,
      message: 'Conexão estabelecida com sucesso e tabela "tasks" pronta!',
    };
  } catch (err: any) {
    return {
      success: false,
      tableExists: false,
      message: `Erro na conexão: ${err.message || 'Verifique as credenciais e tente novamente.'}`,
    };
  }
}

// Local Storage helpers for fallback / zero-config state
export function getLocalTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
}

// Fetch all tasks from Supabase or fallback
export async function fetchTasks(): Promise<{ tasks: Task[]; source: 'supabase' | 'local'; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { tasks: getLocalTasks(), source: 'local' };
  }

  try {
    const { data, error } = await client
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao carregar do Supabase, carregando localmente:', error.message);
      return {
        tasks: getLocalTasks(),
        source: 'local',
        error: `Supabase: ${error.message}`,
      };
    }

    const tasks: Task[] = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      status: row.status as TaskStatus,
      priority: row.priority || 'Média',
      contact_name: row.contact_name || undefined,
      contact_email: row.contact_email || undefined,
      contact_phone: row.contact_phone || undefined,
      deal_value: row.deal_value ? Number(row.deal_value) : undefined,
      due_date: row.due_date || undefined,
      tags: row.tags || [],
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    // Keep local backup updated
    saveLocalTasks(tasks);

    return { tasks, source: 'supabase' };
  } catch (err: any) {
    return {
      tasks: getLocalTasks(),
      source: 'local',
      error: err.message || 'Erro inesperado',
    };
  }
}

// Create a new task
export async function insertTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<{ task: Task; error?: string }> {
  const client = getSupabaseClient();
  const now = new Date().toISOString();
  const newId = crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newTask: Task = {
    ...taskData,
    id: newId,
    created_at: now,
    updated_at: now,
  };

  if (!client) {
    const current = getLocalTasks();
    const updated = [newTask, ...current];
    saveLocalTasks(updated);
    return { task: newTask };
  }

  try {
    const payload = {
      title: taskData.title,
      description: taskData.description || null,
      status: taskData.status,
      priority: taskData.priority,
      contact_name: taskData.contact_name || null,
      contact_email: taskData.contact_email || null,
      contact_phone: taskData.contact_phone || null,
      deal_value: taskData.deal_value || null,
      due_date: taskData.due_date || null,
      tags: taskData.tags || [],
      attachments: taskData.attachments || [],
    };

    const { data, error } = await client.from('tasks').insert([payload]).select().single();

    if (error) {
      console.warn('Erro ao inserir no Supabase, salvando local:', error.message);
      const current = getLocalTasks();
      saveLocalTasks([newTask, ...current]);
      return { task: newTask, error: error.message };
    }

    const createdTask: Task = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      status: data.status as TaskStatus,
      priority: data.priority,
      contact_name: data.contact_name || undefined,
      contact_email: data.contact_email || undefined,
      contact_phone: data.contact_phone || undefined,
      deal_value: data.deal_value ? Number(data.deal_value) : undefined,
      due_date: data.due_date || undefined,
      tags: data.tags || [],
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    // Update local cache
    const current = getLocalTasks().filter((t) => t.id !== createdTask.id);
    saveLocalTasks([createdTask, ...current]);

    return { task: createdTask };
  } catch (err: any) {
    const current = getLocalTasks();
    saveLocalTasks([newTask, ...current]);
    return { task: newTask, error: err.message };
  }
}

// Update task
export async function updateTask(id: string, updates: Partial<Task>): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  const now = new Date().toISOString();

  // Always update local storage
  const current = getLocalTasks();
  const updatedLocal = current.map((t) => (t.id === id ? { ...t, ...updates, updated_at: now } : t));
  saveLocalTasks(updatedLocal);

  if (!client) {
    return { success: true };
  }

  try {
    const payload: Record<string, any> = {
      updated_at: now,
    };

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description || null;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.contact_name !== undefined) payload.contact_name = updates.contact_name || null;
    if (updates.contact_email !== undefined) payload.contact_email = updates.contact_email || null;
    if (updates.contact_phone !== undefined) payload.contact_phone = updates.contact_phone || null;
    if (updates.deal_value !== undefined) payload.deal_value = updates.deal_value || null;
    if (updates.due_date !== undefined) payload.due_date = updates.due_date || null;
    if (updates.tags !== undefined) payload.tags = updates.tags || [];
    if (updates.attachments !== undefined) payload.attachments = updates.attachments || [];

    const { error } = await client.from('tasks').update(payload).eq('id', id);

    if (error) {
      console.warn('Erro ao atualizar no Supabase:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Delete task
export async function deleteTask(id: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();

  // Remove from local storage
  const current = getLocalTasks();
  saveLocalTasks(current.filter((t) => t.id !== id));

  if (!client) {
    return { success: true };
  }

  try {
    const { error } = await client.from('tasks').delete().eq('id', id);
    if (error) {
      console.warn('Erro ao excluir no Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Sync local tasks to Supabase if any exist
export async function syncLocalTasksToSupabase(): Promise<{ count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { count: 0, error: 'Supabase não conectado.' };
  }

  const localTasks = getLocalTasks();
  if (localTasks.length === 0) {
    return { count: 0 };
  }

  try {
    const payload = localTasks.map((t) => ({
      title: t.title,
      description: t.description || null,
      status: t.status,
      priority: t.priority,
      contact_name: t.contact_name || null,
      contact_email: t.contact_email || null,
      contact_phone: t.contact_phone || null,
      deal_value: t.deal_value || null,
      due_date: t.due_date || null,
      tags: t.tags || [],
      attachments: t.attachments || [],
    }));

    const { error } = await client.from('tasks').insert(payload);
    if (error) {
      return { count: 0, error: error.message };
    }

    return { count: localTasks.length };
  } catch (err: any) {
    return { count: 0, error: err.message };
  }
}
