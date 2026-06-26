'use client'

import useSWR from 'swr'
import { useMemo, useState } from 'react'
import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { surahListFetcher, type SurahMeta } from '@/lib/quran'
import { localizeDigits } from '@/lib/prayer-utils'
import { useSettings } from '@/lib/settings-context'
import { QuranReader } from './quran-reader'

export function QuranScreen() {
  const { t, lang, dir } = useSettings()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<SurahMeta | null>(null)

  const { data, isLoading } = useSWR<SurahMeta[]>('surah-list', surahListFetcher, {
    revalidateOnFocus: false,
  })

  const filtered = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (s) =>
        s.name.includes(q) ||
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        String(s.number).includes(q),
    )
  }, [data, query])

  if (selected) {
    return <QuranReader surah={selected} onBack={() => setSelected(null)} />
  }

  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight

  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-2">
      <h1 className="mb-1 text-center font-heading text-2xl font-bold">{t('quran')}</h1>
      <p className="mb-4 text-center text-sm text-muted-foreground">{t('quranSubtitle')}</p>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchSurah')}
          className="w-full rounded-2xl border border-input glass py-3 pe-10 ps-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm">{t('loadingSurahs')}</p>
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map((s, i) => (
          <li key={s.number}>
            <button
              type="button"
              onClick={() => setSelected(s)}
              className="flex w-full items-center gap-3 rounded-2xl glass px-3 py-3 text-start transition active:scale-[0.99] animate-float-up"
              style={{ animationDelay: `${Math.min(i, 14) * 25}ms` }}
            >
              {/* Number badge */}
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                <svg viewBox="0 0 44 44" className="absolute inset-0 h-full w-full text-primary/30">
                  <path
                    fill="currentColor"
                    d="M22 1l5.5 3.6 6.5-1 1.9 6.3 5.6 3.5-2.3 6.2 2.3 6.2-5.6 3.5-1.9 6.3-6.5-1L22 43l-5.5-3.6-6.5 1-1.9-6.3L2.5 30.5l2.3-6.2-2.3-6.2 5.6-3.5 1.9-6.3 6.5 1z"
                  />
                </svg>
                <span className="relative font-mono text-sm font-bold text-primary">
                  {localizeDigits(s.number, lang)}
                </span>
              </span>

              <span className="flex-1">
                <span className="block font-heading text-lg font-bold leading-tight">
                  {s.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {s.englishName} ·{' '}
                  {s.revelationType === 'Meccan' ? t('makki') : t('madani')} ·{' '}
                  {localizeDigits(s.numberOfAyahs, lang)} {t('verses')}
                </span>
              </span>

              <Chevron className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
