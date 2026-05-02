'use client'

import { useEffect } from 'react'

export default function AppInit() {
  useEffect(() => {
    async function init() {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setBackgroundColor({ color: '#1a3565' })
        await StatusBar.setStyle({ style: Style.Dark }) // Dark = light/white icons
      } catch {
        // Not in Capacitor (web browser) — no-op
      }

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide({ fadeOutDuration: 400 })
      } catch {
        // Not in Capacitor — no-op
      }
    }
    init()
  }, [])

  return null
}
