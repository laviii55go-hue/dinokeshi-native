import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameState } from './types';

const GAME_STATE_KEY = 'dinoKeshiGameState';
const RANKING_KEY = 'dinoKeshiRanking';
const SETTINGS_KEY = 'dinoKeshiSettings';

// --- Game state persistence ---

export async function saveGameState(state: GameState) {
  try {
    await AsyncStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save game state:', e);
  }
}

export async function loadGameState(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(GAME_STATE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    // Backward compat: allCount added in v5.1
    if (state.allCount === undefined) state.allCount = 0;
    return state;
  } catch (e) {
    console.warn('Failed to load game state:', e);
    return null;
  }
}

export async function clearGameState() {
  try {
    await AsyncStorage.removeItem(GAME_STATE_KEY);
  } catch (e) {
    console.warn('Failed to clear game state:', e);
  }
}

// --- Rankings ---

export interface RankEntry {
  score: number;
  level: number;
  date: string;
}

export async function loadRankings(): Promise<RankEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(RANKING_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RankEntry[];
  } catch {
    return [];
  }
}

export async function saveToRanking(score: number, level: number): Promise<number | null> {
  const rankings = await loadRankings();
  const entry: RankEntry = {
    score,
    level,
    date: (() => { const n = new Date(); const p = (v: number) => String(v).padStart(2, '0'); return `${p(n.getMonth()+1)}/${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}`; })(),
  };
  rankings.push(entry);
  rankings.sort((a, b) => b.score - a.score);
  const top10 = rankings.slice(0, 10);
  await AsyncStorage.setItem(RANKING_KEY, JSON.stringify(top10));

  const rank = top10.findIndex(e => e === entry);
  return rank >= 0 ? rank + 1 : null;
}

// --- Settings ---

export interface Settings {
  soundVolume: number;  // 0, 0.1, 0.3, 0.5
  bgmOn: boolean;
  hapticsOn: boolean;
  dropAnimation: boolean;
  bombWaveEffect: boolean;
  numberSize: 'sm' | 'md' | 'lg' | 'xl';
  playerName: string;
}

const defaultSettings: Settings = {
  soundVolume: 0.3,
  bgmOn: true,
  hapticsOn: true,
  dropAnimation: true,
  bombWaveEffect: true,
  numberSize: 'md',
  playerName: '',
};

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

export async function saveSettings(settings: Settings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}
