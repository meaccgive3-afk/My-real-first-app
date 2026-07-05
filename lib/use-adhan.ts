'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MAIN_PRAYERS,
  PRAYER_LABELS,
  timeToDate,
  type PrayerKey,
  type Timings,
} from './prayer-utils'

export type AdhanSettings = {
  /** Play the adhan sound at prayer time */
  sound: boolean
  /** Show a system notification at prayer time */
  notify: boolean
}

const SETTINGS_KEY = 'adhan-settings'
const DEFAULT_SETTINGS: AdhanSettings = { sound: true, notify: true }

function loadSettings(): AdhanSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

/**
 * Watches the day's prayer timings and fires the adhan (sound + notification)
 * exactly when a prayer time arrives while the app is open.
 */
export function useAdhan(timings: Timings | null) {
  const [settings, setSettingsState] = useState<AdhanSettings>(DEFAULT_SETTINGS)
  const [playing, setPlaying] = useState<PrayerKey | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const firedRef = useRef<Set<string>>(new Set())

  // Load persisted settings on mount
  useEffect(() => {
    setSettingsState(loadSettings())
  }, [])

  const setSettings = useCallback((next: Partial<AdhanSettings>) => {
    setSettingsState((prev) => {
      const merged = { ...prev, ...next }
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged))
      } catch {
        /* ignore */
      }
      return merged
    })
  }, [])

  const stopAdhan = useCallback(() => {
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.currentTime = 0
    setPlaying(null)
  }, [])

  const playAdhan = useCallback(
    (prayer: PrayerKey) => {
      if (!audioRef.current) {
        audioRef.current = new Audio('/adhan.mp3')
        audioRef.current.addEventListener('ended', () => setPlaying(null))
      }
      audioRef.current.currentTime = 0
      audioRef.current
        .play()
        .then(() => setPlaying(prayer))
        .catch(() => {
          // Autoplay may be blocked before any user interaction
          setPlaying(null)
        })
    },
    [],
  )

  /** Ask for notification permission (call from a user gesture). */
  const requestNotifyPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false
    if (Notification.permission === 'granted') return true
    const result = await Notification.requestPermission()
    return result === 'granted'
  }, [])

  // Watcher: check every second whether a prayer time just arrived
  useEffect(() => {
    if (!timings) return
    const interval = setInterval(() => {
      const now = new Date()
      const dayKey = now.toDateString()
      for (const key of MAIN_PRAYERS) {
        const at = timeToDate(timings[key], now)
        const diff = now.getTime() - at.getTime()
        const fireKey = `${dayKey}-${key}`
        // Fire within the first 60s after prayer time, once per day per prayer
        if (diff >= 0 && diff < 60_000 && !firedRef.current.has(fireKey)) {
          firedRef.current.add(fireKey)
          if (settings.sound) playAdhan(key)
          if (
            settings.notify &&
            typeof Notification !== 'undefined' &&
            Notification.permission === 'granted'
          ) {
            try {
              new Notification(`حان الآن وقت صلاة ${PRAYER_LABELS[key]}`, {
                body: 'حيّ على الصلاة، حيّ على الفلاح',
                icon: '/app-icon.png',
                tag: fireKey,
              })
            } catch {
              /* ignore */
            }
          }
        }
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [timings, settings.sound, settings.notify, playAdhan])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  return { settings, setSettings, playing, stopAdhan, playAdhan, requestNotifyPermission }
}
