"use client";

import { useState, useEffect } from "react";
import { Settings, Key, Save, Eye, EyeOff, CheckCircle2, Sparkles, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

type SettingsPayload = {
  hasKey: boolean;
  masked: string;
  model: string;
  prompt: string;
  maxRetries: number;
  defaults: {
    model: string;
    prompt: string;
    maxRetries: number;
  };
};

export default function SettingsPage() {
  const [masked, setMasked] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [show, setShow] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [maxRetries, setMaxRetries] = useState(3);
  const [defaults, setDefaults] = useState<SettingsPayload["defaults"] | null>(null);
  const [savingAI, setSavingAI] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: SettingsPayload) => {
        setHasKey(d.hasKey);
        setMasked(d.masked);
        setModel(d.model);
        setPrompt(d.prompt);
        setMaxRetries(d.maxRetries);
        setDefaults(d.defaults);
      });
  }, []);

  async function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) return;
    setSavingKey(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: newKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("API key saved.");
      setHasKey(true);
      const preview = newKey.trim();
      setMasked("•".repeat(Math.max(preview.length - 4, 4)) + preview.slice(-4));
      setNewKey("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save.");
    } finally {
      setSavingKey(false);
    }
  }

  async function handleSaveAI(e: React.FormEvent) {
    e.preventDefault();
    setSavingAI(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model.trim(),
          prompt: prompt.trim(),
          maxRetries,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("AI settings saved.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save.");
    } finally {
      setSavingAI(false);
    }
  }

  function resetToDefaults() {
    if (!defaults) return;
    setModel(defaults.model);
    setPrompt(defaults.prompt);
    setMaxRetries(defaults.maxRetries);
    toast.info("Reverted to defaults. Click Save to apply.");
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
          <Settings className="w-10 h-10 text-indigo-500" /> SETTINGS
        </h1>
        <p className="text-zinc-400 font-medium">Configure your ComicSleuth instance.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <Key className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Gemini API Key</h2>
        </div>

        {hasKey && (
          <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-zinc-800/60 rounded-2xl border border-zinc-700">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span className="text-sm font-bold text-zinc-300 font-mono tracking-wider">{masked}</span>
          </div>
        )}

        <form onSubmit={handleSaveKey} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2 block">
              {hasKey ? "Replace API Key" : "Enter API Key"}
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="AIza..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 pr-12 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingKey || !newKey.trim()}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-widest rounded-2xl px-6 py-3 transition-colors"
          >
            <Save className="w-4 h-4" />
            {savingKey ? "Saving…" : "Save Key"}
          </button>
        </form>

        <p className="text-xs text-zinc-600 mt-4">
          Keys are stored locally in your database. The key saved here takes priority over any GEMINI_API_KEY environment variable.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">AI Behavior</h2>
          </div>
          <button
            type="button"
            onClick={resetToDefaults}
            disabled={!defaults}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset defaults
          </button>
        </div>

        <form onSubmit={handleSaveAI} className="flex flex-col gap-5">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2 block">
              Model
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={defaults?.model ?? ""}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <p className="text-xs text-zinc-600 mt-2">
              Any Gemini model ID supported by the Generative AI SDK. Default: <span className="font-mono">{defaults?.model}</span>
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2 block">
              Max Retries
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxRetries}
              onChange={(e) => setMaxRetries(parseInt(e.target.value, 10) || 1)}
              className="w-32 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <p className="text-xs text-zinc-600 mt-2">
              Retries on transient network errors (1–10). Default: {defaults?.maxRetries}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2 block">
              Analysis Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={12}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-y"
            />
            <p className="text-xs text-zinc-600 mt-2">
              Must instruct the model to return valid JSON with the expected fields. Tweak the grading rubric, tone, or fields as needed.
            </p>
          </div>

          <button
            type="submit"
            disabled={savingAI || !model.trim() || !prompt.trim()}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-widest rounded-2xl px-6 py-3 transition-colors self-start"
          >
            <Save className="w-4 h-4" />
            {savingAI ? "Saving…" : "Save AI Settings"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
