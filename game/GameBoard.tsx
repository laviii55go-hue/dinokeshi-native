import * as React from 'react';
import { View } from 'react-native';

import { COLS, ROWS } from './constants';
import { AnimatedCell } from './AnimatedCell';
import type { Cell } from './types';

interface Props {
  grid: Cell[][];
  cellSize: number;
  cellGap: number;
  numFontSize: number;
  dropAnimation: boolean;
  highlightCells: Set<number>;
  explodingCells: Map<number, number>;
  explodePhase: number;
  isSelectMode: boolean;
  onCellPress: (r: number, c: number) => void;
}

// Pre-compute cell press handlers and margin styles to avoid re-creation
export const GameBoard = React.memo(function GameBoard({
  grid,
  cellSize,
  cellGap,
  numFontSize,
  dropAnimation,
  highlightCells,
  explodingCells,
  explodePhase,
  isSelectMode,
  onCellPress,
}: Props) {
  // Memoize margin styles - only recompute when cellGap changes
  const marginStyles = React.useMemo(() => {
    if (cellGap === 0) return null;
    const styles: (object | undefined)[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        styles.push({
          marginRight: c === COLS - 1 ? 0 : cellGap,
          marginBottom: r === ROWS - 1 ? 0 : cellGap,
        });
      }
    }
    return styles;
  }, [cellGap]);

  // Memoize press handlers - stable references per cell position
  const pressHandlers = React.useMemo(() => {
    const handlers: (() => void)[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        handlers.push(() => onCellPress(r, c));
      }
    }
    return handlers;
  }, [onCellPress]);

  return (
    <>
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const key = r * COLS + c;
          return (
            <View key={key} style={marginStyles?.[key]}>
              <AnimatedCell
                cell={cell}
                cellSize={cellSize}
                numFontSize={numFontSize}
                dropAnimation={dropAnimation}
                isHighlight={highlightCells.has(key)}
                isExploding={explodingCells.has(key)}
                explodeDistance={explodingCells.get(key) ?? -1}
                explodePhase={explodePhase}
                isSelectMode={isSelectMode && cell.type >= 0}
                onPress={pressHandlers[key]}
              />
            </View>
          );
        })
      )}
    </>
  );
});
