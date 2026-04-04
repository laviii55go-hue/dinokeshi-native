import * as Haptics from 'expo-haptics';
import { Image, ImageBackground } from 'expo-image';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useAd } from '../game/AdContext';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { COLS, DINO_EMOJI, DINO_NAMES, DINO_UNLOCK_LV, groupsNeeded, ROWS } from '../game/constants';
import { DINO_SOURCES } from '../game/images';
import { GameBoard } from '../game/GameBoard';
import {
  applyGravityAndRefill,
  calcScore,
  checkLevelUp,
  convertType,
  createInitialState,
  eraseAllOfType,
  eraseBombCells,
  eraseCells,
  explodeBomb,
  getGroup,
  hasValidMoves,
  minGroupSize,
  shuffleGrid
} from '../game/logic';
import { BGM_NAMES, getCurrentBGMIndex, loadSoundEffects, onBgmChange, playBomb, playBonus, playBonusBig, playErase, playEraser, playGameOver, playHenkou, playShuffle, playTick, setSoundVolume, startBGM, stopBGM, switchBGM } from '../game/sound';
import { clearGameState, loadGameState, loadRankings, loadSettings, saveGameState, saveSettings, saveToRanking, type Settings } from '../game/storage';
import type { Cell, GameState } from '../game/types';

import { fetchGlobalRankings, submitGlobalScore, type GlobalRankEntry, type RankPeriod } from '../game/firebase';

const BG_IMAGE = require('../assets/images/bg.png');

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 36) : 44;
// Vertical budget reserved for header, items row, info bar, footer, banner, status bar
const VERTICAL_OVERHEAD = STATUS_BAR_HEIGHT + 240;

const VOLUME_OPTIONS = [
  { label: '消', value: 0 },
  { label: '小', value: 0.1 },
  { label: '中', value: 0.3 },
  { label: '大', value: 0.5 },
];

const NUM_SIZE_OPTIONS: { label: string; key: Settings['numberSize']; size: number }[] = [
  { label: '小', key: 'sm', size: 0.75 },
  { label: '中', key: 'md', size: 0.95 },
  { label: '大', key: 'lg', size: 1.2 },
  { label: '特大', key: 'xl', size: 1.5 },
];

// No React.memo - cells must always re-render when grid changes

export default function GameScreen() {
  const router = useRouter();
  const adState = useAd();

  // Layout calculations (responsive: use both width & height to fit tablets)
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const horizontalPadding = 4;
  const boardBorder = 1;
  const boardPadding = 0;
  const cellGap = 0;
  const maxBoardWidth = screenWidth - horizontalPadding * 2 - boardBorder * 2 - boardPadding * 2;
  const cellFromWidth = Math.floor((maxBoardWidth - (COLS - 1) * cellGap) / COLS);
  const availableHeight = screenHeight - VERTICAL_OVERHEAD;
  const cellFromHeight = Math.floor((availableHeight - (ROWS - 1) * cellGap) / ROWS);
  const cellSize = Math.min(cellFromWidth, cellFromHeight);
  const actualBoardInner = cellSize * COLS + cellGap * (COLS - 1);
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
  // Use refs for board visual state to avoid parent re-renders
  const convertedCellsRef = React.useRef<Set<number>>(new Set());
  const highlightCellsRef = React.useRef<Set<number>>(new Set());
  const explodingCellsRef = React.useRef<Map<number, number>>(new Map());
  const explodePhaseRef = React.useRef(0);
  const [boardTick, setBoardTick] = React.useState(0); // single trigger for board re-render

  const triggerBoardUpdate = () => setBoardTick(t => t + 1);
  const setConvertedCells = (s: Set<number>) => { convertedCellsRef.current = s; triggerBoardUpdate(); };
  const setHighlightCells = (s: Set<number>) => { highlightCellsRef.current = s; triggerBoardUpdate(); };
  const setExplodingCells = (m: Map<number, number>) => { explodingCellsRef.current = m; };
  const setExplodePhase = (p: number) => { explodePhaseRef.current = p; triggerBoardUpdate(); };
  const popupTextRef = React.useRef<string | null>(null);
  const popupSetterRef = React.useRef<(text: string | null) => void>(() => {});
  const [gameOverVisible, setGameOverVisible] = React.useState(false);
  const [settingsVisible, setSettingsVisible] = React.useState(false);
  const [rankingVisible, setRankingVisible] = React.useState(false);
  const [rulesVisible, setRulesVisible] = React.useState(false);
  const [rulesPage, setRulesPage] = React.useState(0);
  const [newDinoHighlight, setNewDinoHighlight] = React.useState<number | null>(null);
  const [dinoFlipRevealed, setDinoFlipRevealed] = React.useState(false);
  const footerPulseAnim = React.useRef(new Animated.Value(1)).current;
  const [dinoInfoPopup, setDinoInfoPopup] = React.useState<number | null>(null);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [exchangeVisible, setExchangeVisible] = React.useState(false);
  const [namePromptVisible, setNamePromptVisible] = React.useState(false);
  const [gameOverNameInput, setGameOverNameInput] = React.useState('');
  const pendingScoreRef = React.useRef<{ score: number; level: number } | null>(null);
  const [dotsFlash, setDotsFlash] = React.useState(false);
  const dotsFlashTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flashButton, setFlashButton] = React.useState<string | null>(null);
  const exchangeAnim = React.useRef(new Animated.Value(1)).current;
  const prevEraserCountRef = React.useRef<number | null>(null);
  const [rankings, setRankings] = React.useState<{ score: number; level: number; date: string }[]>([]);
  const [globalRankings, setGlobalRankings] = React.useState<GlobalRankEntry[]>([]);
  const [rankPeriod, setRankPeriod] = React.useState<RankPeriod>('daily');
  const [rankTab, setRankTab] = React.useState<'local' | 'global'>('local');
  const [loadingGlobal, setLoadingGlobal] = React.useState(false);
  const footerListRef = React.useRef<FlatList>(null);

  // Settings state
  const [settings, setSettings] = React.useState<Settings>({
    soundVolume: 0.3, bgmOn: true, hapticsOn: true, dropAnimation: true,
    bombWaveEffect: true, numberSize: 'lg', playerName: '',
  });
  const [nameInput, setNameInput] = React.useState('');
  const settingsRef = React.useRef(settings);
  const [bgmIndex, setBgmIndex] = React.useState(0);

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
      loadSoundEffects().then(() => setSoundVolume(savedSettings.soundVolume)); // re-apply volume after load

      const saved = await loadGameState();
      if (saved && saved.running) {
        setGameState(saved);
      } else {
        const initial = createInitialState();
        setGameState(initial);
        showPopup('ゲームスタート！');
      }
      if (savedSettings.bgmOn) {
        try { await startBGM(); } catch {}
      }
    })();
    const unsub = onBgmChange(() => setBgmIndex(getCurrentBGMIndex()));
    return () => {
      stopBGM(); unsub();
      if (popupTimer.current) clearTimeout(popupTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      if (checkEraseTimer.current) clearTimeout(checkEraseTimer.current);
      if (dotsFlashTimer.current) clearTimeout(dotsFlashTimer.current);
      if (levelUpTimer.current) clearTimeout(levelUpTimer.current);
    };
  }, []);

  // Keep a ref to always have the latest gameState for async handlers
  const gsRef = React.useRef(gameState);
  gsRef.current = gameState;
  eraserModeRef.current = eraserMode;
  henkouModeRef.current = henkouMode;
  allModeRef.current = allMode;
  settingsRef.current = settings;

  // Auto-save (debounced: every 5 seconds)
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (gameState && gameState.running) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveGameState(gameState), 5000);
    }
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [gameState]);

  // Exchange button animation: trigger once when eraserCount reaches 10
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

  // Show new dino popup is now handled inside applyLevelUp via newTypes from checkLevelUp

  const updateSettings = (partial: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      if (partial.soundVolume !== undefined) setSoundVolume(partial.soundVolume);
      saveSettings(next);
      return next;
    });
  };

  // Deferred popup ref - used to avoid setState during render (inside setGameState callbacks)
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

  // Stable ref for handleCellPress to avoid GameBoard re-renders
  const cellPressRef = React.useRef<(r: number, c: number) => void>(() => {});
  const stableCellPress = React.useCallback((r: number, c: number) => cellPressRef.current(r, c), []);

  if (!gameState) {
    return (
      <ImageBackground source={BG_IMAGE} style={styles.screen} contentFit="cover">
        <Text style={styles.loadingText}>読み込み中...</Text>
      </ImageBackground>
    );
  }

  const { grid, level, score, erasedGroups, eraserCount, shuffleCount, henkouCount, allCount, running } = gameState;
  const needed = groupsNeeded(level);
  const numSizeMultiplier = NUM_SIZE_OPTIONS.find(o => o.key === settings.numberSize)?.size ?? 0.75;
  const numFontSize = Math.max(10, cellSize * 0.32 * numSizeMultiplier / 0.75);

  // Helper: update state AND sync ref immediately
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

  // ====== Cell press handler ======
  const handleCellPress = async (r: number, c: number) => {
    if (animatingRef.current) return;
    const gs = gsRef.current;
    if (!gs || !gs.running) return;
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

        const erased = eraseCells(g, [[r, c]]);
        const filled = applyGravityAndRefill(erased, prev.level);
        const ns = { ...prev, grid: filled, eraserCount: prev.eraserCount - 1 };
        gsRef.current = ns;
        checkAfterErase(ns);
        return ns;
      });
      return;
    }

    // Henkou mode
    if (henkouModeRef.current) {
      if (cell.type < 0 || cell.bomb) return;
      setHenkouMode(false);
      s.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      playHenkou();
      const targetType = cell.type;
      // Build converted cell keys before state update
      const convKeys = new Set<number>();
      for (let rr = 0; rr < ROWS; rr++)
        for (let cc = 0; cc < COLS; cc++)
          if (gs.grid[rr][cc].type === targetType && !gs.grid[rr][cc].bomb)
            convKeys.add(rr * COLS + cc);
      setConvertedCells(convKeys);
      setTimeout(() => setConvertedCells(new Set()), 600);
      setGameState(prev => {
        if (!prev) return prev;

        const converted = convertType(prev.grid, targetType);
        const ns = { ...prev, grid: converted, henkouCount: prev.henkouCount - 1 };
        gsRef.current = ns;
        checkAfterErase(ns);
        return ns;
      });
      return;
    }

    // ALL mode: erase all of one type
    if (allModeRef.current) {
      if (cell.type < 0 || cell.bomb) return;
      setAllMode(false);
      animatingRef.current = true;
      s.hapticsOn && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      playEraser();
      const targetType = cell.type;

      // Highlight all cells of this type briefly
      const allKeys = new Set<number>();
      for (let rr = 0; rr < ROWS; rr++)
        for (let cc = 0; cc < COLS; cc++)
          if (gs.grid[rr][cc].type === targetType && !gs.grid[rr][cc].bomb)
            allKeys.add(rr * COLS + cc);
      setHighlightCells(allKeys);
      await delay(300);
      setHighlightCells(new Set());

      setGameState(prev => {
        if (!prev) return prev;
        const { newGrid, erasedCount } = eraseAllOfType(prev.grid, targetType);
        if (erasedCount === 0) return prev;
        const filled = applyGravityAndRefill(newGrid, prev.level);
        const result = calcScore(erasedCount, targetType, prev.level);
        const allBonus = erasedCount * 5;
        const totalPts = result.pts + allBonus;
        let ns: GameState = {
          ...prev, grid: filled,
          score: prev.score + totalPts,
          erasedGroups: prev.erasedGroups + 1,
          allCount: prev.allCount - 1,
        };
        const leveled = ns.erasedGroups >= groupsNeeded(ns.level);
        ns = applyLevelUp(ns, false);
        let popMsg = `💥ALL +${totalPts}pts`;
        if (result.bonus === 'bonus') { popMsg += ' ✨'; }
        if (leveled) popMsg += ` 🎉 LV${ns.level}!`;
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
      s.hapticsOn && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      playBomb();

      if (s.bombWaveEffect) {
        const result = explodeBomb(gs.grid, r, c);
        // Build distance map from bomb origin for cascading effect
        const distMap = new Map<number, number>();
        for (const key of result.destroyed) {
          const cr = Math.floor(key / COLS);
          const cc = key % COLS;
          const dist = Math.abs(cr - r) + Math.abs(cc - c);
          distMap.set(key, dist);
        }
        const maxDist = Math.max(...distMap.values(), 1);

        // Cascade: set all cells with distance info, AnimatedCell handles delay
        setExplodingCells(distMap);
        setExplodePhase(1);
        s.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const cascadeTime = maxDist * 12 + 25;
        await delay(cascadeTime);
        setExplodingCells(new Map());
        setExplodePhase(0);
      }

      // Phase 1: Erase cells (show blank spaces)
      let bombScore = 0;
      setGameState(prev => {
        if (!prev) return prev;
        const g = prev.grid;
        if (!g[r][c].bomb) return prev;

        const result = explodeBomb(g, r, c);
        const erased = eraseBombCells(g, result.destroyed);
        bombScore = result.destroyed.size * 2;
        const ns: GameState = { ...prev, grid: erased };
        gsRef.current = ns;
        return ns;
      });

      // Blank pause: show empty cells before new panels drop
      await delay(150);

      // Phase 2: Gravity & refill (new panels drop in)
      setGameState(prev => {
        if (!prev) return prev;
        const filled = applyGravityAndRefill(prev.grid, prev.level);
        let ns: GameState = {
          ...prev, grid: filled,
          score: prev.score + bombScore, erasedGroups: prev.erasedGroups + 1,
        };
        const leveled = ns.erasedGroups >= groupsNeeded(ns.level);
        ns = applyLevelUp(ns, false);
        let popMsg = `🌋 +${bombScore}pts`;
        if (leveled) popMsg += ` 🎉 LV${ns.level}!`;
        deferPopup(popMsg, leveled ? 250 : 150);
        gsRef.current = ns;
        checkAfterErase(ns);
        return ns;
      });

      // Wait for drop animation before showing popup
      const dropDelay = s.dropAnimation ? 200 : 0;
      if (dropDelay > 0) {
        await delay(dropDelay);
      }
      flushDeferredPopup();
      flushDeferredLevelUp();
      animatingRef.current = false;
      return;
    }

    // Normal cell click
    if (cell.type < 0) return;

    // Pre-check from ref for early validation
    const preGroup = getGroup(gs.grid, r, c);
    if (preGroup.length < minGroupSize(cell.type)) return;

    // Erase immediately - grid update first, then feedback
    animatingRef.current = true;
    setGameState(prev => {
      if (!prev) return prev;
      const g = prev.grid;
      if (g[r][c].type < 0) return prev;
      // Re-use preGroup if grid unchanged, otherwise re-find
      const group = g === gs.grid ? preGroup : getGroup(g, r, c);
      const cellType = g[r][c].type;
      if (group.length < minGroupSize(cellType)) return prev;
      const erased = eraseCells(g, group);
      const filled = applyGravityAndRefill(erased, prev.level);
      const result = calcScore(group.length, cellType, prev.level);
      const pts = result.pts;
      const bonus = result.bonus;
      let ns: GameState = {
        ...prev, grid: filled,
        score: (typeof prev.score === 'number' ? prev.score : 0) + pts,
        erasedGroups: prev.erasedGroups + 1,
      };
      const leveled = ns.erasedGroups >= groupsNeeded(ns.level);
      // Build popup message: score + bonus + level up combined
      let popMsg = `+${pts}pts`;
      if (bonus === 'bonus') { popMsg += ' ✨ ボーナス!'; }
      ns = applyLevelUp(ns, false); // don't show popup inside
      if (leveled) popMsg += ` 🎉 LV${ns.level}!`;
      deferPopup(popMsg, leveled ? 250 : 150);
      gsRef.current = ns;
      checkAfterErase(ns);
      return ns;
    });
    // Wait for drop animation (180ms) before showing score popup
    // Skip delay when drop animation is OFF
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
    // Feedback after state update (non-blocking)
    playErase();
    s.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  cellPressRef.current = handleCellPress;

  // Apply level up directly to state (called inside setGameState callbacks)
  // All side effects are deferred to avoid setState during render
  const applyLevelUp = (state: GameState, showMsg = true): GameState => {
    const result = checkLevelUp(state);
    if (!result.leveled) return state;

    // Defer dots flash (will be flushed after setGameState)
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
      if (items.length > 0) msg += ` ${items.join(' ')}`;
      deferPopup(msg, 250);
    }

    // Defer new dino footer highlight (popup removed, footer pulse instead)
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
      const newType = d.newDino;
      const pageIndex = d.pageIndex;
      d.newDino = null;
      if (levelUpTimer.current) clearTimeout(levelUpTimer.current);
      levelUpTimer.current = setTimeout(() => {
        // Scroll to the new dino in footer and pulse the icon
        footerListRef.current?.scrollToOffset({ offset: pageIndex * gridMaxWidth, animated: true });
        setNewDinoHighlight(newType);
        footerPulseAnim.setValue(0);
        setDinoFlipRevealed(false);
        // カード回転: 前半でLV表示→90°で裏返し→後半で恐竜画像
        Animated.timing(footerPulseAnim, { toValue: 0.5, duration: 350, useNativeDriver: true })
          .start(() => {
            setDinoFlipRevealed(true);
            Animated.timing(footerPulseAnim, { toValue: 1, duration: 350, useNativeDriver: true })
              .start(() => setNewDinoHighlight(null));
          });
      }, 400);
    }
  };

  const checkAfterErase = (state: GameState) => {
    // Extract only needed values to avoid capturing entire state in closure
    const grid = state.grid;
    const eraserCnt = state.eraserCount;
    const shuffleCnt = state.shuffleCount;
    const henkouCnt = state.henkouCount;
    const allCnt = state.allCount || 0;
    // Run after render completes so UI updates first
    if (checkEraseTimer.current) clearTimeout(checkEraseTimer.current);
    checkEraseTimer.current = setTimeout(() => {
      if (!hasValidMoves(grid)) {
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
    settings.hapticsOn && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    playGameOver();
    await stopBGM();
    updateState({ running: false });
    // Force save before clearing
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await clearGameState();
    await saveToRanking(state.score, state.level);
    // Submit to global ranking if player name is set
    if (settings.playerName) {
      await submitGlobalScore(settings.playerName, state.score, state.level);
      setGameOverVisible(true);
    } else {
      // No name: show name prompt first
      pendingScoreRef.current = { score: state.score, level: state.level };
      setGameOverNameInput('');
      setNamePromptVisible(true);
    }
    showPopup('GAME OVER', 3000);
  };

  const submitNameAndScore = async (name: string) => {
    setNamePromptVisible(false);
    if (name && pendingScoreRef.current) {
      updateSettings({ playerName: name });
      setNameInput(name);
      await submitGlobalScore(name, pendingScoreRef.current.score, pendingScoreRef.current.level);
    }
    pendingScoreRef.current = null;
    setGameOverVisible(true);
  };

  const handleRestart = async () => {
    setGameOverVisible(false);
    const initial = createInitialState();
    gsRef.current = initial;
    setGameState(initial);
    animatingRef.current = false;
    showPopup('ゲームスタート！');
    if (settings.bgmOn) { try { await startBGM(); } catch {} }
  };


  const handleRetire = () => {
    setMenuVisible(false);
    Alert.alert('リタイア', '本当にリタイアしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'リタイア', style: 'destructive', onPress: () => handleGameOver(gameState) },
    ]);
  };

  const handleShuffle = () => {
    if (shuffleCount <= 0 || animatingRef.current) return;
    settings.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    playShuffle();
    setGameState(prev => {
      if (!prev) return prev;
      const shuffled = shuffleGrid(prev.grid);
      const ns = { ...prev, grid: shuffled, shuffleCount: prev.shuffleCount - 1 };
      gsRef.current = ns;
      checkAfterErase(ns);
      return ns;
    });
    showPopup('シャッフル！');
  };

  const handleEraser = () => {
    if (eraserCount <= 0 || animatingRef.current) return;
    setHenkouMode(false);
    setAllMode(false);
    setEraserMode(!eraserMode);
    settings.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleHenkou = () => {
    if (henkouCount <= 0 || animatingRef.current) return;
    setEraserMode(false);
    setAllMode(false);
    setHenkouMode(!henkouMode);
    settings.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAll = () => {
    if (allCount <= 0 || animatingRef.current) return;
    setEraserMode(false);
    setHenkouMode(false);
    setAllMode(!allMode);
    settings.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleHint = () => {
    // Find a valid move and highlight it with a pulsing border
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c].bomb) {
          setHighlightCells(new Set([r * COLS + c]));
          settings.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (hintTimer.current) clearTimeout(hintTimer.current);
          hintTimer.current = setTimeout(() => setHighlightCells(new Set()), 5000);
          showPopup('🌋 ボルケーノをタップ！', 2000);
          return;
        }
        if (grid[r][c].type < 0) continue;
        const group = getGroup(grid, r, c);
        if (group.length >= minGroupSize(grid[r][c].type)) {
          setHighlightCells(new Set(group.map(([gr, gc]) => gr * COLS + gc)));
          settings.hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (hintTimer.current) clearTimeout(hintTimer.current);
          hintTimer.current = setTimeout(() => setHighlightCells(new Set()), 5000);
          showPopup(`${DINO_NAMES[grid[r][c].type]}を${group.length}個消せる！`, 2000);
          return;
        }
      }
    }
    // No valid moves found
    if (eraserCount > 0 || shuffleCount > 0 || henkouCount > 0 || allCount > 0) {
      showPopup('アイテムを使おう！', 2000);
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
    showPopup('DEL×10 → CHG×1 交換完了！', 200);
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
    showPopup('DEL×15 → ALL×1 交換完了！', 200);
  };

  const handleExit = () => {
    Alert.alert('終了', 'ゲームを保存して戻りますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '保存して戻る', onPress: async () => { await saveGameState(gameState); await stopBGM(); router.back(); } },
    ]);
  };

  // ====== Render ======
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ImageBackground source={BG_IMAGE} style={styles.screen} contentFit="cover">
      <View style={{ paddingTop: STATUS_BAR_HEIGHT, flex: 1 }}>
        {/* Header */}
        <View style={[styles.headerCard, { marginHorizontal: horizontalPadding }]}>
          {/* Row 1: Navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navIconBtn} onPress={() => setMenuVisible(true)}>
              <Text style={styles.navIconText}>≡</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navIconBtn} onPress={async () => {
              const r = await loadRankings();
              setRankings(r);
              setRankTab('local');
              setRankingVisible(true);
            }}>
              <Text style={styles.navIconText}>👑</Text>
            </TouchableOpacity>
            <View style={styles.navCenter}>
              <View style={styles.statusLv}>
                <Text style={styles.statusLvLabel}>LV</Text>
                <Text style={[styles.statusLvValue, level >= 1000 ? { fontSize: 11 } : level >= 100 ? { fontSize: 14 } : null]}>{level}</Text>
              </View>
              <View style={styles.dotsRow}>
                {Array.from({ length: 10 }, (_, i) => {
                  const filled = dotsFlash ? true : i < erasedGroups;
                  const flash = dotsFlash;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        filled
                          ? (flash ? styles.dotFlash : styles.dotFilled)
                          : styles.dotEmpty,
                      ]}
                    />
                  );
                })}
              </View>
              <View style={styles.statusScore}>
                <Text style={styles.scoreLabel}>SCORE</Text>
                <Text style={styles.scoreValue}>{formatScore(score)}</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.actionBtn, styles.hintBtn]} onPress={handleHint}>
              <Text style={styles.actionBtnText}>ヒント</Text>
            </TouchableOpacity>
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
            <Animated.View style={{ transform: [{ scale: exchangeAnim }] }}>
              <TouchableOpacity
                style={[styles.exchangeBtn, eraserCount >= 10 ? styles.exchangeBtnReady : styles.exchangeBtnLocked]}
                onPress={handleExchange}
                disabled={eraserCount < 10}
              >
                <Text style={[styles.exchangeBtnText, eraserCount >= 10 ? styles.exchangeBtnTextReady : styles.exchangeBtnTextLocked]}>
                  {eraserCount >= 10 ? '✨' : '🔒'} 交換 {Math.min(eraserCount, 10)}/10
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Info bar: isolated component with its own state */}
        <PopupBar
          setterRef={popupSetterRef}
          eraserMode={eraserMode}
          henkouMode={henkouMode}
          allMode={allMode}
          onCancelMode={() => { setEraserMode(false); setHenkouMode(false); setAllMode(false); }}
          styles={styles}
        />

        {/* Board */}
        <View style={styles.centerArea}>
          <View style={[styles.boardWrap, { width: gridMaxWidth }]}>
            <View style={[styles.board, { padding: boardPadding, borderWidth: boardBorder }]}>
              <GameBoard
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
          </View>
        </View>

        {/* Footer: dino panel - horizontal paging, 5 per page */}
        <View style={[styles.footerPanel, { marginHorizontal: horizontalPadding }]}>
          <View style={styles.footerLabelRow}>
            <Text style={styles.footerLabel}>登場キャラクター</Text>
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
              // isPulsing中は前半LV表示→90°で切替→後半は恐竜画像
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

        {/* Banner ad is now in GlobalBanner (root layout) */}
      </View>

      {/* Hamburger Menu */}
      {menuVisible && <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuPanel}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setRulesVisible(true); }}>
              <Text style={styles.menuItemText}>📖 遊び方</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setSettingsVisible(true); }}>
              <Text style={styles.menuItemText}>⚙ 設定</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleRetire}>
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>🚪 リタイア</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>}

      {/* Name Prompt (on game over without player name) */}
      {namePromptVisible && <Modal visible={namePromptVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={{ fontSize: 32 }}>🦕</Text>
            <Text style={styles.modalTitle}>プレイヤー名を登録</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
              グローバルランキングに参加できます
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
              placeholder="名前を入力（最大12文字）"
              placeholderTextColor="#9ca3af"
              maxLength={12}
              autoFocus
            />
            <Text style={{ fontSize: 11, color: '#9ca3af' }}>※後から設定画面で変更できます</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' }}>
              <TouchableOpacity
                style={[styles.modalBtn, { flex: 1, backgroundColor: '#e5e7eb' }]}
                onPress={() => submitNameAndScore('')}
              >
                <Text style={[styles.modalBtnText, { color: '#374151' }]}>スキップ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { flex: 1 }]}
                onPress={() => submitNameAndScore(gameOverNameInput.trim())}
              >
                <Text style={styles.modalBtnText}>決定！</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>}

      {/* Game Over */}
      {gameOverVisible && <Modal visible={gameOverVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>GAME OVER</Text>
            <Text style={styles.modalScore}>スコア: {formatScore(score)}</Text>
            <Text style={styles.modalLevel}>レベル: {level}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={handleRestart}>
              <Text style={styles.modalBtnText}>もう一度プレイ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#f59e0b' }]} onPress={async () => {
              setGameOverVisible(false);
              const initial = createInitialState();
              gsRef.current = initial;
              setGameState(initial);
              animatingRef.current = false;
              const r = await loadRankings();
              setRankings(r);
              setRankTab('local');
              setRankingVisible(true);
            }}>
              <Text style={styles.modalBtnText}>🏆 ランキングを確認</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={async () => {
              setGameOverVisible(false);
              const initial = createInitialState();
              gsRef.current = initial;
              setGameState(initial);
              animatingRef.current = false;
              await stopBGM();
              router.back();
            }}>
              <Text style={styles.modalBtnTextSecondary}>タイトルに戻る</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>}

      {/* Exchange Confirm */}
      {exchangeVisible && <Modal visible={exchangeVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>アイテム交換</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
              DEL ×{eraserCount}
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, { opacity: eraserCount >= 10 ? 1 : 0.4 }]}
              onPress={confirmExchangeCHG}
              disabled={eraserCount < 10}
            >
              <Text style={styles.modalBtnText}>DEL×10 → CHG×1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: '#dc2626', opacity: eraserCount >= 15 ? 1 : 0.4 }]}
              onPress={confirmExchangeALL}
              disabled={eraserCount < 15}
            >
              <Text style={styles.modalBtnText}>DEL×15 → ALL×1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: '#e5e7eb' }]}
              onPress={() => setExchangeVisible(false)}
            >
              <Text style={[styles.modalBtnText, { color: '#374151' }]}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>}

      {/* Character Popup removed — new dinos are now highlighted in footer with gold pulse */}

      {/* Rules */}
      {rulesVisible && <Modal visible={rulesVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.rkDialog, { maxHeight: '85%' }]}>
            <View style={styles.rulesHeader}>
              <Text style={styles.rulesHeaderText}>📖 遊び方</Text>
              <TouchableOpacity style={styles.rulesCloseX} onPress={() => { setRulesVisible(false); setRulesPage(0); }}>
                <Text style={styles.rulesCloseXText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ width: '100%', padding: 16 }} showsVerticalScrollIndicator={false}>

              {rulesPage === 0 && (<View style={styles.rulesPage}>
                <Text style={styles.rulesTitle}>① 基本ルール</Text>
                <Text style={styles.rulesText}>
                  同じ種類の恐竜が「表示の数」と同じ数だけつながっているときにタップで消せます。
                </Text>
                <View style={styles.rulesTable}>
                  <View style={styles.rulesTableHeader}>
                    <Text style={[styles.rulesTableCell, { flex: 2 }]}>恐竜</Text>
                    <Text style={styles.rulesTableCell}>表示</Text>
                    <Text style={[styles.rulesTableCell, { flex: 2 }]}>必要な連結数</Text>
                  </View>
                  {[
                    ['ティラノサウルス', '1', '1個（単体でOK）'],
                    ['ブラキオサウルス', '2', '2個以上'],
                    ['プテラノドン', '3', '3個以上'],
                    ['トリケラトプス', '4', '4個以上'],
                    ['ステゴサウルス', '5', '5個以上'],
                    ['スピノサウルス', '6', '6個以上'],
                  ].map(([name, num, req], i) => (
                    <View key={i} style={styles.rulesTableRow}>
                      <Text style={[styles.rulesTableCell, { flex: 2 }]}>{name}</Text>
                      <Text style={[styles.rulesTableCell, styles.rulesBold]}>{num}</Text>
                      <Text style={[styles.rulesTableCell, { flex: 2 }]}>{req}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.rulesTip}>💡 タップすると消えるグループが黄色でハイライトされます！</Text>
              </View>)}

              {rulesPage === 1 && (<View style={styles.rulesPage}>
                <Text style={styles.rulesTitle}>② スコアのしくみ</Text>
                <Text style={styles.rulesText}>
                  スコアは <Text style={styles.rulesBold}>消えた枚数 × 表示の数値</Text> で加算されます。
                </Text>
                <Text style={styles.rulesText}>
                  グループが大きいほど、また表示数値が大きい恐竜ほど<Text style={styles.rulesBold}>高得点</Text>！
                </Text>
                <Text style={styles.rulesTip}>
                  ✨ <Text style={styles.rulesBold}>レアボーナス</Text>{'\n'}
                  スピノサウルス以上の恐竜を消すとレアボーナス加算！{'\n'}
                  難しい恐竜ほど高ボーナス{'\n\n'}
                  📈 <Text style={styles.rulesBold}>レベル係数</Text>：LV3からスコアUP{'\n'}
                  LV3:1.1倍 → LV10:1.35倍 → LV30:1.7倍 → LV50+:2.0倍〜
                </Text>
                <Text style={styles.rulesTip}>
                  💡 ティラノサウルス（表示1）は1個から消せるので詰まったときの救済にも！
                </Text>
              </View>)}

              {rulesPage === 2 && (<View style={styles.rulesPage}>
                <Text style={styles.rulesTitle}>③ 噴火 🌋</Text>
                <Text style={styles.rulesText}>
                  🌋をタップすると、その噴火がある<Text style={styles.rulesBold}>縦一列＋横一列</Text>を一気に消します。
                </Text>
                <View style={styles.rulesDiagram}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.rulesDiagramText}>↑</Text>
                    <Text style={styles.rulesDiagramText}>←🌋→</Text>
                    <Text style={styles.rulesDiagramText}>↓</Text>
                  </View>
                </View>
                <Text style={styles.rulesText}>
                  🌋 隣の噴火に連鎖して一気に爆発することも！
                </Text>
                <Text style={styles.rulesTip}>
                  噴火はLV1〜3で多め。盤上に最大3個。
                </Text>
              </View>)}

              {rulesPage === 3 && (<View style={styles.rulesPage}>
                <Text style={styles.rulesTitle}>④ レベルアップ＆特別ボタン</Text>
                <Text style={styles.rulesText}>
                  <Text style={styles.rulesBold}>10グループ</Text>消すごとにレベルアップ！新キャラクターが出現します。
                </Text>
                <View style={styles.rulesTable}>
                  <View style={styles.rulesTableHeader}>
                    <Text style={styles.rulesTableCell}>解放LV</Text>
                    <Text style={styles.rulesTableCell}>ボタン</Text>
                    <Text style={[styles.rulesTableCell, { flex: 3 }]}>効果</Text>
                  </View>
                  {[
                    ['LV3〜', '🗑DEL', '好きな1マスを消去。LVアップごとに+1'],
                    ['LV5〜', '🔀MIX', 'グリッド全体をシャッフル'],
                    ['LV10〜', '🔄CHG', '1種類を基本6種のどれかに全変換'],
                    ['LV20〜', '💥ALL', '1種類の恐竜を盤面から全消去'],
                  ].map(([lv, btn, effect], i) => (
                    <View key={i} style={styles.rulesTableRow}>
                      <Text style={styles.rulesTableCell}>{lv}</Text>
                      <Text style={[styles.rulesTableCell, styles.rulesBold]}>{btn}</Text>
                      <Text style={[styles.rulesTableCell, { flex: 3 }]}>{effect}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.rulesTip}>
                  💡 DEL・MIX・CHG・ALLが残っているとゲームオーバーを回避！{'\n'}
                  ボタンが光ったら使いどき！{'\n'}
                  🔁 DEL×10 → CHG×1、DEL×15 → ALL×1 に交換可能！
                </Text>
              </View>)}

              {rulesPage === 4 && (<View style={styles.rulesPage}>
                <Text style={styles.rulesTitle}>⑤ 新キャラクターの出現</Text>
                <Text style={styles.rulesText}>
                  レベルが上がると、より強力な新キャラクターが出現します。
                </Text>
                <View style={styles.rulesTable}>
                  <View style={styles.rulesTableHeader}>
                    <Text style={styles.rulesTableCell}>解放LV</Text>
                    <Text style={[styles.rulesTableCell, { flex: 2 }]}>恐竜</Text>
                    <Text style={styles.rulesTableCell}>表示</Text>
                    <Text style={styles.rulesTableCell}>必要数</Text>
                  </View>
                  {[
                    ['LV5', 'アロサウルス', '7', '7個'],
                    ['LV10', 'パキケファロ', '8', '8個'],
                    ['LV15', 'モササウルス', '9', '9個'],
                    ['LV20', 'アンキロ', '10', '10個'],
                    ['LV25', 'マイアサウラ', '11', '11個'],
                    ['LV30', 'ケツァルコアトル', '12', '12個'],
                    ['LV35', 'マンモス', '13', '13個'],
                  ].map(([lv, name, num, req], i) => (
                    <View key={i} style={styles.rulesTableRow}>
                      <Text style={styles.rulesTableCell}>{lv}</Text>
                      <Text style={[styles.rulesTableCell, { flex: 2 }]}>{name}</Text>
                      <Text style={[styles.rulesTableCell, styles.rulesBold]}>{num}</Text>
                      <Text style={styles.rulesTableCell}>{req}</Text>
                    </View>
                  ))}
                  <View style={[styles.rulesTableRow, { backgroundColor: '#fef3c7' }]}>
                    <Text style={[styles.rulesTableCell, { flex: 1 }]}>LV40〜</Text>
                    <Text style={[styles.rulesTableCell, { flex: 5, textAlign: 'center', fontStyle: 'italic', color: '#92400e' }]}>??? 何が出るかはお楽しみ！</Text>
                  </View>
                </View>
                <Text style={styles.rulesTip}>
                  ⚠️ 新種は連結数が多くて消しにくい分、高得点チャンス！{'\n'}
                  🎁 大グループで消すと固定ボーナス加算！
                </Text>
              </View>)}

              {rulesPage === 5 && (<View style={styles.rulesPage}>
                <Text style={styles.rulesTitle}>📋 更新履歴</Text>
                <Text style={styles.rulesText}>
                  <Text style={styles.rulesBold}>v5.2.0</Text>（2026/04/04）{'\n'}
                  ・スコアポップアップ表示タイミング改善{'\n'}
                  ・序盤スコア倍率強化（LV3から段階的に上昇）{'\n'}
                  ・火山爆発後の空白待機追加{'\n'}
                  ・新恐竜登場時のカード回転演出{'\n'}
                  ・未解放キャラに解放レベルを表示{'\n'}
                  ・MIX効果音・ゲームオーバー音の改善{'\n'}
                  ・同じ数字補充時の落下アニメーション修正{'\n'}
                  {'\n'}
                  <Text style={styles.rulesBold}>v5.1.0</Text>（2026/04/01）{'\n'}
                  ・一括消去ボタン（ALL）追加{'\n'}
                  ・新恐竜アンロック演出をフッター演出に変更{'\n'}
                  ・高レベル恐竜の報酬バランス見直し{'\n'}
                  ・落下アニメーション追加{'\n'}
                  ・タッチ判定改善{'\n'}
                  {'\n'}
                  <Text style={styles.rulesBold}>v5.0.1</Text>（2026/03/25）{'\n'}
                  ・新キャラ追加：マイアサウラ、ヤマタノオロチ（全19種）{'\n'}
                  ・ランキング：デイリー/週間/月間の3タブに変更{'\n'}
                  ・ランキング表示の不具合修正{'\n'}
                  ・高レベル時のUI表示改善{'\n'}
                  ・ゲームオーバー画面にランキング確認ボタン追加{'\n'}
                  ・パフォーマンス改善（画像最適化・データ取得効率化）{'\n'}
                  {'\n'}
                  <Text style={styles.rulesBold}>v5.0.0</Text>（2026/03/24）{'\n'}
                  ・広告非表示パック（アプリ内購入）{'\n'}
                  ・アイテム交換機能（DEL×10→CHG×1）{'\n'}
                  ・月間ランキング追加{'\n'}
                  ・振動ON/OFF設定{'\n'}
                  ・ゲームオーバー時の名前登録{'\n'}
                  ・スコアバランス調整（固定ボーナス+レベル係数）{'\n'}
                  ・キャラ出現バランス最適化{'\n'}
                  ・パフォーマンス大幅改善{'\n'}
                  ・表記変更（🗑DEL / 🔀MIX / 🔄CHG）
                </Text>
              </View>)}

            </ScrollView>
            <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <TouchableOpacity key={i} onPress={() => setRulesPage(i)} hitSlop={8}>
                    <View style={{
                      width: rulesPage === i ? 10 : 8,
                      height: rulesPage === i ? 10 : 8,
                      borderRadius: 5,
                      backgroundColor: rulesPage === i ? '#f59e0b' : '#d1d5db',
                    }} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={[styles.rulesNav, { paddingHorizontal: 16, paddingBottom: 12 }]}>
              {rulesPage > 0 ? (
                <TouchableOpacity onPress={() => setRulesPage(rulesPage - 1)}>
                  <Text style={styles.rulesNavText}>◀ 前へ</Text>
                </TouchableOpacity>
              ) : <View />}
              <Text style={styles.rulesPageNum}>{rulesPage + 1}/6</Text>
              {rulesPage < 5 ? (
                <TouchableOpacity onPress={() => setRulesPage(rulesPage + 1)}>
                  <Text style={styles.rulesNavText}>次へ ▶</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => { setRulesVisible(false); setRulesPage(0); }}>
                  <Text style={styles.rulesNavText}>閉じる</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>}

      {/* Settings */}
      {settingsVisible && <Modal visible={settingsVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
            <View style={styles.settingsCard}>
              <View style={styles.settingsHeader}>
                <Text style={styles.settingsHeaderText}>⚙ 設定</Text>
              </View>

              {/* Sound Volume */}
              <View style={styles.settingSection}>
                <Text style={styles.settingLabel}>🔊 効果音</Text>
                <View style={styles.settingBtnRow}>
                  {VOLUME_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.volBtn, settings.soundVolume === opt.value && styles.volBtnActive]}
                      onPress={() => updateSettings({ soundVolume: opt.value })}
                    >
                      <Text style={[styles.volBtnText, settings.soundVolume === opt.value && styles.volBtnTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.settingDivider} />

              {/* Effects section removed - always ON */}

              {/* Number Size */}
              <View style={styles.settingSection}>
                <Text style={styles.settingLabel}>🔢 数値サイズ</Text>
                <View style={styles.settingBtnRow}>
                  {NUM_SIZE_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.volBtn, settings.numberSize === opt.key && styles.numSizeBtnActive]}
                      onPress={() => updateSettings({ numberSize: opt.key })}
                    >
                      <Text style={[styles.volBtnText, settings.numberSize === opt.key && styles.volBtnTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.settingDivider} />

              {/* BGM */}
              <View style={styles.settingSection}>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>🎵 BGM</Text>
                  <TouchableOpacity
                    style={[styles.toggleBtn, settings.bgmOn ? styles.toggleOn : styles.toggleOff]}
                    onPress={async () => {
                      const next = !settings.bgmOn;
                      updateSettings({ bgmOn: next });
                      if (next) { try { await startBGM(); } catch {} }
                      else { await stopBGM(); }
                    }}
                  >
                    <Text style={[styles.toggleText, settings.bgmOn && styles.toggleTextOn]}>
                      {settings.bgmOn ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {settings.bgmOn && (
                  <View style={styles.bgmList}>
                    {BGM_NAMES.map((name, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.bgmItem, bgmIndex === i && styles.bgmItemActive]}
                        onPress={() => switchBGM(i)}
                      >
                        <Text style={styles.bgmItemText}>{name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.settingDivider} />

              {/* Haptics */}
              <View style={styles.settingSection}>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>📳 振動</Text>
                  <TouchableOpacity
                    style={[styles.toggleBtn, settings.hapticsOn ? styles.toggleOn : styles.toggleOff]}
                    onPress={() => updateSettings({ hapticsOn: !settings.hapticsOn })}
                  >
                    <Text style={[styles.toggleText, settings.hapticsOn && styles.toggleTextOn]}>
                      {settings.hapticsOn ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.settingDivider} />

              {/* Drop Animation */}
              <View style={styles.settingSection}>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>🫧 落下アニメ</Text>
                  <TouchableOpacity
                    style={[styles.toggleBtn, settings.dropAnimation ? styles.toggleOn : styles.toggleOff]}
                    onPress={() => updateSettings({ dropAnimation: !settings.dropAnimation })}
                  >
                    <Text style={[styles.toggleText, settings.dropAnimation && styles.toggleTextOn]}>
                      {settings.dropAnimation ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.settingDivider} />

              {/* Player Name */}
              <View style={styles.settingSection}>
                <Text style={styles.settingLabel}>🏷 プレイヤー名</Text>
                <View style={styles.nameRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="名前を入力"
                    maxLength={12}
                  />
                  <TouchableOpacity
                    style={styles.nameSaveBtn}
                    onPress={() => {
                      updateSettings({ playerName: nameInput });
                      settings.hapticsOn && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                  >
                    <Text style={styles.nameSaveBtnText}>保存</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.nameHint}>現在: {settings.playerName || '未設定'}</Text>
              </View>

              <View style={styles.settingDivider} />

              {/* Ad & Purchase */}
              <View style={styles.settingSection}>
                <Text style={styles.settingLabel}>📢 広告</Text>
                {adState.isAdRemoved ? (
                  <Text style={[styles.settingSubLabel, { paddingVertical: 6 }]}>広告は削除済みです ✅</Text>
                ) : (
                  <TouchableOpacity
                    style={[styles.nameSaveBtn, { marginTop: 6, alignSelf: 'flex-start' }]}
                    onPress={adState.buyAdRemoval}
                  >
                    <Text style={styles.nameSaveBtnText}>広告を削除する</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{ paddingVertical: 6 }}
                  onPress={adState.restore}
                >
                  <Text style={[styles.settingSubLabel, { color: '#3b82f6', textDecorationLine: 'underline' }]}>
                    購入を復元する
                  </Text>
                </TouchableOpacity>

                {/* Debug toggle - dev only */}
                {__DEV__ && (
                <View style={[styles.settingSubRow, { borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 6, paddingTop: 6 }]}>
                  <Text style={[styles.settingSubLabel, { color: '#d1d5db' }]}>🛠 デバッグ</Text>
                  <TouchableOpacity
                    style={[styles.toggleBtn, !adState.isAdRemoved ? styles.toggleOn : styles.toggleOff]}
                    onPress={() => adState.setAdRemoved(!adState.isAdRemoved)}
                  >
                    <Text style={[styles.toggleText, !adState.isAdRemoved && styles.toggleTextOn]}>
                      {adState.isAdRemoved ? '広告OFF' : '広告ON'}
                    </Text>
                  </TouchableOpacity>
                </View>
                )}
              </View>

              <TouchableOpacity style={styles.settingsCloseBtn} onPress={() => setSettingsVisible(false)}>
                <Text style={styles.settingsCloseBtnText}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>}

      {/* Dino Info Popup */}
      {dinoInfoPopup !== null && <Modal visible={dinoInfoPopup !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {dinoInfoPopup !== null && (
              <>
                <Image source={DINO_SOURCES[dinoInfoPopup]} style={styles.charPopupImage} contentFit="contain" />
                <Text style={styles.charPopupName}>{DINO_NAMES[dinoInfoPopup]} {DINO_EMOJI[dinoInfoPopup]}</Text>
                <Text style={styles.charPopupDesc}>
                  数字: {dinoInfoPopup + 1}（{dinoInfoPopup + 1}個つながると消せる）
                </Text>
                <Text style={[styles.charPopupDesc, { color: '#9ca3af' }]}>
                  {DINO_UNLOCK_LV[dinoInfoPopup] === 0 ? '初期から使用可能' : `LV${DINO_UNLOCK_LV[dinoInfoPopup]}で解放`}
                </Text>
                <TouchableOpacity style={styles.modalBtn} onPress={() => setDinoInfoPopup(null)}>
                  <Text style={styles.modalBtnText}>閉じる</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>}

      {/* Ranking */}
      {rankingVisible && <Modal visible={rankingVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.rkDialog]}>
            {/* Header */}
            <View style={styles.rkHeader}>
              <Text style={styles.rkHeaderText}>🏆 ランキング</Text>
              <TouchableOpacity style={styles.rkCloseX} onPress={() => { setRankingVisible(false); setGlobalRankings([]); }}>
                <Text style={styles.rkCloseXText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.rkTabs}>
              <TouchableOpacity
                style={[styles.rkTab, rankTab === 'local' && styles.rkTabActive]}
                onPress={() => setRankTab('local')}
              >
                <Text style={[styles.rkTabText, rankTab === 'local' && styles.rkTabTextActive]}>📱 端末</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rkTab, rankTab === 'global' && styles.rkTabActive]}
                onPress={async () => {
                  setRankTab('global');
                  setLoadingGlobal(true);
                  const data = await fetchGlobalRankings(rankPeriod);
                  setGlobalRankings(data);
                  setLoadingGlobal(false);
                }}
              >
                <Text style={[styles.rkTabText, rankTab === 'global' && styles.rkTabTextActive]}>🌍 グローバル</Text>
              </TouchableOpacity>
            </View>

            {/* Period sub-tabs (global only) */}
            {rankTab === 'global' && (
              <View style={styles.rkPeriodTabs}>
                {(['daily', 'weekly', 'monthly'] as RankPeriod[]).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.rkPeriodTab, rankPeriod === p && styles.rkPeriodTabActive]}
                    onPress={async () => {
                      setRankPeriod(p);
                      setLoadingGlobal(true);
                      const data = await fetchGlobalRankings(p);
                      setGlobalRankings(data);
                      setLoadingGlobal(false);
                    }}
                  >
                    <Text style={[styles.rkPeriodText, rankPeriod === p && styles.rkPeriodTextActive]}>
                      {p === 'daily' ? 'デイリー' : p === 'weekly' ? '週間' : '月間'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Table */}
            <ScrollView style={styles.rkBody}>
              {/* Table header */}
              <View style={styles.rkTh}>
                <Text style={[styles.rkThCell, { width: 36 }]}>順位</Text>
                <Text style={[styles.rkThCell, { width: 80 }]}>スコア</Text>
                {rankTab === 'global' && <Text style={[styles.rkThCell, { flex: 1, paddingLeft: 8 }]} numberOfLines={1}>プレイヤー</Text>}
                <Text style={[styles.rkThCell, { width: 50 }]}>LV</Text>
                <Text style={[styles.rkThCell, { width: 72 }]}>日時</Text>
              </View>

              {rankTab === 'local' ? (
                rankings.length === 0 ? (
                  <Text style={styles.rkEmpty}>まだ記録がありません</Text>
                ) : (
                  rankings.map((entry, i) => (
                    <View key={i} style={[styles.rkTd, i % 2 === 1 && styles.rkTdEven]}>
                      <Text style={[styles.rkTdCell, { width: 36 }]}>{rankLabel(i)}</Text>
                      <Text style={[styles.rkTdCell, { width: 80, textAlign: 'right', paddingRight: 8, fontWeight: '800' },
                        entry.score >= 15000 && { fontSize: 15, fontWeight: '900', color: '#dc2626' },
                        entry.score >= 10000 && entry.score < 15000 && { fontSize: 13, fontWeight: '900', color: '#d97706' },
                      ]}>{formatScore(entry.score)}</Text>
                      <Text style={[styles.rkTdCell, { width: 50 }]}>LV{entry.level}</Text>
                      <Text style={[styles.rkTdCell, { flex: 1, textAlign: 'left', paddingLeft: 8, fontSize: 12 }]}>{entry.date}</Text>
                    </View>
                  ))
                )
              ) : loadingGlobal ? (
                <Text style={styles.rkEmpty}>読み込み中...</Text>
              ) : globalRankings.length === 0 ? (
                <Text style={styles.rkEmpty}>まだ記録がありません</Text>
              ) : (
                globalRankings.map((entry, i) => (
                  <View key={i} style={[styles.rkTd, i % 2 === 1 && styles.rkTdEven]}>
                    <Text style={[styles.rkTdCell, { width: 36 }]}>{rankLabel(i)}</Text>
                    <Text style={[styles.rkTdCell, { width: 80, textAlign: 'right', paddingRight: 8, fontWeight: '800' },
                      entry.score >= 15000 && { fontSize: 15, fontWeight: '900', color: '#dc2626' },
                      entry.score >= 10000 && entry.score < 15000 && { fontSize: 13, fontWeight: '900', color: '#d97706' },
                    ]}>{formatScore(entry.score)}</Text>
                    <Text style={[styles.rkTdCell, { flex: 1, textAlign: 'left', paddingLeft: 8 }]} numberOfLines={1}>
                      {entry.name || '???'}
                    </Text>
                    <Text style={[styles.rkTdCell, { width: 50 }]}>LV{entry.level}</Text>
                    <Text style={[styles.rkTdCell, { width: 72, textAlign: 'right', fontSize: 12 }]}>{entry.date}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.rkFooter}>
              {rankTab === 'global' && !settings.playerName && (
                <Text style={styles.rkWarning}>設定でプレイヤー名を登録すると参加できます</Text>
              )}
              <TouchableOpacity style={styles.rkCloseBtn} onPress={() => { setRankingVisible(false); setGlobalRankings([]); }}>
                <Text style={styles.rkCloseBtnText}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>}
    </ImageBackground>
    </GestureHandlerRootView>
  );
}

function rankLabel(i: number): string {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return `${i + 1}.`;
}

// Isolated popup component - has its own state, doesn't trigger parent re-render
function PopupBar({
  setterRef,
  eraserMode,
  henkouMode,
  allMode,
  onCancelMode,
  styles: s,
}: {
  setterRef: React.MutableRefObject<(text: string | null) => void>;
  eraserMode: boolean;
  henkouMode: boolean;
  allMode: boolean;
  onCancelMode: () => void;
  styles: any;
}) {
  const [text, setText] = React.useState<string | null>(null);
  setterRef.current = setText;

  const isMode = eraserMode || henkouMode || allMode;
  return (
    <View style={[
      s.modeIndicator,
      text ? s.modePopup :
      isMode ? undefined :
      s.modeHidden,
    ]}>
      {text ? (
        <Text style={s.popupInlineText}>{text}</Text>
      ) : isMode ? (
        <>
          <Text style={s.modeText}>
            {eraserMode ? '🔴 DEL: 消したいセルをタップ' : henkouMode ? '🟡 CHG: 変換する恐竜をタップ' : '🔴 ALL: 全消去する恐竜をタップ'}
          </Text>
          <TouchableOpacity onPress={onCancelMode}>
            <Text style={s.modeCancelText}>キャンセル</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={s.modeTextPlaceholder}> </Text>
      )}
    </View>
  );
}

function formatScore(n: number | any): string {
  const num = typeof n === 'number' ? n : Number(n) || 0;
  return num.toLocaleString();
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loadingText: {
    flex: 1, textAlign: 'center', textAlignVertical: 'center',
    fontSize: 18, fontWeight: '800', color: '#fff',
  },
  centerArea: { alignItems: 'center', paddingTop: 1 },

  // Header
  headerCard: {
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: 6, gap: 4,
  },
  // Nav row (row 1)
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navIconBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 2, borderColor: '#d97706',
  },
  navIconText: { fontSize: 18, fontWeight: '900' },
  navCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 1 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 2 },
  dotFilled: { backgroundColor: '#F97316' },
  dotEmpty: { backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
  dotFlash: { backgroundColor: '#FBBF24' },

  // Items row (row 2)
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

  // Exchange button (new spec)
  exchangeBtn: {
    height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 10,
  },
  exchangeBtnReady: { backgroundColor: '#059669', borderWidth: 2, borderColor: '#047857' },
  exchangeBtnLocked: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)' },
  exchangeBtnText: { fontWeight: '900', fontSize: 12 },
  exchangeBtnTextReady: { color: '#fff' },
  exchangeBtnTextLocked: { color: 'rgba(255,255,255,0.5)' },

  // Hamburger menu
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

  // Status
  statusLv: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statusLvLabel: { color: 'rgba(0,0,0,0.65)', fontSize: 11, fontWeight: '900' },
  statusLvValue: { color: '#111827', fontSize: 17, fontWeight: '900' },
  statusScore: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  scoreLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: 'rgba(0,0,0,0.55)' },
  scoreValue: { fontSize: 20, fontWeight: '900', letterSpacing: 1.2, color: '#111827' },

  // Mode indicator
  modeIndicator: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, backgroundColor: 'rgba(239,68,68,0.2)',
    paddingVertical: 5, marginHorizontal: 4, borderRadius: 8, marginTop: 2,
    height: 30,
  },
  modeHidden: {
    backgroundColor: 'transparent',
  },
  modePopup: {
    backgroundColor: 'transparent',
  },
  modeText: { fontWeight: '800', color: '#991b1b', fontSize: 12 },
  modeTextPlaceholder: { fontSize: 12 },
  modeCancelText: { fontWeight: '800', color: '#dc2626', fontSize: 12, textDecorationLine: 'underline' },
  popupInlineText: { color: '#d97706', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },

  // Board
  boardWrap: { alignItems: 'center' },
  board: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 8,
    borderColor: 'rgba(255,255,255,0.9)', elevation: 6,
  },
  // Cell styles are now in game/AnimatedCell.tsx

  // Footer
  footerPanel: { alignItems: 'center', paddingBottom: 4, paddingTop: 8, width: '100%' },
  footerLabelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 3, minHeight: 26,
  },
  footerLabel: {
    fontWeight: '800', fontSize: 12, color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(0,0,0,0.25)', paddingVertical: 2, paddingHorizontal: 10,
    borderRadius: 6, overflow: 'hidden',
  },
  footerScroll: { alignItems: 'center' },
  footerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  footerIconWrap: { padding: 2 },
  footerIconCard: {
    aspectRatio: 1, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  footerIconLocked: { backgroundColor: 'rgba(0,0,0,0.15)' },
  footerIconPulse: { borderColor: '#f59e0b', borderWidth: 2, backgroundColor: 'rgba(245,158,11,0.2)' },
  footerIcon: { width: '82%', height: '82%' },
  lockedText: { fontSize: 11, fontWeight: '900', color: 'rgba(0,0,0,0.3)', textAlign: 'center' },

  // Popup

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalCard: {
    width: '100%', maxWidth: 380, backgroundColor: '#fff',
    borderRadius: 20, padding: 24, alignItems: 'center', gap: 12,
  },
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

  charPopupTitle: { fontSize: 20, fontWeight: '900', color: '#d97706' },
  charPopupImage: { width: 140, height: 140 },
  charPopupName: { fontSize: 20, fontWeight: '900', color: '#111827' },
  charPopupDesc: { fontSize: 14, color: '#6b7280', fontWeight: '700' },

  // Rules
  rulesHeader: {
    backgroundColor: '#d97706', paddingVertical: 14, paddingHorizontal: 16,
    alignItems: 'center',
  },
  rulesHeaderText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  rulesCloseX: {
    position: 'absolute', right: 12, top: 12,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  rulesCloseXText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  rulesPage: { gap: 8, paddingVertical: 4 },
  rulesTitle: {
    fontSize: 16, fontWeight: '900', color: '#92400e', marginBottom: 4,
  },
  rulesText: { fontSize: 13, lineHeight: 21, color: '#374151', fontWeight: '600' },
  rulesBold: { fontWeight: '900', color: '#111827' },
  rulesTip: {
    fontSize: 12, lineHeight: 20, color: '#374151', fontWeight: '600',
    backgroundColor: '#fef3c7', borderRadius: 8, padding: 8, marginTop: 4,
  },
  rulesTable: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden', marginVertical: 4,
  },
  rulesTableHeader: {
    flexDirection: 'row', backgroundColor: '#f59e0b', paddingVertical: 6, paddingHorizontal: 4,
  },
  rulesTableRow: {
    flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  rulesTableCell: {
    flex: 1, fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center',
  },
  rulesExamples: {
    backgroundColor: '#f3f4f6', borderRadius: 8, padding: 8, gap: 4, marginVertical: 4,
  },
  rulesExample: { fontSize: 13, fontWeight: '600', color: '#374151' },
  rulesDiagram: {
    backgroundColor: '#1f2937', borderRadius: 8, padding: 12, alignItems: 'center', marginVertical: 4,
  },
  rulesDiagramText: { fontSize: 18, color: '#fff', fontFamily: 'monospace' },
  rulesNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  rulesNavText: { color: '#d97706', fontWeight: '900', fontSize: 15 },
  rulesPageNum: { color: '#9ca3af', fontWeight: '700' },

  // Settings
  settingsCard: {
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    width: '100%', maxWidth: 380, alignSelf: 'center',
  },
  settingsHeader: { backgroundColor: '#f59e0b', paddingVertical: 14, alignItems: 'center' },
  settingsHeaderText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  settingSection: { paddingHorizontal: 20, paddingVertical: 8 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6,
  },
  settingLabel: { fontSize: 15, fontWeight: '800', color: '#374151' },
  settingSubRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 5, paddingLeft: 8,
  },
  settingSubLabel: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  settingBtnRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  settingDivider: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 16 },

  volBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 2, borderColor: '#9ca3af', backgroundColor: '#fff',
  },
  volBtnActive: { backgroundColor: '#059669', borderColor: '#059669' },
  volBtnText: { fontSize: 13, fontWeight: '800', color: '#374151' },
  volBtnTextActive: { color: '#fff' },
  numSizeBtnActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },

  toggleBtn: { paddingVertical: 5, paddingHorizontal: 18, borderRadius: 20, borderWidth: 2 },
  toggleOn: { backgroundColor: '#d97706', borderColor: '#d97706' },
  toggleOff: { backgroundColor: '#fff', borderColor: '#ccc' },
  toggleText: { fontWeight: '800', fontSize: 13, color: '#999' },
  toggleTextOn: { color: '#fff' },

  bgmList: { gap: 4, paddingTop: 4 },
  bgmItem: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#f3f4f6' },
  bgmItemActive: { backgroundColor: '#fef3c7', borderWidth: 2, borderColor: '#f59e0b' },
  bgmItemText: { fontWeight: '700', color: '#374151' },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  nameInput: {
    flex: 1, borderWidth: 2, borderColor: '#d1d5db', borderRadius: 10,
    height: 56, paddingVertical: 14, paddingHorizontal: 12, fontSize: 16, fontWeight: '700', color: '#111827',
  },
  nameSaveBtn: { backgroundColor: '#f59e0b', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  nameSaveBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  nameHint: { fontSize: 12, color: '#9ca3af', fontWeight: '600', paddingTop: 2 },

  settingsCloseBtn: {
    paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee',
  },
  settingsCloseBtnText: { color: '#d97706', fontWeight: '900', fontSize: 16 },

  // Ranking
  // Ranking dialog (元アプリ準拠)
  rkDialog: {
    width: '100%', maxWidth: 440, maxHeight: '90%', minHeight: 300,
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    flexShrink: 1,
  },
  rkHeader: {
    backgroundColor: '#d97706', paddingVertical: 14, paddingHorizontal: 16,
    alignItems: 'center',
  },
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
  rkTab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  rkTabActive: { borderBottomColor: '#d97706' },
  rkTabText: { fontWeight: '800', fontSize: 13, color: '#aaa' },
  rkTabTextActive: { color: '#d97706' },
  rkPeriodTabs: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
  },
  rkPeriodTab: {
    flex: 1, paddingVertical: 5, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  rkPeriodTabActive: { borderBottomColor: '#d97706' },
  rkPeriodText: { fontWeight: '700', fontSize: 12, color: '#9ca3af' },
  rkPeriodTextActive: { color: '#d97706' },
  rkBody: { paddingHorizontal: 12, maxHeight: 400 },
  rkTh: {
    flexDirection: 'row', backgroundColor: '#fef3c7', paddingVertical: 6, paddingHorizontal: 4,
    borderWidth: 1, borderColor: '#fde68a',
  },
  rkThCell: {
    fontSize: 14, fontWeight: '800', color: '#92400e', textAlign: 'center',
    borderRightWidth: 1, borderRightColor: '#f0dca0',
  },
  rkTd: {
    flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb', alignItems: 'center',
  },
  rkTdEven: { backgroundColor: '#f9fafb' },
  rkTdCell: {
    fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'center',
    borderRightWidth: 1, borderRightColor: '#e5e7eb',
  },
  rkEmpty: { fontSize: 14, color: '#888', textAlign: 'center', paddingVertical: 24 },
  rkFooter: {
    paddingVertical: 12, paddingHorizontal: 16, gap: 6,
    borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  rkNote: { fontSize: 10, color: '#78716c', textAlign: 'center', marginBottom: 4 },
  rkWarning: { fontSize: 11, color: '#ef4444', fontWeight: '700', textAlign: 'center' },
  rkCloseBtn: {
    backgroundColor: '#d97706', paddingVertical: 8, paddingHorizontal: 24,
    borderRadius: 8,
  },
  rkCloseBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
