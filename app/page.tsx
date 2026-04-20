"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, ListTodo } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function ComicSleuth() {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const frontInput = useRef<HTMLInputElement>(null);
  const backInput = useRef<HTMLInputElement>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>, setImg: (s: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImg(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const queueComic = async () => {
    if (!frontImage || !backImage) {
      toast.error("Both front and back images are required.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ front: frontImage, back: backImage }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      toast.success("Comic added to processing queue!");
      reset();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong adding to queue.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFrontImage(null);
    setBackImage(null);
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 md:py-12 flex flex-col min-h-[calc(100vh-100px)]">
      <div className="text-center mb-12 md:hidden">
        <h1 className="text-5xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-4 tracking-tight">
          COMIC SLEUTH
        </h1>
        <p className="text-zinc-400 text-lg font-medium">Fast Scan Mode.</p>
      </div>

      <div className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Front Capture */}
          <div 
            onClick={() => frontInput.current?.click()}
            className={`aspect-[2/3] relative rounded-3xl border-4 border-dashed cursor-pointer overflow-hidden transition-all duration-300 group
              ${frontImage ? 'border-indigo-500/50' : 'border-zinc-800 hover:border-indigo-500/30 bg-zinc-900/50'}`}
          >
            {frontImage ? (
              <img src={frontImage} className="w-full h-full object-cover" alt="Front Cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <Camera className="w-12 h-12 mb-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                <p className="text-xl font-bold text-zinc-500 group-hover:text-zinc-300">Snap Front</p>
                <p className="text-sm text-zinc-600 mt-2">Required</p>
              </div>
            )}
            <input 
              type="file" 
              ref={frontInput} 
              onChange={(e) => handleImage(e, setFrontImage)} 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
            />
          </div>

          {/* Back Capture */}
          <div 
            onClick={() => backInput.current?.click()}
            className={`aspect-[2/3] relative rounded-3xl border-4 border-dashed cursor-pointer overflow-hidden transition-all duration-300 group
              ${backImage ? 'border-indigo-500/50' : 'border-zinc-800 hover:border-indigo-500/30 bg-zinc-900/50'}`}
          >
            {backImage ? (
              <img src={backImage} className="w-full h-full object-cover" alt="Back Cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <Camera className="w-12 h-12 mb-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                <p className="text-xl font-bold text-zinc-500 group-hover:text-zinc-300">Snap Back</p>
                <p className="text-sm text-zinc-600 mt-2">Required</p>
              </div>
            )}
            <input 
              type="file" 
              ref={backInput} 
              onChange={(e) => handleImage(e, setBackImage)} 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={queueComic}
            disabled={!frontImage || !backImage || loading}
            className={`w-full max-w-md py-5 rounded-2xl text-xl font-black uppercase tracking-widest transition-all
              ${loading ? 'bg-zinc-800 cursor-not-allowed text-zinc-500' : 
                frontImage && backImage ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_40px_rgba(79,70,229,0.3)] shadow-indigo-500/50 active:scale-95' : 
                'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin" />
                Queueing...
              </span>
            ) : (
              "Add to Processing Queue"
            )}
          </button>
          
          {(frontImage || backImage) && !loading && (
            <button onClick={reset} className="text-zinc-500 hover:text-zinc-300 font-bold transition-colors mt-2">
              Clear Images
            </button>
          )}

          <Link href="/queue" className="mt-8 text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
             <ListTodo className="w-4 h-4" /> View Processing Queue
          </Link>
        </div>
      </div>
    </main>
  );
}
