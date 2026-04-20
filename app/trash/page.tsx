"use client";

import { useState, useEffect } from "react";
import { Package, DollarSign, ArchiveRestore, Trash2, Loader2, Info } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";

export default function TrashPage() {
  const [deletedListings, setDeletedListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeletedListings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trash`);
      const data = await res.json();
      setDeletedListings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedListings();
  }, []);

  const handleRestore = async (id: number) => {
    try {
      const res = await fetch(`/api/trash/${id}`, { method: 'POST', body: JSON.stringify({ action: 'restore' }) });
      if (!res.ok) throw new Error("Failed to restore");
      toast.success("Comic restored to inventory!");
      fetchDeletedListings();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore comic.");
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this comic? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/trash/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete permanently");
      toast.success("Comic permanently deleted.");
      fetchDeletedListings();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete comic.");
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
            <Trash2 className="w-10 h-10 text-red-500" /> TRASH
          </h1>
          <p className="text-zinc-400 font-medium">Deleted comics are kept here for 7 days before permanent deletion.</p>
        </div>
        <Link href="/inventory" className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-xs whitespace-nowrap bg-zinc-900/50 px-4 py-3 rounded-2xl border border-zinc-800">
           Back to Inventory
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500 flex flex-col items-center gap-4">
           <Loader2 className="w-8 h-8 animate-spin" />
           Loading trash...
        </div>
      ) : deletedListings.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 bg-zinc-900/30 rounded-3xl border border-zinc-800/50">
          <Package className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
          <p className="text-xl font-bold">Trash is empty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deletedListings.map((item, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={item.id}
              className="bg-red-950/10 border border-red-900/30 rounded-3xl overflow-hidden shadow-lg"
            >
              <div className="aspect-[3/2] w-full bg-zinc-950 relative overflow-hidden flex items-center justify-center grayscale opacity-60">
                {item.frontImage ? (
                  <img src={`/api${item.frontImage}`} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="text-zinc-700 font-bold uppercase tracking-widest text-xs">No Image</div>
                )}
                <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg">
                  Deleted
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-black text-white leading-tight mb-2 line-through text-zinc-500">
                  {item.title} <span className="text-zinc-600 text-lg">#{item.issueNumber}</span>
                </h3>
                <div className="flex items-center text-zinc-500 text-xs font-medium mb-4 gap-2">
                   <Info className="w-3 h-3" /> Auto-deletes in 7 days
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-red-900/30 gap-2">
                  <button 
                    onClick={() => handleRestore(item.id)}
                    className="flex-1 text-green-500 hover:text-green-400 bg-green-500/10 hover:bg-green-500/20 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 py-3 rounded-xl transition-colors"
                  >
                    <ArchiveRestore className="w-4 h-4" /> Restore
                  </button>
                  <button 
                    onClick={() => handlePermanentDelete(item.id)}
                    className="flex-1 text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 py-3 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Destroy
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}
