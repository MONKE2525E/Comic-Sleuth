"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag, Send, Sparkles, User, CheckCircle2, DollarSign, Save, Package } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface DraftedComic {
  id: number;
  price: number;
  title: string;
  ebayDescription: string;
}

export default function EbayDraftingPage() {
  const router = useRouter();
  const [comics, setComics] = useState<any[]>([]);
  const [draftedComics, setDraftedComics] = useState<Record<number, DraftedComic>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [input, setInput] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "I'm ready to draft your eBay listings! Let me know your pricing strategy (e.g. 'Aim for higher prices' or 'Price to sell quickly') and I'll process the comics in batches of 10."
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const idsString = sessionStorage.getItem('ebayDraftIds');
    if (!idsString) {
      toast.error("No comics selected.");
      router.push('/inventory');
      return;
    }

    try {
      const ids = JSON.parse(idsString) as number[];
      if (ids.length === 0) {
        router.push('/inventory');
        return;
      }

      fetch(`/api/listings?ids=${ids.join(',')}`)
        .then(res => res.json())
        .then(data => {
          setComics(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load selected comics", err);
          toast.error("Failed to load selected comics.");
          setLoading(false);
        });
    } catch (e) {
      console.error("Failed to parse eBay draft IDs", e);
      router.push('/inventory');
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || processing) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setProcessing(true);

    // Determine the next batch of up to 10 unprocessed comics
    const unprocessed = comics.filter(c => !draftedComics[c.id]);
    const batch = unprocessed.slice(0, 10);

    if (batch.length === 0) {
      setProcessing(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "All selected comics have already been processed! If you want to change them, we can refine the drafted list in a future update. For now, review the drafts and click 'Save Drafts'."
      }]);
      return;
    }

    try {
      const res = await fetch('/api/ebay/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages,
          comics: batch 
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to process drafts');
      }

      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || `Processed ${batch.length} comics.`,
      };
      
      setMessages(prev => [...prev, assistantMsg]);

      if (data.comics && Array.isArray(data.comics)) {
        const newDrafts = { ...draftedComics };
        data.comics.forEach((c: DraftedComic) => {
          newDrafts[c.id] = c;
        });
        setDraftedComics(newDrafts);
        
        if (unprocessed.length - batch.length > 0) {
          toast.info(`${unprocessed.length - batch.length} comics left to process.`);
        } else {
          toast.success("All selected comics have been drafted!");
        }
      }

    } catch (error: any) {
      toast.error(error.message);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${error.message}`,
      }]);
    } finally {
      setProcessing(false);
    }
  };

  const handlePushToEbay = async () => {
    setPushing(true);
    try {
      const res = await fetch('/api/ebay/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drafts: Object.values(draftedComics) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.errors && data.errors.length > 0) {
        toast.warning(`Pushed ${data.count} listings. Errors: ${data.errors.join(' | ')}`, { duration: 10000 });
      } else {
        toast.success(`Successfully pushed ${data.count || Object.keys(draftedComics).length} listings to eBay!`);
      }
      
      sessionStorage.removeItem('ebayDraftIds');
      router.push('/inventory');
    } catch (err: any) {
      toast.error(err.message || 'Failed to push to eBay.');
    } finally {
      setPushing(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-zinc-500">Loading comics...</div>;
  }

  const progress = Math.round((Object.keys(draftedComics).length / comics.length) * 100) || 0;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 mb-6 flex items-center justify-between">
        <div>
          <button 
            onClick={() => router.push('/inventory')}
            className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Inventory
          </button>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-blue-500" /> EBAY DRAFTING
          </h1>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            Progress <span className="text-blue-400">{Object.keys(draftedComics).length} / {comics.length}</span>
          </div>
          <div className="w-32 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden min-h-0 pb-10">
        
        {/* Left: Chat Interface */}
        <div className="w-full md:w-1/3 flex flex-col bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-lg relative">
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className={`p-3 rounded-2xl text-sm leading-relaxed max-w-[85%] ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : 'bg-zinc-900 text-zinc-100 rounded-tl-sm border border-zinc-800 shadow-sm'
                }`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3 h-3 text-zinc-400" />
                  </div>
                )}
              </div>
            ))}
            {processing && (
              <div className="flex gap-3 justify-start">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="p-3 rounded-2xl bg-zinc-900 text-zinc-100 rounded-tl-sm border border-zinc-800 flex gap-1 items-center h-10">
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-3 bg-zinc-950 border-t border-zinc-800 shrink-0">
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl flex items-end focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                placeholder={processing ? "Processing..." : "e.g. Aim for higher prices"}
                disabled={processing}
                className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-600 p-3 min-h-[44px] max-h-24 resize-none outline-none text-sm"
                rows={1}
              />
              <button 
                type="submit"
                disabled={!input.trim() || processing}
                className="p-2.5 m-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 text-center mt-2 font-medium">Sends the next batch of 10 comics to AI.</p>
          </form>
        </div>

        {/* Right: Comics List */}
        <div className="w-full md:w-2/3 flex flex-col overflow-hidden bg-zinc-900/30 border border-zinc-800/80 rounded-3xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50 backdrop-blur shrink-0">
            <h2 className="font-bold text-zinc-300 text-sm flex items-center gap-2">
              <Package className="w-4 h-4" /> COMICS TO LIST ({comics.length})
            </h2>
            <button 
              onClick={handlePushToEbay}
              disabled={Object.keys(draftedComics).length === 0 || pushing || Object.keys(draftedComics).length !== comics.length}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-colors"
            >
              <Send className="w-3 h-3" /> {pushing ? "Pushing..." : `Push ${Object.keys(draftedComics).length} Drafted`}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {comics.map((comic) => {
              const draft = draftedComics[comic.id];
              const isDrafted = !!draft;

              return (
                <div key={comic.id} className={`p-4 rounded-2xl border transition-colors ${isDrafted ? 'bg-blue-500/5 border-blue-500/30' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="w-16 h-24 rounded-lg bg-zinc-950 overflow-hidden shrink-0 relative border border-zinc-800">
                      {comic.frontImage && (
                        <Image src={`/api${comic.frontImage}`} alt={comic.title} fill className="object-cover opacity-80" />
                      )}
                      {isDrafted && (
                        <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <h3 className="font-bold text-white text-sm line-clamp-1">
                            {isDrafted ? (
                              draft.title
                            ) : (
                              <>{comic.title} <span className="text-zinc-500">#{comic.issueNumber}</span></>
                            )}
                          </h3>
                          <div className="text-xs text-zinc-500 mt-0.5">{comic.publisher} • Grade {comic.gradeEstimate}</div>
                        </div>
                        
                        <div className="text-right shrink-0">
                          {isDrafted ? (
                            <div className="text-green-400 font-black text-sm flex items-center justify-end">
                              <DollarSign className="w-3.5 h-3.5" />{draft.price.toFixed(2)}
                            </div>
                          ) : (
                            <div className="text-zinc-400 font-bold text-xs">
                              Est: {comic.valueEstimate}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description Snippet */}
                      <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800/80 mt-2">
                        <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed font-mono">
                          {isDrafted ? draft.ebayDescription : comic.ebayDescription || comic.keyFeatures || "No description generated yet."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
}