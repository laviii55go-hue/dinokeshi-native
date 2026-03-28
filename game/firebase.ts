import AsyncStorage from '@react-native-async-storage/async-storage';

const FB_DB = 'https://dino-keshi-default-rtdb.asia-southeast1.firebasedatabase.app';
const FB_SCORES_URL = FB_DB + '/scores.json';

const FB_LAST_LOGIN_KEY = 'dinoKeshiLastLogin';
const FB_CONSECUTIVE_KEY = 'dinoKeshiConsecutiveDays';

export interface GlobalRankEntry {
  name: string;
  score: number;
  level: number;
  date: string;
  ts: number;
  consecutiveDays: number;
  lastLoginDate: string;
}

// --- Read global rankings ---

export type RankPeriod = 'daily' | 'weekly' | 'monthly';

// Cache: monthly Firebase data (covers daily & weekly too)
let _cachedEntries: GlobalRankEntry[] | null = null;
let _cacheTs = 0;
const CACHE_TTL = 60_000; // 60 seconds

export function invalidateRankingsCache() {
  _cachedEntries = null;
  _cacheTs = 0;
}

async function fetchMonthlyEntries(): Promise<GlobalRankEntry[]> {
  const now = Date.now();
  if (_cachedEntries && now - _cacheTs < CACHE_TTL) return _cachedEntries;
  try {
    const d = new Date();
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const url = `${FB_SCORES_URL}?orderBy="ts"&startAt=${monthStart}&endAt=${monthEnd}`;
    const res = await fetch(url);
    if (!res.ok) return _cachedEntries ?? [];
    const data = await res.json();
    if (!data) return [];
    _cachedEntries = Object.values(data);
    _cacheTs = now;
    return _cachedEntries;
  } catch (e) {
    console.warn('Failed to fetch global rankings:', e);
    return _cachedEntries ?? [];
  }
}

export async function fetchGlobalRankings(period: RankPeriod = 'daily'): Promise<GlobalRankEntry[]> {
  const entries = await fetchMonthlyEntries();
  if (entries.length === 0) return [];

  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + DAY;

  const weekStart = todayStart - (now.getDay() * DAY); // Sunday start

  const filtered = entries.filter(d => {
    if (!d.ts) return false;
    if (period === 'daily') return d.ts >= todayStart && d.ts < todayEnd;
    if (period === 'weekly') return d.ts >= weekStart && d.ts < todayEnd;
    if (period === 'monthly') return true; // already filtered by server
    return true;
  });

  // Keep only the best score per user name
  const bestByName = new Map<string, GlobalRankEntry>();
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

// --- Submit score to global ranking ---

export async function submitGlobalScore(name: string, score: number, level: number): Promise<boolean> {
  try {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const dateStr = `${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // Consecutive days tracking
    const lastLogin = await AsyncStorage.getItem(FB_LAST_LOGIN_KEY) || '';
    let consecutiveDays = parseInt(await AsyncStorage.getItem(FB_CONSECUTIVE_KEY) || '1', 10) || 1;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

    if (lastLogin === yesterdayStr) {
      consecutiveDays += 1;
    } else if (lastLogin !== todayStr) {
      consecutiveDays = 1;
    }

    await AsyncStorage.setItem(FB_LAST_LOGIN_KEY, todayStr);
    await AsyncStorage.setItem(FB_CONSECUTIVE_KEY, String(consecutiveDays));

    const data: GlobalRankEntry = {
      name,
      score,
      level,
      date: dateStr,
      ts: Date.now(),
      consecutiveDays,
      lastLoginDate: todayStr,
    };

    const res = await fetch(FB_SCORES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) invalidateRankingsCache();
    return res.ok;
  } catch (e) {
    console.warn('Failed to submit global score:', e);
    return false;
  }
}
