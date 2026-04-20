"use client";

import { useState, useEffect } from "react";
import { BarChart2, DollarSign, Package, Star, TrendingUp, Loader2, Key, Award, Clock } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface ComicSummary {
  id: number;
  title: string;
  issueNumber: string;
  publisher: string;
  valueEstimate: string;
  gradeEstimate: string;
  frontImage: string;
}

interface Stats {
  total: number;
  totalValue: number;
  avgGrade: number;
  byPublisher: { name: string; count: number; value: number }[];
  gradeDistribution: { label: string; sublabel: string; count: number; color: string }[];
  top10: ComicSummary[];
  keyIssuesCount: number;
  highestGrade: number;
  topKeyIssues: (ComicSummary & { keyFeatures: string })[];
  byDecade: { decade: string; count: number; value: number }[];
  recentlyAdded: ComicSummary[];
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </main>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-black text-white tracking-tight mb-4 flex items-center gap-4">
          <BarChart2 className="w-10 h-10 text-indigo-500" /> COLLECTION STATS
        </h1>
        <div className="text-center py-20 text-zinc-500 bg-zinc-900/30 rounded-3xl border border-zinc-800/50">
          <BarChart2 className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
          <p className="text-xl font-bold">No inventory yet.</p>
          <p className="text-sm mt-2">Scan some comics and store them to see your collection stats.</p>
        </div>
      </main>
    );
  }

  const maxPubCount = Math.max(...stats.byPublisher.map(p => p.count), 1);
  const maxBucketCount = Math.max(...stats.gradeDistribution.map(b => b.count), 1);
  const maxDecadeCount = Math.max(...stats.byDecade.map(d => d.count), 1);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
          <BarChart2 className="w-10 h-10 text-indigo-500" /> COLLECTION STATS
        </h1>
        <p className="text-zinc-400 font-medium">Your comic collection at a glance.</p>
      </div>

      {/* Hero Stats — 6 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {[
          {
            label: 'Total Comics',
            value: stats.total.toLocaleString(),
            icon: <Package className="w-5 h-5" />,
            color: 'text-indigo-400',
          },
          {
            label: 'Est. Collection Value',
            value: `$${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            icon: <DollarSign className="w-5 h-5" />,
            color: 'text-green-400',
          },
          {
            label: 'Average Grade',
            value: stats.avgGrade.toFixed(1),
            icon: <Star className="w-5 h-5" />,
            color: 'text-yellow-400',
          },
          {
            label: 'Publishers',
            value: stats.byPublisher.length.toLocaleString(),
            icon: <TrendingUp className="w-5 h-5" />,
            color: 'text-blue-400',
          },
          {
            label: 'Key Issues',
            value: stats.keyIssuesCount.toLocaleString(),
            icon: <Key className="w-5 h-5" />,
            color: 'text-orange-400',
          },
          {
            label: 'Highest Grade',
            value: stats.highestGrade.toFixed(1),
            icon: <Award className="w-5 h-5" />,
            color: 'text-pink-400',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
          >
            <div className={`flex items-center gap-2 mb-3 ${stat.color}`}>
              {stat.icon}
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{stat.label}</span>
            </div>
            <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Publisher Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
        >
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6">By Publisher</h2>
          <div className="flex flex-col gap-4">
            {stats.byPublisher.slice(0, 10).map((pub) => (
              <div key={pub.name}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-sm font-black text-white">{pub.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-green-400 font-bold">
                      ${pub.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs font-black text-zinc-400 w-8 text-right">{pub.count}</span>
                  </div>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(pub.count / maxPubCount) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="h-full bg-indigo-500 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Grade Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
        >
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6">Grade Distribution</h2>
          <div className="flex items-end justify-around gap-3 h-48">
            {stats.gradeDistribution.map((bucket) => (
              <div key={bucket.label} className="flex flex-col items-center gap-2 flex-1">
                <span className="text-xs font-black text-zinc-400">{bucket.count}</span>
                <div className="w-full bg-zinc-800 rounded-xl overflow-hidden flex flex-col justify-end" style={{ height: '120px' }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(bucket.count / maxBucketCount) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className={`w-full rounded-xl ${bucket.color}`}
                  />
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-black text-white">{bucket.label}</div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-wide">{bucket.sublabel}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* By Decade */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
        >
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6">By Decade</h2>
          {stats.byDecade.length === 0 ? (
            <p className="text-zinc-600 text-sm font-bold">No year data available.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {stats.byDecade.map((d) => (
                <div key={d.decade}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm font-black text-white">{d.decade}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-green-400 font-bold">
                        ${d.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-xs font-black text-zinc-400 w-8 text-right">{d.count}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(d.count / maxDecadeCount) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.5 }}
                      className="h-full bg-orange-500 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Key Issues */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
        >
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6">Top Key Issues</h2>
          {stats.topKeyIssues.length === 0 ? (
            <p className="text-zinc-600 text-sm font-bold">No key issues in inventory yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-zinc-800">
              {stats.topKeyIssues.map((comic, i) => (
                <div key={comic.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="text-2xl font-black text-zinc-700 w-8 text-center shrink-0">{i + 1}</span>
                  {comic.frontImage && (
                    <div className="w-10 h-14 rounded-lg overflow-hidden border border-zinc-800 shrink-0 bg-zinc-950">
                      <img src={`/api${comic.frontImage}`} alt={comic.title} className="w-full h-full object-cover opacity-80" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate">
                      {comic.title} <span className="text-zinc-500">#{comic.issueNumber}</span>
                    </p>
                    <p className="text-[10px] text-orange-400 font-bold truncate mt-0.5">{comic.keyFeatures}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-zinc-500 font-bold">{comic.publisher}</span>
                      <span className="text-[10px] text-indigo-400 font-bold">Grade {comic.gradeEstimate}</span>
                    </div>
                  </div>
                  <span className="text-green-400 font-black text-sm shrink-0">{comic.valueEstimate}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recently Added */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> Recently Added
          </h2>
          <Link href="/inventory" className="text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {stats.recentlyAdded.map((comic) => (
            <div key={comic.id} className="flex flex-col gap-2">
              <div className="aspect-[2/3] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
                {comic.frontImage ? (
                  <img src={`/api${comic.frontImage}`} alt={comic.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                    <Package className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-black text-white truncate">{comic.title} <span className="text-zinc-500">#{comic.issueNumber}</span></p>
                <p className="text-xs text-green-400 font-bold">{comic.valueEstimate}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Top 10 Most Valuable */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Top 10 Most Valuable</h2>
          <Link href="/inventory" className="text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors">
            View All →
          </Link>
        </div>
        <div className="flex flex-col divide-y divide-zinc-800">
          {stats.top10.map((comic, i) => (
            <div key={comic.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <span className="text-2xl font-black text-zinc-700 w-8 text-center shrink-0">
                {i + 1}
              </span>
              {comic.frontImage && (
                <div className="w-10 h-14 rounded-lg overflow-hidden border border-zinc-800 shrink-0 bg-zinc-950">
                  <img src={`/api${comic.frontImage}`} alt={comic.title} className="w-full h-full object-cover opacity-80" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">
                  {comic.title} <span className="text-zinc-500">#{comic.issueNumber}</span>
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-zinc-500 font-bold">{comic.publisher}</span>
                  <span className="text-[10px] text-indigo-400 font-bold">Grade {comic.gradeEstimate}</span>
                </div>
              </div>
              <span className="text-green-400 font-black text-sm shrink-0">{comic.valueEstimate}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </main>
  );
}
