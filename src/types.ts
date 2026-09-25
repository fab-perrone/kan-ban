export type TaskStatus = 'Não iniciado' | 'Em Andamento' | 'Finalizado';

export type TaskPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

export interface TaskAttachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  deal_value?: number;
  due_date?: string;
  tags?: string[];
  attachments?: TaskAttachment[];
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  tableName: string;
}

export const KANBAN_COLUMNS: {
  id: TaskStatus;
  title: string;
  description: string;
  color: string;
  badgeBg: string;
  borderColor: string;
}[] = [
  {
    id: 'Não iniciado',
    title: 'Não iniciado',
    description: 'Demandas e oportunidades aguardando início',
    color: 'text-zinc-600 dark:text-zinc-400',
    badgeBg: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
    borderColor: 'border-zinc-300 dark:border-zinc-700',
  },
  {
    id: 'Em Andamento',
    title: 'Em Andamento',
    description: 'Tarefas e negociações em execução',
    color: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-700',
  },
  {
    id: 'Finalizado',
    title: 'Finalizado',
    description: 'Tarefas concluídas com sucesso',
    color: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
  },
];
