import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const PARTICLE_COUNT = 12;
const PARTICLE_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#06b6d4', '#3b82f6',
  '#8b5cf6', '#ec4899', '#f43f5e', '#fbbf24',
];

interface Props {
  cellSize: number;
  delayMs: number;  // cascade delay from bomb distance
  onDone: () => void;
}

// Single particle with its own shared values
function Particle({
  cellSize,
  delayMs,
  color,
  angle,
  speed,
  index,
}: {
  cellSize: number;
  delayMs: number;
  color: string;
  angle: number;
  speed: number;
  index: number;
}) {
  const progress = useSharedValue(0);
  const size = 3 + Math.random() * 3; // 3-6px

  React.useEffect(() => {
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration: 350 + Math.random() * 150, easing: Easing.out(Easing.quad) })
    );
  }, []);

  const dx = Math.cos(angle) * speed;
  const dy = Math.sin(angle) * speed;

  const animStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateX: dx * p },
        { translateY: dy * p + 30 * p * p }, // gravity curve
        { scale: 1 - p * 0.8 },
      ],
      opacity: 1 - p,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: cellSize / 2 - size / 2,
          top: cellSize / 2 - size / 2,
        },
        animStyle,
      ]}
    />
  );
}

export function ParticleExplosion({ cellSize, delayMs, onDone }: Props) {
  const [alive, setAlive] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setAlive(false);
      onDone();
    }, delayMs + 600);
    return () => clearTimeout(timer);
  }, []);

  if (!alive) return null;

  const particles = React.useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5;
      const speed = cellSize * 0.4 + Math.random() * cellSize * 0.5;
      const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
      return { angle, speed, color, key: i };
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map(p => (
        <Particle
          key={p.key}
          cellSize={cellSize}
          delayMs={delayMs}
          color={p.color}
          angle={p.angle}
          speed={p.speed}
          index={p.key}
        />
      ))}
    </View>
  );
}
