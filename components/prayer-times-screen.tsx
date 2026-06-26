'use client'

import useSWR from 'swr'
import { useEffect, useState } from 'react'
import {
  MapPin,
  ChevronLeft,
  ChevronRight,
  Sunrise as SunriseIcon,
  Sun,
  CloudSun,
  Sunset,
  Moon,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import type { StoredLocation } from '@/lib/use-location'
import {
  ALL_TIMINGS,
  type PrayerKey,
  type Timings,
  formatTime12,
  getNextPrayer,
  getCurrentPrayer,
  formatCountdown,
  localizeDigits,
  hijriMonthName,
} from '@/lib/prayer-utils'
import { useSettings } from '@/lib/settings-context'
import { cn } from '@/lib/utils'

const PRAYER_ICONS: Record<PrayerKey, typeof Sun> = {
  Fajr: CloudSun,
  Sunrise: SunriseIcon,
  Dhuhr: Sun,
  Asr: CloudSun,
  Maghrib: Sunset,
  Isha: Moon,
}

type AladhanResponse = {
  data: {
    timings: Record<string, string>
    date: {
      hijri: {
        day: string
        month: { number: number; ar: string }
        year: string
        weekday: { ar: string }
      }
      gregorian: { date: string; weekday: { en: string } }
    }
    meta: { timezone: string }
  }
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function cleanTime(raw: string): string {
  const match = raw.match(/\d{1,2}:\d{2}/)
  return match ? match[0] : raw
}

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

export function PrayerTimesScreen({
  location,
  onOpenLocation,
}: {
  location: StoredLocation
  onOpenLocation: () => void
}) {
  const { t, lang, dir } = useSettings()
  const now = new Date()
  const dateStr = `${pad2(now.getDate())}-${pad2(now.getMonth() + 1)}-${now.getFullYear()}`
  const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${location.lat}&longitude=${location.lng}&method=${location.method}`

  const { data, error, isLoading, mutate, isValidating } = useSWR<AladhanResponse>(
    url,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  )

  const [tick, setTick] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const timings: Timings | null = data?.data?.timings
    ? (Object.fromEntries(
        ALL_TIMINGS.map((k) => [k, cleanTime(data.data.timings[k])]),
      ) as Timings)
    : null

  const nowDate = new Date(tick)
  const next = timings ? getNextPrayer(timings, nowDate) : null
  const current = timings ? getCurrentPrayer(timings, nowDate) : null
  const hijri = data?.data?.date?.hijri
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight

  const period = (isPM: boolean) => (isPM ? t('pm') : t('am'))

  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-2">
      {/* Location bar */}
      <button
        type="button"
        onClick={onOpenLocation}
        className="mb-4 flex w-full items-center justify-between rounded-2xl glass px-4 py-3 transition active:scale-[0.99] animate-float-up"
      >
        <span className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="text-start">
            <span className="block font-bold leading-tight">{location.name}</span>
            {location.country && (
              <span className="block text-xs text-muted-foreground">{location.country}</span>
            )}
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold text-primary">
          {t('change')}
          <Chevron className="h-4 w-4" />
        </span>
      </button>

      {/* Hero next-prayer card */}
      <section
        className="relative overflow-hidden rounded-[1.75rem] bg-primary p-6 text-primary-foreground shadow-xl shadow-primary/25 animate-float-up"
        style={{ animationDelay: '60ms' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{ backgroundImage: 'url(/islamic-pattern.png)', backgroundSize: '220px' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative">
          {isLoading && (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin opacity-80" />
            </div>
          )}

          {error && !timings && (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm opacity-90">{t('loadError')}</p>
              <button
                type="button"
                onClick={() => mutate()}
                className="flex items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-2 text-sm font-semibold"
              >
                <RefreshCw className="h-4 w-4" /> {t('retry')}
              </button>
            </div>
          )}

          {timings && next && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium opacity-85">{t('nextPrayer')}</p>
                {hijri && (
                  <p className="text-xs font-medium opacity-85">
                    {localizeDigits(hijri.day, lang)}{' '}
                    {hijriMonthName(String(hijri.month.number))}{' '}
                    {localizeDigits(hijri.year, lang)} {t('hijriSuffix')}
                  </p>
                )}
              </div>
              <h2 className="mt-1 font-heading text-4xl font-bold">{t(next.key)}</h2>
              <p className="mt-0.5 text-sm opacity-85">
                {(() => {
                  const f = formatTime12(timings[next.key])
                  return `${localizeDigits(f.time, lang)} ${period(f.isPM)}`
                })()}
                {next.isTomorrow ? ` — ${t('tomorrow')}` : ''}
              </p>

              <div className="mt-5 flex items-baseline justify-center gap-2 rounded-2xl bg-primary-foreground/12 py-4">
                <span className="font-mono text-5xl font-bold tabular-nums tracking-wider">
                  {localizeDigits(formatCountdown(next.msUntil), lang)}
                </span>
              </div>
              <p className="mt-2 text-center text-xs opacity-80">
                {t('remainingFor')} {t(next.key)}
              </p>
            </>
          )}
        </div>
      </section>

      {/* Timings list */}
      {timings && (
        <section className="mt-5 space-y-2.5">
          {ALL_TIMINGS.map((key, i) => {
            const Icon = PRAYER_ICONS[key]
            const isNext = next?.key === key && !next.isTomorrow
            const isCurrent = current === key && key !== 'Sunrise'
            const f = formatTime12(timings[key])
            return (
              <div
                key={key}
                className={cn(
                  'flex items-center justify-between rounded-2xl px-4 py-3.5 transition animate-float-up',
                  isNext
                    ? 'bg-primary/15 ring-1 ring-primary/40'
                    : isCurrent
                      ? 'bg-gold/15 ring-1 ring-gold/40'
                      : 'glass',
                )}
                style={{ animationDelay: `${120 + i * 50}ms` }}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full',
                      isNext
                        ? 'bg-primary text-primary-foreground'
                        : isCurrent
                          ? 'bg-gold text-gold-foreground'
                          : 'bg-foreground/8 text-muted-foreground',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-bold">{t(key)}</span>
                    {key === 'Sunrise' && (
                      <span className="block text-xs text-muted-foreground">{t('endOfFajr')}</span>
                    )}
                    {isNext && (
                      <span className="block text-xs font-semibold text-primary">{t('next')}</span>
                    )}
                    {isCurrent && (
                      <span className="block text-xs font-semibold text-gold">{t('current')}</span>
                    )}
                  </span>
                </span>
                <span className="text-end">
                  <span className="font-mono text-lg font-bold tabular-nums">
                    {localizeDigits(f.time, lang)}
                  </span>
                  <span className="mx-1 text-xs text-muted-foreground">{period(f.isPM)}</span>
                </span>
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => mutate()}
            className="mt-2 flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold text-muted-foreground transition active:scale-95"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isValidating && 'animate-spin')} />
            {t('refreshTimes')}
          </button>
        </section>
      )}
    </div>
  )
}
