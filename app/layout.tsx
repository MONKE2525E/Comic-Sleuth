import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Link from "next/link";
import { Camera, Library, ListTodo, BarChart2, Settings } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ComicSleuth | AI Comic Valuer",
  description: "Identify and value your comic books instantly using AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 min-h-screen pb-20 md:pb-0 pt-0 md:pt-20`}>
        
        {/* Desktop Header */}
        <header className="hidden md:flex fixed top-0 w-full bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900 z-50 px-8 py-4 items-center justify-between">
          <Link href="/" className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent tracking-tight">
            COMIC SLEUTH
          </Link>
          <nav className="flex gap-6">
            <Link href="/" className="text-zinc-400 hover:text-white font-bold text-sm uppercase tracking-widest transition-colors flex items-center gap-2">
              <Camera className="w-4 h-4" /> Scan
            </Link>
            <Link href="/queue" className="text-zinc-400 hover:text-white font-bold text-sm uppercase tracking-widest transition-colors flex items-center gap-2">
              <ListTodo className="w-4 h-4" /> Queue
            </Link>
            <Link href="/inventory" className="text-zinc-400 hover:text-white font-bold text-sm uppercase tracking-widest transition-colors flex items-center gap-2">
              <Library className="w-4 h-4" /> Inventory
            </Link>
            <Link href="/stats" className="text-zinc-400 hover:text-white font-bold text-sm uppercase tracking-widest transition-colors flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Stats
            </Link>
            <Link href="/settings" className="text-zinc-400 hover:text-white font-bold text-sm uppercase tracking-widest transition-colors flex items-center gap-2">
              <Settings className="w-4 h-4" /> Settings
            </Link>
          </nav>
        </header>

        {children}
        <Toaster position="top-center" richColors />

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 w-full bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-900 z-50 flex justify-around items-center p-4 pb-safe">
          <Link href="/" className="flex flex-col items-center gap-1 text-zinc-400 hover:text-indigo-400 transition-colors">
            <Camera className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Scan</span>
          </Link>
          <Link href="/queue" className="flex flex-col items-center gap-1 text-zinc-400 hover:text-indigo-400 transition-colors">
            <ListTodo className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Queue</span>
          </Link>
          <Link href="/inventory" className="flex flex-col items-center gap-1 text-zinc-400 hover:text-indigo-400 transition-colors">
            <Library className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Inventory</span>
          </Link>
          <Link href="/stats" className="flex flex-col items-center gap-1 text-zinc-400 hover:text-indigo-400 transition-colors">
            <BarChart2 className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Stats</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center gap-1 text-zinc-400 hover:text-indigo-400 transition-colors">
            <Settings className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Settings</span>
          </Link>
        </nav>

      </body>
    </html>
  );
}
