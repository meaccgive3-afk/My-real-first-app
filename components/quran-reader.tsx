'use client'

import useSWR from 'swr'
import { useState } from 'react'
import {
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Download,
  Check,
  Loader2,
  Languages,
  Mic,
} from 'lucide-react'
import {
  RECITERS,
  surahDetailFetcher,
  type SurahMeta,
  type SurahDetail,
} from '@/lib/quran'
import { useSurahAudio } from '@/lib/use-surah-audio'
import { localizeDigits } from '@/lib/prayer-utils'
import { useSettings } from '@/lib/settings-context'
import { QURAN_TRANSLATION_EDITION } from '@/lib/i18n'
import { cn } from '@/lib/utils'

function fmtTime(s: number): string {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function QuranReader({
  surah,
  onBack,
}: {
  surah: SurahMeta
  onBack: () => void
}) {
  const { t, lang, dir } = useSettings()
  const edition = QURAN_TRANSLATION_EDITION[lang]
  const [reciter, setReciter] = useState(RECITERS[0].id)
  const [showTranslation, setShowTranslation] = useState(true)

  const { data, isLoading } = useSWR<SurahDetail>(
    ['surah', surah.number, edition],
    surahDetailFetcher,
    { revalidateOnFocus: false },
  )

  const audio = useSurahAudio(reciter, surah.number)
  const Back = dir === 'rtl' ? ChevronRight : ChevronLeft

  const isBasmalahSurah = surah.number !== 1 && surah.number !== 9

  return (
    <div className="mx-auto max-w-md px-4 pb-44 pt-2">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('quran')}
          className="flex h-10 w-10 items-center justify-center rounded-full glass text-foreground transition active:scale-90"
        >
          <Back className="h-5 w-5" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="font-heading text-2xl font-bold leading-tight">{surah.name}</h1>
          <p className="text-xs text-muted-foreground">
            {surah.englishName} ·{' '}
            {surah.revelationType === 'Meccan' ? t('makki') : t('madani')} ·{' '}
            {localizeDigits(surah.numberOfAyahs, lang)} {t('verses')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTranslation((s) => !s)}
          aria-label={showTranslation ? t('hideTranslation') : t('showTranslation')}
          aria-pressed={showTranslation}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90',
            showTranslation ? 'bg-primary text-primary-foreground' : 'glass text-foreground',
          )}
        >
          <Languages className="h-5 w-5" />
        </button>
      </div>

      {/* Reciter selector */}
      <div className="mb-3 flex items-center gap-2 rounded-2xl glass px-3 py-2">
        <Mic className="h-4 w-4 shrink-0 text-primary" />
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
          {t('reciter')}
        </span>
        <select
          value={reciter}
          onChange={(e) => setReciter(e.target.value)}
          className="w-full bg-transparent text-sm font-bold outline-none"
        >
          {RECITERS.map((r) => (
            <option key={r.id} value={r.id} className="bg-popover text-popover-foreground">
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Basmalah */}
      {isBasmalahSurah && (
        <p className="mb-4 text-center font-serif text-2xl leading-loose text-primary">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
      )}

      {/* Verses */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm">{t('loadingSurah')}</p>
        </div>
      )}

      {data && (
        <div className="space-y-3">
          {data.arabic.map((ayah, i) => (
            <article
              key={ayah.number}
              className="rounded-[1.25rem] glass px-4 py-4 animate-float-up"
              style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary/15 px-2 font-mono text-xs font-bold text-primary">
                  {localizeDigits(ayah.numberInSurah, lang)}
                </span>
              </div>
              <p dir="rtl" className="text-pretty font-serif text-2xl leading-[2.4] text-foreground">
                {ayah.text}
              </p>
              {showTranslation && data.translation[i] && (
                <p
                  dir={dir}
                  className="mt-2 border-t border-glass-border pt-2 text-sm leading-relaxed text-muted-foreground"
                >
                  {data.translation[i].text}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Sticky audio player */}
      <div className="fixed inset-x-0 bottom-[5.5rem] z-30 px-3">
        <div className="mx-auto flex max-w-md items-center gap-3 rounded-[1.5rem] glass-strong px-3 py-2.5 shadow-2xl shadow-black/25">
          <button
            type="button"
            onClick={audio.toggle}
            aria-label={audio.playing ? t('pause') : t('play')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-90"
          >
            {audio.playing ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5 ms-0.5" fill="currentColor" />
            )}
          </button>

          <div className="flex-1">
            <input
              type="range"
              min={0}
              max={audio.duration || 0}
              value={audio.progress}
              onChange={(e) => audio.seek(Number(e.target.value))}
              aria-label={t('play')}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-foreground/15 accent-primary"
            />
            <div className="mt-1 flex justify-between font-mono text-[0.65rem] text-muted-foreground">
              <span>{fmtTime(audio.progress)}</span>
              <span>{fmtTime(audio.duration)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={audio.download}
            disabled={audio.downloadState === 'downloaded'}
            aria-label={t('download')}
            className={cn(
              'flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-bold transition active:scale-95',
              audio.downloadState === 'downloaded'
                ? 'bg-primary/15 text-primary'
                : 'bg-foreground/10 text-foreground',
            )}
          >
            {audio.downloadState === 'downloading' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {localizeDigits(audio.downloadPct, lang)}%
              </>
            ) : audio.downloadState === 'downloaded' ? (
              <Check className="h-5 w-5" />
            ) : (
              <Download className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
