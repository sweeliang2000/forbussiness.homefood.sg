/**
 * Clamps `value` between `min` and `max` inclusively.
 * 
 * @param {number} value - The numeric value to clamp.
 * @param {number} min - The lower boundary.
 * @param {number} max - The upper boundary.
 * @returns {number} - The clamped value.
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  