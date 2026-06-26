'use client'

import { useEffect, useState } from 'react'
import { Navigation2, Compass, MapPin } from 'lucide-react'
import type { StoredLocation } from '@/lib/use-location'
import { qiblaBearing, localizeDigits } from '@/lib/prayer-utils'
import { useSettings } from '@/lib/settings-context'

export function QiblaScreen({ location }: { location: StoredLocation }) {
  const { t, lang } = useSettings()
  const bearing = qiblaBearing(location.lat, location.lng)
  const [heading, setHeading] = useState<number | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [needsPermission, setNeedsPermission] = useState(false)

  useEffect(() => {
    const DOE = (typeof window !== 'undefined' ? (window as any).DeviceOrientationEvent : null) as
      | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> })
      | null
    if (DOE && typeof DOE.requestPermission === 'function') {
      setNeedsPermission(true)
    }
  }, [])

  const handleOrientation = (e: DeviceOrientationEvent) => {
    const webkitHeading = (e as any).webkitCompassHeading as number | undefined
    if (typeof webkitHeading === 'number') {
      setHeading(webkitHeading)
    } else if (e.alpha != null) {
      setHeading(360 - e.alpha)
    }
  }

  const enableCompass = async () => {
    const DOE = (window as any).DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> })
      | undefined
    try {
      if (DOE && typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission()
        if (res !== 'granted') return
      }
      window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener)
      window.addEventListener('deviceorientation', handleOrientation as EventListener)
      setEnabled(true)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener)
      window.removeEventListener('deviceorientation', handleOrientation as EventListener)
    }
  }, [])

  const pointerRotation = heading != null ? bearing - heading : bearing
  const aligned = heading != null && Math.abs(((pointerRotation % 360) + 360) % 360) < 6

  const directionLetters = [
    { l: 'N', a: 0 },
    { l: 'E', a: 90 },
    { l: 'S', a: 180 },
    { l: 'W', a: 270 },
  ] as const

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-md flex-col px-4 pb-32 pt-2">
      <h1 className="mb-1 text-center font-heading text-2xl font-bold">{t('qiblaDirection')}</h1>
      <p className="mb-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" />
        {location.name}
      </p>

      <div className="mb-6 text-center">
        <span className="font-mono text-3xl font-bold text-primary">
          {localizeDigits(Math.round(bearing), lang)}°
        </span>
        <span className="mx-2 text-sm text-muted-foreground">{t('fromNorth')}</span>
      </div>

      {/* Compass */}
      <div className="relative mx-auto my-auto aspect-square w-full max-w-xs">
        {/* Dial */}
        <div
          className="absolute inset-0 rounded-full glass shadow-2xl shadow-black/10 transition-transform duration-150"
          style={{ transform: heading != null ? `rotate(${-heading}deg)` : undefined }}
        >
          {directionLetters.map(({ l, a }) => (
            <span
              key={l}
              className="absolute left-1/2 top-3 -translate-x-1/2 text-sm font-bold text-muted-foreground"
              style={{ transformOrigin: '50% calc(50vw)', transform: `rotate(${a}deg)` }}
            >
              {l}
            </span>
          ))}
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-foreground/20"
              style={{ transformOrigin: '50% 50vw', transform: `rotate(${i * 15}deg)` }}
            />
          ))}
        </div>

        {/* Qibla pointer */}
        <div
          className="absolute inset-0 flex items-start justify-center transition-transform duration-150"
          style={{ transform: `rotate(${pointerRotation}deg)` }}
        >
          <div className="flex flex-col items-center pt-4">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-colors ${
                aligned ? 'bg-gold text-gold-foreground' : 'bg-primary text-primary-foreground'
              }`}
            >
              <Navigation2 className="h-6 w-6" fill="currentColor" />
            </span>
            <span className="mt-1 rounded-full glass-strong px-2 py-0.5 text-xs font-bold text-primary">
              {t('kaaba')}
            </span>
          </div>
        </div>

        {/* Center */}
        <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full glass-strong">
          <Compass className="h-7 w-7 text-muted-foreground" />
        </div>
      </div>

      <div className="mt-auto pt-6 text-center">
        {needsPermission && !enabled ? (
          <button
            type="button"
            onClick={enableCompass}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 active:scale-95"
          >
            <Compass className="h-5 w-5" />
            {t('enableCompass')}
          </button>
        ) : enabled && heading != null ? (
          <p className="text-sm text-muted-foreground">
            {aligned ? t('facingQibla') : t('alignArrow')}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {enabled ? t('calibrate') : t('compassHint')}
          </p>
        )}
        {!enabled && !needsPermission && (
          <button
            type="button"
            onClick={enableCompass}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 active:scale-95"
          >
            <Compass className="h-5 w-5" />
            {t('enableCompass')}
          </button>
        )}
      </div>
    </div>
  )
}
