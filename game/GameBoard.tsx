import * as React from 'react';
import { View } from 'react-native';

import { AnimatedCell } from './AnimatedCell';
import type { Cell } from './types';

interface Props {
  grid: Cell[][];
  cellSize: number;
  cellGap: number;
  numFontSize: number;
  dropAnimation: boolean;
  convertedCells: Set<number>;
  highlightCells: Set<number>;
  explodingCells: Map<number, number>;
  explodePhase: number;
  isSelectMode: boolean;
  onCellPress: (r: number, c: number) => void;
}

export const GameBoard = React.memo(function GameBoard({
  grid,
  cellSize,
  cellGap,
  numFontSize,
  dropAnimation,
  convertedCells,
  highlightCells,
  explodingCells,
  explodePhase,
  isSelectMode,
  onCellPress,
}: Props) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const marginStyles = React.useMemo(() => {
    if (cellGap === 0) return null;
    const styles: (object | undefined)[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        styles.push({
          marginRight: c === cols - 1 ? 0 : cellGap,
          marginBottom: r === rows - 1 ? 0 : cellGap,
        });
      }
    }
    return styles;
  }, [cellGap, rows, cols]);

  const pressHandlers = React.useMemo(() => {
    const handlers: (() => void)[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        handlers.push(() => onCellPress(r, c));
      }
    }
    return handlers;
  }, [onCellPress, rows, cols]);

  return (
    <>
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const key = r * cols + c;
          return (
            <View key={key} style={marginStyles?.[key]}>
              <AnimatedCell
                cell={cell}
                cellSize={cellSize}
                numFontSize={numFontSize}
                dropAnimation={dropAnimation}
                isConverted={convertedCells.has(key)}
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
