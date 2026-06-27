import * as Haptics from 'expo-haptics';
import { Image, ImageBackground } from 'expo-image';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useAd } from '../game/AdContext';
import {
  Alert,
  Animated,
  FlatList,
  InteractionManager,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  DINO_EMOJI, DINO_UNLOCK_LV,
  groupsNeeded, bombBoardMax,
} from '../game/constants';
import { t, tf, dinoName, setLanguage } from '../game/i18n';
import { DINO_SOURCES } from '../game/images';
import { TAGameBoard } from '../game/TAGameBoard';
import { calcScore, checkLevelUp, minGroupSize } from '../game/logic';
import {
  taApplyGravityAndRefill, taConvertType, taEraseAllOfType,
  taEraseBombCells, taEraseCells, taExplodeBomb, taGetGroup,
  taHasValidMoves, taShuffleGrid,
} from '../game/timeattack-logic';
import {
  BGM_NAMES, getCurrentBGMIndex, loadSoundEffects, onBgmChange,
  playBomb, playBonus, playBonusBig, playErase, playEraser,
  playGameOver, playHenkou, playShuffle, playTick,
  setSoundVolume, startBGM, stopBGM, switchBGM,
} from '../game/sound';
import { loadSettings, saveSettings, type Settings } from '../game/storage';
import type { Cell, GameState } from '../game/types';
import { getBgByLevel } from '../game/backgrounds';

import {
  TA_COLS, TA_ROWS, TA_DURATION, TA_SCORE_MULTIPLIER, TA_ITEM_PENALTY,
  TA_COMBO_WINDOW_MS, TA_COMBO_MULTIPLIERS,
  createTimeAttackState,
} from '../game/timeattack-config';
import { loadTARankings, saveToTARanking, type TARankEntry } from '../game/timeattack-storage';
import { fetchTAGlobalRankings, submitTAGlobalScore, type TAGlobalRankEntry, type RankPeriod } from '../game/timeattack-firebase';
import { preloadInterstitialAd, showInterstitialAd, incrementTAGameCount, shouldShowOnTARestart } from '../game/InterstitialAdManager';

const BG_IMAGE = require('../assets/images/bg.png');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 36) : 44;
const VERTICAL_OVERHEAD = STATUS_BAR_HEIGHT + 240;

const VOLUME_OPTIONS = [
  { labelKey: 'vol_mute', value: 0 },
  { labelKey: 'vol_low', value: 0.1 },
  { labelKey: 'vol_mid', value: 0.3 },
  { labelKey: 'vol_high', value: 0.5 },
];

const NUM_SIZE_OPTIONS: { labelKey: string; key: Settings['numberSize']; size: number }[] = [
  { labelKey: 'numsize_sm', key: 'sm', size: 0.75 },
  { labelKey: 'numsize_md', key: 'md', size: 0.95 },
  { labelKey: 'numsize_lg', key: 'lg', size: 1.2 },
  { labelKey: 'numsize_xl', key: 'xl', size: 1.5 },
];

export default function TimeAttackScreen() {
  const router = useRouter();
  const adState = useAd();

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const horizontalPadding = Math.max(2, Math.min(8, Math.floor((screenWidth - 360) / 4)));
  const boardBorder = 1;
  const boardPadding = 0;
  const cellGap = 0;
  const maxBoardWidth = screenWidth - horizontalPadding * 2 - boardBorder * 2 - boardPadding * 2;
  const cellFromWidth = Math.floor((maxBoardWidth - (TA_COLS - 1) * cellGap) / TA_COLS);
  const availableHeight = screenHeight - VERTICAL_OVERHEAD;
  const cellFromHeight = Math.floor((availableHeight - (TA_ROWS - 1) * cellGap) / TA_ROWS);
  const cellSize = Math.min(cellFromWidth, cellFromHeight);
  const actualBoardInner = cellSize * TA_COLS + cellGap * (TA_COLS - 1);
  const gridMaxWidth = actualBoardInner + boardPadding * 2 + boardBorder * 2;

  // Game state
  const [gameState, setGameState] = React.useState<GameState | null>(null);
  const animatingRef = React.useRef(false);
  const [eraserMode, setEraserMode] = React.useState(false);
  const [henkouMode, setHenkouMode] = React.useState(false);
  const [allMode, setAllMode] = React.useState(false);
  const eraserModeRef = React.useRef(false);
  const henkouModeRef = React.useRef(false);
  const allModeRef = React.useRef(false);
  const convertedCellsRef = React.useRef<Set<number>>(new Set());
  const highlightCellsRef = React.useRef<Set<number>>(new Set());
  const explodingCellsRef = React.useRef<Map<number, number>>(new Map());
  const explodePhaseRef = React.useRef(0);
  const [boardTick, setBoardTick] = React.useState(0);

  const triggerBoardUpdate = () => setBoardTick(t => t + 1);
  const setConvertedCells = (s: Set<number>) => { convertedCellsRef.current = s; triggerBoardUpdate(); };
  const setHighlightCells = (s: Set<number>) => { highlightCellsRef.current = s; triggerBoardUpdate(); };
  const setExplodingCells = (m: Map<number, number>) => { explodingCellsRef.current = m; };
  const setExplodePhase = (p: number) => { explodePhaseRef.current = p; triggerBoardUpdate(); };
  const popupTextRef = React.useRef<string | null>(null);
  const popupSetterRef = React.useRef<(text: string | null) => void>(() => {});
  const [waitingStart, setWaitingStart] = React.useState(true);
  const [paused, setPaused] = React.useState(false);
  const [gameOverVisible, setGameOverVisible] = React.useState(false);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [exchangeVisible, setExchangeVisible] = React.useState(false);
  const [dinoInfoPopup, setDinoInfoPopup] = React.useState<number | null>(null);
  const [rankingVisible, setRankingVisible] = React.useState(false);
  const [dotsFlash, setDotsFlash] = React.useState(false);
  const dotsFlashTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flashButton, setFlashButton] = React.useState<string | null>(null);
  const exchangeAnim = React.useRef(new Animated.Value(1)).current;
  const prevEraserCountRef = React.useRef<number | null>(null);
  const [unlockOverlay, setUnlockOverlay] = React.useState<{ type: number; name: string } | null>(null);
  const unlockOverlayAnim = React.useRef(new Animated.Value(0)).current;
  const unlockBoltAnim = React.useRef(new Animated.Value(0)).current;
  const [newDinoHighlight, setNewDinoHighlight] = React.useState<number | null>(null);
  const [dinoFlipRevealed, setDinoFlipRevealed] = React.useState(false);
  const footerPulseAnim = React.useRef(new Animated.Value(1)).current;
  const footerListRef = React.useRef<FlatList>(null);
  const [taRankings, setTaRankings] = React.useState<TARankEntry[]>([]);
  const [globalRankings, setGlobalRankings] = React.useState<TAGlobalRankEntry[]>([]);
  const [rankTab, setRankTab] = React.useState<'local' | 'global'>('local');
  const [rankPeriod, setRankPeriod] = React.useState<RankPeriod>('daily');
  const [loadingGlobal, setLoadingGlobal] = React.useState(false);
  const [namePromptVisible, setNamePromptVisible] = React.useState(false);
  const [gameOverNameInput, setGameOverNameInput] = React.useState('');
  const pendingScoreRef = React.useRef<{ score: number; level: number } | null>(null);
  const pendingRestartRef = React.useRef(false);
  const pendingShowAdRef = React.useRef(false);

  // Combo
  const comboCountRef = React.useRef(0);
  const comboTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [comboDisplay, setComboDisplay] = React.useState(0);

  const getComboMultiplier = () => {
    const idx = Math.min(comboCountRef.current, TA_COMBO_MULTIPLIERS.length - 1);
    return TA_COMBO_MULTIPLIERS[idx];
  };

  const tickCombo = () => {
    comboCountRef.current = Math.min(comboCountRef.current + 1, TA_COMBO_MULTIPLIERS.length - 1);
    setComboDisplay(comboCountRef.current);
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => {
      comboCountRef.current = 0;
      setComboDisplay(0);
    }, TA_COMBO_WINDOW_MS);
  };

  // Timer
  const [timeRemaining, setTimeRemaining] = React.useState(TA_DURATION);
  const timeRef = React.useRef(TA_DURATION);
  const timerIdRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const [settings, setSettings] = React.useState<Settings>({
    soundVolume: 0.3, bgmOn: true, hapticsOn: true, dropAnimation: true,
    bombWaveEffect: true, unlockAnimationOn: true, numberSize: 'lg', playerName: '', language: 'ja',
  });
  const settingsRef = React.useRef(settings);
  const [bgmIndex, setBgmIndex] = React.useState(0);
  const [settingsVisible, setSettingsVisible] = React.useState(false);
  const [nameInput, setNameInput] = React.useState('');

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      settingsRef.current = next;
      saveSettings(next);
      if (patch.soundVolume !== undefined) setSoundVolume(patch.soundVolume);
      return next;
    });
  };

  const popupTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkEraseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelUpTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize
  React.useEffect(() => {
    (async () => {
      const savedSettings = await loadSettings();
      setSettings(savedSettings);
      setNameInput(savedSettings.playerName);
      setSoundVolume(savedSettings.soundVolume);
      if (savedSettings.language) setLanguage(savedSettings.language);
      loadSoundEffects().then(() => setSoundVolume(savedSettings.soundVolume));

      const initial = createTimeAttackState();
      setGameState(initial);
      // タイマーはスタートボタン押下まで開始しない
      preloadInterstitialAd();

      const savedRankings = await loadTARankings();
      setTaRankings(savedRankings);
    })();
    const unsub = onBgmChange(() => setBgmIndex(getCurrentBGMIndex()));
    return () => {
      stopBGM(); unsub();
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      if (popupTimer.current) clearTimeout(popupTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      if (checkEraseTimer.current) clearTimeout(checkEraseTimer.current);
      if (dotsFlashTimer.current) clearTimeout(dotsFlashTimer.current);
      if (levelUpTimer.current) clearTimeout(levelUpTimer.current);
    };
  }, []);

  const gsRef = React.useRef(gameState);
  gsRef.current = gameState;
  eraserModeRef.current = eraserMode;
  henkouModeRef.current = henkouMode;
  allModeRef.current = allMode;
  settingsRef.current = settings;

  // Time up → game over
  const startTimer = () => {
    if (timerIdRef.current) clearInterval(timerIdRef.current);
    timerIdRef.current = setInterval(() => {
      timeRef.current -= 1;
      setTimeRemaining(timeRef.current);
      if (timeRef.current <= 0) {
        if (timerIdRef.current) clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
    }, 1000);
  };

  const handleStart = async () => {
    setWaitingStart(false);
    if (settings.bgmOn) { try { await startBGM(); } catch {} }
    startTimer();
  };

  const handlePause = () => {
    if (timerIdRef.current) { clearInterval(timerIdRef.current); timerIdRef.current = null; }
    if (comboTimerRef.current) { clearTimeout(comboTimerRef.current); comboTimerRef.current = null; }
    comboCountRef.current = 0;
    setComboDisplay(0);
    setPaused(true);
  };

  const handleResume = async () => {
    setPaused(false);
    if (settings.bgmOn) { try { await startBGM(); } catch {} }
    startTimer();
  };

  React.useEffect(() => {
    if (timeRemaining <= 0 && gameState?.running && !waitingStart) {
      handleGameOver(gameState);
    }
  }, [timeRemaining]);

  // Exchange button animation
  React.useEffect(() => {
    if (!gameState) return;
    const prev = prevEraserCountRef.current;
    prevEraserCountRef.current = gameState.eraserCount;
    if (prev !== null && prev < 10 && gameState.eraserCount >= 10) {
      Animated.sequence([
        Animated.timing(exchangeAnim, { toValue: 1.2, duration: 200, useNativeDriver: true }),
        Animated.timing(exchangeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(exchangeAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
        Animated.timing(exchangeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [gameState?.eraserCount]);

  const resetForNewGame = () => {
    const initial = createTimeAttackState();
    gsRef.current = initial;
    setGameState(initial);
    animatingRef.current = false;
    comboCountRef.current = 0;
    setComboDisplay(0);
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    timeRef.current = TA_DURATION;
    setTimeRemaining(TA_DURATION);
    setPaused(false);
    setWaitingStart(true);
    if (timerIdRef.current) clearInterval(timerIdRef.current);
    timerIdRef.current = null;
    return initial;
  };

  const finishPendingRestart = () => {
    if (!pendingRestartRef.current) return;
    pendingRestartRef.current = false;
    const showAd = pendingShowAdRef.current;
    pendingShowAdRef.current = false;
    resetForNewGame();
    if (showAd) {
      void showInterstitialAd(adState.isPremium);
    }
  };

  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (gameOverVisible || !pendingRestartRef.current) return;
    const task = InteractionManager.runAfterInteractions(() => {
      finishPendingRestart();
    });
    return () => task.cancel();
  }, [gameOverVisible]);

  const bombMaxUnlockLabel = (oldLevel: number, newLevel: number) => {
    const oldMax = bombBoardMax(oldLevel);
    const newMax = bombBoardMax(newLevel);
    return newMax > oldMax ? ` ${tf('volcano_max', newMax - oldMax)}` : '';
  };

  const deferredPopupRef = React.useRef<{ text: string; duration: number } | null>(null);
  const deferredLevelUpRef = React.useRef<{ dotsFlash: boolean; newDino: number | null; pageIndex: number }>({ dotsFlash: false, newDino: null, pageIndex: 0 });

  const showPopup = (text: string, duration = 150) => {
    popupTextRef.current = text;
    popupSetterRef.current(text);
    if (popupTimer.current) clearTimeout(popupTimer.current);
    popupTimer.current = setTimeout(() => {
      popupTextRef.current = null;
      popupSetterRef.current(null);
    }, duration);
  };

  const deferPopup = (text: string, duration = 150) => {
    deferredPopupRef.current = { text, duration };
  };

  const flushDeferredPopup = () => {
    if (deferredPopupRef.current) {
      showPopup(deferredPopupRef.current.text, deferredPopupRef.current.duration);
      deferredPopupRef.current = null;
    }
  };

  const cellPressRef = React.useRef<(r: number, c: number) => void>(() => {});
  const stableCellPress = React.useCallback((r: number, c: number) => cellPressRef.current(r, c), []);

  if (!gameState) {
    return (
      <ImageBackground source={BG_IMAGE} style={styles.screen} contentFit="cover">
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </ImageBackground>
    );
  }

  const { grid, level, score, erasedGroups, eraserCount, shuffleCount, henkouCount, allCount, running } = gameState;
  const needed = groupsNeeded(level);
  const numSizeMultiplier = NUM_SIZE_OPTIONS.find(o => o.key === settings.numberSize)?.size ?? 0.75;
  const numFontSize = Math.max(10, cellSize * 0.32 * numSizeMultiplier / 0.75);

  const commitState = (ns: GameState) => {
    gsRef.current = ns;
    setGameState(ns);
  };

  const updateState = (partial: Partial<GameState>) => {
    setGameState(prev => {
      if (!prev) return prev;
      const ns = { ...prev, ...partial };
      gsRef.current = ns;
      return ns;
    });
  };

  // ====== TA Score Helper: base ×5 + combo multiplier ======
  const taScore = (basePts: number) => {
    const combo = getComboMultiplier();
    return Math.floor(basePts * TA_SCORE_MULTIPLIER * combo);
  };

  // ====== Cell press handler ======
  const handleCellPress = async (r: number, c: number) => {
    if (animatingRef.current || waitingStart || paused) return;
    const gs = gsRef.current;
    if (!gs || !gs.running || timeRef.current <= 0) return;
    const cell = gs.grid[r][c];
    const s = settingsRef.current;

    // Eraser mode
    if (eraserModeRef.current) {
      if (cell.type < 0) return;
      setEraserMode(false);
      s.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      playEraser();
      setGameState(prev => {
        if (!prev) return prev;
        const g = prev.grid;
        if (g[r][c].type < 0) return prev;
        const erased = taEraseCells(g, [[r, c]]);
        const filled = taApplyGravityAndRefill(erased, prev.level);
        const penalty = TA_ITEM_PENALTY.eraser;
        const ns = { ...prev, grid: filled, eraserCount: prev.eraserCount - 1, score: Math.max(0, prev.score - penalty) };
        gsRef.current = ns;
        checkAfterErase(ns);
        return ns;
      });
      showPopup(`DEL -${TA_ITEM_PENALTY.eraser}pts`, 200);
      return;
    }

    // Henkou mode
    if (henkouModeRef.current) {
      if (cell.type < 0 || cell.bomb) return;
      setHenkouMode(false);
      s.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      playHenkou();
      const targetType = cell.type;
      const convKeys = new Set<number>();
      for (let rr = 0; rr < TA_ROWS; rr++)
        for (let cc = 0; cc < TA_COLS; cc++)
          if (gs.grid[rr][cc].type === targetType && !gs.grid[rr][cc].bomb)
            convKeys.add(rr * TA_COLS + cc);
      setConvertedCells(convKeys);
      setTimeout(() => setConvertedCells(new Set()), 600);
      setGameState(prev => {
        if (!prev) return prev;
        const converted = taConvertType(prev.grid, targetType);
        const penalty = TA_ITEM_PENALTY.henkou;
        const ns = { ...prev, grid: converted, henkouCount: prev.henkouCount - 1, score: Math.max(0, prev.score - penalty) };
        gsRef.current = ns;
        checkAfterErase(ns);
        return ns;
      });
      showPopup(`CHG -${TA_ITEM_PENALTY.henkou}pts`, 200);
      return;
    }

    // ALL mode
    if (allModeRef.current) {
      if (cell.type < 0 || cell.bomb) return;
      setAllMode(false);
      animatingRef.current = true;
      tickCombo();
      s.hapticsOn && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      playEraser();
      const targetType = cell.type;
      const allKeys = new Set<number>();
      for (let rr = 0; rr < TA_ROWS; rr++)
        for (let cc = 0; cc < TA_COLS; cc++)
          if (gs.grid[rr][cc].type === targetType && !gs.grid[rr][cc].bomb)
            allKeys.add(rr * TA_COLS + cc);
      setHighlightCells(allKeys);
      await delay(300);
      setHighlightCells(new Set());

      setGameState(prev => {
        if (!prev) return prev;
        const { newGrid, erasedCount } = taEraseAllOfType(prev.grid, targetType);
        if (erasedCount === 0) return prev;
        const filled = taApplyGravityAndRefill(newGrid, prev.level);
        const result = calcScore(erasedCount, targetType, prev.level);
        const allBonus = erasedCount * 5;
        const totalPts = taScore(result.pts + allBonus);
        const penalty = TA_ITEM_PENALTY.all;
        let ns: GameState = {
          ...prev, grid: filled,
          score: Math.max(0, prev.score + totalPts - penalty),
          erasedGroups: prev.erasedGroups + 1,
          allCount: prev.allCount - 1,
        };
        const leveled = ns.erasedGroups >= groupsNeeded(ns.level);
        ns = applyLevelUp(ns, false);
        const combo = getComboMultiplier();
        let popMsg = `💥ALL +${totalPts} -${penalty}pts`;
        if (combo > 1) popMsg += ` 🔥×${combo}`;
        if (result.bonus === 'bonus') popMsg += ' ✨';
        if (leveled) popMsg += ` 🎉 LV${ns.level}!${bombMaxUnlockLabel(prev.level, ns.level)}`;
        deferPopup(popMsg, leveled ? 250 : 150);
        gsRef.current = ns;
        checkAfterErase(ns);
        return ns;
      });
      flushDeferredPopup();
      flushDeferredLevelUp();
      animatingRef.current = false;
      return;
    }

    // Bomb click
    if (cell.bomb) {
      animatingRef.current = true;
      tickCombo();
      s.hapticsOn && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      playBomb();

      if (s.bombWaveEffect) {
        const result = taExplodeBomb(gs.grid, r, c);
        const distMap = new Map<number, number>();
        for (const key of result.destroyed) {
          const cr = Math.floor(key / TA_COLS);
          const cc = key % TA_COLS;
          const dist = Math.abs(cr - r) + Math.abs(cc - c);
          distMap.set(key, dist);
        }
        const maxDist = Math.max(...distMap.values(), 1);
        setExplodingCells(distMap);
        setExplodePhase(1);
        s.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const cascadeTime = maxDist * 12 + 25;
        await delay(cascadeTime);
        setExplodingCells(new Map());
        setExplodePhase(0);
      }

      let bombScore = 0;
      setGameState(prev => {
        if (!prev) return prev;
        const g = prev.grid;
        if (!g[r][c].bomb) return prev;
        const result = taExplodeBomb(g, r, c);
        const erased = taEraseBombCells(g, result.destroyed);
        bombScore = taScore(result.destroyed.size * 2);
        const ns: GameState = { ...prev, grid: erased };
        gsRef.current = ns;
        return ns;
      });
      await delay(150);
      setGameState(prev => {
        if (!prev) return prev;
        const filled = taApplyGravityAndRefill(prev.grid, prev.level);
        let ns: GameState = {
          ...prev, grid: filled,
          score: prev.score + bombScore, erasedGroups: prev.erasedGroups + 1,
        };
        const leveled = ns.erasedGroups >= groupsNeeded(ns.level);
        ns = applyLevelUp(ns, false);
        const combo = getComboMultiplier();
        let popMsg = `🌋 +${bombScore}pts`;
        if (combo > 1) popMsg += ` 🔥×${combo}`;
        if (leveled) popMsg += ` 🎉 LV${ns.level}!${bombMaxUnlockLabel(prev.level, ns.level)}`;
        deferPopup(popMsg, leveled ? 250 : 150);
        gsRef.current = ns;
        checkAfterErase(ns);
        return ns;
      });
      const dropDelay = s.dropAnimation ? 200 : 0;
      if (dropDelay > 0) await delay(dropDelay);
      flushDeferredPopup();
      flushDeferredLevelUp();
      animatingRef.current = false;
      return;
    }

    // Normal cell click
    if (cell.type < 0) return;
    const preGroup = taGetGroup(gs.grid, r, c);
    if (preGroup.length < minGroupSize(cell.type)) return;

    animatingRef.current = true;
    tickCombo();
    setGameState(prev => {
      if (!prev) return prev;
      const g = prev.grid;
      if (g[r][c].type < 0) return prev;
      const group = g === gs.grid ? preGroup : taGetGroup(g, r, c);
      const cellType = g[r][c].type;
      if (group.length < minGroupSize(cellType)) return prev;
      const erased = taEraseCells(g, group);
      const filled = taApplyGravityAndRefill(erased, prev.level);
      const result = calcScore(group.length, cellType, prev.level);
      const pts = taScore(result.pts);
      const bonus = result.bonus;
      const combo = getComboMultiplier();
      let ns: GameState = {
        ...prev, grid: filled,
        score: (typeof prev.score === 'number' ? prev.score : 0) + pts,
        erasedGroups: prev.erasedGroups + 1,
      };
      const leveled = ns.erasedGroups >= groupsNeeded(ns.level);
      let popMsg = `+${pts}pts`;
      if (combo > 1) popMsg += ` 🔥×${combo}`;
      if (bonus === 'bonus') popMsg += ' ✨';
      ns = applyLevelUp(ns, false);
      if (leveled) popMsg += ` 🎉 LV${ns.level}!${bombMaxUnlockLabel(prev.level, ns.level)}`;
      deferPopup(popMsg, leveled ? 250 : 150);
      gsRef.current = ns;
      checkAfterErase(ns);
      return ns;
    });
    const dropDelay = s.dropAnimation ? 200 : 0;
    if (dropDelay > 0) {
      setTimeout(() => {
        animatingRef.current = false;
        flushDeferredPopup();
        flushDeferredLevelUp();
      }, dropDelay);
    } else {
      animatingRef.current = false;
      flushDeferredPopup();
      flushDeferredLevelUp();
    }
    playErase();
    s.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  cellPressRef.current = handleCellPress;

  // Apply level up
  const applyLevelUp = (state: GameState, showMsg = true): GameState => {
    const result = checkLevelUp(state);
    if (!result.leveled) return state;
    deferredLevelUpRef.current.dotsFlash = true;
    let ns = { ...state, level: result.newLevel, erasedGroups: 0 };
    if (result.earnedEraser) ns.eraserCount = (state.eraserCount || 0) + 1;
    if (result.earnedShuffle) ns.shuffleCount = (state.shuffleCount || 0) + 1;
    if (result.earnedHenkou) ns.henkouCount = (state.henkouCount || 0) + 1;
    if (result.earnedAll) ns.allCount = (state.allCount || 0) + 1;
    if (showMsg) {
      let msg = `🎉 LV${result.newLevel}!`;
      const items: string[] = [];
      if (result.earnedEraser) items.push('DEL×1');
      if (result.earnedShuffle) items.push('MIX×1');
      if (result.earnedHenkou) items.push('CHG×1');
      if (result.earnedAll) items.push('ALL×1');
      const oldBombMax = bombBoardMax(state.level);
      const newBombMax = bombBoardMax(result.newLevel);
      if (newBombMax > oldBombMax) items.push(tf('volcano_max', newBombMax - oldBombMax));
      if (items.length > 0) msg += ` ${items.join(' ')}`;
      deferPopup(msg, 250);
    }
    const unannounced = result.newTypes.filter(t => !ns.announcedTypes.includes(t));
    if (unannounced.length > 0) {
      ns = { ...ns, announcedTypes: [...ns.announcedTypes, ...unannounced] };
      deferredLevelUpRef.current.newDino = unannounced[0];
      deferredLevelUpRef.current.pageIndex = Math.floor(unannounced[0] / 5);
    }
    return ns;
  };

  const flushDeferredLevelUp = () => {
    const d = deferredLevelUpRef.current;
    if (d.dotsFlash) {
      setDotsFlash(true);
      if (dotsFlashTimer.current) clearTimeout(dotsFlashTimer.current);
      dotsFlashTimer.current = setTimeout(() => setDotsFlash(false), 500);
      d.dotsFlash = false;
    }
    if (d.newDino !== null) {
      d.newDino = null;
      // TAではキャラ解放アニメをスキップ（スピード勝負の邪魔になるため）
    }
  };

  const checkAfterErase = (state: GameState) => {
    const grid = state.grid;
    const eraserCnt = state.eraserCount;
    const shuffleCnt = state.shuffleCount;
    const henkouCnt = state.henkouCount;
    const allCnt = state.allCount || 0;
    if (checkEraseTimer.current) clearTimeout(checkEraseTimer.current);
    checkEraseTimer.current = setTimeout(() => {
      if (!taHasValidMoves(grid)) {
        if (eraserCnt > 0) {
          setFlashButton('eraser');
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setFlashButton(null), 3000);
        } else if (shuffleCnt > 0) {
          setFlashButton('shuffle');
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setFlashButton(null), 3000);
        } else if (henkouCnt > 0) {
          setFlashButton('henkou');
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setFlashButton(null), 3000);
        } else if (allCnt > 0) {
          setFlashButton('all');
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setFlashButton(null), 3000);
        } else {
          handleGameOver(state);
        }
      }
    }, 0);
  };

  const handleGameOver = async (state: GameState) => {
    if (timerIdRef.current) { clearInterval(timerIdRef.current); timerIdRef.current = null; }
    settings.hapticsOn && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    playGameOver();
    await stopBGM();
    updateState({ running: false });
    incrementTAGameCount();
    await saveToTARanking(state.score, state.level);
    const r = await loadTARankings();
    setTaRankings(r);
    showPopup(timeRef.current <= 0 ? t('time_up') : t('game_over'), 3000);

    if (settings.playerName) {
      await submitTAGlobalScore(settings.playerName, state.score, state.level);
      setGameOverVisible(true);
    } else {
      pendingScoreRef.current = { score: state.score, level: state.level };
      setGameOverNameInput('');
      setNamePromptVisible(true);
    }
  };

  const submitNameAndScore = async (name: string) => {
    setNamePromptVisible(false);
    if (name && pendingScoreRef.current) {
      const newSettings = { ...settings, playerName: name };
      setSettings(newSettings);
      settingsRef.current = newSettings;
      await saveSettings(newSettings);
      await submitTAGlobalScore(name, pendingScoreRef.current.score, pendingScoreRef.current.level);
    }
    pendingScoreRef.current = null;
    setGameOverVisible(true);
  };

  const handleRestart = () => {
    pendingRestartRef.current = true;
    pendingShowAdRef.current = shouldShowOnTARestart();
    setGameOverVisible(false);
  };

  const handleRetire = () => {
    setMenuVisible(false);
    Alert.alert(t('retire'), t('retire_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('retire'), style: 'destructive', onPress: () => handleGameOver(gameState) },
    ]);
  };

  const handleShuffle = () => {
    if (waitingStart || paused || shuffleCount <= 0 || animatingRef.current) return;
    settings.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    playShuffle();
    setGameState(prev => {
      if (!prev) return prev;
      const shuffled = taShuffleGrid(prev.grid);
      const penalty = TA_ITEM_PENALTY.shuffle;
      const ns = { ...prev, grid: shuffled, shuffleCount: prev.shuffleCount - 1, score: Math.max(0, prev.score - penalty) };
      gsRef.current = ns;
      checkAfterErase(ns);
      return ns;
    });
    showPopup(tf('shuffle_penalty', TA_ITEM_PENALTY.shuffle));
  };

  const handleEraser = () => {
    if (waitingStart || paused || eraserCount <= 0 || animatingRef.current) return;
    setHenkouMode(false);
    setAllMode(false);
    setEraserMode(!eraserMode);
    settings.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleHenkou = () => {
    if (waitingStart || paused || henkouCount <= 0 || animatingRef.current) return;
    setEraserMode(false);
    setAllMode(false);
    setHenkouMode(!henkouMode);
    settings.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAll = () => {
    if (waitingStart || paused || allCount <= 0 || animatingRef.current) return;
    setEraserMode(false);
    setHenkouMode(false);
    setAllMode(!allMode);
    settings.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleHint = () => {
    if (waitingStart || paused) return;
    for (let r = 0; r < TA_ROWS; r++) {
      for (let c = 0; c < TA_COLS; c++) {
        if (grid[r][c].bomb) {
          setHighlightCells(new Set([r * TA_COLS + c]));
          settings.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (hintTimer.current) clearTimeout(hintTimer.current);
          hintTimer.current = setTimeout(() => setHighlightCells(new Set()), 5000);
          showPopup(t('hint_volcano'), 2000);
          return;
        }
        if (grid[r][c].type < 0) continue;
        const group = taGetGroup(grid, r, c);
        if (group.length >= minGroupSize(grid[r][c].type)) {
          setHighlightCells(new Set(group.map(([gr, gc]) => gr * TA_COLS + gc)));
          settings.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (hintTimer.current) clearTimeout(hintTimer.current);
          hintTimer.current = setTimeout(() => setHighlightCells(new Set()), 5000);
          showPopup(tf('hint_erase', dinoName(grid[r][c].type), group.length), 2000);
          return;
        }
      }
    }
    if (eraserCount > 0 || shuffleCount > 0 || henkouCount > 0 || allCount > 0) {
      showPopup(t('hint_use_item'), 2000);
    }
  };

  const handleExchange = () => {
    if (eraserCount < 10) return;
    setExchangeVisible(true);
  };

  const confirmExchangeCHG = () => {
    setExchangeVisible(false);
    setGameState(prev => {
      if (!prev || prev.eraserCount < 10) return prev;
      const ns = { ...prev, eraserCount: prev.eraserCount - 10, henkouCount: prev.henkouCount + 1 };
      gsRef.current = ns;
      return ns;
    });
    settings.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showPopup(t('exchange_chg_done'), 200);
  };

  const confirmExchangeALL = () => {
    setExchangeVisible(false);
    setGameState(prev => {
      if (!prev || prev.eraserCount < 15) return prev;
      const ns = { ...prev, eraserCount: prev.eraserCount - 15, allCount: (prev.allCount || 0) + 1 };
      gsRef.current = ns;
      return ns;
    });
    settings.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showPopup(t('exchange_all_done'), 200);
  };

  const handleExit = () => {
    Alert.alert(t('exit'), t('exit_ta'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('exit_ta_confirm'), onPress: async () => {
        if (timerIdRef.current) { clearInterval(timerIdRef.current); timerIdRef.current = null; }
        await stopBGM();
        router.back();
      }},
    ]);
  };

  // Timer color
  const timerColor = timeRemaining <= 10 ? '#dc2626' : timeRemaining <= 30 ? '#f59e0b' : '#059669';

  // ====== Render ======
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ImageBackground source={getBgByLevel(level)} style={styles.screen} contentFit="cover">
      <View style={{ paddingTop: STATUS_BAR_HEIGHT, flex: 1 }}>
        {/* Header */}
        <View style={[styles.headerCard, { marginHorizontal: horizontalPadding }]}>
          {/* Row 1: Navigation + Timer */}
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navIconBtn} onPress={() => setMenuVisible(true)}>
              <Text style={styles.navIconText}>≡</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navIconBtn} onPress={async () => {
              const r = await loadTARankings();
              setTaRankings(r);
              setRankTab('local');
              setRankingVisible(true);
            }}>
              <Text style={styles.navIconText}>👑</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navIconBtn, !waitingStart && running ? styles.pauseBtnActive : styles.pauseBtnDisabled]} onPress={() => { if (!waitingStart && running) handlePause(); }}>
              <Text style={styles.navIconText}>⏸</Text>
            </TouchableOpacity>
            <View style={styles.timerChip}>
              <Text style={styles.timerLabel}>TIME</Text>
              <Text style={[styles.timerValue, { color: timerColor }]}>{timeRemaining}</Text>
            </View>
            <View style={styles.lvChip}>
              <Text style={styles.statusLvLabel}>LV</Text>
              <Text style={[styles.lvChipValue, level >= 100 ? { fontSize: 16 } : null]}>{level}</Text>
            </View>
            <View style={styles.scoreArea}>
              <Text style={styles.scoreLabel}>SCORE</Text>
              <Text style={styles.scoreValue}>{formatScore(score)}</Text>
            </View>
          </View>

          {/* Row 2: Items */}
          <View style={styles.itemsRow}>
            {[
              { key: 'eraser', label: 'DEL', count: eraserCount, mode: eraserMode, handler: handleEraser },
              { key: 'shuffle', label: 'MIX', count: shuffleCount, mode: false, handler: handleShuffle },
              { key: 'henkou', label: 'CHG', count: henkouCount, mode: henkouMode, handler: handleHenkou },
              { key: 'all', label: 'ALL', count: allCount, mode: allMode, handler: handleAll },
            ].map(item => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.itemBtn,
                  item.count > 0 ? styles.itemBtnActive : styles.itemBtnDisabled,
                  item.mode && styles.itemBtnSelected,
                  flashButton === item.key && styles.itemBtnFlash,
                ]}
                onPress={item.handler}
              >
                <Text style={[styles.itemBtnText, item.count > 0 ? styles.itemBtnTextActive : styles.itemBtnTextDisabled]}>
                  {item.label}
                </Text>
                {item.count > 0 && <Text style={styles.itemCount}>{item.count}</Text>}
              </TouchableOpacity>
            ))}
            <Animated.View style={[styles.exchangeBtnWrap, { transform: [{ scale: exchangeAnim }] }]}>
              <TouchableOpacity
                style={[styles.exchangeBtn, eraserCount >= 10 ? styles.exchangeBtnReady : styles.exchangeBtnLocked]}
                onPress={handleExchange}
                disabled={eraserCount < 10}
              >
                <Text style={[styles.exchangeBtnText, eraserCount >= 10 ? styles.exchangeBtnTextReady : styles.exchangeBtnTextLocked]}>
                  {eraserCount >= 10 ? '✨' : '🔒'} {Math.min(eraserCount, 10)}/10
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* TA Mode badge + combo */}
          <View style={styles.taBadgeRow}>
            <View style={styles.taBadge}>
              <Text style={styles.taBadgeText}>{tf('ta_score_multiplier', TA_SCORE_MULTIPLIER)}</Text>
            </View>
            {comboDisplay > 0 && (
              <View style={styles.comboBadge}>
                <Text style={styles.comboBadgeText}>{tf('ta_combo', TA_COMBO_MULTIPLIERS[comboDisplay])}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info bar */}
        <PopupBar
          setterRef={popupSetterRef}
          eraserMode={eraserMode}
          henkouMode={henkouMode}
          allMode={allMode}
          onCancelMode={() => { setEraserMode(false); setHenkouMode(false); setAllMode(false); }}
        />

        {/* Board */}
        <View style={styles.centerArea}>
          <View style={[styles.boardWrap, { width: gridMaxWidth }]}>
            {(waitingStart || paused) ? (
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.boardOverlay, { width: gridMaxWidth, height: cellSize * TA_ROWS + boardPadding * 2 + boardBorder * 2 }]}
                onPress={waitingStart ? handleStart : handleResume}
              >
                <Text style={styles.boardOverlayEmoji}>{waitingStart ? '⏱' : '⏸'}</Text>
                <Text style={styles.boardOverlayTitle}>{waitingStart ? t('ta_start_title') : t('ta_pause_title')}</Text>
                <Text style={styles.boardOverlayDesc}>
                  {waitingStart ? tf('ta_start_desc', TA_DURATION, TA_SCORE_MULTIPLIER) : t('ta_pause_desc')}
                </Text>
                <View style={styles.boardOverlayBtn}>
                  <Text style={styles.boardOverlayBtnText}>{waitingStart ? t('ta_start_btn') : t('ta_resume')}</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.board, { padding: boardPadding, borderWidth: boardBorder }]}>
                <TAGameBoard
                  grid={grid}
                  cellSize={cellSize}
                  cellGap={cellGap}
                  numFontSize={numFontSize}
                  dropAnimation={settings.dropAnimation}
                  convertedCells={convertedCellsRef.current}
                  highlightCells={highlightCellsRef.current}
                  explodingCells={explodingCellsRef.current}
                  explodePhase={explodePhaseRef.current}
                  isSelectMode={eraserMode || henkouMode || allMode}
                  onCellPress={stableCellPress}
                />
              </View>
            )}
          </View>
        </View>

        {/* Footer: dino panel */}
        <View style={[styles.footerPanel, { marginHorizontal: horizontalPadding }]}>
          <View style={styles.footerLabelRow}>
            <Text style={styles.footerLabel}>{t('char_footer')}</Text>
          </View>
          <FlatList
            ref={footerListRef}
            data={DINO_SOURCES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            style={{ width: gridMaxWidth }}
            contentContainerStyle={styles.footerScroll}
            snapToInterval={gridMaxWidth}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={2}
            removeClippedSubviews
            decelerationRate="fast"
            renderItem={({ item: src, index: i }) => {
              const unlocked = level >= DINO_UNLOCK_LV[i];
              const isPulsing = newDinoHighlight === i;
              const showImage = isPulsing ? dinoFlipRevealed : unlocked;
              const iconContent = (
                <View style={[styles.footerIconCard, !showImage && styles.footerIconLocked, isPulsing && styles.footerIconPulse]}>
                  {showImage ? (
                    <Image source={src} style={styles.footerIcon} contentFit="contain" />
                  ) : (
                    <Text style={styles.lockedText}>LV{DINO_UNLOCK_LV[i]}</Text>
                  )}
                </View>
              );
              return (
                <TouchableOpacity
                  style={[styles.footerIconWrap, { width: gridMaxWidth / 5 }]}
                  activeOpacity={0.7}
                  onPress={() => unlocked && setDinoInfoPopup(i)}
                >
                  {isPulsing ? (
                    <Animated.View style={{
                      transform: [{
                        rotateY: footerPulseAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: ['0deg', '90deg', '0deg'],
                        }),
                      }],
                    }}>
                      {iconContent}
                    </Animated.View>
                  ) : iconContent}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>

      {/* Menu */}
      {menuVisible && <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuPanel}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setSettingsVisible(true); }}>
              <Text style={styles.menuItemText}>{t('menu_settings')}</Text>
            </TouchableOpacity>
            {!waitingStart && (<>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={handleRetire}>
                <Text style={[styles.menuItemText, styles.menuItemDanger]}>{t('menu_retire')}</Text>
              </TouchableOpacity>
            </>)}
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={async () => {
              setMenuVisible(false);
              if (waitingStart) {
                await stopBGM();
                router.back();
              } else {
                handleExit();
              }
            }}>
              <Text style={styles.menuItemText}>{t('menu_home')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>}

      {/* Game Over — visible prop のみで制御（iOS onDismiss を確実に発火させる） */}
      <Modal
        visible={gameOverVisible}
        transparent
        animationType="fade"
        onDismiss={Platform.OS === 'ios' ? finishPendingRestart : undefined}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.taGameOverLabel}>{t('ta_label')}</Text>
            <Text style={styles.modalTitle}>{timeRemaining <= 0 ? t('time_up') : t('game_over')}</Text>
            <Text style={styles.modalScore}>{tf('score_display', formatScore(score))}</Text>
            <Text style={styles.modalLevel}>{tf('level_display_ta', level)}</Text>

            {/* TA Ranking inline */}
            {taRankings.length > 0 && (
              <View style={styles.taRankInline}>
                <Text style={styles.taRankInlineTitle}>{t('ta_best')}</Text>
                {taRankings.slice(0, 5).map((entry, i) => (
                  <View key={i} style={styles.taRankRow}>
                    <Text style={styles.taRankPos}>{rankLabel(i)}</Text>
                    <Text style={styles.taRankScore}>{formatScore(entry.score)}</Text>
                    <Text style={styles.taRankLv}>LV{entry.level}</Text>
                    <Text style={styles.taRankDate}>{entry.date}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.modalBtn} onPress={handleRestart}>
              <Text style={styles.modalBtnText}>{t('play_again')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={async () => {
              setGameOverVisible(false);
              if (timerIdRef.current) { clearInterval(timerIdRef.current); timerIdRef.current = null; }
              await stopBGM();
              router.back();
            }}>
              <Text style={styles.modalBtnTextSecondary}>{t('back_to_title')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Exchange */}
      {exchangeVisible && <Modal visible={exchangeVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('exchange_title')}</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>DEL ×{eraserCount}</Text>
            <TouchableOpacity
              style={[styles.modalBtn, { opacity: eraserCount >= 10 ? 1 : 0.4 }]}
              onPress={confirmExchangeCHG}
              disabled={eraserCount < 10}
            >
              <Text style={styles.modalBtnText}>{t('exchange_del_chg')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: '#dc2626', opacity: eraserCount >= 15 ? 1 : 0.4 }]}
              onPress={confirmExchangeALL}
              disabled={eraserCount < 15}
            >
              <Text style={styles.modalBtnText}>{t('exchange_del_all')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: '#e5e7eb' }]}
              onPress={() => setExchangeVisible(false)}
            >
              <Text style={[styles.modalBtnText, { color: '#374151' }]}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>}

      {/* Dino Info */}
      {dinoInfoPopup !== null && <Modal visible={dinoInfoPopup !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Image source={DINO_SOURCES[dinoInfoPopup]} style={{ width: 140, height: 140 }} contentFit="contain" />
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#111827' }}>{dinoName(dinoInfoPopup)} {DINO_EMOJI[dinoInfoPopup]}</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '700' }}>
              {tf('char_desc', dinoInfoPopup + 1)}
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setDinoInfoPopup(null)}>
              <Text style={styles.modalBtnText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>}

      {/* Name Prompt */}
      {namePromptVisible && <Modal visible={namePromptVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={{ fontSize: 32 }}>⏱</Text>
            <Text style={styles.modalTitle}>{t('name_prompt_title')}</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
              {t('name_prompt_subtitle')}
            </Text>
            <TextInput
              style={{
                width: '100%', marginTop: 8,
                borderWidth: 2, borderColor: '#d1d5db', borderRadius: 10,
                paddingHorizontal: 14, fontSize: 18, fontWeight: '700',
                color: '#111827', backgroundColor: '#f9fafb',
                minHeight: 50, textAlignVertical: 'center',
              }}
              value={gameOverNameInput}
              onChangeText={setGameOverNameInput}
              placeholder={t('name_placeholder')}
              placeholderTextColor="#9ca3af"
              maxLength={12}
              autoFocus
            />
            <Text style={{ fontSize: 11, color: '#9ca3af' }}>{t('name_shared_hint')}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' }}>
              <TouchableOpacity
                style={[styles.modalBtn, { flex: 1, backgroundColor: '#e5e7eb' }]}
                onPress={() => submitNameAndScore('')}
              >
                <Text style={[styles.modalBtnText, { color: '#374151' }]}>{t('skip')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { flex: 1 }]}
                onPress={() => submitNameAndScore(gameOverNameInput.trim())}
              >
                <Text style={styles.modalBtnText}>{t('decide')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>}

      {/* Ranking */}
      {rankingVisible && <Modal visible={rankingVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.rkDialog}>
            <View style={styles.rkHeader}>
              <Text style={styles.rkHeaderText}>{t('ranking_ta_title')}</Text>
              <TouchableOpacity style={styles.rkCloseX} onPress={() => { setRankingVisible(false); setGlobalRankings([]); }}>
                <Text style={styles.rkCloseXText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.rkTabs}>
              <TouchableOpacity
                style={[styles.rkTabBtn, rankTab === 'local' && styles.rkTabActive]}
                onPress={() => setRankTab('local')}
              >
                <Text style={[styles.rkTabText, rankTab === 'local' && styles.rkTabTextActive]}>{t('ranking_local')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rkTabBtn, rankTab === 'global' && styles.rkTabActive]}
                onPress={async () => {
                  setRankTab('global');
                  setLoadingGlobal(true);
                  const data = await fetchTAGlobalRankings(rankPeriod);
                  setGlobalRankings(data);
                  setLoadingGlobal(false);
                }}
              >
                <Text style={[styles.rkTabText, rankTab === 'global' && styles.rkTabTextActive]}>{t('ranking_global')}</Text>
              </TouchableOpacity>
            </View>

            {/* Period sub-tabs (global) */}
            {rankTab === 'global' && (
              <View style={styles.rkPeriodTabs}>
                {(['daily', 'weekly', 'monthly'] as RankPeriod[]).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.rkPeriodTab, rankPeriod === p && styles.rkPeriodTabActive]}
                    onPress={async () => {
                      setRankPeriod(p);
                      setLoadingGlobal(true);
                      const data = await fetchTAGlobalRankings(p);
                      setGlobalRankings(data);
                      setLoadingGlobal(false);
                    }}
                  >
                    <Text style={[styles.rkPeriodText, rankPeriod === p && styles.rkPeriodTextActive]}>
                      {p === 'daily' ? t('ranking_daily') : p === 'weekly' ? t('ranking_weekly') : t('ranking_monthly')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Table */}
            <ScrollView style={styles.rkBody}>
              <View style={styles.rkTh}>
                <Text style={[styles.rkThCell, { width: 36 }]}>{t('ranking_pos')}</Text>
                <Text style={[styles.rkThCell, { width: 80 }]}>{t('ranking_score')}</Text>
                {rankTab === 'global' && <Text style={[styles.rkThCell, { flex: 1, paddingLeft: 8 }]} numberOfLines={1}>{t('ranking_player')}</Text>}
                <Text style={[styles.rkThCell, { width: 58 }]}>LV</Text>
                <Text style={[styles.rkThCell, { width: 52, textAlign: 'center' }]}>{t('ranking_date')}</Text>
              </View>

              {rankTab === 'local' ? (
                taRankings.length === 0 ? (
                  <Text style={styles.rkEmpty}>{t('ranking_empty')}</Text>
                ) : (
                  taRankings.map((entry, i) => (
                    <View key={i} style={[styles.rkTd, i % 2 === 1 && styles.rkTdEven]}>
                      <Text style={[styles.rkTdCell, { width: 36 }]}>{rankLabel(i)}</Text>
                      <Text style={[styles.rkTdCell, { width: 80, textAlign: 'right', paddingRight: 8, fontWeight: '800' }]}>{formatScore(entry.score)}</Text>
                      <Text style={[styles.rkTdCell, { width: 58 }]}>LV{entry.level}</Text>
                      <Text style={[styles.rkTdCell, { width: 52, textAlign: 'center', fontSize: 12 }]}>{entry.date}</Text>
                    </View>
                  ))
                )
              ) : loadingGlobal ? (
                <Text style={styles.rkEmpty}>{t('loading')}</Text>
              ) : globalRankings.length === 0 ? (
                <Text style={styles.rkEmpty}>{t('ranking_empty')}</Text>
              ) : (
                globalRankings.map((entry, i) => (
                  <View key={i} style={[styles.rkTd, i % 2 === 1 && styles.rkTdEven]}>
                    <Text style={[styles.rkTdCell, { width: 36 }]}>{rankLabel(i)}</Text>
                    <Text style={[styles.rkTdCell, { width: 80, textAlign: 'right', paddingRight: 8, fontWeight: '800' }]}>{formatScore(entry.score)}</Text>
                    <Text style={[styles.rkTdCell, { flex: 1, textAlign: 'left', paddingLeft: 8 }]} numberOfLines={1}>{entry.name || '???'}</Text>
                    <Text style={[styles.rkTdCell, { width: 58 }]}>LV{entry.level}</Text>
                    <Text style={[styles.rkTdCell, { width: 52, textAlign: 'center', fontSize: 12 }]}>{entry.date}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.rkFooter}>
              {rankTab === 'global' && !settings.playerName && (
                <Text style={styles.rkWarning}>{t('ranking_name_required')}</Text>
              )}
              <TouchableOpacity style={styles.rkCloseBtn} onPress={() => { setRankingVisible(false); setGlobalRankings([]); }}>
                <Text style={styles.rkCloseBtnText}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>}

      {/* Settings */}
      {settingsVisible && <Modal visible={settingsVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
            <View style={styles.stCard}>
              <View style={styles.stHeader}>
                <Text style={styles.stHeaderText}>{t('settings_title')}</Text>
              </View>

              <View style={styles.stSection}>
                <Text style={styles.stLabel}>{t('settings_player_name')}</Text>
                <View style={styles.stNameRow}>
                  <TextInput
                    style={styles.stNameInput}
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder={t('settings_name_placeholder')}
                    maxLength={12}
                  />
                  <TouchableOpacity
                    style={styles.stSaveBtn}
                    onPress={() => {
                      updateSettings({ playerName: nameInput });
                      settings.hapticsOn && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                  >
                    <Text style={styles.stSaveBtnText}>{t('save')}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.stHint}>{tf('settings_name_current', settings.playerName || t('settings_name_none'))}</Text>
              </View>
              <View style={styles.stDivider} />

              <View style={styles.stSection}>
                <Text style={styles.stLabel}>{t('settings_sound')}</Text>
                <View style={styles.stBtnRow}>
                  {VOLUME_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.stBtn, settings.soundVolume === opt.value && styles.stBtnActive]}
                      onPress={() => updateSettings({ soundVolume: opt.value })}
                    >
                      <Text style={[styles.stBtnText, settings.soundVolume === opt.value && styles.stBtnTextActive]}>
                        {t(opt.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.stDivider} />

              <View style={styles.stSection}>
                <Text style={styles.stLabel}>{t('settings_numsize')}</Text>
                <View style={styles.stBtnRow}>
                  {NUM_SIZE_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.stBtn, settings.numberSize === opt.key && styles.stBtnActive]}
                      onPress={() => updateSettings({ numberSize: opt.key })}
                    >
                      <Text style={[styles.stBtnText, settings.numberSize === opt.key && styles.stBtnTextActive]}>
                        {t(opt.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.stDivider} />

              <View style={styles.stSection}>
                <View style={styles.stRow}>
                  <Text style={styles.stLabel}>{t('settings_bgm')}</Text>
                  <TouchableOpacity
                    style={[styles.stToggle, settings.bgmOn ? styles.stToggleOn : styles.stToggleOff]}
                    onPress={async () => {
                      const next = !settings.bgmOn;
                      updateSettings({ bgmOn: next });
                      if (next) { try { await startBGM(); } catch {} }
                      else { await stopBGM(); }
                    }}
                  >
                    <Text style={[styles.stToggleText, settings.bgmOn && styles.stToggleTextOn]}>
                      {settings.bgmOn ? t('on') : t('off')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {settings.bgmOn && (
                  <View style={styles.stBgmList}>
                    {BGM_NAMES.map((name, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.stBgmItem, bgmIndex === i && styles.stBgmItemActive]}
                        onPress={() => switchBGM(i)}
                      >
                        <Text style={styles.stBgmItemText}>{name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.stDivider} />

              <View style={styles.stSection}>
                <View style={styles.stRow}>
                  <Text style={styles.stLabel}>{t('settings_haptics')}</Text>
                  <TouchableOpacity
                    style={[styles.stToggle, settings.hapticsOn ? styles.stToggleOn : styles.stToggleOff]}
                    onPress={() => updateSettings({ hapticsOn: !settings.hapticsOn })}
                  >
                    <Text style={[styles.stToggleText, settings.hapticsOn && styles.stToggleTextOn]}>
                      {settings.hapticsOn ? t('on') : t('off')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.stDivider} />
              <View style={styles.stSection}>
                <Text style={styles.stLabel}>{t('settings_language')}</Text>
                <View style={styles.stBtnRow}>
                  {(['ja', 'en'] as const).map(lang => (
                    <TouchableOpacity
                      key={lang}
                      style={[styles.stBtn, settings.language === lang && styles.stBtnActive]}
                      onPress={() => {
                        updateSettings({ language: lang });
                        setLanguage(lang);
                      }}
                    >
                      <Text style={[styles.stBtnText, settings.language === lang && styles.stBtnTextActive]}>
                        {lang === 'ja' ? t('lang_ja') : t('lang_en')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.stCloseBtn} onPress={() => setSettingsVisible(false)}>
                <Text style={styles.stCloseBtnText}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>}

      {/* Unlock overlay */}
      {unlockOverlay && (
        <Animated.View style={[styles.unlockOverlay, { opacity: unlockOverlayAnim }]} pointerEvents="none">
          <Animated.View style={[styles.unlockFlashBg, {
            opacity: unlockBoltAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 0.55] }),
          }]} />
          <View style={styles.unlockCenter}>
            <Animated.Text style={[styles.unlockBolt, {
              transform: [{ scale: unlockBoltAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] }) }],
            }]}>⚡</Animated.Text>
            <Animated.View style={{
              transform: [{ scale: unlockOverlayAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
            }}>
              <Image source={DINO_SOURCES[unlockOverlay.type]} style={{ width: 180, height: 180 }} contentFit="contain" />
            </Animated.View>
            <Animated.Text style={[styles.unlockBolt, {
              transform: [{ scale: unlockBoltAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] }) }],
            }]}>⚡</Animated.Text>
            <Text style={styles.unlockName}>{tf('char_unlock_msg', unlockOverlay.name)}</Text>
          </View>
        </Animated.View>
      )}
    </ImageBackground>
    </GestureHandlerRootView>
  );
}

// ---- Helper components ----

function PopupBar({
  setterRef, eraserMode, henkouMode, allMode, onCancelMode,
}: {
  setterRef: React.MutableRefObject<(text: string | null) => void>;
  eraserMode: boolean; henkouMode: boolean; allMode: boolean;
  onCancelMode: () => void;
}) {
  const [text, setText] = React.useState<string | null>(null);
  setterRef.current = setText;
  const isMode = eraserMode || henkouMode || allMode;
  return (
    <View style={[styles.modeIndicator, text ? styles.modePopup : isMode ? undefined : styles.modeHidden]}>
      {text ? (
        <Text style={styles.popupInlineText}>{text}</Text>
      ) : isMode ? (
        <>
          <Text style={styles.modeText}>
            {eraserMode ? t('mode_del') : henkouMode ? t('mode_chg') : t('mode_all')}
          </Text>
          <TouchableOpacity onPress={onCancelMode}>
            <Text style={styles.modeCancelText}>{t('cancel')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={{ fontSize: 12 }}> </Text>
      )}
    </View>
  );
}

function rankLabel(i: number): string {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return `${i + 1}.`;
}

function formatScore(n: number | any): string {
  const num = typeof n === 'number' ? n : Number(n) || 0;
  return num.toLocaleString();
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---- Styles ----

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loadingText: {
    flex: 1, textAlign: 'center', textAlignVertical: 'center',
    fontSize: 18, fontWeight: '800', color: '#fff',
  },
  centerArea: { alignItems: 'center', paddingTop: 1 },

  // Header
  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.78)', borderRadius: 14, padding: 6, gap: 4,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navIconBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 2, borderColor: '#dc2626',
  },
  navIconText: { fontSize: 18, fontWeight: '900' },
  lvChip: {
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)',
  },
  lvChipValue: { color: '#111827', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  statusLvLabel: { color: 'rgba(0,0,0,0.65)', fontSize: 10, fontWeight: '900', lineHeight: 12 },
  scoreArea: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, minWidth: 100 },
  timerChip: {
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2,
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)',
  },
  timerLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: 'rgba(0,0,0,0.55)', lineHeight: 12 },
  timerValue: { fontSize: 30, fontWeight: '900', lineHeight: 34 },
  statusScore: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  scoreLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, color: 'rgba(255,255,255,0.7)', lineHeight: 12 },
  scoreValue: { fontSize: 28, fontWeight: '900', letterSpacing: 1, color: '#ffffff', lineHeight: 32, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  // TA badge + combo
  taBadgeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2,
  },
  taBadge: {
    backgroundColor: '#dc2626', borderRadius: 8,
    paddingVertical: 2, paddingHorizontal: 10,
  },
  taBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  comboBadge: {
    backgroundColor: '#f59e0b', borderRadius: 8,
    paddingVertical: 2, paddingHorizontal: 10,
  },
  comboBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  // Items
  itemsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtn: { borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
  hintBtn: { backgroundColor: '#0891b2' },
  actionBtnText: { color: 'white', fontWeight: '900', fontSize: 13 },
  itemBtn: { flex: 1, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemCount: {
    position: 'absolute', top: -8, right: -8,
    backgroundColor: '#ef4444', color: '#fff', fontSize: 14,
    fontWeight: '900', borderRadius: 11, minWidth: 22, height: 22,
    lineHeight: 22, textAlign: 'center', paddingHorizontal: 4, overflow: 'hidden',
  },
  itemBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)' },
  itemBtnActive: { backgroundColor: '#f59e0b', borderWidth: 2, borderColor: '#d97706' },
  itemBtnSelected: { backgroundColor: '#ef4444', borderColor: '#b91c1c' },
  itemBtnFlash: { backgroundColor: '#fbbf24', borderColor: '#f59e0b' },
  itemBtnText: { fontWeight: '900', fontSize: 13 },
  itemBtnTextDisabled: { color: 'rgba(0,0,0,0.35)' },
  itemBtnTextActive: { color: '#fff' },
  exchangeBtnWrap: { flex: 1 },
  exchangeBtn: {
    flex: 1, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  exchangeBtnReady: { backgroundColor: '#059669', borderWidth: 2, borderColor: '#047857' },
  exchangeBtnLocked: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)' },
  exchangeBtnText: { fontWeight: '900', fontSize: 12 },
  exchangeBtnTextReady: { color: '#fff' },
  exchangeBtnTextLocked: { color: 'rgba(255,255,255,0.5)' },

  // Menu
  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 36) + 50 : 94,
    paddingHorizontal: 12,
  },
  menuPanel: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    width: 200, elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12,
  },
  menuItem: { paddingVertical: 14, paddingHorizontal: 18 },
  menuItemText: { fontSize: 15, fontWeight: '800', color: '#374151' },
  menuItemDanger: { color: '#dc2626' },
  menuDivider: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 12 },

  // Mode indicator
  modeIndicator: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, backgroundColor: 'rgba(239,68,68,0.2)',
    paddingVertical: 5, marginHorizontal: 4, borderRadius: 8, marginTop: 2, height: 30,
  },
  modeHidden: { backgroundColor: 'transparent' },
  modePopup: { backgroundColor: 'transparent' },
  modeText: { fontWeight: '800', color: '#991b1b', fontSize: 12 },
  modeCancelText: { fontWeight: '800', color: '#dc2626', fontSize: 12, textDecorationLine: 'underline' },
  popupInlineText: { color: '#d97706', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },

  // Pause button
  pauseBtnActive: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
  pauseBtnDisabled: { opacity: 0.35 },

  // Board
  boardWrap: { alignItems: 'center' },
  boardOverlay: {
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  boardOverlayEmoji: { fontSize: 48 },
  boardOverlayTitle: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  boardOverlayDesc: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  boardOverlayBtn: {
    backgroundColor: '#dc2626', borderRadius: 26,
    paddingVertical: 14, paddingHorizontal: 48, marginTop: 8,
  },
  boardOverlayBtnText: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  board: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 8,
    borderColor: 'rgba(255,255,255,0.9)', elevation: 6,
  },

  // Footer
  footerPanel: { alignItems: 'center', paddingBottom: 4, paddingTop: 8, width: '100%' },
  footerLabelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 3, minHeight: 26,
  },
  footerLabel: {
    fontWeight: '800', fontSize: 12, color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(0,0,0,0.25)', paddingVertical: 2, paddingHorizontal: 10, borderRadius: 6, overflow: 'hidden',
  },
  footerScroll: { alignItems: 'center' },
  footerIconWrap: { padding: 2 },
  footerIconCard: {
    aspectRatio: 1, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)', alignItems: 'center', justifyContent: 'center',
  },
  footerIconLocked: { backgroundColor: 'rgba(0,0,0,0.15)' },
  footerIconPulse: { borderColor: '#f59e0b', borderWidth: 2, backgroundColor: 'rgba(245,158,11,0.2)' },
  footerIcon: { width: '82%', height: '82%' },
  lockedText: { fontSize: 11, fontWeight: '900', color: 'rgba(0,0,0,0.3)', textAlign: 'center' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalCard: {
    width: '100%', maxWidth: 440, backgroundColor: '#fff',
    borderRadius: 20, padding: 24, alignItems: 'center', gap: 12,
  },
  taGameOverLabel: { fontSize: 13, fontWeight: '900', color: '#dc2626', letterSpacing: 1 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#111827' },
  modalScore: { fontSize: 20, fontWeight: '800', color: '#d97706' },
  modalLevel: { fontSize: 16, fontWeight: '700', color: '#6b7280' },
  modalBtn: {
    backgroundColor: '#f59e0b', paddingVertical: 12, paddingHorizontal: 28,
    borderRadius: 26, marginTop: 8, width: '100%', alignItems: 'center',
  },
  modalBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  modalBtnSecondary: { backgroundColor: '#6b7280' },
  modalBtnTextSecondary: { color: '#fff', fontWeight: '900', fontSize: 14 },

  // TA inline ranking
  taRankInline: {
    width: '100%', backgroundColor: '#fffbeb', borderRadius: 12, padding: 12, gap: 4,
  },
  taRankInlineTitle: { fontSize: 14, fontWeight: '900', color: '#92400e', textAlign: 'center', marginBottom: 4 },
  taRankRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 3,
    borderBottomWidth: 1, borderBottomColor: '#fde68a',
  },
  taRankPos: { width: 32, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  taRankScore: { flex: 1, fontSize: 14, fontWeight: '800', color: '#111827', textAlign: 'right', paddingRight: 8 },
  taRankLv: { width: 50, fontSize: 13, fontWeight: '700', color: '#6b7280', textAlign: 'center' },
  taRankDate: { width: 50, fontSize: 12, fontWeight: '600', color: '#9ca3af', textAlign: 'center' },

  // Ranking dialog
  rkDialog: {
    width: '100%', maxWidth: 440, maxHeight: '90%', minHeight: 300,
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', flexShrink: 1,
  },
  rkHeader: { backgroundColor: '#dc2626', paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  rkHeaderText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  rkCloseX: {
    position: 'absolute', right: 12, top: 12,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  rkCloseXText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  rkTabs: {
    flexDirection: 'row', backgroundColor: '#fffbeb',
    borderBottomWidth: 2, borderBottomColor: '#f3f4f6',
  },
  rkTabBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  rkTabActive: { borderBottomColor: '#dc2626' },
  rkTabText: { fontWeight: '800', fontSize: 13, color: '#aaa' },
  rkTabTextActive: { color: '#dc2626' },
  rkPeriodTabs: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
  },
  rkPeriodTab: {
    flex: 1, paddingVertical: 5, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  rkPeriodTabActive: { borderBottomColor: '#dc2626' },
  rkPeriodText: { fontWeight: '700', fontSize: 12, color: '#9ca3af' },
  rkPeriodTextActive: { color: '#dc2626' },
  rkWarning: { fontSize: 11, color: '#ef4444', fontWeight: '700', textAlign: 'center' },
  rkBody: { paddingHorizontal: 12, maxHeight: 400 },
  rkTh: {
    flexDirection: 'row', backgroundColor: '#fef3c7', paddingVertical: 6, paddingHorizontal: 4,
    borderWidth: 1, borderColor: '#fde68a',
  },
  rkThCell: { fontSize: 14, fontWeight: '800', color: '#92400e', textAlign: 'center', borderRightWidth: 1, borderRightColor: '#f0dca0' },
  rkTd: {
    flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb', alignItems: 'center',
  },
  rkTdEven: { backgroundColor: '#f9fafb' },
  rkTdCell: { fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'center', borderRightWidth: 1, borderRightColor: '#e5e7eb' },
  rkEmpty: { fontSize: 14, color: '#888', textAlign: 'center', paddingVertical: 24 },
  rkFooter: {
    paddingVertical: 12, paddingHorizontal: 16, gap: 6,
    borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#f9fafb', alignItems: 'center',
  },
  rkCloseBtn: { backgroundColor: '#dc2626', paddingVertical: 8, paddingHorizontal: 24, borderRadius: 8 },
  rkCloseBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  // Settings
  stCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, maxWidth: 440, width: '100%', alignSelf: 'center',
  },
  stHeader: { alignItems: 'center', marginBottom: 12 },
  stHeaderText: { fontSize: 20, fontWeight: '900', color: '#374151' },
  stSection: { paddingVertical: 8 },
  stLabel: { fontSize: 15, fontWeight: '800', color: '#374151', marginBottom: 6 },
  stDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 4 },
  stRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stBtnRow: { flexDirection: 'row', gap: 8 },
  stBtn: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  stBtnActive: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  stBtnText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  stBtnTextActive: { color: '#fff' },
  stToggle: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
  stToggleOn: { backgroundColor: '#dc2626' },
  stToggleOff: { backgroundColor: '#e5e7eb' },
  stToggleText: { fontSize: 13, fontWeight: '800', color: '#6b7280' },
  stToggleTextOn: { color: '#fff' },
  stBgmList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  stBgmItem: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#f3f4f6' },
  stBgmItemActive: { backgroundColor: '#fecaca' },
  stBgmItemText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  stNameRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  stNameInput: {
    flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 14,
  },
  stSaveBtn: { backgroundColor: '#dc2626', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  stSaveBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  stHint: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  stCloseBtn: {
    marginTop: 16, backgroundColor: '#374151', paddingVertical: 10,
    borderRadius: 10, alignItems: 'center',
  },
  stCloseBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  // Unlock overlay
  unlockOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', zIndex: 9999,
  },
  unlockFlashBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,240,150,0.85)',
  },
  unlockCenter: {
    flexDirection: 'row', flexWrap: 'wrap',
    alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24,
  },
  unlockBolt: {
    fontSize: 64, color: '#fde047',
    textShadowColor: '#facc15', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18,
  },
  unlockName: {
    width: '100%', textAlign: 'center', marginTop: 12,
    fontSize: 28, fontWeight: '900', color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
    letterSpacing: 2,
  },
});
