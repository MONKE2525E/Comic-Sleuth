import { NextResponse } from 'next/server';
import db from '@/lib/db';

function parseValue(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[$,\s]/g, '');
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-').map(Number).filter(n => !isNaN(n));
    if (parts.length >= 2) return (parts[0] + parts[1]) / 2;
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export async function GET() {
  try {
    const listings = db.prepare('SELECT * FROM listings').all() as any[];

    if (listings.length === 0) {
      return NextResponse.json({ total: 0, totalValue: 0, avgGrade: 0, byPublisher: [], gradeDistribution: [], top10: [] });
    }

    const total = listings.length;
    const totalValue = listings.reduce((sum, l) => sum + parseValue(l.valueEstimate), 0);
    const avgGrade = listings.reduce((sum, l) => sum + (parseFloat(l.gradeEstimate) || 0), 0) / total;

    const pubMap: Record<string, { count: number; value: number }> = {};
    for (const l of listings) {
      const pub = l.publisher || 'Unknown';
      if (!pubMap[pub]) pubMap[pub] = { count: 0, value: 0 };
      pubMap[pub].count++;
      pubMap[pub].value += parseValue(l.valueEstimate);
    }
    const byPublisher = Object.entries(pubMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    const buckets = [
      { label: '0–2', sublabel: 'Poor', count: 0, color: 'bg-red-500' },
      { label: '2–4', sublabel: 'Good', count: 0, color: 'bg-orange-500' },
      { label: '4–6', sublabel: 'Fine', count: 0, color: 'bg-yellow-500' },
      { label: '6–8', sublabel: 'VF', count: 0, color: 'bg-blue-500' },
      { label: '8–10', sublabel: 'NM+', count: 0, color: 'bg-green-500' },
    ];
    for (const l of listings) {
      const g = parseFloat(l.gradeEstimate) || 0;
      if (g <= 2.0) buckets[0].count++;
      else if (g <= 4.0) buckets[1].count++;
      else if (g <= 6.0) buckets[2].count++;
      else if (g <= 8.0) buckets[3].count++;
      else buckets[4].count++;
    }

    const sorted = [...listings].sort((a, b) => parseValue(b.valueEstimate) - parseValue(a.valueEstimate));

    const top10 = sorted.slice(0, 10).map(l => ({
      id: l.id,
      title: l.title,
      issueNumber: l.issueNumber,
      publisher: l.publisher,
      valueEstimate: l.valueEstimate,
      gradeEstimate: l.gradeEstimate,
      frontImage: l.frontImage,
    }));

    const keyIssuesCount = listings.filter(l => !/standard issue/i.test(l.keyFeatures || '')).length;
    const highestGrade = Math.max(...listings.map(l => parseFloat(l.gradeEstimate) || 0));

    const topKeyIssues = sorted
      .filter(l => !/standard issue/i.test(l.keyFeatures || ''))
      .slice(0, 10)
      .map(l => ({
        id: l.id,
        title: l.title,
        issueNumber: l.issueNumber,
        publisher: l.publisher,
        valueEstimate: l.valueEstimate,
        gradeEstimate: l.gradeEstimate,
        frontImage: l.frontImage,
        keyFeatures: l.keyFeatures,
      }));

    const decadeMap: Record<number, { count: number; value: number }> = {};
    for (const l of listings) {
      const yr = parseInt(l.year);
      if (isNaN(yr)) continue;
      const decade = Math.floor(yr / 10) * 10;
      if (!decadeMap[decade]) decadeMap[decade] = { count: 0, value: 0 };
      decadeMap[decade].count++;
      decadeMap[decade].value += parseValue(l.valueEstimate);
    }
    const byDecade = Object.entries(decadeMap)
      .map(([d, data]) => ({ decade: `${d}s`, count: data.count, value: data.value }))
      .sort((a, b) => parseInt(a.decade) - parseInt(b.decade));

    const recentlyAdded = [...listings]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(l => ({
        id: l.id,
        title: l.title,
        issueNumber: l.issueNumber,
        publisher: l.publisher,
        valueEstimate: l.valueEstimate,
        gradeEstimate: l.gradeEstimate,
        frontImage: l.frontImage,
      }));

    return NextResponse.json({ total, totalValue, avgGrade, byPublisher, gradeDistribution: buckets, top10, keyIssuesCount, highestGrade, topKeyIssues, byDecade, recentlyAdded });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
