"use client";

import { useState, useEffect } from "react";
import { Search, Package, DollarSign, ExternalLink, X, Tag, Calendar, Info, CheckCircle2, Trash2, ArchiveRestore } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";

export default function InventoryPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedComic, setSelectedComic] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const fetchListings = async (query = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/listings${query ? '?q=' + encodeURIComponent(query) : ''}`);
      const data = await res.json();
      setListings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings(searchQuery);
  };

  const handleDelete = async () => {
    if (!selectedComic) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/listings/${selectedComic.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to delete");
      
      toast.success("Comic moved to trash (kept for 7 days).");
      setSelectedComic(null);
      setShowConfirmDelete(false);
      fetchListings(searchQuery);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete comic.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">INVENTORY</h1>
          <p className="text-zinc-400 font-medium">Manage and browse your comic book listings.</p>
        </div>

        <div className="w-full md:w-auto flex flex-col md:flex-row gap-4 items-center">
          <form onSubmit={handleSearch} className="w-full md:w-96 relative">
            <input
              type="text"
              placeholder="Search titles, publishers, or SKUs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
            <button type="submit" className="hidden" />
          </form>
          
          <Link href="/trash" className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-xs whitespace-nowrap bg-zinc-900/50 px-4 py-3 rounded-2xl border border-zinc-800">
            <Trash2 className="w-4 h-4" /> Trash
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500">Loading inventory...</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 bg-zinc-900/30 rounded-3xl border border-zinc-800/50">
          <Package className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
          <p className="text-xl font-bold">No comics found.</p>
          <p className="text-sm mt-2">Try adjusting your search or scan some new comics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={item.id}
              onClick={() => setSelectedComic(item)}
              className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden group hover:border-indigo-500/50 transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/10"
            >
              <div className="aspect-[3/2] w-full bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                {item.frontImage ? (
                  <img
                    src={`/api${item.frontImage}`} 
                    alt={item.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-zinc-700 font-bold uppercase tracking-widest text-xs">No Image</div>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-black/60 backdrop-blur text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                    {item.publisher}
                  </span>
                  <span className="bg-indigo-500/80 backdrop-blur text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Grade {item.gradeEstimate}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2 gap-4">
                  <h3 className="text-xl font-black text-white leading-tight">
                    {item.title} <span className="text-zinc-500 text-lg">#{item.issueNumber}</span>
                  </h3>
                  <div className="flex items-center text-green-400 font-black whitespace-nowrap text-lg">
                    <DollarSign className="w-5 h-5" />
                    {item.valueEstimate}
                  </div>
                </div>
                <p className="text-zinc-400 text-sm mb-4 line-clamp-2 leading-relaxed">{item.keyFeatures}</p>
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80">
                  <div className="text-xs font-mono font-bold text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                    {item.suggestedSKU}
                  </div>
                  <div className="text-indigo-400 font-black text-xs uppercase tracking-widest flex items-center gap-1 group-hover:text-indigo-300">
                    View <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {selectedComic && (
          <motion.div 
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col"
            >
              <button 
                onClick={() => {
                  setSelectedComic(null);
                  setShowConfirmDelete(false);
                }}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col md:flex-row flex-1">
                {/* Image Section */}
                <div className="w-full md:w-2/5 bg-zinc-950 p-6 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-zinc-800">
                  <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden border border-zinc-800 relative bg-zinc-900 group">
                    {selectedComic.frontImage ? (
                      <>
                        <img src={`/api${selectedComic.frontImage}`} alt="Front" className="w-full h-full object-cover" />
                        {selectedComic.frontImageHighRes && (
                           <a href={`/api${selectedComic.frontImageHighRes}`} target="_blank" download className="absolute top-3 right-3 bg-zinc-900/90 hover:bg-indigo-600 text-white p-2 rounded-full backdrop-blur transition-all opacity-0 group-hover:opacity-100 shadow-lg">
                             <ExternalLink className="w-4 h-4" />
                           </a>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold uppercase text-xs">No Front Image</div>
                    )}
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-white tracking-widest pointer-events-none">Front</div>
                  </div>
                  <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden border border-zinc-800 relative bg-zinc-900 group">
                    {selectedComic.backImage ? (
                      <>
                        <img src={`/api${selectedComic.backImage}`} alt="Back" className="w-full h-full object-cover" />
                        {selectedComic.backImageHighRes && (
                           <a href={`/api${selectedComic.backImageHighRes}`} target="_blank" download className="absolute top-3 right-3 bg-zinc-900/90 hover:bg-indigo-600 text-white p-2 rounded-full backdrop-blur transition-all opacity-0 group-hover:opacity-100 shadow-lg">
                             <ExternalLink className="w-4 h-4" />
                           </a>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold uppercase text-xs">No Back Image</div>
                    )}
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-white tracking-widest pointer-events-none">Back</div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="w-full md:w-3/5 p-6 sm:p-8 flex flex-col">
                  <div className="flex-1">
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                          {selectedComic.publisher}
                        </span>
                        <span className="text-zinc-500 font-bold">#{selectedComic.issueNumber}</span>
                        <span className="text-zinc-500 font-bold flex items-center gap-1 ml-2">
                          <Calendar className="w-3 h-3" /> {selectedComic.year}
                        </span>
                      </div>
                      <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-2">
                        {selectedComic.title}
                      </h2>
                      <div className="text-3xl font-black text-green-400 flex items-center gap-1">
                        <DollarSign className="w-8 h-8" />
                        {selectedComic.valueEstimate}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                      <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                        <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2"><Tag className="w-3 h-3" /> Grade</div>
                        <div className="text-2xl font-black text-indigo-400">{selectedComic.gradeEstimate}</div>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{selectedComic.gradingNotes}</p>
                      </div>
                      <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                        <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2"><Info className="w-3 h-3" /> Key Info</div>
                        <p className="text-sm text-zinc-300 font-bold leading-relaxed">{selectedComic.keyFeatures}</p>
                      </div>
                    </div>

                    <div className="mb-8">
                       <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">SKU</div>
                       <div className="font-mono text-sm bg-zinc-950 text-zinc-300 p-3 rounded-xl border border-zinc-800 select-all">
                         {selectedComic.suggestedSKU}
                       </div>
                    </div>

                    <div className="mb-8">
                      <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2 flex justify-between items-end">
                        eBay Draft
                        <button 
                          onClick={() => navigator.clipboard.writeText(selectedComic.ebayDescription)}
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[10px]"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <div className="font-mono text-xs bg-zinc-950 text-zinc-400 p-4 rounded-xl border border-zinc-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto select-all">
                        {selectedComic.ebayDescription}
                      </div>
                    </div>
                  </div>

                  {/* Delete Section */}
                  <div className="mt-8 pt-6 border-t border-zinc-800/80 mt-auto">
                    {showConfirmDelete ? (
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-red-400 text-sm font-bold flex items-center gap-2">
                          <Trash2 className="w-4 h-4" /> Move to trash?
                        </p>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button 
                            onClick={() => setShowConfirmDelete(false)}
                            className="flex-1 sm:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? 'Deleting...' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowConfirmDelete(true)}
                        className="w-full sm:w-auto text-red-500 hover:text-red-400 hover:bg-red-500/10 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" /> Delete Comic
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
