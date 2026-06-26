'use client'

import { useMemo, useState } from 'react'
import { X, Search, MapPin, LocateFixed, Loader2, Check } from 'lucide-react'
import { CITIES } from '@/lib/cities'
import type { StoredLocation } from '@/lib/use-location'
import { useSettings } from '@/lib/settings-context'
import { cn } from '@/lib/utils'

const METHODS: { id: number; label: string }[] = [
  { id: 4, label: 'Umm al-Qura — أم القرى' },
  { id: 3, label: 'Muslim World League — رابطة العالم الإسلامي' },
  { id: 2, label: 'ISNA — الجمعية الإسلامية بأمريكا' },
  { id: 5, label: 'Egyptian Authority — الهيئة المصرية' },
  { id: 8, label: 'Gulf Region — منطقة الخليج' },
  { id: 9, label: 'Kuwait — الكويت' },
  { id: 10, label: 'Qatar — قطر' },
  { id: 1, label: 'University of Karachi — كراتشي' },
  { id: 13, label: 'Diyanet — ديانت (تركيا)' },
  { id: 7, label: 'Tehran — معهد الجيوفيزياء، طهران' },
]

export function LocationSheet({
  current,
  onClose,
  onSelect,
  onDetect,
  geoLoading,
  geoError,
}: {
  current: StoredLocation
  onClose: () => void
  onSelect: (loc: StoredLocation) => void
  onDetect: () => void
  geoLoading: boolean
  geoError: string | null
}) {
  const { t } = useSettings()
  const [query, setQuery] = useState('')
  const [method, setMethod] = useState(current.method)

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return CITIES
    return CITIES.filter((c) => c.name.includes(q) || c.country.includes(q))
  }, [query])

  return (
    <div className="fixed inset-0 z-[70] flex flex-col animate-fade-in">
      <button
        type="button"
        aria-label={t('close')}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      <div className="relative mt-auto flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[2rem] glass-strong animate-sheet-up">
        <header className="flex items-center justify-between px-5 pb-3 pt-4">
          <h2 className="text-lg font-bold">{t('chooseLocation')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 text-foreground transition active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onDetect}
            disabled={geoLoading}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-[0.99] disabled:opacity-70"
          >
            {geoLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LocateFixed className="h-5 w-5" />
            )}
            <span className="font-semibold">
              {geoLoading ? t('detecting') : t('detectLocation')}
            </span>
          </button>
          {geoError && (
            <p className="mb-3 rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">
              {geoError}
            </p>
          )}

          {/* Calculation method */}
          <div className="mb-4 rounded-2xl glass p-3">
            <label
              htmlFor="method"
              className="mb-2 block text-sm font-semibold text-muted-foreground"
            >
              {t('calcMethod')}
            </label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(Number(e.target.value))}
              className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
            >
              {METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchCity')}
              className="w-full rounded-2xl border border-input glass py-3 pe-10 ps-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <ul className="space-y-1.5">
            {filtered.map((c) => {
              const isActive =
                !current.auto &&
                Math.abs(current.lat - c.lat) < 0.001 &&
                Math.abs(current.lng - c.lng) < 0.001
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() =>
                      onSelect({
                        name: c.name,
                        country: c.country,
                        lat: c.lat,
                        lng: c.lng,
                        method,
                      })
                    }
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-start transition active:scale-[0.99]',
                      isActive ? 'bg-primary/15 ring-1 ring-primary/40' : 'glass',
                    )}
                  >
                    <MapPin
                      className={cn(
                        'h-5 w-5 shrink-0',
                        isActive ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                    <span className="flex-1">
                      <span className="block font-semibold">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">{c.country}</span>
                    </span>
                    {isActive && <Check className="h-5 w-5 text-primary" />}
                  </button>
                </li>
              )
            })}
            {filtered.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">{t('noResults')}</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
