import { Image, ImageBackground } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLS, ROWS, DINO_NAMES, DINO_UNLOCK_LV, DINO_EMOJI, groupsNeeded, availableDinoTypes } from '../game/constants';
import { DINO_SOURCES } from '../game/images';
import {
  createGrid,
  createInitialState,
  getGroup,
  minGroupSize,
  explodeBomb,
  applyGravityAndRefill,
  eraseCells,
  eraseBombCells,
  hasValidMoves,
  shuffleGrid,
  convertType,
  checkLevelUp,
  calcScore,
} from '../game/logic';
import type { Cell, GameState } from '../game/types';
import { saveGameState, loadGameState, clearGameState, saveToRanking, loadSettings, saveSettings, type Settings } from '../game/storage';
import { startBGM, stopBGM, switchBGM, BGM_NAMES, getCurrentBGMIndex, onBgmChange, loadSoundEffects, playTick, playErase, playBomb, playGameOver, setSoundVolume } from '../game/sound';

const BG_IMAGE = require('../assets/images/bg.png');

const SCREEN_WIDTH = Dimensions.get('window').width;
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 36) : 44;

const VOLUME_OPTIONS = [
  { label: '消', value: 0 },
  { label: '小', value: 0.3 },
  { label: '中', value: 0.7 },
  { label: '大', value: 1.0 },
];

const NUM_SIZE_OPTIONS: { label: string; key: Settings['numberSize']; size: number }[] = [
  { label: '小', key: 'sm', size: 0.6 },
  { label: '中', key: 'md', size: 0.75 },
  { label: '大', key: 'lg', size: 0.95 },
  { label: '特大', key: 'xl', size: 1.2 },
];

// --- Single cell component with press animation ---
const CellView = React.memo(function CellView({
  cell,
  cellSize,
  isHighlight,
  isExploding,
  numFontSize,
  onPress,
}: {
  cell: Cell;
  cellSize: number;
  isHighlight: boolean;
  isExploding: boolean;
  numFontSize: number;
  onPress: () => void;
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const isEmpty = cell.type < 0;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.85,
      duration: 60,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 10,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.cell,
          {
            width: cellSize,
            height: cellSize,
            transform: [{ scale: scaleAnim }],
          },
          isEmpty && styles.cellEmpty,
          cell.bomb && styles.cellBomb,
          isHighlight && !cell.bomb && styles.cellHighlight,
          isHighlight && cell.bomb && styles.cellHighlightBomb,
          isExploding && styles.cellExploding,
        ]}
      >
        {!isEmpty && !cell.bomb && (
          <>
            <Image source={DINO_SOURCES[cell.type]} style={styles.cellImage} contentFit="cover" />
            <Text style={[styles.cellNum, { fontSize: numFontSize }]}>{cell.type + 1}</Text>
          </>
        )}
        {cell.bomb && <Text style={[styles.bombEmoji, { fontSize: cellSize * 0.6 }]}>🌋</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
});

export default function GameScreen() {
  const router = useRouter();

  // Layout calculations
  const horizontalPadding = 4;
  const boardBorder = 3;
  const boardPadding = 2;
  const cellGap = 1;
  const innerWidth = Math.min(460, SCREEN_WIDTH - horizontalPadding * 2) - boardBorder * 2 - boardPadding * 2;
  const cellSize = Math.floor((innerWidth - (COLS - 1) * cellGap) / COLS);
  const actualBoardInner = cellSize * COLS + cellGap * (COLS - 1);
  const gridMaxWidth = actualBoardInner + boardPadding * 2 + boardBorder * 2;

  // Game state
  const [gameState, setGameState] = React.useState<GameState | null>(null);
  const [animating, setAnimating] = React.useState(false);
  const [eraserMode, setEraserMode] = React.useState(false);
  const [henkouMode, setHenkouMode] = React.useState(false);
  const [highlightCells, setHighlightCells] = React.useState<Set<number>>(new Set());
  const [explodingCells, setExplodingCells] = React.useState<Set<number>>(new Set());
  const [popupText, setPopupText] = React.useState<string | null>(null);
  const [gameOverVisible, setGameOverVisible] = React.useState(false);
  const [settingsVisible, setSettingsVisible] = React.useState(false);
  const [rankingVisible, setRankingVisible] = React.useState(false);
  const [rulesVisible, setRulesVisible] = React.useState(false);
  const [rulesPage, setRulesPage] = React.useState(0);
  const [charPopup, setCharPopup] = React.useState<number | null>(null);
  const [flashButton, setFlashButton] = React.useState<string | null>(null);
  const [rankings, setRankings] = React.useState<{ score: number; level: number; date: string }[]>([]);

  // Settings state
  const [settings, setSettings] = React.useState<Settings>({
    soundVolume: 0.7, bgmOn: true, dropAnimation: true,
    bombWaveEffect: true, numberSize: 'lg', playerName: '',
  });
  const [nameInput, setNameInput] = React.useState('');
  const [bgmIndex, setBgmIndex] = React.useState(0);

  const popupTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize
  React.useEffect(() => {
    (async () => {
      const savedSettings = await loadSettings();
      setSettings(savedSettings);
      setNameInput(savedSettings.playerName);
      setSoundVolume(savedSettings.soundVolume);
      await loadSoundEffects();

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
    return () => { stopBGM(); unsub(); };
  }, []);

  // Auto-save
  React.useEffect(() => {
    if (gameState && gameState.running) saveGameState(gameState);
  }, [gameState]);

  const updateSettings = (partial: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      if (partial.soundVolume !== undefined) setSoundVolume(partial.soundVolume);
      saveSettings(next);
      return next;
    });
  };

  const showPopup = (text: string, duration = 1500) => {
    setPopupText(text);
    if (popupTimer.current) clearTimeout(popupTimer.current);
    popupTimer.current = setTimeout(() => setPopupText(null), duration);
  };

  if (!gameState) {
    return (
      <ImageBackground source={BG_IMAGE} style={styles.screen} contentFit="cover">
        <Text style={styles.loadingText}>読み込み中...</Text>
      </ImageBackground>
    );
  }

  const { grid, level, score, erasedGroups, eraserCount, shuffleCount, henkouCount, running } = gameState;
  const needed = groupsNeeded(level);
  const progressPct = Math.min(100, (erasedGroups / needed) * 100);
  const numSizeMultiplier = NUM_SIZE_OPTIONS.find(o => o.key === settings.numberSize)?.size ?? 0.75;
  const numFontSize = Math.max(10, cellSize * 0.32 * numSizeMultiplier / 0.75);

  const updateState = (partial: Partial<GameState>) => {
    setGameState(prev => prev ? { ...prev, ...partial } : prev);
  };

  // ====== Cell press handler ======
  const handleCellPress = async (r: number, c: number) => {
    if (animating || !running) return;
    const cell = grid[r][c];

    // Eraser mode
    if (eraserMode) {
      if (cell.type < 0) return;
      setEraserMode(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      playErase();
      const newGrid = eraseCells(grid, [[r, c]]);
      const filledGrid = applyGravityAndRefill(newGrid, level);
      const newState: GameState = { ...gameState, grid: filledGrid, eraserCount: eraserCount - 1 };
      setGameState(newState);
      checkAfterErase(newState);
      return;
    }

    // Henkou mode
    if (henkouMode) {
      if (cell.type < 0 || cell.bomb) return;
      setHenkouMode(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      playErase();
      const converted = convertType(grid, cell.type);
      const newState: GameState = { ...gameState, grid: converted, henkouCount: henkouCount - 1 };
      setGameState(newState);
      checkAfterErase(newState);
      return;
    }

    // Bomb click
    if (cell.bomb) {
      setAnimating(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      playBomb();
      const result = explodeBomb(grid, r, c);

      if (settings.bombWaveEffect) {
        setExplodingCells(result.destroyed);
        await delay(400);
        setExplodingCells(new Set());
      }

      const erased = eraseBombCells(grid, result.destroyed);
      const filledGrid = applyGravityAndRefill(erased, level);
      const bombScore = result.destroyed.size * 2;
      const newState: GameState = {
        ...gameState, grid: filledGrid,
        score: score + bombScore, erasedGroups: erasedGroups + 1,
      };
      showPopup(`🌋 +${bombScore}pts`);
      setGameState(newState);
      setAnimating(false);
      processLevelUp(newState);
      checkAfterErase(newState);
      return;
    }

    // Normal cell click
    if (cell.type < 0) return;
    const group = getGroup(grid, r, c);
    const required = minGroupSize(cell.type);

    if (group.length < required) {
      const hl = new Set(group.map(([gr, gc]) => gr * COLS + gc));
      setHighlightCells(hl);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      playTick();
      setTimeout(() => setHighlightCells(new Set()), 400);
      return;
    }

    // Valid group - erase with highlight phase
    setAnimating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playErase();

    const hl = new Set(group.map(([gr, gc]) => gr * COLS + gc));
    setHighlightCells(hl);
    await delay(250);

    // Erase highlighted cells (show empty briefly)
    const erased = eraseCells(grid, group);
    setGameState(prev => prev ? { ...prev, grid: erased } : prev);
    setHighlightCells(new Set());
    await delay(150);

    // Apply gravity and refill
    const filledGrid = applyGravityAndRefill(erased, level);
    const pts = calcScore(group.length, cell.type);
    const newState: GameState = {
      ...gameState, grid: filledGrid,
      score: score + pts, erasedGroups: erasedGroups + 1,
    };

    showPopup(pts >= 25 ? `+${pts}pts ✨` : `+${pts}pts`);
    setGameState(newState);
    setAnimating(false);
    processLevelUp(newState);
    checkAfterErase(newState);
  };

  const processLevelUp = (state: GameState) => {
    const result = checkLevelUp(state);
    if (!result.leveled) return;

    const updates: Partial<GameState> = { level: result.newLevel, erasedGroups: 0 };
    if (result.earnedEraser) updates.eraserCount = (state.eraserCount || 0) + 1;
    if (result.earnedShuffle) updates.shuffleCount = (state.shuffleCount || 0) + 1;
    if (result.earnedHenkou) updates.henkouCount = (state.henkouCount || 0) + 1;

    if (result.newTypes.length > 0) {
      const announced = [...state.announcedTypes];
      for (const t of result.newTypes) {
        if (!announced.includes(t)) {
          announced.push(t);
          setTimeout(() => setCharPopup(t), 500);
        }
      }
      updates.announcedTypes = announced;
    }

    let msg = `🎉 LV${result.newLevel}!`;
    const items: string[] = [];
    if (result.earnedEraser) items.push('消×1');
    if (result.earnedShuffle) items.push('混×1');
    if (result.earnedHenkou) items.push('変×1');
    if (items.length > 0) msg += ` ${items.join(' ')}`;
    showPopup(msg, 2000);
    setGameState(prev => prev ? { ...prev, ...updates } : prev);
  };

  const checkAfterErase = (state: GameState) => {
    setTimeout(() => {
      if (!hasValidMoves(state.grid)) {
        if (state.eraserCount > 0) {
          setFlashButton('eraser');
          setTimeout(() => setFlashButton(null), 3000);
        } else if (state.shuffleCount > 0) {
          setFlashButton('shuffle');
          setTimeout(() => setFlashButton(null), 3000);
        } else if (state.henkouCount > 0) {
          setFlashButton('henkou');
          setTimeout(() => setFlashButton(null), 3000);
        } else {
          handleGameOver(state);
        }
      }
    }, 200);
  };

  const handleGameOver = async (state: GameState) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    playGameOver();
    await stopBGM();
    updateState({ running: false });
    await clearGameState();
    await saveToRanking(state.score, state.level);
    setGameOverVisible(true);
    showPopup('GAME OVER', 3000);
  };

  const handleRestart = async () => {
    setGameOverVisible(false);
    const initial = createInitialState();
    setGameState(initial);
    showPopup('ゲームスタート！');
    if (settings.bgmOn) { try { await startBGM(); } catch {} }
  };

  const handleRetire = () => {
    Alert.alert('リタイア', 'ゲームを終了しますか？スコアは記録されます。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'リタイア', style: 'destructive', onPress: () => handleGameOver(gameState) },
    ]);
  };

  const handleShuffle = () => {
    if (shuffleCount <= 0 || animating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const shuffled = shuffleGrid(grid);
    setGameState(prev => prev ? { ...prev, grid: shuffled, shuffleCount: prev.shuffleCount - 1 } : prev);
    showPopup('シャッフル！');
  };

  const handleEraser = () => {
    if (eraserCount <= 0 || animating) return;
    setHenkouMode(false);
    setEraserMode(!eraserMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleHenkou = () => {
    if (henkouCount <= 0 || animating) return;
    setEraserMode(false);
    setHenkouMode(!henkouMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleHint = () => {
    // Find a valid move and highlight it with a pulsing border
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c].bomb) {
          setHighlightCells(new Set([r * COLS + c]));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setTimeout(() => setHighlightCells(new Set()), 2000);
          showPopup('🌋 ボルケーノをタップ！');
          return;
        }
        if (grid[r][c].type < 0) continue;
        const group = getGroup(grid, r, c);
        if (group.length >= minGroupSize(grid[r][c].type)) {
          setHighlightCells(new Set(group.map(([gr, gc]) => gr * COLS + gc)));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setTimeout(() => setHighlightCells(new Set()), 2000);
          showPopup(`${DINO_NAMES[grid[r][c].type]}を${group.length}個消せる！`);
          return;
        }
      }
    }
    // No valid moves found
    if (eraserCount > 0 || shuffleCount > 0 || henkouCount > 0) {
      showPopup('アイテムを使おう！');
    }
  };

  const handleExit = () => {
    Alert.alert('終了', 'ゲームを保存して戻りますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '保存して戻る', onPress: async () => { await saveGameState(gameState); await stopBGM(); router.back(); } },
    ]);
  };

  // ====== Render ======
  return (
    <ImageBackground source={BG_IMAGE} style={styles.screen} contentFit="cover">
      <View style={{ paddingTop: STATUS_BAR_HEIGHT, flex: 1 }}>
        {/* Header */}
        <View style={[styles.headerCard, { marginHorizontal: horizontalPadding }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={[styles.smallBtn, styles.smallBtnOutline]} onPress={() => setRulesVisible(true)}>
              <Text style={[styles.smallBtnText, styles.smallBtnTextOutline]}>？</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallBtn, styles.smallBtnOutline]} onPress={() => {
              import('../game/storage').then(m => m.loadRankings()).then(r => { setRankings(r); setRankingVisible(true); });
            }}>
              <Text style={[styles.smallBtnText, styles.smallBtnTextOutline]}>ランキング</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallBtn, styles.smallBtnOutline]} onPress={() => setSettingsVisible(true)}>
              <Text style={[styles.smallBtnText, styles.smallBtnTextOutline]}>設定</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallBtn, styles.smallBtnGhost]} onPress={handleExit}>
              <Text style={[styles.smallBtnText, styles.smallBtnTextGhost]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerRowWrap}>
            <TouchableOpacity style={[styles.actionBtn, styles.retireBtn]} onPress={handleRetire}>
              <Text style={styles.actionBtnText}>リタイア</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.hintBtn]} onPress={handleHint}>
              <Text style={styles.actionBtnText}>ヒント</Text>
            </TouchableOpacity>
            <View style={styles.itemsGroup}>
              {[
                { key: 'eraser', label: '消', count: eraserCount, mode: eraserMode, handler: handleEraser },
                { key: 'shuffle', label: '混', count: shuffleCount, mode: false, handler: handleShuffle },
                { key: 'henkou', label: '変', count: henkouCount, mode: henkouMode, handler: handleHenkou },
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
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusLv}>
              <Text style={styles.statusLvLabel}>LV</Text>
              <Text style={styles.statusLvValue}>{level}</Text>
            </View>
            <View style={styles.statusProgress}>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.progressText}>{erasedGroups}/{needed}</Text>
            </View>
            <View style={styles.statusScore}>
              <Text style={styles.scoreLabel}>SCORE</Text>
              <Text style={styles.scoreValue}>{String(score).padStart(6, '0')}</Text>
            </View>
          </View>
        </View>

        {/* Mode indicator */}
        {(eraserMode || henkouMode) && (
          <View style={styles.modeIndicator}>
            <Text style={styles.modeText}>
              {eraserMode ? '🔴 消したいセルをタップ' : '🟡 変換する恐竜をタップ'}
            </Text>
            <TouchableOpacity onPress={() => { setEraserMode(false); setHenkouMode(false); }}>
              <Text style={styles.modeCancelText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Board */}
        <View style={styles.centerArea}>
          <View style={[styles.boardWrap, { width: gridMaxWidth }]}>
            <View style={[styles.board, { padding: boardPadding, borderWidth: boardBorder }]}>
              {grid.map((row, r) =>
                row.map((cell, c) => {
                  const key = r * COLS + c;
                  return (
                    <View
                      key={key}
                      style={{
                        marginRight: c === COLS - 1 ? 0 : cellGap,
                        marginBottom: r === ROWS - 1 ? 0 : cellGap,
                      }}
                    >
                      <CellView
                        cell={cell}
                        cellSize={cellSize}
                        isHighlight={highlightCells.has(key)}
                        isExploding={explodingCells.has(key)}
                        numFontSize={numFontSize}
                        onPress={() => handleCellPress(r, c)}
                      />
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>

        {/* Footer: dino panel */}
        <View style={[styles.footerPanel, { marginHorizontal: horizontalPadding }]}>
          <View style={styles.footerGrid}>
            {DINO_SOURCES.map((src, i) => {
              const unlocked = level >= DINO_UNLOCK_LV[i];
              return (
                <View key={i} style={styles.footerIconWrap}>
                  <View style={[styles.footerIconCard, !unlocked && styles.footerIconLocked]}>
                    {unlocked ? (
                      <Image source={src} style={styles.footerIcon} contentFit="contain" />
                    ) : (
                      <Text style={styles.lockedText}>?</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Popup */}
      {popupText && (
        <View style={styles.popupOverlay} pointerEvents="none">
          <View style={styles.popupBox}>
            <Text style={styles.popupBoxText}>{popupText}</Text>
          </View>
        </View>
      )}

      {/* Game Over */}
      <Modal visible={gameOverVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>GAME OVER</Text>
            <Text style={styles.modalScore}>スコア: {score}</Text>
            <Text style={styles.modalLevel}>レベル: {level}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={handleRestart}>
              <Text style={styles.modalBtnText}>もう一度プレイ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={async () => {
              setGameOverVisible(false); await stopBGM(); router.back();
            }}>
              <Text style={styles.modalBtnTextSecondary}>タイトルに戻る</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Character Popup */}
      <Modal visible={charPopup !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {charPopup !== null && (
              <>
                <Text style={styles.charPopupTitle}>新しい仲間！</Text>
                <Image source={DINO_SOURCES[charPopup]} style={styles.charPopupImage} contentFit="contain" />
                <Text style={styles.charPopupName}>{DINO_NAMES[charPopup]} {DINO_EMOJI[charPopup]}</Text>
                <Text style={styles.charPopupDesc}>数字: {charPopup + 1}（{charPopup + 1}個つながると消せる）</Text>
                <TouchableOpacity style={styles.modalBtn} onPress={() => setCharPopup(null)}>
                  <Text style={styles.modalBtnText}>OK</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Rules */}
      <Modal visible={rulesVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>あそびかた</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {rulesPage === 0 && (
                <Text style={styles.rulesText}>
                  🦕 <Text style={styles.rulesBold}>恐竜けし</Text>は、同じ恐竜をつなげて消すパズルゲームです。{'\n\n'}
                  ● 各恐竜には数字が書かれています{'\n'}
                  ● その数字の数だけつながっていると消せます{'\n'}
                  ● 例: 「1」は1個で消せる、「3」は3個つながると消せる
                </Text>
              )}
              {rulesPage === 1 && (
                <Text style={styles.rulesText}>
                  🌋 <Text style={styles.rulesBold}>ボルケーノ（噴火）</Text>{'\n\n'}
                  ● タップするとその行と列が全て消えます{'\n'}
                  ● 範囲内に別の🌋があると連鎖爆発{'\n'}
                  ● 盤面に同時に最大2個まで出現
                </Text>
              )}
              {rulesPage === 2 && (
                <Text style={styles.rulesText}>
                  🔧 <Text style={styles.rulesBold}>アイテム</Text>{'\n\n'}
                  【消】LV3〜 1マスだけ消せる{'\n'}
                  【混】LV5〜 盤面をシャッフル{'\n'}
                  【変】LV10〜 選んだ恐竜を基本種に変換
                </Text>
              )}
              {rulesPage === 3 && (
                <Text style={styles.rulesText}>
                  📈 <Text style={styles.rulesBold}>レベルアップ</Text>{'\n\n'}
                  ● 一定数のグループを消すとレベルアップ{'\n'}
                  ● レベルが上がると新しい恐竜が登場{'\n'}
                  ● レベルアップでアイテムを獲得
                </Text>
              )}
              {rulesPage === 4 && (
                <Text style={styles.rulesText}>
                  💀 <Text style={styles.rulesBold}>ゲームオーバー</Text>{'\n\n'}
                  ● 消せるグループがなくアイテムもない場合{'\n'}
                  ● ヒントボタンで消せる場所を確認できます
                </Text>
              )}
            </ScrollView>
            <View style={styles.rulesNav}>
              {rulesPage > 0 ? (
                <TouchableOpacity onPress={() => setRulesPage(rulesPage - 1)}>
                  <Text style={styles.rulesNavText}>◀ 前へ</Text>
                </TouchableOpacity>
              ) : <View />}
              <Text style={styles.rulesPageNum}>{rulesPage + 1}/5</Text>
              {rulesPage < 4 ? (
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
      </Modal>

      {/* Settings */}
      <Modal visible={settingsVisible} transparent animationType="fade">
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

              {/* Effects */}
              <View style={styles.settingSection}>
                <Text style={styles.settingLabel}>✨ エフェクト</Text>
                <View style={styles.settingSubRow}>
                  <Text style={styles.settingSubLabel}>落下アニメ</Text>
                  <TouchableOpacity
                    style={[styles.toggleBtn, settings.dropAnimation ? styles.toggleOn : styles.toggleOff]}
                    onPress={() => updateSettings({ dropAnimation: !settings.dropAnimation })}
                  >
                    <Text style={[styles.toggleText, settings.dropAnimation && styles.toggleTextOn]}>
                      {settings.dropAnimation ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.settingSubRow}>
                  <Text style={styles.settingSubLabel}>火山エフェクト</Text>
                  <TouchableOpacity
                    style={[styles.toggleBtn, settings.bombWaveEffect ? styles.toggleOn : styles.toggleOff]}
                    onPress={() => updateSettings({ bombWaveEffect: !settings.bombWaveEffect })}
                  >
                    <Text style={[styles.toggleText, settings.bombWaveEffect && styles.toggleTextOn]}>
                      {settings.bombWaveEffect ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.settingDivider} />

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
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                  >
                    <Text style={styles.nameSaveBtnText}>保存</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.nameHint}>現在: {settings.playerName || '未設定'}</Text>
              </View>

              <TouchableOpacity style={styles.settingsCloseBtn} onPress={() => setSettingsVisible(false)}>
                <Text style={styles.settingsCloseBtnText}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Ranking */}
      <Modal visible={rankingVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>ランキング</Text>
            <ScrollView>
              {rankings.length === 0 ? (
                <Text style={styles.rankEmpty}>まだ記録がありません</Text>
              ) : (
                rankings.map((entry, i) => (
                  <View key={i} style={styles.rankRow}>
                    <Text style={styles.rankNum}>{i + 1}.</Text>
                    <Text style={styles.rankScore}>{entry.score}pts</Text>
                    <Text style={styles.rankLevel}>LV{entry.level}</Text>
                    <Text style={styles.rankDate}>{entry.date}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setRankingVisible(false)}>
              <Text style={styles.modalBtnText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
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
  centerArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },

  // Header
  headerCard: {
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: 6, gap: 6,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerRowWrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  smallBtn: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 999 },
  smallBtnOutline: {
    backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 2, borderColor: '#d97706',
  },
  smallBtnText: { fontWeight: '900', fontSize: 12 },
  smallBtnTextOutline: { color: '#d97706' },
  smallBtnGhost: { marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.15)' },
  smallBtnTextGhost: { color: 'white' },

  actionBtn: { borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
  retireBtn: { backgroundColor: '#dc2626' },
  hintBtn: { backgroundColor: '#0891b2' },
  actionBtnText: { color: 'white', fontWeight: '900', fontSize: 13 },

  itemsGroup: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  itemBtn: { width: 42, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)' },
  itemBtnActive: { backgroundColor: '#f59e0b', borderWidth: 2, borderColor: '#d97706' },
  itemBtnSelected: { backgroundColor: '#ef4444', borderColor: '#b91c1c' },
  itemBtnFlash: { backgroundColor: '#fbbf24', borderColor: '#f59e0b' },
  itemBtnText: { fontWeight: '900', fontSize: 15 },
  itemBtnTextDisabled: { color: 'rgba(0,0,0,0.35)' },
  itemBtnTextActive: { color: '#fff' },
  itemCount: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#ef4444', color: '#fff', fontSize: 10,
    fontWeight: '900', borderRadius: 8, minWidth: 16,
    textAlign: 'center', paddingHorizontal: 3, overflow: 'hidden',
  },

  // Status
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 10,
    paddingVertical: 6, paddingHorizontal: 8,
  },
  statusLv: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statusLvLabel: { color: 'rgba(0,0,0,0.65)', fontSize: 11, fontWeight: '900' },
  statusLvValue: { color: '#111827', fontSize: 17, fontWeight: '900' },
  statusProgress: { flex: 1, gap: 4, alignItems: 'center' },
  progressBarTrack: {
    width: '100%', height: 8, backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 999, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 999 },
  progressText: { fontSize: 11, fontWeight: '800', color: 'rgba(0,0,0,0.7)' },
  statusScore: { alignItems: 'flex-end' },
  scoreLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: 'rgba(0,0,0,0.55)' },
  scoreValue: { fontSize: 16, fontWeight: '900', letterSpacing: 1.4, color: '#111827' },

  // Mode indicator
  modeIndicator: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, backgroundColor: 'rgba(239,68,68,0.2)',
    paddingVertical: 5, marginHorizontal: 4, borderRadius: 8, marginTop: 3,
  },
  modeText: { fontWeight: '800', color: '#991b1b', fontSize: 12 },
  modeCancelText: { fontWeight: '800', color: '#dc2626', fontSize: 12, textDecorationLine: 'underline' },

  // Board
  boardWrap: { alignItems: 'center' },
  board: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 8,
    borderColor: 'rgba(255,255,255,0.9)', elevation: 6,
  },
  cell: {
    borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  cellEmpty: { backgroundColor: 'rgba(0,0,0,0.04)' },
  cellBomb: { backgroundColor: '#7f1d1d' },
  cellHighlight: { backgroundColor: '#fef08a', borderWidth: 2, borderColor: '#f59e0b' },
  cellHighlightBomb: { backgroundColor: '#fca5a5', borderWidth: 2, borderColor: '#ef4444' },
  cellExploding: { backgroundColor: '#fbbf24', opacity: 0.5 },
  cellImage: { width: '100%', height: '100%' },
  cellNum: {
    position: 'absolute', bottom: 1, right: 3,
    color: '#ffffff', fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3,
  },
  bombEmoji: {},

  // Footer
  footerPanel: { alignItems: 'center', paddingBottom: 4, paddingTop: 2 },
  footerGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap' },
  footerIconWrap: { width: `${100 / 9}%`, padding: 1 },
  footerIconCard: {
    aspectRatio: 1, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  footerIconLocked: { backgroundColor: 'rgba(0,0,0,0.15)' },
  footerIcon: { width: '80%', height: '80%' },
  lockedText: { fontSize: 14, fontWeight: '900', color: 'rgba(0,0,0,0.3)' },

  // Popup
  popupOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  popupBox: {
    backgroundColor: 'rgba(0,0,0,0.82)',
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16,
  },
  popupBoxText: { color: '#fbbf24', fontSize: 22, fontWeight: '900', letterSpacing: 1 },

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
  rulesText: { fontSize: 14, lineHeight: 22, color: '#374151', paddingVertical: 8 },
  rulesBold: { fontWeight: '900', color: '#111827' },
  rulesNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', marginTop: 8,
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
    paddingVertical: 6, paddingHorizontal: 12, fontSize: 14, fontWeight: '700',
  },
  nameSaveBtn: { backgroundColor: '#f59e0b', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  nameSaveBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  nameHint: { fontSize: 12, color: '#9ca3af', fontWeight: '600', paddingTop: 2 },

  settingsCloseBtn: {
    paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee',
  },
  settingsCloseBtnText: { color: '#d97706', fontWeight: '900', fontSize: 16 },

  // Ranking
  rankEmpty: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingVertical: 20 },
  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  rankNum: { width: 28, fontWeight: '900', color: '#d97706', fontSize: 16 },
  rankScore: { flex: 1, fontWeight: '800', color: '#111827', fontSize: 15 },
  rankLevel: { fontWeight: '700', color: '#6b7280', fontSize: 13 },
  rankDate: { fontWeight: '600', color: '#9ca3af', fontSize: 12 },
});
