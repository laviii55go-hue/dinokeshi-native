export interface Cell {
  type: number;   // dinosaur type 0-16
  bomb: boolean;  // is volcano bomb
  gen?: number;   // generation counter for animation detection
}

export interface GameState {
  grid: Cell[][];           // [row][col]
  level: number;
  score: number;
  erasedGroups: number;     // groups erased toward next level
  eraserCount: number;
  shuffleCount: number;
  henkouCount: number;
  allCount: number;         // ALL (erase all of one type) count
  running: boolean;
  announcedTypes: number[]; // character introductions shown
}
