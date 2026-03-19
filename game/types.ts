export interface Cell {
  type: number;   // dinosaur type 0-16
  bomb: boolean;  // is volcano bomb
}

export interface GameState {
  grid: Cell[][];           // [row][col]
  level: number;
  score: number;
  erasedGroups: number;     // groups erased toward next level
  eraserCount: number;
  shuffleCount: number;
  henkouCount: number;
  running: boolean;
  announcedTypes: number[]; // character introductions shown
}
