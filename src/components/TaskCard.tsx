import React from 'react';
import { 
  GripVertical, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  ArrowRight, 
  ArrowLeft,
  DollarSign
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus, KANBAN_COLUMNS } from '../types';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: TaskStatus) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onDragStart,
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const priorityStyles: Record<TaskPriority, { text: string; dot: string }> = {
    Baixa: { text: 'text-zinc-500', dot: 'bg-zinc-400' },
    Média: { text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
    Alta: { text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    Urgente: { text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  };

  // Determine next and prev status
  const currentIdx = KANBAN_COLUMNS.findIndex((c) => c.id === task.status);
  const prevColumn = currentIdx > 0 ? KANBAN_COLUMNS[currentIdx - 1] : null;
  const nextColumn = currentIdx < KANBAN_COLUMNS.length - 1 ? KANBAN_COLUMNS[currentIdx + 1] : null;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0)) && task.status !== 'Finalizado';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-lg p-3.5 shadow-xs hover:shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing flex flex-col gap-2.5"
    >
      {/* Top row: Priority, title, and actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${priorityStyles[task.priority]?.dot || 'bg-zinc-400'}`} />
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {task.priority}
          </span>
        </div>

        {/* Quick Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Opções da tarefa"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setShowMenu(false)} 
              />
              <div className="absolute right-0 top-6 z-40 w-44 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl py-1 text-xs text-zinc-700 dark:text-zinc-200 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(task);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700/60 flex items-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                  Editar Tarefa
                </button>

                {prevColumn && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onStatusChange(task.id, prevColumn.id);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700/60 flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-zinc-500" />
                    Mover para {prevColumn.title}
                  </button>
                )}

                {nextColumn && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onStatusChange(task.id, nextColumn.id);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700/60 flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    Mover para {nextColumn.title}
                  </button>
                )}

                <div className="my-1 border-t border-zinc-100 dark:border-zinc-700" />

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(task.id);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir Tarefa
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 
        onClick={() => onEdit(task)}
        className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
      >
        {task.title}
      </h3>

      {/* Description preview */}
      {task.description && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Contact info if available */}
      {task.contact_name && (
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
          <User className="w-3 h-3 text-zinc-400 shrink-0" />
          <span className="font-medium truncate">{task.contact_name}</span>
          {task.contact_phone && (
            <span className="text-zinc-400 text-[10px] hidden sm:inline">· {task.contact_phone}</span>
          )}
        </div>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span 
              key={tag} 
              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Bottom Metadata: Deal value & Due date */}
      <div className="flex items-center justify-between gap-2 pt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80">
        <div>
          {task.deal_value !== undefined && task.deal_value > 0 ? (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(task.deal_value)}
            </span>
          ) : (
            <span className="text-zinc-400 text-[10px]">Sem valor</span>
          )}
        </div>

        {task.due_date ? (
          <div 
            className={`flex items-center gap-1 text-[10px] font-medium ${
              isOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-zinc-500 dark:text-zinc-400'
            }`}
            title={isOverdue ? 'Atenção: Prazo expirado!' : 'Data prevista'}
          >
            <Calendar className="w-3 h-3" />
            <span>
              {new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
            </span>
          </div>
        ) : (
          <span className="text-zinc-400 text-[10px]">Sem prazo</span>
        )}
      </div>

      {/* Quick Move Footer Bar on Hover */}
      <div className="pt-1 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 opacity-60 group-hover:opacity-100 transition">
        {prevColumn ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(task.id, prevColumn.id);
            }}
            className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 py-0.5 px-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            title={`Voltar para ${prevColumn.title}`}
          >
            <ArrowLeft className="w-2.5 h-2.5" />
            <span className="truncate max-w-[70px]">{prevColumn.title}</span>
          </button>
        ) : <div />}

        {nextColumn ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(task.id, nextColumn.id);
            }}
            className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium py-0.5 px-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer ml-auto"
            title={`Avançar para ${nextColumn.title}`}
          >
            <span className="truncate max-w-[80px]">{nextColumn.title}</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        ) : <div />}
      </div>
    </div>
  );
};
