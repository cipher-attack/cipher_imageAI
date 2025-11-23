export interface GeneratedImageResult {
  imageUrl: string;
  description?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  UPLOADING = 'UPLOADING',
  GENERATING = 'GENERATING',
  EXPLAINING = 'EXPLAINING', // New state for education mode
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export enum DiagramStyle {
  STANDARD = 'Standard',
  LINE_ART = 'Line Art',
  REALISTIC = 'Realistic',
  NEON = 'Neon Cyberpunk', // New
  BLUEPRINT = 'Blueprint', // New
  SKETCH = 'Hand Sketch' // New
}

export interface HistoryItem {
  id: string;
  original: string;
  generated: string;
  prompt: string;
  date: number;
}

export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE = '4:3',
  PORTRAIT = '3:4',
  WIDE = '16:9'
}