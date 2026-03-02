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

  /* =========================
     sRGB ↔ OKLab ↔ OKLCH 轉換
     參考 Björn Ottosson OKLab 標準矩陣
  ========================= */

  function srgbChannelToLinear(c) {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function linearToSrgbChannel(c) {
    c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return clamp(Math.round(c * 255), 0, 255);
  }

  function rgbToOklabArr(r, g, b) {
    var R = srgbChannelToLinear(r);
    var G = srgbChannelToLinear(g);
    var B = srgbChannelToLinear(b);
    var l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
    var m = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
    var s = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;
    var lp = Math.cbrt(l),
      mp = Math.cbrt(m),
      sp = Math.cbrt(s);
    return [
      0.2104542553 * lp + 0.793617785 * mp - 0.0040720468 * sp,
      1.9779984951 * lp - 2.428592205 * mp + 0.4505937099 * sp,
      0.0259040371 * lp + 0.7827717662 * mp - 0.808675766 * sp,
    ];
  }

  function oklabToLinearRgb(L, a, b) {
    var lp = L + 0.3963377774 * a + 0.2158037573 * b;
    var mp = L - 0.1055613458 * a - 0.0638541728 * b;
    var sp = L - 0.0894841775 * a - 1.291485548 * b;
    var l = lp * lp * lp;
    var m = mp * mp * mp;
    var s = sp * sp * sp;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
  }

  function oklabToOklchArr(L, a, b) {
    var C = Math.sqrt(a * a + b * b);
    var h = Math.atan2(b, a) * (180 / Math.PI);
    if (h < 0) h += 360;
    return [L, C, h];
  }

  function oklchToOklabArr(L, C, h) {
    var hr = h * (Math.PI / 180);
    return [L, C * Math.cos(hr), C * Math.sin(hr)];
  }

  function isLinearRgbInGamut(r, g, b) {
    var eps = 0.002;
    return (
      r >= -eps &&
      r <= 1 + eps &&
      g >= -eps &&
      g <= 1 + eps &&
      b >= -eps &&
      b <= 1 + eps
    );
  }

  function oklchToRgbClamped(L, C, h) {
    var c = C;
    for (var i = 0; i < 50; i++) {
      var lab = oklchToOklabArr(L, c, h);
      var rgb = oklabToLinearRgb(lab[0], lab[1], lab[2]);
      if (isLinearRgbInGamut(rgb[0], rgb[1], rgb[2])) {
        return {
          r: linearToSrgbChannel(rgb[0]),
          g: linearToSrgbChannel(rgb[1]),
          b: linearToSrgbChannel(rgb[2]),
        };
      }
      c *= 0.95;
    }
    var lab0 = oklchToOklabArr(L, 0, h);
    var rgb0 = oklabToLinearRgb(lab0[0], lab0[1], lab0[2]);
    return {
      r: linearToSrgbChannel(rgb0[0]),
      g: linearToSrgbChannel(rgb0[1]),
      b: linearToSrgbChannel(rgb0[2]),
    };
  }

  /**
   * 以 OKLCH 空間做 Perceived 模式色盤插值。
   * 錨點：(0, LMax)、(valueStop, L₀)、(1000, LMin)，L 線性插值。
   * C 在較亮側（stop ≤ valueStop）用 stop 比例，較暗側（stop > valueStop）與 L 等比縮放。
   * h 保持不變。在 stop === valueStop 直接使用輸入色。
   */
  function createSwatches(config) {
    var value = config.value;
    var valueStop = config.valueStop;
    var hexColor = value.indexOf('#') === 0 ? value : '#' + value;

    var rgb0 = hexToRGB(hexColor);
    var oklab0 = rgbToOklabArr(rgb0.r, rgb0.g, rgb0.b);
    var oklch0 = oklabToOklchArr(oklab0[0], oklab0[1], oklab0[2]);
    var L0 = oklch0[0];
    var C0 = oklch0[1];
    var h0 = oklch0[2];
    if (isNaN(h0)) h0 = 0;

    var LMax = 0.97;
    var LMin = 0.13;

    var result = [];
    for (var i = 0; i < ALL_STOPS.length; i++) {
      var stop = ALL_STOPS[i];

      var L;
      if (stop <= valueStop) {
        L = valueStop === 0 ? L0 : LMax + (L0 - LMax) * (stop / valueStop);
      } else {
        L =
          valueStop === 1000
            ? L0
            : L0 + (LMin - L0) * ((stop - valueStop) / (1000 - valueStop));
      }
      L = clamp(L, 0, 1);

      var C;
      if (stop <= valueStop) {
        C = valueStop === 0 ? C0 : C0 * (stop / valueStop);
      } else {
        C = L0 > 0 ? C0 * (L / L0) : 0;
      }
      C = Math.max(0, C);

      var hex;
      if (stop === valueStop) {
        hex = (
          hexColor.indexOf('#') === 0 ? hexColor : '#' + hexColor
        ).toUpperCase();
      } else {
        var mapped = oklchToRgbClamped(L, C, h0);
        hex = rgbToHex(mapped).toUpperCase();
      }

      var outHsl = hexToHSL(hex);
      result.push({
        stop: stop,
        hex: hex,
        h: isNaN(outHsl.h) ? 0 : outHsl.h,
        hScale: 1,
        s: outHsl.s,
        sScale: 1,
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
