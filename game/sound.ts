// SDK 55 対応：expo-av → expo-audio 移行（2026/04/30 v5.3.8 / v1.5）
// 同期API（player.volume = N / player.play() / player.seekTo(0)）
import { createAudioPlayer, setAudioModeAsync, AudioPlayer, AudioSource } from 'expo-audio';

let soundVolume = 0.3;
let muted = false;
const allPlayers = new Set<AudioPlayer>();

export function setSoundVolume(v: number) {
  soundVolume = v;
  muted = v === 0;
  for (const p of allPlayers) {
    try {
      p.volume = v;
    } catch {}
  }
}

export function getSoundVolume() {
  return soundVolume;
}

// ---- Sound effects ----

const SE_SOURCES = {
  tick: require('../assets/audio/se_tick.mp3'),
  erase: require('../assets/audio/se_erase.mp3'),
  bomb: require('../assets/audio/se_bomb.mp3'),
  gameover: require('../assets/audio/se_gameover.mp3'),
  bonus: require('../assets/audio/se_bonus.mp3'),
  bonusBig: require('../assets/audio/se_bonus_big.mp3'),
  eraser: require('../assets/audio/se_eraser.mp3'),
  shuffle: require('../assets/audio/se_scratch.mp3'),
  henkou: require('../assets/audio/se_henkou.mp3'),
};

let tickS: AudioPlayer | null = null;
let eraseS: AudioPlayer | null = null;
let bombS: AudioPlayer | null = null;
let gameoverS: AudioPlayer | null = null;
let bonusS: AudioPlayer | null = null;
let bonusBigS: AudioPlayer | null = null;
let eraserS: AudioPlayer | null = null;
let shuffleS: AudioPlayer | null = null;
let henkouS: AudioPlayer | null = null;
let seLoaded = false;

export async function loadSoundEffects() {
  if (seLoaded) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    const vol = soundVolume;
    const load = (src: AudioSource): AudioPlayer => {
      const player = createAudioPlayer(src);
      try {
        player.volume = vol;
      } catch {}
      allPlayers.add(player);
      return player;
    };
    tickS = load(SE_SOURCES.tick);
    eraseS = load(SE_SOURCES.erase);
    bombS = load(SE_SOURCES.bomb);
    gameoverS = load(SE_SOURCES.gameover);
    bonusS = load(SE_SOURCES.bonus);
    bonusBigS = load(SE_SOURCES.bonusBig);
    eraserS = load(SE_SOURCES.eraser);
    shuffleS = load(SE_SOURCES.shuffle);
    henkouS = load(SE_SOURCES.henkou);
    seLoaded = true;
  } catch (e) {
    console.warn('SE load failed:', e);
  }
}

function playSE(player: AudioPlayer | null) {
  if (!player || muted) return;
  try {
    // seekTo は Promise を返すため then チェーンで play を確実に再開（旧 expo-av: setPositionAsync().then(playAsync) と同パターン）
    player.seekTo(0).then(() => {
      try { player.play(); } catch {}
    }).catch(() => {
      // seek失敗時もとりあえず再生試行（連続押し時など）
      try { player.play(); } catch {}
    });
  } catch (e) {
    // フォールバック：再生失敗時は無視（ユーザー体験を妨げないため）
  }
}

export function playTick() { playSE(tickS); }
export function playErase() { playSE(eraseS); }
export function playBomb() { playSE(bombS); }
export function playBonus() { playSE(bonusS); }
export function playBonusBig() { playSE(bonusBigS); }
export function playEraser() { playSE(eraserS); }
export function playShuffle() { playSE(shuffleS); }
export function playHenkou() { playSE(henkouS); }
export function playGameOver() { playSE(gameoverS); }

// ---- BGM ----

let bgmPlayer: AudioPlayer | null = null;
let currentBgmIndex = 0;
let bgmChangeListeners: (() => void)[] = [];

const BGM_SOURCES = [
  require('../assets/audio/bgm1.mp3'),
  require('../assets/audio/bgm2.mp3'),
  require('../assets/audio/bgm3.mp3'),
];

export const BGM_NAMES = ['恐竜時代', '恐竜散歩', 'ピコピコゲーム'];

export function onBgmChange(fn: () => void) {
  bgmChangeListeners.push(fn);
  return () => {
    const idx = bgmChangeListeners.indexOf(fn);
    if (idx >= 0) bgmChangeListeners.splice(idx, 1);
  };
}

export async function startBGM(index?: number) {
  try {
    await stopBGM();
    if (index !== undefined) currentBgmIndex = index;
    const player = createAudioPlayer(BGM_SOURCES[currentBgmIndex]);
    try {
      player.volume = 0.38;
      player.loop = true;
    } catch {}
    bgmPlayer = player;
    player.play();
    bgmChangeListeners.forEach(fn => fn());
  } catch (e) {
    console.warn('BGM start failed:', e);
  }
}

export async function stopBGM() {
  try {
    if (bgmPlayer) {
      try {
        bgmPlayer.pause();
      } catch {}
      try {
        bgmPlayer.remove();
      } catch {}
      bgmPlayer = null;
    }
  } catch {}
}

export async function switchBGM(index: number) {
  currentBgmIndex = index;
  await startBGM(index);
}

export function getCurrentBGMIndex() {
  return currentBgmIndex;
}
