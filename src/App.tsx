import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  fetchTasks, 
  insertTask, 
  updateTask, 
  deleteTask, 
  getSavedConfig,
  getSupabaseClient
} from './lib/supabase';
import { Task, TaskStatus } from './types';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskModal } from './components/TaskModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { 
  Database, 
  Plus, 
  Info, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Trash2
} from 'lucide-react';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [dataSource, setDataSource] = useState<'supabase' | 'local'>('local');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultColumnStatus, setDefaultColumnStatus] = useState<TaskStatus>('Não iniciado');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('Todas');
  const [dismissSetupBanner, setDismissSetupBanner] = useState(false);

  // Check initial connection and load tasks
  const loadData = useCallback(async () => {
    const config = getSavedConfig();
    const hasConfig = Boolean(config.url && config.anonKey);
    setIsSupabaseConnected(hasConfig);

    setIsRefreshing(true);
    const result = await fetchTasks();
    setTasks(result.tasks || []);
    setDataSource(result.source);
    if (result.error) {
      setErrorMessage(result.error);
    } else {
      setErrorMessage(null);
    }
    setLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Setup Supabase Realtime subscription if client available
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const channel = client
        .channel('tasks-crm-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          () => {
            loadData();
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }
  }, [isSupabaseConnected, loadData]);

  // Handlers
  const handleOpenCreateModal = (defaultStatus: TaskStatus = 'Não iniciado') => {
    setEditingTask(null);
    setDefaultColumnStatus(defaultStatus);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingTask) {
      // Update
      const res = await updateTask(editingTask.id, taskData);
      if (res.error) {
        setErrorMessage(`Aviso: ${res.error}`);
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? { ...t, ...taskData } : t))
      );
    } else {
      // Insert
      const res = await insertTask(taskData);
      if (res.error) {
        setErrorMessage(`Aviso: ${res.error}`);
      }
      setTasks((prev) => [res.task, ...prev]);
    }
  };

  const handleStatusChange = async (id: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    const res = await updateTask(id, { status: newStatus });
    if (res.error) {
      setErrorMessage(`Erro ao atualizar status: ${res.error}`);
      // Reload on failure to restore consistency
      loadData();
    }
  };

  const handleDeleteTask = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const targetId = deleteConfirmId;
    setDeleteConfirmId(null);

    // Optimistic remove
    setTasks((prev) => prev.filter((t) => t.id !== targetId));

    const res = await deleteTask(targetId);
    if (res.error) {
      setErrorMessage(`Erro ao excluir: ${res.error}`);
      loadData();
    }
  };

  // Filter tasks based on search & priority
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Priority filter
      if (selectedPriority !== 'Todas' && task.priority !== selectedPriority) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        const matchesContact = task.contact_name?.toLowerCase().includes(q);
        const matchesTag = task.tags?.some((t) => t.toLowerCase().includes(q));
        return Boolean(matchesTitle || matchesDesc || matchesContact || matchesTag);
      }

      return true;
    });
  }, [tasks, searchQuery, selectedPriority]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Header with Search, Filters and New Task */}
      <Header
        tasks={tasks}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        onOpenCreateModal={() => handleOpenCreateModal('Não iniciado')}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
      />

      {/* Connection notice banner if Supabase not configured yet */}
      {!isSupabaseConnected && !dismissSetupBanner && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Pronto para Supabase:</strong> O CRM está funcionando com armazenamento local. Conecte sua URL e Chave Anon para gravar direto no seu banco de dados na nuvem.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsSupabaseModalOpen(true)}
                className="underline font-semibold hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer"
              >
                Conectar agora
              </button>
              <button
                type="button"
                onClick={() => setDismissSetupBanner(true)}
                className="p-1 text-amber-600 dark:text-amber-400 hover:text-amber-900 cursor-pointer"
                aria-label="Dispensar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error alert toast if any */}
      {errorMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3 w-full">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-700 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Kanban Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-medium">Carregando quadro Kanban...</p>
          </div>
        ) : tasks.length === 0 ? (
          /* Zero tasks state (strictly respecting: "não crie informações modelo") */
          <div className="py-16 px-4 text-center max-w-lg mx-auto flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 mb-4 shadow-xs">
              <Plus className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Seu Kanban está pronto e sem tarefas de modelo
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
              Comece a cadastrar manualmente seus leads, oportunidades e tarefas nos status <strong>Não iniciado</strong>, <strong>Em Andamento</strong> e <strong>Finalizado</strong>.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenCreateModal('Não iniciado')}
                className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Criar Primeira Tarefa
              </button>
              <button
                type="button"
                onClick={() => setIsSupabaseModalOpen(true)}
                className="px-4 py-2.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition flex items-center gap-2 cursor-pointer"
              >
                <Database className="w-4 h-4 text-emerald-500" />
                Configurar Supabase
              </button>
            </div>
          </div>
        ) : (
          <KanbanBoard
            tasks={filteredTasks}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
            onOpenCreateModal={handleOpenCreateModal}
          />
        )}
      </main>

      {/* Task Creation & Editing Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        editingTask={editingTask}
        defaultStatus={defaultColumnStatus}
      />

      {/* Supabase Configuration Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConnectedChange={(connected) => {
          setIsSupabaseConnected(connected);
          loadData();
        }}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Excluir Tarefa?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Esta ação removerá a tarefa do sistema e do Supabase.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition shadow-xs cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer with clean system metadata */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/80 py-4 px-4 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CRM Kanban · Status: Não iniciado · Em Andamento · Finalizado</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {isSupabaseConnected ? 'Sincronizado com Supabase' : 'Armazenamento Local Ativo'}
            </span>
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
            >
              Credenciais
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
