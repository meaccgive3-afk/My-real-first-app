'use client'

import { useEffect, useState } from 'react'
import { RotateCcw, Vibrate, VolumeX } from 'lucide-react'
import { TASBIH_PRESETS } from '@/lib/adhkar-data'
import { toArabicDigits } from '@/lib/prayer-utils'
import { cn } from '@/lib/utils'

const TOTAL_KEY = 'sakinah:tasbih:total'

export function TasbihScreen() {
  const [presetId, setPresetId] = useState(TASBIH_PRESETS[0].id)
  const [count, setCount] = useState(0)
  const [rounds, setRounds] = useState(0)
  const [total, setTotal] = useState(0)
  const [haptics, setHaptics] = useState(true)

  const preset = TASBIH_PRESETS.find((p) => p.id === presetId) ?? TASBIH_PRESETS[0]
  const target = preset.target
  const progress = (count / target) * 100

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TOTAL_KEY)
      if (raw) setTotal(parseInt(raw, 10) || 0)
    } catch {
      // ignore
    }
  }, [])

  const persistTotal = (val: number) => {
    setTotal(val)
    try {
      localStorage.setItem(TOTAL_KEY, String(val))
    } catch {
      // ignore
    }
  }

  const handleCount = () => {
    const nextCount = count + 1
    if (haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(nextCount >= target ? [30, 40, 30] : 18)
    }
    persistTotal(total + 1)
    if (nextCount >= target) {
      setRounds((r) => r + 1)
      setCount(0)
    } else {
      setCount(nextCount)
    }
  }

  const resetCurrent = () => {
    setCount(0)
    setRounds(0)
  }

  const switchPreset = (id: string) => {
    setPresetId(id)
    setCount(0)
    setRounds(0)
  }

  const R = 130
  const circumference = 2 * Math.PI * R

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col px-4 pb-28 pt-4">
      <h1 className="mb-1 text-center font-heading text-2xl font-bold">السبحة</h1>
      <p className="mb-4 text-center text-sm text-muted-foreground">اضغط في أي مكان للعدّ</p>

      {/* Preset chips */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto no-scrollbar px-4">
        {TASBIH_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => switchPreset(p.id)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 font-serif text-base transition',
              p.id === presetId
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground',
            )}
          >
            {p.text}
          </button>
        ))}
      </div>

      {/* Big tap area */}
      <button
        type="button"
        onClick={handleCount}
        className="group relative mx-auto my-auto flex aspect-square w-full max-w-xs items-center justify-center rounded-full outline-none"
        aria-label={`عدّ ${preset.text}`}
      >
        <svg viewBox="0 0 300 300" className="h-full w-full -rotate-90">
          <circle
            cx="150"
            cy="150"
            r={R}
            fill="none"
            strokeWidth="14"
            className="stroke-muted"
          />
          <circle
            cx="150"
            cy="150"
            r={R}
            fill="none"
            strokeWidth="14"
            strokeLinecap="round"
            className="stroke-primary transition-[stroke-dashoffset] duration-200"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (progress / 100) * circumference}
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-6xl font-bold tabular-nums text-foreground transition group-active:scale-90">
            {toArabicDigits(count)}
          </span>
          <span className="mt-1 text-sm font-semibold text-muted-foreground">
            من {toArabicDigits(target)}
          </span>
          <span className="mt-2 font-serif text-lg text-primary">{preset.text}</span>
        </span>
      </button>

      {/* Stats */}
      <div className="mt-auto grid grid-cols-3 gap-2 pt-6">
        <div className="rounded-2xl bg-card py-3 text-center ring-1 ring-border">
          <p className="font-mono text-xl font-bold">{toArabicDigits(rounds)}</p>
          <p className="text-xs text-muted-foreground">الدورات</p>
        </div>
        <div className="rounded-2xl bg-card py-3 text-center ring-1 ring-border">
          <p className="font-mono text-xl font-bold">{toArabicDigits(total)}</p>
          <p className="text-xs text-muted-foreground">الإجمالي</p>
        </div>
        <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-card py-3 ring-1 ring-border">
          <button
            type="button"
            onClick={resetCurrent}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
            aria-label="تصفير العدّاد"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setHaptics((h) => !h)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full transition',
              haptics ? 'text-primary' : 'text-muted-foreground hover:bg-muted',
            )}
            aria-label="تشغيل أو إيقاف الاهتزاز"
            aria-pressed={haptics}
          >
            {haptics ? <Vibrate className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
