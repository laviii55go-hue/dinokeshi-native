import { Audio } from 'expo-av';

let soundVolume = 0.3;

const allSounds = new Set<Audio.Sound>();

export function setSoundVolume(v: number) {
  soundVolume = v;
  muted = v === 0;
  for (const s of allSounds) {
    s.setVolumeAsync(v).catch(() => {});
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
  shuffle: require('../assets/audio/se_shuffle.mp3'),
  henkou: require('../assets/audio/se_henkou.mp3'),
};

let tickS: Audio.Sound | null = null;
let eraseS: Audio.Sound | null = null;
let bombS: Audio.Sound | null = null;
let gameoverS: Audio.Sound | null = null;
let bonusS: Audio.Sound | null = null;
let bonusBigS: Audio.Sound | null = null;
let eraserS: Audio.Sound | null = null;
let shuffleS: Audio.Sound | null = null;
let henkouS: Audio.Sound | null = null;
let seLoaded = false;

export async function loadSoundEffects() {
  if (seLoaded) return;
  try {
    const vol = soundVolume; // capture current volume at load time
    const load = async (src: any) => {
      const { sound } = await Audio.Sound.createAsync(src, { volume: vol });
      allSounds.add(sound);
      return sound;
    };
    [tickS, eraseS, bombS, gameoverS, bonusS, bonusBigS, eraserS, shuffleS, henkouS] =
      await Promise.all([
        load(SE_SOURCES.tick), load(SE_SOURCES.erase), load(SE_SOURCES.bomb),
        load(SE_SOURCES.gameover), load(SE_SOURCES.bonus), load(SE_SOURCES.bonusBig),
        load(SE_SOURCES.eraser), load(SE_SOURCES.shuffle), load(SE_SOURCES.henkou),
      ]);
    seLoaded = true;
  } catch (e) {
    console.warn('SE load failed:', e);
  }
}

let muted = false;

function playSE(sound: Audio.Sound | null) {
  if (!sound || muted) return;
  sound.replayAsync({ positionMillis: 0 }).catch(() => {});
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

let bgmSound: Audio.Sound | null = null;
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
    const { sound } = await Audio.Sound.createAsync(
      BGM_SOURCES[currentBgmIndex],
      { isLooping: true, volume: 0.38 }
    );
    bgmSound = sound;
    await bgmSound.playAsync();
    bgmChangeListeners.forEach(fn => fn());
  } catch (e) {
    console.warn('BGM start failed:', e);
  }
}

export async function stopBGM() {
  try {
    if (bgmSound) {
      await bgmSound.stopAsync();
      await bgmSound.unloadAsync();
      bgmSound = null;
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
