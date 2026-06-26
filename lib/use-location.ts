'use client'

import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_CITY } from './cities'

export type StoredLocation = {
  name: string
  country: string
  lat: number
  lng: number
  method: number
  /** true when obtained via device geolocation */
  auto?: boolean
}

const STORAGE_KEY = 'sakinah:location:v1'

const FALLBACK: StoredLocation = {
  name: DEFAULT_CITY.name,
  country: DEFAULT_CITY.country,
  lat: DEFAULT_CITY.lat,
  lng: DEFAULT_CITY.lng,
  method: DEFAULT_CITY.method,
}

export function useLocation() {
  const [location, setLocationState] = useState<StoredLocation>(FALLBACK)
  const [hydrated, setHydrated] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setLocationState(JSON.parse(raw))
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  const setLocation = useCallback((loc: StoredLocation) => {
    setLocationState(loc)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))
    } catch {
      // ignore
    }
  }, [])

  const applyCoords = useCallback(
    (latitude: number, longitude: number) => {
      setLocation({
        name: 'موقعي الحالي',
        country: '',
        lat: latitude,
        lng: longitude,
        method: 3,
        auto: true,
      })
    },
    [setLocation],
  )

  const detectLocation = useCallback(async () => {
    setGeoLoading(true)
    setGeoError(null)

    // Use the native Capacitor plugin when running inside the app.
    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation')
        const perm = await Geolocation.requestPermissions()
        if (perm.location === 'denied') {
          setGeoLoading(false)
          setGeoError('تم رفض إذن الموقع. اختر مدينتك يدوياً.')
          return
        }
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        })
        applyCoords(pos.coords.latitude, pos.coords.longitude)
        setGeoLoading(false)
        return
      }
    } catch {
      // fall through to the browser API
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoLoading(false)
      setGeoError('الجهاز لا يدعم تحديد الموقع.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoords(pos.coords.latitude, pos.coords.longitude)
        setGeoLoading(false)
      },
      (err) => {
        setGeoLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('تم رفض إذن الموقع. اختر مدينتك يدوياً.')
        } else {
          setGeoError('تعذّر تحديد الموقع. اختر مدينتك يدوياً.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [applyCoords])

  return {
    location,
    setLocation,
    detectLocation,
    geoError,
    geoLoading,
    hydrated,
  }
}
