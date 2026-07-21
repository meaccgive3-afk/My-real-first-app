'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_CITY } from './cities'

export type StoredLocation = {
  name: string
  country: string
  lat: number
  lng: number
  method: number
  auto?: boolean
  accuracy?: number
  altitude?: number | null
  heading?: number | null
  speed?: number | null
  timestamp?: number
  timezone?: string
  resolvedName?: string
  resolvedCountry?: string
  source?: 'manual' | 'gps' | 'ip' | 'cache'
}

export type LocationHistoryEntry = StoredLocation & { savedAt: number }

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown'

const STORAGE_KEY = 'sakinah:location:v1'
const HISTORY_KEY = 'sakinah:location:history:v1'
const GEO_CACHE_KEY = 'sakinah:location:geocache:v1'
const HISTORY_LIMIT = 12
const GEO_CACHE_TTL = 1000 * 60 * 60 * 24 * 14
const DETECT_THROTTLE_MS = 1500
const WATCH_MIN_DELTA_METERS = 120

const FALLBACK: StoredLocation = {
  name: DEFAULT_CITY.name,
  country: DEFAULT_CITY.country,
  lat: DEFAULT_CITY.lat,
  lng: DEFAULT_CITY.lng,
  method: DEFAULT_CITY.method,
  source: 'manual',
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function isValidCoords(lat: unknown, lng: unknown): boolean {
  return (
    isFiniteNumber(lat) &&
    isFiniteNumber(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

function sanitizeLocation(raw: unknown): StoredLocation | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!isValidCoords(r.lat, r.lng)) return null
  return {
    name: typeof r.name === 'string' && r.name.trim() ? r.name : FALLBACK.name,
    country: typeof r.country === 'string' ? r.country : '',
    lat: r.lat as number,
    lng: r.lng as number,
    method: isFiniteNumber(r.method) ? (r.method as number) : FALLBACK.method,
    auto: r.auto === true,
    accuracy: isFiniteNumber(r.accuracy) ? (r.accuracy as number) : undefined,
    altitude: isFiniteNumber(r.altitude) ? (r.altitude as number) : null,
    heading: isFiniteNumber(r.heading) ? (r.heading as number) : null,
    speed: isFiniteNumber(r.speed) ? (r.speed as number) : null,
    timestamp: isFiniteNumber(r.timestamp) ? (r.timestamp as number) : undefined,
    timezone: typeof r.timezone === 'string' ? r.timezone : undefined,
    resolvedName: typeof r.resolvedName === 'string' ? r.resolvedName : undefined,
    resolvedCountry:
      typeof r.resolvedCountry === 'string' ? r.resolvedCountry : undefined,
    source:
      r.source === 'gps' || r.source === 'ip' || r.source === 'cache'
        ? r.source
        : 'manual',
  }
}

function safeRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export function distanceBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

function geoCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`
}

type GeoCache = Record<string, { name: string; country: string; at: number }>

async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<{ name: string; country: string } | null> {
  const cache = safeRead<GeoCache>(GEO_CACHE_KEY) || {}
  const key = geoCacheKey(lat, lng)
  const hit = cache[key]
  if (hit && Date.now() - hit.at < GEO_CACHE_TTL) {
    return { name: hit.name, country: hit.country }
  }
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ar`,
      { signal },
    )
    if (!res.ok) return null
    const data = await res.json()
    const name: string =
      data?.city || data?.locality || data?.principalSubdivision || ''
    const country: string = data?.countryName || ''
    if (!name && !country) return null
    const next: GeoCache = { ...cache, [key]: { name, country, at: Date.now() } }
    const keys = Object.keys(next)
    if (keys.length > 50) {
      keys
        .sort((a, b) => next[a].at - next[b].at)
        .slice(0, keys.length - 50)
        .forEach((k) => delete next[k])
    }
    safeWrite(GEO_CACHE_KEY, next)
    return { name, country }
  } catch {
    return null
  }
}

async function ipFallbackLocation(
  signal?: AbortSignal,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal })
    if (!res.ok) return null
    const data = await res.json()
    if (isValidCoords(data?.latitude, data?.longitude)) {
      return { lat: data.latitude, lng: data.longitude }
    }
    return null
  } catch {
    return null
  }
}

function getPositionOnce(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

async function getPositionWithRetry(): Promise<GeolocationPosition> {
  const attempts: PositionOptions[] = [
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 },
    { enableHighAccuracy: false, timeout: 20000, maximumAge: 600000 },
  ]
  let lastError: unknown = null
  for (const opts of attempts) {
    try {
      return await getPositionOnce(opts)
    } catch (err) {
      lastError = err
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as GeolocationPositionError).code ===
          (err as GeolocationPositionError).PERMISSION_DENIED
      ) {
        throw err
      }
    }
  }
  throw lastError
}

export function useLocation() {
  const [location, setLocationState] = useState<StoredLocation>(FALLBACK)
  const [hydrated, setHydrated] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [permission, setPermission] = useState<PermissionStatus>('unknown')
  const [watching, setWatching] = useState(false)
  const [history, setHistory] = useState<LocationHistoryEntry[]>([])

  const watchIdRef = useRef<number | null>(null)
  const capacitorWatchRef = useRef<string | null>(null)
  const lastDetectRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const locationRef = useRef(location)
  locationRef.current = location

  useEffect(() => {
    mountedRef.current = true
    const stored = sanitizeLocation(safeRead<unknown>(STORAGE_KEY))
    if (stored) setLocationState(stored)
    const storedHistory = safeRead<LocationHistoryEntry[]>(HISTORY_KEY)
    if (Array.isArray(storedHistory)) {
      setHistory(
        storedHistory
          .map((h) => {
            const s = sanitizeLocation(h)
            return s && isFiniteNumber((h as LocationHistoryEntry).savedAt)
              ? { ...s, savedAt: (h as LocationHistoryEntry).savedAt }
              : null
          })
          .filter((h): h is LocationHistoryEntry => h !== null)
          .slice(0, HISTORY_LIMIT),
      )
    }
    setHydrated(true)
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation?.clearWatch(watchIdRef.current)
      }
      if (capacitorWatchRef.current) {
        import('@capacitor/geolocation')
          .then(({ Geolocation }) =>
            Geolocation.clearWatch({ id: capacitorWatchRef.current as string }),
          )
          .catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return
    let status: PermissionStatus | null = null
    let permStatus: PermissionStatus | null = status
    void permStatus
    let perm: { state: string; onchange: (() => void) | null } | null = null
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((p) => {
        perm = p as unknown as { state: string; onchange: (() => void) | null }
        const apply = () => {
          if (!mountedRef.current || !perm) return
          const s = perm.state
          setPermission(
            s === 'granted' || s === 'denied' || s === 'prompt' ? s : 'unknown',
          )
        }
        apply()
        perm.onchange = apply
      })
      .catch(() => {})
    return () => {
      if (perm) perm.onchange = null
    }
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try {
        const next = sanitizeLocation(JSON.parse(e.newValue))
        if (next) setLocationState(next)
      } catch {}
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const pushHistory = useCallback((loc: StoredLocation) => {
    setHistory((prev) => {
      const entry: LocationHistoryEntry = { ...loc, savedAt: Date.now() }
      const filtered = prev.filter(
        (h) => distanceBetween(h.lat, h.lng, loc.lat, loc.lng) > 500,
      )
      const next = [entry, ...filtered].slice(0, HISTORY_LIMIT)
      safeWrite(HISTORY_KEY, next)
      return next
    })
  }, [])

  const setLocation = useCallback(
    (loc: StoredLocation) => {
      if (!isValidCoords(loc.lat, loc.lng)) return
      const enriched: StoredLocation = {
        ...loc,
        timestamp: loc.timestamp ?? Date.now(),
        timezone:
          loc.timezone ??
          (typeof Intl !== 'undefined'
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : undefined),
        source: loc.source ?? (loc.auto ? 'gps' : 'manual'),
      }
      setLocationState(enriched)
      safeWrite(STORAGE_KEY, enriched)
      pushHistory(enriched)
    },
    [pushHistory],
  )

  const applyCoords = useCallback(
    (
      latitude: number,
      longitude: number,
      extras?: Partial<StoredLocation>,
    ) => {
      if (!isValidCoords(latitude, longitude)) return
      const base: StoredLocation = {
        name: 'موقعي الحالي',
        country: '',
        lat: latitude,
        lng: longitude,
        method: 3,
        auto: true,
        source: 'gps',
        ...extras,
      }
      setLocation(base)
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      reverseGeocode(latitude, longitude, controller.signal).then((geo) => {
        if (!geo || !mountedRef.current || controller.signal.aborted) return
        const current = locationRef.current
        if (
          current.lat !== latitude ||
          current.lng !== longitude ||
          !current.auto
        )
          return
        const updated: StoredLocation = {
          ...current,
          resolvedName: geo.name || current.resolvedName,
          resolvedCountry: geo.country || current.resolvedCountry,
        }
        setLocationState(updated)
        safeWrite(STORAGE_KEY, updated)
      })
    },
    [setLocation],
  )

  const detectLocation = useCallback(async () => {
    const now = Date.now()
    if (now - lastDetectRef.current < DETECT_THROTTLE_MS || geoLoading) return
    lastDetectRef.current = now
    setGeoLoading(true)
    setGeoError(null)

    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation')
        const perm = await Geolocation.requestPermissions()
        if (perm.location === 'denied') {
          if (mountedRef.current) {
            setPermission('denied')
            setGeoLoading(false)
            setGeoError('تم رفض إذن الموقع. اختر مدينتك يدوياً.')
          }
          return
        }
        if (mountedRef.current) setPermission('granted')
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        })
        if (mountedRef.current) {
          applyCoords(pos.coords.latitude, pos.coords.longitude, {
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          })
          setGeoLoading(false)
        }
        return
      }
    } catch {}

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const controller = new AbortController()
      abortRef.current = controller
      const ip = await ipFallbackLocation(controller.signal)
      if (!mountedRef.current) return
      setGeoLoading(false)
      if (ip) {
        applyCoords(ip.lat, ip.lng, { source: 'ip', accuracy: 25000 })
      } else {
        setGeoError('الجهاز لا يدعم تحديد الموقع.')
      }
      return
    }

    try {
      const pos = await getPositionWithRetry()
      if (!mountedRef.current) return
      setPermission('granted')
      applyCoords(pos.coords.latitude, pos.coords.longitude, {
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        timestamp: pos.timestamp,
      })
      setGeoLoading(false)
    } catch (err) {
      if (!mountedRef.current) return
      const e = err as GeolocationPositionError | null
      if (e && 'code' in e && e.code === e.PERMISSION_DENIED) {
        setPermission('denied')
        setGeoLoading(false)
        setGeoError('تم رفض إذن الموقع. اختر مدينتك يدوياً.')
        return
      }
      const controller = new AbortController()
      abortRef.current = controller
      const ip = await ipFallbackLocation(controller.signal)
      if (!mountedRef.current) return
      setGeoLoading(false)
      if (ip) {
        applyCoords(ip.lat, ip.lng, { source: 'ip', accuracy: 25000 })
      } else {
        setGeoError('تعذّر تحديد الموقع. اختر مدينتك يدوياً.')
      }
    }
  }, [applyCoords, geoLoading])

  const startWatching = useCallback(async () => {
    if (watching) return
    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation')
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 15000 },
          (pos) => {
            if (!pos || !mountedRef.current) return
            const cur = locationRef.current
            const moved = distanceBetween(
              cur.lat,
              cur.lng,
              pos.coords.latitude,
              pos.coords.longitude,
            )
            if (moved < WATCH_MIN_DELTA_METERS) return
            applyCoords(pos.coords.latitude, pos.coords.longitude, {
              accuracy: pos.coords.accuracy,
              timestamp: pos.timestamp,
            })
          },
        )
        capacitorWatchRef.current = id
        setWatching(true)
        return
      }
    } catch {}
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (!mountedRef.current) return
        const cur = locationRef.current
        const moved = distanceBetween(
          cur.lat,
          cur.lng,
          pos.coords.latitude,
          pos.coords.longitude,
        )
        if (moved < WATCH_MIN_DELTA_METERS) return
        applyCoords(pos.coords.latitude, pos.coords.longitude, {
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        })
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
    watchIdRef.current = id
    setWatching(true)
  }, [applyCoords, watching])

  const stopWatching = useCallback(async () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation?.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (capacitorWatchRef.current) {
      try {
        const { Geolocation } = await import('@capacitor/geolocation')
        await Geolocation.clearWatch({ id: capacitorWatchRef.current })
      } catch {}
      capacitorWatchRef.current = null
    }
    setWatching(false)
  }, [])

  const restoreFromHistory = useCallback(
    (entry: LocationHistoryEntry) => {
      const { savedAt, ...loc } = entry
      void savedAt
      setLocation({ ...loc, source: 'cache' })
    },
    [setLocation],
  )

  const clearHistory = useCallback(() => {
    setHistory([])
    try {
      localStorage.removeItem(HISTORY_KEY)
    } catch {}
  }, [])

  const resetLocation = useCallback(() => {
    setLocation(FALLBACK)
    setGeoError(null)
  }, [setLocation])

  const clearGeoError = useCallback(() => setGeoError(null), [])

  const isStale = useMemo(() => {
    if (!location.auto || !location.timestamp) return false
    return Date.now() - location.timestamp > 1000 * 60 * 60 * 6
  }, [location])

  const displayName = useMemo(() => {
    if (location.auto && location.resolvedName) return location.resolvedName
    return location.name
  }, [location])

  const displayCountry = useMemo(() => {
    if (location.auto && location.resolvedCountry) return location.resolvedCountry
    return location.country
  }, [location])

  const distanceFromDefault = useMemo(
    () =>
      Math.round(
        distanceBetween(location.lat, location.lng, FALLBACK.lat, FALLBACK.lng),
      ),
    [location.lat, location.lng],
  )

  return {
    location,
    setLocation,
    detectLocation,
    geoError,
    geoLoading,
    hydrated,
    permission,
    watching,
    startWatching,
    stopWatching,
    history,
    restoreFromHistory,
    clearHistory,
    resetLocation,
    clearGeoError,
    isStale,
    displayName,
    displayCountry,
    distanceFromDefault,
  }
}
