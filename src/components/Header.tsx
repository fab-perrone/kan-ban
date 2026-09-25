import React from 'react';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Layers,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import { Task } from '../types';

interface HeaderProps {
  tasks: Task[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPriority: string;
  onPriorityChange: (p: string) => void;
  onOpenCreateModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  tasks,
  searchQuery,
  onSearchChange,
  selectedPriority,
  onPriorityChange,
  onOpenCreateModal,
  onRefresh,
  isRefreshing,
}) => {
  const totalTasks = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === 'Em Andamento').length;
  const completedCount = tasks.filter((t) => t.status === 'Finalizado').length;
  const totalPipelineValue = tasks.reduce((sum, t) => sum + (t.deal_value || 0), 0);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-20">
      {/* Top Bar: Brand, Supabase status, Primary actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Brand info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  CRM Kanban
                </h1>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  Pipeline
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Gerencie manualmente suas tarefas e status em tempo real
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hidden lg:flex items-center gap-4 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-2">
              <span className="text-zinc-400">Total:</span>
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{totalTasks}</strong>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-2">
              <span className="text-amber-500">Em Andamento:</span>
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{inProgressCount}</strong>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-2">
              <span className="text-emerald-500">Finalizadas:</span>
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{completedCount}</strong>
            </div>

            {totalPipelineValue > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-zinc-400">Pipeline:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {formatBRL(totalPipelineValue)}
                </strong>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Refresh button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border border-zinc-200 dark:border-zinc-800 cursor-pointer disabled:opacity-50"
              title="Recarregar tarefas"
              aria-label="Recarregar"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Primary New Task button */}
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por título, cliente, descrição ou tag..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 outline-hidden"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] text-zinc-400 shrink-0 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" />
              Prioridade:
            </span>
            {['Todas', 'Urgente', 'Alta', 'Média', 'Baixa'].map((p) => {
              const isSelected = selectedPriority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPriorityChange(p)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
