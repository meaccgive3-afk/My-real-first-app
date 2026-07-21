'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigation2, Compass, MapPin, Ruler, Gauge, Sparkles, Vibrate } from 'lucide-react'
import type { StoredLocation } from '@/lib/use-location'
import { qiblaBearing, toArabicDigits } from '@/lib/prayer-utils'

const KAABA_LAT = 21.4225
const KAABA_LNG = 39.8262

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371.0088
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function normalize360(deg: number) {
  return ((deg % 360) + 360) % 360
}

function signedDelta(target: number, current: number) {
  let d = normalize360(target - current)
  if (d > 180) d -= 360
  return d
}

function useSmoothedAngle(target: number | null, stiffness = 0.18) {
  const [value, setValue] = useState<number | null>(null)
  const raf = useRef<number>(0)
  const current = useRef<number | null>(null)
  const goal = useRef<number | null>(null)

  useEffect(() => {
    goal.current = target
    if (target != null && current.current == null) {
      current.current = target
      setValue(target)
    }
  }, [target])

  useEffect(() => {
    const tick = () => {
      if (goal.current != null && current.current != null) {
        const d = signedDelta(goal.current, current.current)
        if (Math.abs(d) > 0.05) {
          current.current = normalize360(current.current + d * stiffness)
          setValue(current.current)
        }
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [stiffness])

  return value
}

export function QiblaScreen({ location }: { location: StoredLocation }) {
  const bearing = useMemo(() => qiblaBearing(location.lat, location.lng), [location.lat, location.lng])
  const distanceKm = useMemo(
    () => haversineKm(location.lat, location.lng, KAABA_LAT, KAABA_LNG),
    [location.lat, location.lng]
  )
  const [rawHeading, setRawHeading] = useState<number | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [needsPermission, setNeedsPermission] = useState(false)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [hapticsOn, setHapticsOn] = useState(true)
  const wasAligned = useRef(false)
  const lastEventAt = useRef(0)

  const heading = useSmoothedAngle(rawHeading)

  useEffect(() => {
    const DOE = (typeof window !== 'undefined' ? (window as any).DeviceOrientationEvent : null) as
      | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> })
      | null
    if (DOE && typeof DOE.requestPermission === 'function') {
      setNeedsPermission(true)
    }
  }, [])

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    const now = performance.now()
    if (now - lastEventAt.current < 33) return
    lastEventAt.current = now
    const webkitHeading = (e as any).webkitCompassHeading as number | undefined
    const webkitAccuracy = (e as any).webkitCompassAccuracy as number | undefined
    if (typeof webkitAccuracy === 'number' && webkitAccuracy >= 0) {
      setAccuracy(webkitAccuracy)
    }
    if (typeof webkitHeading === 'number') {
      setRawHeading(normalize360(webkitHeading))
    } else if (e.alpha != null) {
      const screenAngle =
        typeof window !== 'undefined' && window.screen?.orientation
          ? window.screen.orientation.angle || 0
          : 0
      setRawHeading(normalize360(360 - e.alpha + screenAngle))
    }
  }, [])

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
      setEnabled(false)
    }
  }

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener)
      window.removeEventListener('deviceorientation', handleOrientation as EventListener)
    }
  }, [handleOrientation])

  const pointerRotation = heading != null ? bearing - heading : bearing
  const delta = heading != null ? signedDelta(bearing, heading) : null
  const absDelta = delta != null ? Math.abs(delta) : null
  const aligned = absDelta != null && absDelta < 6
  const near = absDelta != null && absDelta < 25

  useEffect(() => {
    if (!hapticsOn) return
    if (aligned && !wasAligned.current) {
      try {
        navigator.vibrate?.([40, 60, 40])
      } catch {}
    }
    wasAligned.current = aligned
  }, [aligned, hapticsOn])

  const glowColor = aligned
    ? 'oklch(0.85 0.16 90 / 0.55)'
    : near
      ? 'oklch(0.75 0.12 150 / 0.35)'
      : 'transparent'

  const accuracyLabel =
    accuracy == null ? null : accuracy <= 15 ? 'عالية' : accuracy <= 35 ? 'متوسطة' : 'منخفضة'

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col px-4 pb-28 pt-4">
      <h1 className="mb-1 text-center font-heading text-2xl font-bold">اتجاه القبلة</h1>
      <p className="mb-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" />
        {location.name}
      </p>

      <div className="mb-4 text-center">
        <span className="font-mono text-3xl font-bold text-primary tabular-nums">
          {toArabicDigits(Math.round(bearing))}°
        </span>
        <span className="mr-2 text-sm text-muted-foreground">من الشمال</span>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-2 py-3 shadow-sm">
          <Ruler className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm font-bold tabular-nums">
            {toArabicDigits(Math.round(distanceKm))}
          </span>
          <span className="text-[10px] text-muted-foreground">كم إلى الكعبة</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-2 py-3 shadow-sm">
          <Gauge className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm font-bold tabular-nums">
            {absDelta != null ? `${toArabicDigits(Math.round(absDelta))}°` : '—'}
          </span>
          <span className="text-[10px] text-muted-foreground">فرق الزاوية</span>
        </div>
        <button
          type="button"
          onClick={() => setHapticsOn((v) => !v)}
          aria-pressed={hapticsOn}
          className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 shadow-sm transition-colors active:scale-95 ${
            hapticsOn ? 'border-primary/40 bg-primary/10' : 'border-border bg-card'
          }`}
        >
          <Vibrate className={`h-4 w-4 ${hapticsOn ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="font-mono text-sm font-bold">{hapticsOn ? 'مفعّل' : 'موقف'}</span>
          <span className="text-[10px] text-muted-foreground">الاهتزاز</span>
        </button>
      </div>

      <div className="relative mx-auto my-auto aspect-square w-full max-w-xs">
        <div
          aria-hidden="true"
          className="absolute -inset-3 rounded-full blur-2xl transition-colors duration-500"
          style={{ backgroundColor: glowColor }}
        />

        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1"
        >
          <span
            className={`block h-0 w-0 border-x-8 border-t-[14px] border-x-transparent transition-colors ${
              aligned ? 'border-t-gold' : 'border-t-primary'
            }`}
          />
        </div>

        <div
          className="absolute inset-0 rounded-full border-4 border-border bg-card shadow-inner will-change-transform"
          style={{ transform: heading != null ? `rotate(${-heading}deg)` : undefined }}
        >
          {(
            [
              { l: 'ش', a: 0 },
              { l: 'ق', a: 90 },
              { l: 'ج', a: 180 },
              { l: 'غ', a: 270 },
            ] as const
          ).map(({ l, a }) => (
            <span
              key={l}
              className={`absolute left-1/2 top-3 -translate-x-1/2 text-sm font-bold ${
                a === 0 ? 'text-primary' : 'text-muted-foreground'
              }`}
              style={{
                transformOrigin: '50% calc(50vw)',
                transform: `rotate(${a}deg)`,
              }}
            >
              {l}
            </span>
          ))}
          {Array.from({ length: 72 }).map((_, i) => (
            <span
              key={i}
              className={`absolute left-1/2 top-0 -translate-x-1/2 ${
                i % 6 === 0 ? 'h-3.5 w-0.5 bg-foreground/40' : 'h-2 w-px bg-border'
              }`}
              style={{ transformOrigin: '50% 50vw', transform: `rotate(${i * 5}deg)` }}
            />
          ))}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              transformOrigin: 'center',
              transform: `rotate(${bearing}deg) translateY(calc(-50% - 42%))`,
            }}
          />
        </div>

        <div
          className="absolute inset-0 flex items-start justify-center will-change-transform"
          style={{ transform: `rotate(${pointerRotation}deg)` }}
        >
          <div className="flex flex-col items-center pt-4">
            <span
              className={`relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
                aligned
                  ? 'bg-gold text-gold-foreground scale-110 shadow-gold/50'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {aligned && (
                <span className="absolute inset-0 animate-ping rounded-full bg-gold/40" />
              )}
              <Navigation2 className="relative h-6 w-6" fill="currentColor" />
            </span>
            <span className="mt-1 rounded-full bg-card px-2 py-0.5 text-xs font-bold text-primary shadow ring-1 ring-border">
              الكعبة
            </span>
          </div>
        </div>

        <div
          className={`absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-background ring-1 transition-shadow duration-300 ${
            aligned ? 'ring-gold shadow-[0_0_24px_-4px] shadow-gold/60' : 'ring-border'
          }`}
        >
          {aligned ? (
            <Sparkles className="h-6 w-6 text-gold" />
          ) : (
            <Compass className="h-6 w-6 text-muted-foreground" />
          )}
          {heading != null && (
            <span className="mt-0.5 font-mono text-[10px] font-bold tabular-nums text-muted-foreground">
              {toArabicDigits(Math.round(normalize360(heading)))}°
            </span>
          )}
        </div>
      </div>

      {enabled && delta != null && !aligned && (
        <p className="mt-4 text-center text-sm font-semibold text-primary" aria-live="polite">
          {delta > 0
            ? `درجات إلى اليمين: ${toArabicDigits(Math.round(absDelta ?? 0))}°`
            : `درجات إلى اليسار: ${toArabicDigits(Math.round(absDelta ?? 0))}°`}
        </p>
      )}

      {enabled && accuracyLabel && (
        <p className="mt-1 text-center text-xs text-muted-foreground">
          دقة البوصلة: {accuracyLabel}
        </p>
      )}

      <div className="mt-auto pt-6 text-center">
        {needsPermission && !enabled ? (
          <button
            type="button"
            onClick={enableCompass}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition-transform active:scale-95"
          >
            <Compass className="h-5 w-5" />
            تفعيل البوصلة
          </button>
        ) : enabled && heading != null ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {aligned ? 'أنت الآن مُتّجه نحو القبلة' : 'وجِّه الجهاز حتى يستقيم السهم نحو الأعلى'}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {enabled
              ? 'حرّك جهازك لمعايرة البوصلة'
              : 'فعّل البوصلة لمعرفة الاتجاه بدقة، أو استعن بالزاوية أعلاه من الشمال.'}
          </p>
        )}
        {!enabled && !needsPermission && (
          <button
            type="button"
            onClick={enableCompass}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition-transform active:scale-95"
          >
            <Compass className="h-5 w-5" />
            تفعيل البوصلة
          </button>
        )}
      </div>
    </div>
  )
}
