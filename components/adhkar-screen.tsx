'use client'

import { useMemo, useState } from 'react'
import { Sun, Moon, RotateCcw, Check } from 'lucide-react'
import { MORNING_ADHKAR, EVENING_ADHKAR, type Dhikr } from '@/lib/adhkar-data'
import { toArabicDigits } from '@/lib/prayer-utils'
import { cn } from '@/lib/utils'

type Mode = 'morning' | 'evening'

function DhikrCard({ dhikr }: { dhikr: Dhikr }) {
  const [count, setCount] = useState(0)
  const done = count >= dhikr.count

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
        'overflow-hidden rounded-3xl border bg-card transition',
        done ? 'border-primary/40 bg-primary/5' : 'border-border',
      )}
    >
      <button
        type="button"
        onClick={handleTap}
        className="w-full px-5 pb-3 pt-5 text-right"
        aria-label="اضغط للعدّ"
      >
        <p className="font-serif text-xl leading-loose text-foreground">{dhikr.text}</p>
      </button>

      {(dhikr.note || dhikr.reference) && (
        <div className="px-5">
          {dhikr.note && (
            <p className="text-sm leading-relaxed text-muted-foreground">{dhikr.note}</p>
          )}
          {dhikr.reference && (
            <p className="mt-1 text-xs font-semibold text-gold-foreground/80">{dhikr.reference}</p>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border/70 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setCount(0)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
          aria-label="إعادة العدّ"
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
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground',
          )}
        >
          {done ? (
            <>
              <Check className="h-5 w-5" /> تمّ
            </>
          ) : (
            <span className="font-mono text-lg tabular-nums">
              {toArabicDigits(count)} / {toArabicDigits(dhikr.count)}
            </span>
          )}
        </button>
      </div>
    </article>
  )
}

export function AdhkarScreen() {
  const hour = new Date().getHours()
  const [mode, setMode] = useState<Mode>(hour >= 4 && hour < 16 ? 'morning' : 'evening')

  const list = useMemo(
    () => (mode === 'morning' ? MORNING_ADHKAR : EVENING_ADHKAR),
    [mode],
  )

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <h1 className="mb-1 text-center font-heading text-2xl font-bold">حصن المسلم</h1>
      <p className="mb-4 text-center text-sm text-muted-foreground">أذكار الصباح والمساء</p>

      {/* Toggle */}
      <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-2xl bg-muted p-1.5">
        {(
          [
            { key: 'morning', label: 'أذكار الصباح', icon: Sun },
            { key: 'evening', label: 'أذكار المساء', icon: Moon },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition',
              mode === key
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {list.map((d) => (
          <DhikrCard key={d.id} dhikr={d} />
        ))}
      </div>
    </div>
  )
}
