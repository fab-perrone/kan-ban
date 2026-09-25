import React, { useState } from 'react';
import { Plus, Inbox, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Task, TaskStatus, KANBAN_COLUMNS } from '../types';
import { TaskCard } from './TaskCard';

interface KanbanBoardProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onStatusChange: (id: string, newStatus: TaskStatus) => void;
  onOpenCreateModal: (defaultStatus: TaskStatus) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onOpenCreateModal,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<TaskStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== columnStatus) {
      setActiveDropColumn(columnStatus);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving the column element itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setActiveDropColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setActiveDropColumn(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      onStatusChange(taskId, targetStatus);
    }
    setDraggedTaskId(null);
  };

  const formatTotalValue = (columnTasks: Task[]) => {
    const total = columnTasks.reduce((sum, t) => sum + (t.deal_value || 0), 0);
    if (total === 0) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(total);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-start">
      {KANBAN_COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.id);
        const totalValue = formatTotalValue(columnTasks);
        const isDropTarget = activeDropColumn === column.id;

        return (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
            className={`flex flex-col rounded-xl bg-zinc-100/70 dark:bg-zinc-900/40 border transition-all duration-150 min-h-[500px] ${
              isDropTarget
                ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
                : 'border-zinc-200/90 dark:border-zinc-800/80'
            }`}
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  column.id === 'Não iniciado' 
                    ? 'bg-zinc-400' 
                    : column.id === 'Em Andamento' 
                    ? 'bg-amber-500' 
                    : 'bg-emerald-500'
                }`} />
                <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  {column.title}
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {totalValue && (
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hidden sm:inline">
                    {totalValue}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onOpenCreateModal(column.id)}
                  className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                  title={`Adicionar tarefa em ${column.title}`}
                  aria-label={`Nova tarefa em ${column.title}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-header description */}
            <div className="px-3.5 py-1.5 bg-zinc-50/50 dark:bg-zinc-900/60 border-b border-zinc-200/40 dark:border-zinc-800/40 text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
              {column.description}
            </div>

            {/* Cards Container */}
            <div className="p-3 flex-1 flex flex-col gap-2.5 overflow-y-auto">
              {columnTasks.length > 0 ? (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onStatusChange={onStatusChange}
                    onDragStart={handleDragStart}
                  />
                ))
              ) : (
                /* Clean empty state (no mock data!) */
                <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-lg">
                  <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-400 mb-2">
                    {column.id === 'Não iniciado' ? (
                      <Inbox className="w-4 h-4" />
                    ) : column.id === 'Em Andamento' ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Nenhuma tarefa {column.id === 'Não iniciado' ? 'em espera' : column.id === 'Em Andamento' ? 'em andamento' : 'finalizada'}
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-[200px]">
                    {column.id === 'Não iniciado'
                      ? 'Clique no botão abaixo para cadastrar a primeira demanda.'
                      : column.id === 'Em Andamento'
                      ? 'Arraste tarefas aqui ou altere o status dos seus cards.'
                      : 'Tarefas concluídas aparecerão aqui.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenCreateModal(column.id)}
                    className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Criar tarefa
                  </button>
                </div>
              )}
            </div>

            {/* Quick Add Footer */}
            <div className="p-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => onOpenCreateModal(column.id)}
                className="w-full py-2 px-3 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar em {column.title}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
