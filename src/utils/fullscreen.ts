/** Browser Fullscreen API helpers */

export function isFullscreen(): boolean {
  return Boolean(document.fullscreenElement)
}

export async function enterFullscreen(el: HTMLElement = document.documentElement): Promise<void> {
  if (isFullscreen()) return
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void
    msRequestFullscreen?: () => Promise<void> | void
  }
  try {
    if (el.requestFullscreen) await el.requestFullscreen()
    else if (anyEl.webkitRequestFullscreen) await anyEl.webkitRequestFullscreen()
    else if (anyEl.msRequestFullscreen) await anyEl.msRequestFullscreen()
  } catch {
    /* user gesture / permission */
  }
}

export async function exitFullscreen(): Promise<void> {
  if (!isFullscreen()) return
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void
    msExitFullscreen?: () => Promise<void> | void
  }
  try {
    if (document.exitFullscreen) await document.exitFullscreen()
    else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen()
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
