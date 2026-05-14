"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Sparkles, Send, User, Search, X } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface Comic {
  id: number;
  title: string;
  issueNumber: string;
  publisher: string;
  year: string;
  suggestedSKU: string;
  frontImage: string | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  mentionedComics?: Comic[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your AI assistant. Mention a comic using `@` to bring its context into our chat. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Comic[]>([]);
  const [mentionedComics, setMentionedComics] = useState<Comic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle autocomplete search
  useEffect(() => {
    if (!isSearching || searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }

    const fetchComics = async () => {
      try {
        const res = await fetch(`/api/listings?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.slice(0, 5)); // Limit to 5 results
        }
      } catch (error) {
        console.error("Failed to fetch comics for mention:", error);
      }
    };

    const timer = setTimeout(fetchComics, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isSearching]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    // Basic mention logic: find the last word, check if it starts with @
    const lastWord = value.split(" ").pop();
    if (lastWord && lastWord.startsWith("@")) {
      setIsSearching(true);
      setSearchQuery(lastWord.substring(1));
    } else {
      setIsSearching(false);
      setSearchQuery("");
    }
  };

  const handleSelectMention = (comic: Comic) => {
    // Replace the `@search` with `@Title #Issue`
    const words = input.split(" ");
    words.pop(); // Remove the current typed @search
    const newText = words.join(" ") + (words.length > 0 ? " " : "") + `@${comic.title} #${comic.issueNumber} `;
    
    setInput(newText);
    setIsSearching(false);
    setSearchQuery("");
    
    // Add to mentioned context if not already there
    if (!mentionedComics.find(c => c.id === comic.id)) {
      setMentionedComics([...mentionedComics, comic]);
    }

    inputRef.current?.focus();
  };

  const removeMention = (id: number) => {
    setMentionedComics(mentionedComics.filter(c => c.id !== id));
    // Optionally remove it from the text, but that's complex for a plain textarea
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      mentionedComics: [...mentionedComics]
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setMentionedComics([]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to communicate with AI');
      }

      const data = await res.json();
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "No reply provided by AI.",
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      
      if (data.action === 'edit_comic' && data.updates) {
        toast.success(`Comic updated successfully!`);
      }
    } catch (error: any) {
      toast.error(error.message);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${error.message}`,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-80px)] mt-0 md:mt-0 relative overflow-hidden">
      


      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth pb-32">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div className={`flex flex-col gap-2 max-w-[85%] md:max-w-[70%]`}>
              <div className={`p-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-sm' 
                  : 'bg-zinc-900 text-zinc-100 rounded-tl-sm border border-zinc-800'
              }`}>
                {/* Render content and highlight mentions */}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content.split(/(@[\w\s]+#\w+)/g).map((part, i) => {
                    if (part.startsWith('@')) {
                      return <span key={i} className="text-blue-400 font-semibold">{part}</span>;
                    }
                    return part;
                  })}
                </p>
              </div>

              {/* Render mentioned comics context block for user messages */}
              {msg.role === 'user' && msg.mentionedComics && msg.mentionedComics.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-end">
                  {msg.mentionedComics.map(comic => (
                    <div key={comic.id} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 pr-3 text-xs text-zinc-300">
                      {comic.frontImage && (
                        <div className="relative w-6 h-8 rounded overflow-hidden">
                          <Image src={comic.frontImage} alt={comic.title} fill className="object-cover" />
                        </div>
                      )}
                      <span>{comic.title} #{comic.issueNumber}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-zinc-400" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900 text-zinc-100 rounded-tl-sm border border-zinc-800 flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pt-10 pb-4 px-4">
        <div className="max-w-4xl mx-auto relative">
          
          {/* Active Mentions Context Bubbles */}
          {mentionedComics.length > 0 && (
            <div className="flex gap-2 mb-2 px-2 overflow-x-auto pb-1 no-scrollbar">
              {mentionedComics.map(comic => (
                <div key={comic.id} className="flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-2 py-1 rounded-full text-xs shrink-0">
                  <span className="font-semibold">{comic.title} #{comic.issueNumber}</span>
                  <button onClick={() => removeMention(comic.id)} className="hover:text-white p-0.5 rounded-full hover:bg-indigo-500/40">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Autocomplete Popover */}
          {isSearching && (
            <div className="absolute bottom-full mb-2 w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-2 border-b border-zinc-800 flex items-center gap-2 text-xs text-zinc-400 bg-zinc-950/50">
                <Search className="w-3 h-3" />
                <span>Searching comics for "{searchQuery}"...</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((comic) => (
                    <button
                      key={comic.id}
                      type="button"
                      onClick={() => handleSelectMention(comic)}
                      className="w-full text-left p-3 hover:bg-zinc-800 flex gap-3 items-center transition-colors border-b border-zinc-800/50 last:border-0"
                    >
                      {comic.frontImage ? (
                        <div className="relative w-8 h-12 rounded bg-zinc-950 shrink-0 overflow-hidden">
                          <Image src={comic.frontImage} alt={comic.title} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-8 h-12 rounded bg-zinc-800 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-sm text-zinc-100">{comic.title} #{comic.issueNumber}</div>
                        <div className="text-xs text-zinc-500 flex gap-2">
                          <span>{comic.publisher}</span>
                          {comic.suggestedSKU && <span>• SKU: {comic.suggestedSKU}</span>}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-zinc-500 text-sm">
                    {searchQuery.length > 0 ? "No comics found." : "Type to search..."}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="relative bg-zinc-900 border border-zinc-800 rounded-2xl flex items-end focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all shadow-lg">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Message AI... Type @ to mention a comic."
              className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 p-4 min-h-[60px] max-h-32 resize-none outline-none text-sm"
              rows={1}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 m-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
