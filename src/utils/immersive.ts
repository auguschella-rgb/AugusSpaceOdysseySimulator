import { useMobileUiStore } from '../store/useMobileUiStore'
import { useSimulatorStore } from '../store/useSimulatorStore'
import {
  canUseFullscreenApi,
  enterFullscreen,
  exitFullscreen,
  isStandaloneDisplay,
} from './fullscreen'

const TIP_KEY = 'asos.iosHomeScreenTip.v1'

export async function enterImmersive(): Promise<void> {
  const ui = useMobileUiStore.getState()
  ui.setSheetOpen(false)
  useSimulatorStore.getState().setActivePanel(null)
  const showTip =
    !canUseFullscreenApi() &&
    !isStandaloneDisplay() &&
    typeof localStorage !== 'undefined' &&
    localStorage.getItem(TIP_KEY) !== '1'
  ui.setShowHomeScreenTip(showTip)
  ui.setImmersive(true)
  await enterFullscreen(document.documentElement)
}

export async function exitImmersive(): Promise<void> {
  const ui = useMobileUiStore.getState()
  ui.setImmersive(false)
  ui.setShowHomeScreenTip(false)
  await exitFullscreen()
}

export function dismissHomeScreenTip(): void {
  try {
    localStorage.setItem(TIP_KEY, '1')
  } catch {
    /* private mode */
  }
  useMobileUiStore.getState().setShowHomeScreenTip(false)
}
