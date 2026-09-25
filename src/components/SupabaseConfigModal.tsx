import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  X, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { 
  getSavedConfig, 
  saveConfig, 
  clearConfig, 
  testSupabaseConnection, 
  SQL_SCHEMA_SCRIPT,
  syncLocalTasksToSupabase,
  getLocalTasks
} from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectedChange: (connected: boolean) => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConnectedChange,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tableExists?: boolean } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [localCount, setLocalCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const config = getSavedConfig();
      setUrl(config.url || '');
      setAnonKey(config.anonKey || '');
      setTestResult(null);
      setSyncResult(null);
      setLocalCount(getLocalTasks().length);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!url || !anonKey) {
      setTestResult({
        success: false,
        message: 'Preencha a URL e a Anon Public Key para testar.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const result = await testSupabaseConnection(url, anonKey);
    setTesting(false);
    setTestResult(result);

    if (result.success) {
      saveConfig(url, anonKey);
      onConnectedChange(true);
    }
  };

  const handleSave = () => {
    saveConfig(url, anonKey);
    onConnectedChange(Boolean(url && anonKey));
    onClose();
  };

  const handleClear = () => {
    clearConfig();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    onConnectedChange(false);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2200);
  };

  const handleSyncLocal = async () => {
    setSyncing(true);
    setSyncResult(null);
    const res = await syncLocalTasksToSupabase();
    setSyncing(false);
    if (res.error) {
      setSyncResult(`Falha ao sincronizar: ${res.error}`);
    } else {
      setSyncResult(`${res.count} tarefa(s) sincronizada(s) com o Supabase com sucesso!`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Conectar ao Supabase
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  PostgreSQL em Nuvem
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Armazene suas tarefas e leads diretamente no seu banco de dados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-6 flex-1 text-sm text-zinc-700 dark:text-zinc-300">
          {/* Quick instructions */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs leading-relaxed space-y-2">
            <div className="font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Como obter suas credenciais em 1 minuto:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
              <li>Acesse seu dashboard em <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 underline inline-flex items-center gap-0.5">supabase.com <ArrowUpRight className="w-3 h-3" /></a></li>
              <li>Abra seu projeto e vá em <strong>Project Settings → API</strong></li>
              <li>Copie a <strong>Project URL</strong> e a chave <strong>anon / public</strong></li>
            </ol>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Project URL <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Anon Public Key <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-mono"
              />
              <span className="text-[11px] text-zinc-400 mt-1 block">
                Use apenas a chave pública anon. Suas credenciais ficam salvas com segurança no seu navegador.
              </span>
            </div>
          </div>

          {/* Test connection alert */}
          {testResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-medium">{testResult.message}</p>
                {testResult.success && testResult.tableExists === false && (
                  <p className="text-[11px] opacity-90">
                    Copie o script SQL abaixo e execute no SQL Editor do Supabase para criar a tabela com os status "Não iniciado", "Em Andamento" e "Finalizado".
                  </p>
                )}
              </div>
            </div>
          )}

          {/* SQL Script Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-500" />
                  Script SQL Completo
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  RLS + Storage Ativados
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-medium transition cursor-pointer shadow-xs"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                    Copiado para Área de Transferência!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar SQL com Políticas
                  </>
                )}
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] text-emerald-900 dark:text-emerald-200 space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                O que este SQL inclui e ativa:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-emerald-800/90 dark:text-emerald-300/90 pl-1 text-[10.5px]">
                <li>Tabela <code>public.tasks</code> com validação estrita de status: <em>Não iniciado, Em Andamento, Finalizado</em></li>
                <li><strong>Row Level Security (RLS) Ativado</strong> na tabela com 4 políticas granulares (SELECT, INSERT, UPDATE, DELETE)</li>
                <li><strong>Políticas de Armazenamento (Supabase Storage)</strong> para o bucket <code>task-attachments</code> com RLS em <code>storage.objects</code></li>
                <li>Trigger automático para atualização de data (<code>updated_at</code>) e índices de performance</li>
                <li>Habilitação da publicação <strong>supabase_realtime</strong></li>
              </ul>
            </div>

            <pre className="p-3 bg-zinc-950 text-zinc-200 text-[11px] rounded-lg overflow-x-auto font-mono max-h-56 border border-zinc-800 selection:bg-emerald-500 selection:text-white leading-relaxed">
              {SQL_SCHEMA_SCRIPT}
            </pre>
          </div>

          {/* Sync local tasks to Supabase if any */}
          {localCount > 0 && (
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-500">
                Você possui <strong>{localCount}</strong> tarefa(s) salva(s) localmente neste navegador.
              </span>
              <button
                type="button"
                onClick={handleSyncLocal}
                disabled={syncing || !url || !anonKey}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded font-medium disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Enviar para Supabase'}
              </button>
            </div>
          )}

          {syncResult && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {syncResult}
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium transition cursor-pointer"
          >
            Limpar conexão
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !url || !anonKey}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition cursor-pointer"
            >
              {testing ? 'Testando...' : 'Testar Conexão'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
            >
              Salvar e Conectar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
