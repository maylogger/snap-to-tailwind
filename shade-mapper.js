/**
 * 依 ref/helpers.ts 與 ref/createSwatches.test.ts 重寫：
 * - calculateStopFromColor：用 baseline 色階 + linear/perceived 的 value 找最近 stop
 * - createSwatches：先有 valueStop，以 valueStop 為錨點做 lightness 線性插值產生 50–950
 */
(function (global) {
  'use strict';

  var ALL_STOPS = [
    0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 1000,
  ];
  var STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

  // 參考色階：同一個藍 #1E70F6 在 500 的 50～950（與 ref/createSwatches.test.ts 一致）
  var BASELINE_LINEAR_PALETTE_1E70F6_STOP500 = [
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
  var BASELINE_PERCEIVED_PALETTE_1E70F6_STOP500 =
    BASELINE_LINEAR_PALETTE_1E70F6_STOP500;

  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }

  function hexToRGB(hex) {
    var H = String(hex).replace(/^#/, '').trim();
    if (H.length === 6 && H.indexOf('#') === -1) {
      H = H;
    }
    var r = 0,
      g = 0,
      b = 0;
    if (H.length === 4) {
      r = parseInt(H[1] + H[1], 16);
      g = parseInt(H[2] + H[2], 16);
      b = parseInt(H[3] + H[3], 16);
    } else if (H.length === 6) {
      r = parseInt(H.slice(0, 2), 16);
      g = parseInt(H.slice(2, 4), 16);
      b = parseInt(H.slice(4, 6), 16);
    }
    return { r: r, g: g, b: b };
  }

  // WCAG 相對亮度 0–1（與 chroma(hex).luminance() 一致）
  function luminanceFromRGB(r, g, b) {
    var R = r / 255;
    R = R <= 0.03928 ? R / 12.92 : Math.pow((R + 0.055) / 1.055, 2.4);
    var G = g / 255;
    G = G <= 0.03928 ? G / 12.92 : Math.pow((G + 0.055) / 1.055, 2.4);
    var B = b / 255;
    B = B <= 0.03928 ? B / 12.92 : Math.pow((B + 0.055) / 1.055, 2.4);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  // 回傳 { h, s, l }，h 0–360，s/l 0–100（與 ref/helpers hexToHSL 一致）
  function hexToHSL(hex) {
    var H = String(hex).replace(/^#/, '').trim();
    if (H.length === 6 && hex.indexOf('#') !== 0) {
      H = '#' + H;
    }
    var rgb = hexToRGB(hex.startsWith('#') ? hex : '#' + hex);
    var r = rgb.r / 255,
      g = rgb.g / 255,
      b = rgb.b / 255;
    var cmin = Math.min(r, g, b),
      cmax = Math.max(r, g, b),
      delta = cmax - cmin;
    var h = 0,
      s = 0,
      l = 0;
    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = parseFloat((s * 100).toFixed(1));
    l = parseFloat((l * 100).toFixed(1));
    return { h: h, s: s, l: l };
  }

  function HSLtoRGB(h, s, l) {
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r = 0,
      g = 0,
      b = 0;
    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 60 && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 180 && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 240 && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (h >= 300 && h < 360) {
      r = c;
      g = 0;
      b = x;
    }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  function rgbToHex(rgb) {
    var rHex = Math.round(rgb.r).toString(16);
    var gHex = Math.round(rgb.g).toString(16);
    var bHex = Math.round(rgb.b).toString(16);
    return (
      '#' +
      rHex.padStart(2, '0') +
      gHex.padStart(2, '0') +
      bHex.padStart(2, '0')
    );
  }

  function HSLToHex(h, s, l) {
    var rgb = HSLtoRGB(h, s, l);
    return rgbToHex(rgb);
  }

  /**
   * 算輸入色的「一個數字」0–100：與 ref 完全一致用 chroma
   * linear：chroma(hex).hsl() 的 L（0–1）* 100
   * perceived：chroma(hex).luminance() * 100
   */
  function valueFromColor(hex, colorMode) {
    var hexColor = hex.indexOf('#') === 0 ? hex : '#' + hex;
    if (typeof chroma !== 'undefined') {
      if (colorMode === 'linear') {
        return chroma(hexColor).hsl()[2] * 100;
      }
      return chroma(hexColor).luminance() * 100;
    }
    var rgb = hexToRGB(hexColor);
    if (colorMode === 'linear') {
      return hexToHSL(hexColor).l;
    }
    return luminanceFromRGB(rgb.r, rgb.g, rgb.b) * 100;
  }

  /**
   * 依 ref/helpers calculateStopFromColor：用 baseline 找與輸入 value 差異最小的 stop
   * @param {string} color - 色碼 "#RRGGBB" 或 "RRGGBB"
   * @param {"linear"|"perceived"} colorMode
   * @returns {number} 50 | 100 | … | 950
   */
  function calculateStopFromColor(color, colorMode) {
    var hexColor = color.indexOf('#') === 0 ? color : '#' + color;
    var value = valueFromColor(hexColor, colorMode);
    var baseline =
      colorMode === 'linear'
        ? BASELINE_LINEAR_PALETTE_1E70F6_STOP500
        : BASELINE_PERCEIVED_PALETTE_1E70F6_STOP500;
    var closestStop = 500;
    var smallestDiff = Infinity;
    for (var i = 0; i < baseline.length; i++) {
      var swatch = baseline[i];
      if (swatch.stop === 0 || swatch.stop === 1000) continue;
      var swatchValue = valueFromColor(swatch.hex, colorMode);
      var diff = Math.abs(swatchValue - value);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestStop = swatch.stop;
      }
    }
    return closestStop;
  }

  /**
   * 先有 valueStop，再以 valueStop 為錨點產生整條 50–950
   * 錨點：(0, lMax)、(valueStop, 輸入色 lightness)、(1000, lMin)，其餘線性插值
   * 在 stop === valueStop 那格直接塞入輸入色
   * 顏色計算一律用 chroma-js（與 ref 一致）
   */
  function createSwatches(config) {
    var value = config.value;
    var valueStop = config.valueStop;
    var hexColor = value.indexOf('#') === 0 ? value : '#' + value;

    var h0, s0, l0;
    if (typeof chroma !== 'undefined') {
      var hslArr = chroma(hexColor).hsl();
      h0 = hslArr[0];
      s0 = hslArr[1] * 100;
      l0 = hslArr[2] * 100;
    } else {
      var hsl = hexToHSL(hexColor);
      h0 = hsl.h;
      s0 = hsl.s;
      l0 = hsl.l;
    }

    var valueStopIdx = ALL_STOPS.indexOf(valueStop);
    if (valueStopIdx === -1) valueStopIdx = 5;

    var lMax = 97;
    var lMin = 5;

    var result = [];
    for (var i = 0; i < ALL_STOPS.length; i++) {
      var stop = ALL_STOPS[i];
      var L;
      if (stop <= valueStop) {
        if (valueStop === 0) {
          L = l0;
        } else {
          L = lMax + (l0 - lMax) * (stop / valueStop);
        }
      } else {
        if (valueStop === 1000) {
          L = l0;
        } else {
          L = l0 + (lMin - l0) * ((stop - valueStop) / (1000 - valueStop));
        }
      }
      L = clamp(L, 0, 100);

      var idx = ALL_STOPS.indexOf(stop);
      var scale = valueStopIdx === 0 ? 1 : idx / valueStopIdx;
      if (idx > valueStopIdx) {
        scale =
          valueStopIdx === ALL_STOPS.length - 1
            ? 1
            : 1 +
              (idx - valueStopIdx) *
                (0.3 / (ALL_STOPS.length - 1 - valueStopIdx));
      }
      var sScale = clamp(scale, 0.3, 1.2);
      var hScale = 1;
      var S = clamp(s0 * sScale, 0, 100);

      var hex;
      if (stop === valueStop) {
        hex = (
          hexColor.indexOf('#') === 0 ? hexColor : '#' + hexColor
        ).toUpperCase();
      } else if (typeof chroma !== 'undefined') {
        hex = chroma
          .hsl(h0, S / 100, L / 100)
          .hex()
          .toUpperCase();
      } else {
        hex = HSLToHex(h0, S, L).toUpperCase();
      }

      var outHsl;
      if (typeof chroma !== 'undefined') {
        var o = chroma(hex).hsl();
        outHsl = { h: o[0], s: o[1] * 100, l: o[2] * 100 };
      } else {
        outHsl = hexToHSL(hex);
      }
      result.push({
        stop: stop,
        hex: hex,
        h: outHsl.h,
        hScale: hScale,
        s: outHsl.s,
        sScale: sScale,
        l: outHsl.l,
      });
    }
    return result;
  }

  /**
   * 依顏色亮度判斷應放在 50–950 的哪一個 stop（對外 API，預設 perceived）
   * @param {string} hex - 色碼
   * @param {"linear"|"perceived"} [colorMode="perceived"]
   */
  function getShadeForColor(hex, colorMode) {
    colorMode = colorMode || 'perceived';
    return calculateStopFromColor(hex, colorMode);
  }

  global.ShadeMapper = {
    STOPS: STOPS.slice(),
    ALL_STOPS: ALL_STOPS.slice(),
    getShadeForColor: getShadeForColor,
    calculateStopFromColor: calculateStopFromColor,
    createSwatches: createSwatches,
    valueFromColor: valueFromColor,
    hexToHSL: hexToHSL,
    luminanceFromRGB: function (hex) {
      var r = hexToRGB(hex.indexOf('#') === 0 ? hex : '#' + hex);
      return luminanceFromRGB(r.r, r.g, r.b);
    },
  };
})(typeof window !== 'undefined' ? window : this);
