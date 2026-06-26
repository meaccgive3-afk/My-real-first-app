'use client'

import { useMemo, useState } from 'react'
import { Sun, Moon, RotateCcw, Check } from 'lucide-react'
import { MORNING_ADHKAR, EVENING_ADHKAR, type Dhikr } from '@/lib/adhkar-data'
import { localizeDigits } from '@/lib/prayer-utils'
import { useSettings } from '@/lib/settings-context'
import { cn } from '@/lib/utils'

type Mode = 'morning' | 'evening'

function DhikrCard({ dhikr, index }: { dhikr: Dhikr; index: number }) {
  const { t, lang } = useSettings()
  const [count, setCount] = useState(0)
  const done = count >= dhikr.count
  const progress = Math.min(count / dhikr.count, 1) * 100

  const handleTap = () => {
    if (done) return
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15)
    }
    setCount((c) => Math.min(c + 1, dhikr.count))
  }

  return (
    <article
      className={cn(
        'overflow-hidden rounded-[1.5rem] transition animate-float-up',
        done ? 'bg-primary/12 ring-1 ring-primary/40' : 'glass',
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <button
        type="button"
        onClick={handleTap}
        className="w-full px-5 pb-3 pt-5 text-start"
        aria-label={t('tapToCount')}
      >
        <p dir="rtl" className="text-pretty font-serif text-xl leading-loose text-foreground">
          {dhikr.text}
        </p>
      </button>

      {(dhikr.note || dhikr.reference) && (
        <div className="px-5">
          {dhikr.note && (
            <p dir="rtl" className="text-sm leading-relaxed text-muted-foreground">
              {dhikr.note}
            </p>
          )}
          {dhikr.reference && (
            <p dir="rtl" className="mt-1 text-xs font-semibold text-gold">
              {dhikr.reference}
            </p>
          )}
        </div>
      )}

      {/* progress line */}
      <div className="mt-3 h-1 w-full bg-foreground/8">
        <div
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-3 py-2.5">
        <button
          type="button"
          onClick={() => setCount(0)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/10 active:scale-90"
          aria-label={t('resetCount')}
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleTap}
          disabled={done}
          className={cn(
            'flex min-w-28 items-center justify-center gap-2 rounded-full px-5 py-2 font-bold transition active:scale-95',
            done
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
              : 'bg-foreground/10 text-foreground',
          )}
        >
          {done ? (
            <>
              <Check className="h-5 w-5" /> {t('done')}
            </>
          ) : (
            <span className="font-mono text-lg tabular-nums">
              {localizeDigits(count, lang)} / {localizeDigits(dhikr.count, lang)}
            </span>
          )}
        </button>
      </div>
    </article>
  )
}

export function AdhkarScreen() {
  const { t } = useSettings()
  const hour = new Date().getHours()
  const [mode, setMode] = useState<Mode>(hour >= 4 && hour < 16 ? 'morning' : 'evening')

  const list = useMemo(
    () => (mode === 'morning' ? MORNING_ADHKAR : EVENING_ADHKAR),
    [mode],
  )

  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-2">
      <h1 className="mb-1 text-center font-heading text-2xl font-bold">{t('fortress')}</h1>
      <p className="mb-4 text-center text-sm text-muted-foreground">{t('adhkarSubtitle')}</p>

      {/* Toggle */}
      <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-2xl glass p-1.5">
        {(
          [
            { key: 'morning', label: t('morning'), icon: Sun },
            { key: 'evening', label: t('evening'), icon: Moon },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key as Mode)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition',
              mode === key
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'text-muted-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {list.map((d, i) => (
          <DhikrCard key={d.id} dhikr={d} index={i} />
        ))}
      </div>
    </div>
  )
}
