import { Image } from 'expo-image';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

import type { Cell } from './types';
import { DINO_SOURCES } from './images';

interface Props {
  cell: Cell;
  cellSize: number;
  numFontSize: number;
  dropAnimation: boolean;
  isHighlight: boolean;
  isExploding: boolean;
  explodeDistance: number; // Manhattan distance from bomb, -1 if not exploding
  explodePhase: number;
  isSelectMode: boolean;
  onPress: () => void;
}

function cellSig(cell: Cell): string {
  return `${cell.type}:${cell.bomb}`;
}

const WAVE_DELAY_PER_STEP = 20; // ms per distance unit

export const AnimatedCell = React.memo(function AnimatedCell({
  cell,
  cellSize,
  numFontSize,
  dropAnimation,
  isHighlight,
  isExploding,
  explodeDistance,
  explodePhase,
  isSelectMode,
  onPress,
}: Props) {
  const isEmpty = cell.type < 0;

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const prevSig = React.useRef(cellSig(cell));
  const prevType = React.useRef(cell.type);

  // Cell change detection: shrink-out old → appear new
  React.useEffect(() => {
    const newSig = cellSig(cell);
    if (newSig !== prevSig.current) {
      const wasVisible = prevType.current >= 0;
      prevSig.current = newSig;
      prevType.current = cell.type;

      // Instant swap - no animation delay
      translateY.value = 0;
      opacity.value = 1;
      scale.value = 1;
    }
  }, [cell.type, cell.bomb]);

  // Highlight pulse
  React.useEffect(() => {
    if (isHighlight) {
      scale.value = withSequence(
        withTiming(1.03, { duration: 60 }),
        withTiming(1.0, { duration: 60 }),
      );
    }
  }, [isHighlight]);

  // Cascading explosion effect with distance-based delay
  React.useEffect(() => {
    if (isExploding && explodePhase > 0 && explodeDistance >= 0) {
      const delayMs = explodeDistance * WAVE_DELAY_PER_STEP;

      // Cascade: delayed scale pop + color flash
      scale.value = withDelay(
        delayMs,
        withSequence(
          withTiming(1.25, { duration: 30 }),
          withTiming(0.85, { duration: 30 }),
          withTiming(1.0, { duration: 40 }),
        ),
      );
      // Fade out after wave reaches this cell
      opacity.value = withDelay(
        delayMs + 75,
        withTiming(0.15, { duration: 75 }),
      );

    } else if (!isExploding) {
      opacity.value = withTiming(1, { duration: 40 });
      scale.value = withTiming(1, { duration: 40 });
    }
  }, [isExploding, explodePhase, explodeDistance]);

  // Press gesture on UI thread
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      runOnJS(onPress)();
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  // Colors based on state (computed on JS thread, cheap)
  const bgColor = isEmpty
    ? 'rgba(0,0,0,0.04)'
    : cell.bomb
    ? '#7f1d1d'
    : isHighlight && !cell.bomb
    ? '#fef08a'
    : isHighlight && cell.bomb
    ? '#fca5a5'
    : isExploding
    ? '#ef4444'
    : 'rgba(255,255,255,0.88)';

  const borderColor = isHighlight && !cell.bomb
    ? '#f59e0b'
    : isHighlight && cell.bomb
    ? '#ef4444'
    : isExploding
    ? '#dc2626'
    : isSelectMode && !isEmpty
    ? '#fbbf24'
    : 'transparent';

  return (
    <View style={{ width: cellSize, height: cellSize }}>
      <GestureDetector gesture={tapGesture}>
        <Animated.View
          style={[
            s.cell,
            { width: cellSize, height: cellSize, backgroundColor: bgColor, borderColor },
            animStyle,
          ]}
        >
          {!isEmpty && !cell.bomb && (
            <>
              <Image source={DINO_SOURCES[cell.type]} style={s.cellImage} contentFit="cover" />
              <Text style={[s.cellNum, { fontSize: numFontSize }]}>{cell.type + 1}</Text>
            </>
          )}
          {cell.bomb && (
            <Text style={{ fontSize: cellSize * 0.6 }}>🌋</Text>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}, (prev, next) => {
  return (
    prev.cell.type === next.cell.type &&
    prev.cell.bomb === next.cell.bomb &&
    prev.dropAnimation === next.dropAnimation &&
    prev.isHighlight === next.isHighlight &&
    prev.isExploding === next.isExploding &&
    prev.explodeDistance === next.explodeDistance &&
    prev.explodePhase === next.explodePhase &&
    prev.isSelectMode === next.isSelectMode &&
    prev.cellSize === next.cellSize &&
    prev.numFontSize === next.numFontSize
  );
});

const s = StyleSheet.create({
  cell: {
    borderRadius: 3,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cellImage: {
    width: '100%',
    height: '100%',
  },
  cellNum: {
    position: 'absolute',
    bottom: 1,
    right: 3,
    color: '#ffffff',
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
