'use client'

import useSWR from 'swr'
import { useEffect, useState } from 'react'
import {
  MapPin,
  ChevronLeft,
  Sunrise as SunriseIcon,
  Sun,
  CloudSun,
  Sunset,
  Moon,
  Loader2,
  RefreshCw,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Square,
} from 'lucide-react'
import type { StoredLocation } from '@/lib/use-location'
import {
  ALL_TIMINGS,
  PRAYER_LABELS,
  type PrayerKey,
  type Timings,
  formatTime12,
  getNextPrayer,
  getCurrentPrayer,
  formatCountdown,
  toArabicDigits,
  hijriMonthName,
} from '@/lib/prayer-utils'
import { cn } from '@/lib/utils'
import { useAdhan } from '@/lib/use-adhan'

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
  // Aladhan may return "05:12 (EET)" — keep only HH:MM
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

  const { settings, setSettings, playing, stopAdhan, requestNotifyPermission } =
    useAdhan(timings)

  const toggleNotify = async () => {
    if (!settings.notify) {
      const granted = await requestNotifyPermission()
      setSettings({ notify: granted })
    } else {
      setSettings({ notify: false })
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      {/* Location bar */}
      <button
        type="button"
        onClick={onOpenLocation}
        className="mb-4 flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-sm ring-1 ring-border"
      >
        <span className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="text-right">
            <span className="block font-bold leading-tight">{location.name}</span>
            {location.country && (
              <span className="block text-xs text-muted-foreground">{location.country}</span>
            )}
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold text-primary">
          تغيير
          <ChevronLeft className="h-4 w-4" />
        </span>
      </button>

      {/* Hero next-prayer card */}
      <section className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'url(/islamic-pattern.png)',
            backgroundSize: '220px',
          }}
        />
        <div className="relative">
          {isLoading && (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin opacity-80" />
            </div>
          )}

          {error && !timings && (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm opacity-90">تعذّر جلب المواقيت. تحقق من اتصالك.</p>
              <button
                type="button"
                onClick={() => mutate()}
                className="flex items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-2 text-sm font-semibold"
              >
                <RefreshCw className="h-4 w-4" /> إعادة المحاولة
              </button>
            </div>
          )}

          {timings && next && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium opacity-85">الصلاة القادمة</p>
                {hijri && (
                  <p className="text-xs font-medium opacity-85">
                    {toArabicDigits(hijri.day)} {hijriMonthName(String(hijri.month.number))}{' '}
                    {toArabicDigits(hijri.year)} هـ
                  </p>
                )}
              </div>
              <h2 className="mt-1 font-heading text-4xl font-bold">{next.label}</h2>
              <p className="mt-0.5 text-sm opacity-85">
                {(() => {
                  const f = formatTime12(timings[next.key])
                  return `${toArabicDigits(f.time)} ${f.period}`
                })()}
                {next.isTomorrow ? ' — غداً' : ''}
              </p>

              <div className="mt-5 flex items-baseline justify-center gap-2 rounded-2xl bg-primary-foreground/12 py-4">
                <span className="font-mono text-4xl font-bold tabular-nums tracking-wider">
                  {toArabicDigits(formatCountdown(next.msUntil))}
                </span>
              </div>
              <p className="mt-2 text-center text-xs opacity-80">
                متبقٍّ على آذان {next.label}
              </p>
            </>
          )}
        </div>
      </section>

      {/* Adhan playing banner */}
      {playing && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-gold/15 px-4 py-3 ring-1 ring-gold/40">
          <span className="flex items-center gap-2 text-sm font-bold text-gold-foreground">
            <Volume2 className="h-5 w-5 animate-pulse" />
            الأذان الآن — صلاة {PRAYER_LABELS[playing]}
          </span>
          <button
            type="button"
            onClick={stopAdhan}
            className="flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-gold-foreground"
          >
            <Square className="h-3 w-3" />
            إيقاف
          </button>
        </div>
      )}

      {/* Adhan settings */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setSettings({ sound: !settings.sound })}
          aria-pressed={settings.sound}
          className={cn(
            'flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold ring-1 transition',
            settings.sound
              ? 'bg-primary/10 text-primary ring-primary/30'
              : 'bg-card text-muted-foreground ring-border',
          )}
        >
          {settings.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          صوت الأذان
        </button>
        <button
          type="button"
          onClick={toggleNotify}
          aria-pressed={settings.notify}
          className={cn(
            'flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold ring-1 transition',
            settings.notify
              ? 'bg-primary/10 text-primary ring-primary/30'
              : 'bg-card text-muted-foreground ring-border',
          )}
        >
          {settings.notify ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          تنبيه الصلاة
        </button>
      </div>

      {/* Timings list */}
      {timings && (
        <section className="mt-5 space-y-2.5">
          {ALL_TIMINGS.map((key) => {
            const Icon = PRAYER_ICONS[key]
            const isNext = next?.key === key && !next.isTomorrow
            const isCurrent = current === key && key !== 'Sunrise'
            const f = formatTime12(timings[key])
            return (
              <div
                key={key}
                className={cn(
                  'flex items-center justify-between rounded-2xl px-4 py-3.5 ring-1 transition',
                  isNext
                    ? 'bg-primary/10 ring-primary/30'
                    : isCurrent
                      ? 'bg-gold/12 ring-gold/30'
                      : 'bg-card ring-border',
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full',
                      isNext
                        ? 'bg-primary text-primary-foreground'
                        : isCurrent
                          ? 'bg-gold text-gold-foreground'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-bold">{PRAYER_LABELS[key]}</span>
                    {key === 'Sunrise' && (
                      <span className="block text-xs text-muted-foreground">نهاية وقت الفجر</span>
                    )}
                    {isNext && (
                      <span className="block text-xs font-semibold text-primary">القادمة</span>
                    )}
                    {isCurrent && (
                      <span className="block text-xs font-semibold text-gold-foreground">
                        الوقت الحالي
                      </span>
                    )}
                  </span>
                </span>
                <span className="text-left">
                  <span className="font-mono text-lg font-bold tabular-nums">
                    {toArabicDigits(f.time)}
                  </span>
                  <span className="mr-1 text-xs text-muted-foreground">{f.period}</span>
                </span>
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => mutate()}
            className="mt-2 flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold text-muted-foreground"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isValidating && 'animate-spin')} />
            تحديث المواقيت
          </button>
        </section>
      )}
    </div>
  )
}
