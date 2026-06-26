'use client'

import { useMemo, useState } from 'react'
import { X, Search, MapPin, LocateFixed, Loader2, Check } from 'lucide-react'
import { CITIES } from '@/lib/cities'
import type { StoredLocation } from '@/lib/use-location'
import { cn } from '@/lib/utils'

const METHODS: { id: number; label: string }[] = [
  { id: 4, label: 'أم القرى (السعودية)' },
  { id: 3, label: 'رابطة العالم الإسلامي' },
  { id: 2, label: 'الجمعية الإسلامية بأمريكا الشمالية' },
  { id: 5, label: 'الهيئة المصرية للمساحة' },
  { id: 8, label: 'منطقة الخليج' },
  { id: 9, label: 'الكويت' },
  { id: 10, label: 'قطر' },
  { id: 1, label: 'جامعة العلوم الإسلامية، كراتشي' },
  { id: 13, label: 'ديانت (تركيا)' },
  { id: 7, label: 'معهد الجيوفيزياء، طهران' },
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
  const [query, setQuery] = useState('')
  const [method, setMethod] = useState(current.method)

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return CITIES
    return CITIES.filter(
      (c) => c.name.includes(q) || c.country.includes(q),
    )
  }, [query])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-4">
        <h2 className="text-lg font-bold">اختر موقعك</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8 pt-4">
        <button
          type="button"
          onClick={onDetect}
          disabled={geoLoading}
          className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground shadow-sm transition active:scale-[0.99] disabled:opacity-70"
        >
          {geoLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LocateFixed className="h-5 w-5" />
          )}
          <span className="font-semibold">
            {geoLoading ? 'جارٍ تحديد موقعك…' : 'تحديد موقعي تلقائياً'}
          </span>
        </button>
        {geoError && (
          <p className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {geoError}
          </p>
        )}

        {/* Calculation method */}
        <div className="mb-4 rounded-2xl border border-border bg-card p-3">
          <label htmlFor="method" className="mb-2 block text-sm font-semibold text-muted-foreground">
            طريقة الحساب
          </label>
          <select
            id="method"
            value={method}
            onChange={(e) => setMethod(Number(e.target.value))}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
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
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن مدينة أو دولة…"
            className="w-full rounded-2xl border border-input bg-card py-3 pr-10 pl-3 text-sm outline-none focus:ring-2 focus:ring-ring"
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
                    'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-right transition',
                    isActive
                      ? 'border-primary bg-primary/8'
                      : 'border-border bg-card hover:bg-accent',
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
            <li className="py-8 text-center text-sm text-muted-foreground">
              لا توجد نتائج مطابقة
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
