'use client'

import { useMemo, useState } from 'react'
import { Search, ChevronLeft, ScrollText } from 'lucide-react'
import { SURAHS, SURAH_START_PAGES, type SurahMeta } from '@/lib/quran-data'
import { toArabicDigits } from '@/lib/prayer-utils'
import { KhatmaCard } from './khatma-card'
import { MushafReader, type TafsirId } from './mushaf-reader'

/* ------------------------------------------------------------------ */
/* Main screen: list <-> mushaf reader                                 */
/* ------------------------------------------------------------------ */

export function QuranScreen() {
  const [openPage, setOpenPage] = useState<number | null>(null)
  const [tafsir, setTafsir] = useState<TafsirId>('none')

  if (openPage !== null) {
    return (
      <MushafReader
        initialPage={openPage}
        tafsir={tafsir}
        onChangeTafsir={setTafsir}
        onBack={() => setOpenPage(null)}
      />
    )
  }

  return (
    <SurahList
      onSelectSurah={(n) => setOpenPage(SURAH_START_PAGES[n - 1])}
      onSelectPage={(p) => setOpenPage(p)}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Surah list                                                          */
/* ------------------------------------------------------------------ */

function SurahList({
  onSelectSurah,
  onSelectPage,
}: {
  onSelectSurah: (n: number) => void
  onSelectPage: (p: number) => void
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return SURAHS
    return SURAHS.filter(
      (s) =>
        s.name.includes(q) ||
        s.number.toString() === q ||
        toArabicDigits(s.number) === q,
    )
  }, [query])

  const lastRead = getLastRead()

  return (
    <div className="mx-auto max-w-md px-4 pb-36 pt-4">
      <header className="mb-4 text-center">
        <h1 className="font-heading text-3xl font-bold text-primary">القرآن الكريم</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          مصحف المدينة — رواية حفص عن عاصم
        </p>
      </header>

      {/* Khatma plan card */}
      <KhatmaCard onOpenSurah={onSelectSurah} />

      {/* Last read card */}
      {lastRead && (
        <button
          type="button"
          onClick={() =>
            lastRead.page
              ? onSelectPage(lastRead.page)
              : onSelectSurah(lastRead.surah)
          }
          className="relative mb-4 flex w-full items-center justify-between overflow-hidden rounded-2xl bg-primary p-4 text-primary-foreground shadow-md"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-15"
            style={{ backgroundImage: 'url(/islamic-pattern.png)', backgroundSize: '200px' }}
          />
          <span className="relative flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/15">
              <ScrollText className="h-5 w-5" />
            </span>
            <span className="text-right">
              <span className="block text-xs opacity-85">متابعة القراءة</span>
              <span className="block font-heading text-lg font-bold">
                سورة {SURAHS[lastRead.surah - 1]?.name}
                {lastRead.page ? ` · صفحة ${toArabicDigits(lastRead.page)}` : ''}
              </span>
            </span>
          </span>
          <ChevronLeft className="relative h-5 w-5 opacity-80" />
        </button>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          dir="rtl"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن سورة بالاسم أو الرقم..."
          className="w-full rounded-2xl bg-card py-3 pl-4 pr-10 text-sm shadow-sm ring-1 ring-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Surah list */}
      <ul className="space-y-2">
        {filtered.map((s) => (
          <li key={s.number}>
            <SurahRow surah={s} onSelect={() => onSelectSurah(s.number)} />
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-10 text-center text-sm text-muted-foreground">
            لا توجد نتائج مطابقة
          </li>
        )}
      </ul>
    </div>
  )
}

function SurahRow({ surah, onSelect }: { surah: SurahMeta; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-sm ring-1 ring-border transition hover:ring-primary/40"
    >
      <span className="flex items-center gap-3">
        {/* Ornamental number */}
        <span className="relative flex h-11 w-11 shrink-0 rotate-45 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/25">
          <span className="-rotate-45 font-heading text-sm font-bold text-primary">
            {toArabicDigits(surah.number)}
          </span>
        </span>
        <span className="text-right">
          <span className="block font-heading text-lg font-bold leading-tight">
            سورة {surah.name}
          </span>
          <span className="block text-xs text-muted-foreground">
            {surah.type === 'M' ? 'مكية' : 'مدنية'} · {toArabicDigits(surah.ayahs)} آية
          </span>
        </span>
      </span>
      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Last-read position (reading preference, stored on device)           */
/* ------------------------------------------------------------------ */

function getLastRead(): { surah: number; page?: number } | null {
  try {
    const raw = localStorage.getItem('quran-last-read')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
