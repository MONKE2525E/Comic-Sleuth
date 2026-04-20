"use client";

import { useState, useEffect } from "react";
import { Loader2, Trash2, Save, CheckCircle2, AlertTriangle, ListTodo, Images, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function QueuePage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      const res = await fetch("/api/queue");
      const data = await res.json();
      setQueue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Poll every 5 seconds for updates if there are pending/processing items
    const interval = setInterval(() => {
      fetchQueue();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const forceStore = async (id: number) => {
    try {
      const res = await fetch(`/api/queue/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'store', force: true })
      });
      if (!res.ok) throw new Error('Failed to store');
      toast.success("Saved to inventory!");
      fetchQueue();
    } catch (err: any) {
      toast.error(err.message || "Failed to store.");
    }
  };

  const handleAction = async (id: number, action: 'store' | 'delete' | 'retry') => {
    setProcessingAction(`${action}-${id}`);
    try {
      if (action === 'delete') {
        await fetch(`/api/queue/${id}`, { method: 'DELETE' });
        toast.success("Item ignored and removed from queue.");
      } else {
        const res = await fetch(`/api/queue/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        });

        if (res.status === 409) {
          const data = await res.json();
          toast.warning(
            `Already in inventory: ${data.existing.title} #${data.existing.issueNumber}`,
            {
              action: { label: 'Store Anyway', onClick: () => forceStore(id) },
              duration: 10000,
            }
          );
          setProcessingAction(null);
          return;
        }

        if (!res.ok) throw new Error(`Failed to ${action}`);
        if (action === 'store') toast.success("Saved to inventory!");
        if (action === 'retry') toast.success("Retrying analysis...");
      }
      fetchQueue();
    } catch (err: any) {
      toast.error(err.message || "Action failed.");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleStoreAll = async () => {
    setProcessingAction('store-all');
    try {
      const res = await fetch('/api/queue/store-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const msg = data.skipped > 0
        ? `Stored ${data.count} comics. Skipped ${data.skipped} duplicates.`
        : `Successfully stored ${data.count} comics!`;
      toast.success(msg);
      fetchQueue();
    } catch (err: any) {
      toast.error(err.message || "Failed to store all items.");
    } finally {
      setProcessingAction(null);
    }
  };

  const completedCount = queue.filter(item => item.status === 'completed').length;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
            <ListTodo className="w-10 h-10 text-indigo-500" /> PROCESSING QUEUE
          </h1>
          <p className="text-zinc-400 font-medium">Review AI grading before saving to inventory.</p>
        </div>

        {completedCount > 0 && (
          <button 
            onClick={handleStoreAll}
            disabled={!!processingAction}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {processingAction === 'store-all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Store All Completed ({completedCount})
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" />
          Loading queue...
        </div>
      ) : queue.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 bg-zinc-900/30 rounded-3xl border border-zinc-800/50">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
          <p className="text-xl font-bold">Queue is empty.</p>
          <p className="text-sm mt-2">All scanned comics have been processed.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <AnimatePresence>
            {queue.map((item) => {
              const result = item.result ? JSON.parse(item.result) : null;
              
              return (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row gap-6"
                >
                  {/* Images */}
                  <div className="w-full md:w-48 flex-shrink-0 flex gap-2 h-32 md:h-auto">
                    <div className="w-1/2 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden relative">
                      <img src={`/api${item.frontImage}`} alt="Front" className="w-full h-full object-cover opacity-80" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 text-[8px] font-black uppercase text-center py-1 text-zinc-400">Front</div>
                    </div>
                    <div className="w-1/2 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden relative">
                      <img src={`/api${item.backImage}`} alt="Back" className="w-full h-full object-cover opacity-80" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 text-[8px] font-black uppercase text-center py-1 text-zinc-400">Back</div>
                    </div>
                  </div>

                  {/* Status & Details */}
                  <div className="flex-1 flex flex-col justify-center">
                    {item.status === 'pending' || item.status === 'processing' ? (
                      <div className="flex items-center gap-4 text-indigo-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <div>
                          <p className="font-bold uppercase tracking-widest text-sm">AI is Processing...</p>
                          <p className="text-zinc-500 text-xs mt-1">Analyzing images and fetching market data.</p>
                        </div>
                      </div>
                    ) : item.status === 'error' ? (
                      <div className="flex items-center gap-4 text-red-400">
                        <AlertTriangle className="w-6 h-6" />
                        <div>
                          <p className="font-bold uppercase tracking-widest text-sm">Analysis Failed</p>
                          <p className="text-zinc-500 text-xs mt-1 line-clamp-1">{item.error || 'Unknown error occurred.'}</p>
                        </div>
                      </div>
                    ) : result ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                            {result.publisher}
                          </span>
                          <span className="text-green-400 font-black text-sm">{result.valueEstimate}</span>
                        </div>
                        <h3 className="text-xl font-black text-white leading-tight mb-2">
                          {result.title} <span className="text-zinc-500">#{result.issueNumber}</span>
                        </h3>
                        <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed mb-3">
                          <strong className="text-zinc-300">Grade {result.gradeEstimate}:</strong> {result.gradingNotes}
                        </p>
                        <div className="text-xs font-mono font-bold text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800 inline-block">
                          {result.suggestedSKU}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="w-full md:w-auto flex flex-row md:flex-col gap-2 justify-center border-t border-zinc-800 md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
                    {item.status === 'completed' && (
                      <button 
                        onClick={() => handleAction(item.id, 'store')}
                        disabled={!!processingAction}
                        className="flex-1 bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {processingAction === `store-${item.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Store
                      </button>
                    )}
                    {item.status === 'error' && (
                      <button 
                        onClick={() => handleAction(item.id, 'retry')}
                        disabled={!!processingAction}
                        className="flex-1 bg-indigo-600 text-white hover:bg-indigo-500 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {processingAction === `retry-${item.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                        Retry
                      </button>
                    )}
                    <button 
                      onClick={() => handleAction(item.id, 'delete')}
                      disabled={!!processingAction}
                      className="flex-1 bg-zinc-950 border border-zinc-800 text-red-400 hover:bg-red-500/10 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {processingAction === `delete-${item.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Ignore
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </main>
  );
}
