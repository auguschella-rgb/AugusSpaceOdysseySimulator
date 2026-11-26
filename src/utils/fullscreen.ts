/** Browser Fullscreen API helpers (standard + webkit / ms prefixes). */

type FsDoc = Document & {
  webkitFullscreenElement?: Element | null
  msFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
  webkitCancelFullScreen?: () => Promise<void> | void
  msExitFullscreen?: () => Promise<void> | void
}

type FsEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
  webkitRequestFullScreen?: () => Promise<void> | void
  msRequestFullscreen?: () => Promise<void> | void
}

export function isFullscreen(): boolean {
  const doc = document as FsDoc
  return Boolean(
    document.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement
  )
}

/** True when the page can reasonably request element fullscreen (not iOS Safari). */
export function canUseFullscreenApi(): boolean {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return false
  // iOS Safari does not fullscreen arbitrary pages (only video). Treat as unavailable
  // even if a webkit prefix exists, so callers can show the Home Screen tip.
  const nav = navigator as Navigator & { standalone?: boolean; platform?: string }
  const ios =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (nav.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1)
  if (ios) return false
  const el = document.documentElement as FsEl
  return Boolean(
    el.requestFullscreen || el.webkitRequestFullscreen || el.webkitRequestFullScreen || el.msRequestFullscreen
  )
}

/** Home Screen / installed PWA (no Safari browser chrome). */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  )
}

export async function enterFullscreen(el: HTMLElement = document.documentElement): Promise<void> {
  if (isFullscreen()) return
  const anyEl = el as FsEl
  try {
    if (el.requestFullscreen) await el.requestFullscreen()
    else if (anyEl.webkitRequestFullscreen) await anyEl.webkitRequestFullscreen()
    else if (anyEl.webkitRequestFullScreen) await anyEl.webkitRequestFullScreen()
    else if (anyEl.msRequestFullscreen) await anyEl.msRequestFullscreen()
  } catch {
    /* user gesture / permission / unsupported */
  }
}

export async function exitFullscreen(): Promise<void> {
  if (!isFullscreen()) return
  const doc = document as FsDoc
  try {
    if (document.exitFullscreen) await document.exitFullscreen()
    else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen()
    else if (doc.webkitCancelFullScreen) await doc.webkitCancelFullScreen()
    else if (doc.msExitFullscreen) await doc.msExitFullscreen()
  } catch {
    /* */
  }
}

export async function toggleFullscreen(el?: HTMLElement): Promise<boolean> {
  if (isFullscreen()) {
    await exitFullscreen()
    return false
  }
  await enterFullscreen(el)
  return isFullscreen()
}
