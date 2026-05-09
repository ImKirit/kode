import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'kode.panelLayout'

export interface PanelLayoutState {
  sidebarVisible: boolean
  aiPanelVisible: boolean
  bottomPanelVisible: boolean
  sidebarWidth: number
  aiPanelWidth: number
  bottomPanelHeight: number
}

export interface UsePanelLayoutResult extends PanelLayoutState {
  toggleSidebar(): void
  toggleAiPanel(): void
  toggleBottomPanel(): void
  setSidebarWidth(w: number): void
  setAiPanelWidth(w: number): void
  setBottomPanelHeight(h: number): void
}

const DEFAULTS: PanelLayoutState = {
  sidebarVisible: true,
  aiPanelVisible: true,
  bottomPanelVisible: true,
  sidebarWidth: 220,
  aiPanelWidth: 360,
  bottomPanelHeight: 220
}

function loadLayout(): PanelLayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function usePanelLayout(): UsePanelLayoutResult {
  const [state, setState] = useState<PanelLayoutState>(() => loadLayout())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const toggleSidebar = useCallback(() =>
    setState(prev => ({ ...prev, sidebarVisible: !prev.sidebarVisible })), [])

  const toggleAiPanel = useCallback(() =>
    setState(prev => ({ ...prev, aiPanelVisible: !prev.aiPanelVisible })), [])

  const toggleBottomPanel = useCallback(() =>
    setState(prev => ({ ...prev, bottomPanelVisible: !prev.bottomPanelVisible })), [])

  const setSidebarWidth = useCallback((w: number) =>
    setState(prev => ({ ...prev, sidebarWidth: w })), [])

  const setAiPanelWidth = useCallback((w: number) =>
    setState(prev => ({ ...prev, aiPanelWidth: w })), [])

  const setBottomPanelHeight = useCallback((h: number) =>
    setState(prev => ({ ...prev, bottomPanelHeight: h })), [])

  return {
    ...state,
    toggleSidebar,
    toggleAiPanel,
    toggleBottomPanel,
    setSidebarWidth,
    setAiPanelWidth,
    setBottomPanelHeight
  }
}
