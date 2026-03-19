import { Audio } from 'expo-av';

let soundVolume = 0.7;

export function setSoundVolume(v: number) {
  soundVolume = v;
}

export function getSoundVolume() {
  return soundVolume;
}

export async function initAudio() {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
  });
}

// ---- Sound effects using short generated tones ----

async function playTone(frequency: number, durationMs: number, vol?: number) {
  // expo-av doesn't support synthesis, so we use very short silent + haptics
  // For real tone generation we'd need expo-audio or a native module
  // Instead we provide a simple click/pop sound via a tiny bundled wav
}

// We generate sound effects as short audio files at build time isn't feasible,
// so we create a minimal approach: use a single tick sound file and vary playback.
// For now, provide placeholder that plays haptic feedback
// TODO: Add actual .wav/.mp3 sound effect files for richer audio

let tickSoundObj: Audio.Sound | null = null;
let eraseSoundObj: Audio.Sound | null = null;
let bombSoundObj: Audio.Sound | null = null;
let gameoverSoundObj: Audio.Sound | null = null;

// Preload sound effects
const SE_SOURCES = {
  tick: require('../assets/audio/se_tick.mp3'),
  erase: require('../assets/audio/se_erase.mp3'),
  bomb: require('../assets/audio/se_bomb.mp3'),
  gameover: require('../assets/audio/se_gameover.mp3'),
};

let seLoaded = false;

export async function loadSoundEffects() {
  if (seLoaded) return;
  try {
    const [t, e, b, g] = await Promise.all([
      Audio.Sound.createAsync(SE_SOURCES.tick, { volume: soundVolume }),
      Audio.Sound.createAsync(SE_SOURCES.erase, { volume: soundVolume }),
      Audio.Sound.createAsync(SE_SOURCES.bomb, { volume: soundVolume }),
      Audio.Sound.createAsync(SE_SOURCES.gameover, { volume: soundVolume }),
    ]);
    tickSoundObj = t.sound;
    eraseSoundObj = e.sound;
    bombSoundObj = b.sound;
    gameoverSoundObj = g.sound;
    seLoaded = true;
  } catch (e) {
    console.warn('SE load failed:', e);
  }
}

async function playSE(sound: Audio.Sound | null) {
  if (!sound || soundVolume === 0) return;
  try {
    await sound.setVolumeAsync(soundVolume);
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (e) {
    console.warn('SE play failed:', e);
  }
}

export async function playTick() {
  await playSE(tickSoundObj);
}

export async function playErase() {
  await playSE(eraseSoundObj);
}

export async function playBomb() {
  await playSE(bombSoundObj);
}

export async function playGameOver() {
  await playSE(gameoverSoundObj);
}

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
    bgmChangeListeners = bgmChangeListeners.filter(f => f !== fn);
  };
}

function notifyBgmChange() {
  bgmChangeListeners.forEach(fn => fn());
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
    notifyBgmChange();
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
  } catch (e) {
    console.warn('BGM stop failed:', e);
  }
}

export async function switchBGM(index: number) {
  currentBgmIndex = index;
  await startBGM(index);
}

export function getCurrentBGMIndex() {
  return currentBgmIndex;
}
