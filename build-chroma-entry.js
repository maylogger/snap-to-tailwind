/**
 * 供 esbuild 打包：把 chroma-js 暴露成全域 window.chroma（與 ref 一致）
 */
import chroma from 'chroma-js';
if (typeof window !== 'undefined') {
  window.chroma = chroma;
}
