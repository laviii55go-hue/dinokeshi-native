const FB_DB = 'https://dino-keshi-default-rtdb.asia-southeast1.firebasedatabase.app';
const FB_TA_SCORES_URL = FB_DB + '/ta_scores.json';

export interface TAGlobalRankEntry {
  name: string;
  score: number;
  level: number;
  date: string;
  ts: number;
}

export type RankPeriod = 'daily' | 'weekly' | 'monthly';

let _cachedEntries: TAGlobalRankEntry[] | null = null;
let _cacheTs = 0;
const CACHE_TTL = 60_000;

export function invalidateTARankingsCache() {
  _cachedEntries = null;
  _cacheTs = 0;
}

async function fetchMonthlyEntries(): Promise<TAGlobalRankEntry[]> {
  const now = Date.now();
  if (_cachedEntries && now - _cacheTs < CACHE_TTL) return _cachedEntries;
  try {
    const d = new Date();
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const url = `${FB_TA_SCORES_URL}?orderBy="ts"&startAt=${monthStart}&endAt=${monthEnd}`;
    const res = await fetch(url);
    if (!res.ok) return _cachedEntries ?? [];
    const data = await res.json();
    if (!data) return [];
    _cachedEntries = Object.values(data);
    _cacheTs = now;
    return _cachedEntries;
  } catch (e) {
    console.warn('Failed to fetch TA global rankings:', e);
    return _cachedEntries ?? [];
  }
}

export async function fetchTAGlobalRankings(period: RankPeriod = 'daily'): Promise<TAGlobalRankEntry[]> {
  const entries = await fetchMonthlyEntries();
  if (entries.length === 0) return [];

  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + DAY;
  const weekStart = todayStart - (now.getDay() * DAY);

  const filtered = entries.filter(d => {
    if (!d.ts) return false;
    if (period === 'daily') return d.ts >= todayStart && d.ts < todayEnd;
    if (period === 'weekly') return d.ts >= weekStart && d.ts < todayEnd;
    return true;
  });

  const bestByName = new Map<string, TAGlobalRankEntry>();
  for (const entry of filtered) {
    const existing = bestByName.get(entry.name);
    if (!existing || entry.score > existing.score) {
      bestByName.set(entry.name, entry);
    }
  }

  const unique = Array.from(bestByName.values());
  unique.sort((a, b) => b.score - a.score);
  return unique.slice(0, 10);
}

export async function submitTAGlobalScore(name: string, score: number, level: number): Promise<boolean> {
  if (!name || name.trim().length < 1 || score <= 0 || level < 1) return false;
  try {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;

    const data: TAGlobalRankEntry = {
      name,
      score,
      level,
      date: dateStr,
      ts: Date.now(),
    };

    const res = await fetch(FB_TA_SCORES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) invalidateTARankingsCache();
    return res.ok;
  } catch (e) {
    console.warn('Failed to submit TA global score:', e);
    return false;
  }
}
