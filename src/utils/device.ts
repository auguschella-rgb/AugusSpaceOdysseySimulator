/**
 * One-time device class detection.
 * Mobile = phone/tablet user agent, OR a touch device whose shorter screen side
 * is <= 820 CSS px. Evaluated once at module load; desktop behaviour is untouched.
 */
function detectMobile(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return true
  const touch = (navigator.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window
  const shortSide = Math.min(window.screen?.width ?? Infinity, window.screen?.height ?? Infinity)
  return touch && shortSide <= 820
}

export const isMobile: boolean = detectMobile()
