import AsyncStorage from '@react-native-async-storage/async-storage';

const TA_RANKING_KEY = 'dinoKeshiTARanking';

export interface TARankEntry {
  score: number;
  level: number;
  date: string;
}

export async function loadTARankings(): Promise<TARankEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(TA_RANKING_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TARankEntry[];
  } catch {
    return [];
  }
}

export async function saveToTARanking(score: number, level: number): Promise<number | null> {
  const rankings = await loadTARankings();
  const entry: TARankEntry = {
    score,
    level,
    date: (() => {
      const n = new Date();
      const p = (v: number) => String(v).padStart(2, '0');
      return `${p(n.getMonth() + 1)}/${p(n.getDate())}`;
    })(),
  };
  rankings.push(entry);
  rankings.sort((a, b) => b.score - a.score);
  const top10 = rankings.slice(0, 10);
  await AsyncStorage.setItem(TA_RANKING_KEY, JSON.stringify(top10));
  const rank = top10.findIndex(e => e === entry);
  return rank >= 0 ? rank + 1 : null;
}
