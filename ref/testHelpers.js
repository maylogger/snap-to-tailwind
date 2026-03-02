/**
 * 參考色階：同一個藍色 #1E70F6 在 stop 500 的 50～950 色階
 * 用於 calculateStopFromColor：與輸入色的 value 比較，選差異最小的 stop
 */

// Linear 模式：HSL lightness 為尺度的色階（來自 createSwatches 產出）
export const BASELINE_LINEAR_PALETTE_1E70F6_STOP500 = [
  { stop: 0, hex: '#FFFFFF' },
  { stop: 50, hex: '#E6F0FE' },
  { stop: 100, hex: '#D3E3FD' },
  { stop: 200, hex: '#A7C7FB' },
  { stop: 300, hex: '#76A8FA' },
  { stop: 400, hex: '#4A8CF8' },
  { stop: 500, hex: '#1E70F6' },
  { stop: 600, hex: '#0856D3' },
  { stop: 700, hex: '#06409D' },
  { stop: 800, hex: '#042C6C' },
  { stop: 900, hex: '#021636' },
  { stop: 950, hex: '#010A19' },
  { stop: 1000, hex: '#000000' },
];

// Perceived 模式：同一組 hex，比較時用 luminance 算 value（與 ref/helpers 一致）
export const BASELINE_PERCEIVED_PALETTE_1E70F6_STOP500 =
  BASELINE_LINEAR_PALETTE_1E70F6_STOP500;
