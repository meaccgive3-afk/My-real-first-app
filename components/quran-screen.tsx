'use client'

import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Loader2,
  RefreshCw,
  ScrollText,
} from 'lucide-react'
import { SURAHS, BISMILLAH, stripBismillah, type SurahMeta } from '@/lib/quran-data'
import { toArabicDigits } from '@/lib/prayer-utils'
import { KhatmaCard } from './khatma-card'
import { BottomSheet } from './bottom-sheet'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type Ayah = {
  number: number
  text: string
  numberInSurah: number
  page: number
  juz: number
}

type SurahResponse = {
  code: number
  data: {
    number: number
    name: string
    numberOfAyahs: number
    revelationType: string
    ayahs: Ayah[]
  }
}

const TAFSIR_EDITIONS = [
  { id: 'none', label: 'بدون تفسير' },
  { id: 'ar.muyassar', label: 'التفسير الميسّر' },
  { id: 'ar.jalalayn', label: 'تفسير الجلالين' },
  { id: 'ar.qurtubi', label: 'تفسير القرطبي' },
] as const

type TafsirId = (typeof TAFSIR_EDITIONS)[number]['id']

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/* ------------------------------------------------------------------ */
/* Main screen: list <-> reader                                        */
/* ------------------------------------------------------------------ */

export function QuranScreen() {
  const [selected, setSelected] = useState<number | null>(null)
  const [tafsir, setTafsir] = useState<TafsirId>('none')

  if (selected !== null) {
    return (
      <SurahReader
        surahNumber={selected}
        tafsir={tafsir}
        onChangeTafsir={setTafsir}
        onBack={() => setSelected(null)}
        onNavigate={(n) => setSelected(n)}
      />
    )
  }

  return <SurahList onSelect={setSelected} />
}

/* ------------------------------------------------------------------ */
/* Surah list                                                          */
/* ------------------------------------------------------------------ */

function SurahList({ onSelect }: { onSelect: (n: number) => void }) {
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
      <KhatmaCard onOpenSurah={onSelect} />

      {/* Last read card */}
      {lastRead && (
        <button
          type="button"
          onClick={() => onSelect(lastRead.surah)}
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
            <SurahRow surah={s} onSelect={() => onSelect(s.number)} />
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

function getLastRead(): { surah: number } | null {
  try {
    const raw = localStorage.getItem('quran-last-read')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setLastRead(surah: number) {
  try {
    localStorage.setItem('quran-last-read', JSON.stringify({ surah }))
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Surah reader — mushaf style                                         */
/* ------------------------------------------------------------------ */

function SurahReader({
  surahNumber,
  tafsir,
  onChangeTafsir,
  onBack,
  onNavigate,
}: {
  surahNumber: number
  tafsir: TafsirId
  onChangeTafsir: (t: TafsirId) => void
  onBack: () => void
  onNavigate: (n: number) => void
}) {
  const meta = SURAHS[surahNumber - 1]
  const [tafsirAyah, setTafsirAyah] = useState<number | null>(null)
  const [showTafsirPicker, setShowTafsirPicker] = useState(false)

  // Quran text (uthmani script)
  const { data, error, isLoading, mutate } = useSWR<SurahResponse>(
    `https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
  )

  // Tafsir text (only fetched when a tafsir edition is selected)
  const { data: tafsirData } = useSWR<SurahResponse>(
    tafsir !== 'none'
      ? `https://api.alquran.cloud/v1/surah/${surahNumber}/${tafsir}`
      : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
  )

  const ayahs = data?.code === 200 ? data.data.ayahs : null

  useEffect(() => {
    if (ayahs) setLastRead(surahNumber)
  }, [ayahs, surahNumber])

  const tafsirLabel = TAFSIR_EDITIONS.find((t) => t.id === tafsir)?.label
  const selectedTafsirText =
    tafsirAyah !== null && tafsirData?.code === 200
      ? tafsirData.data.ayahs.find((a) => a.numberInSurah === tafsirAyah)?.text
      : null

  return (
    <div className="mx-auto max-w-md px-4 pb-36 pt-4">
      {/* Top bar */}
      <header className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-full bg-card px-3 py-2 text-xs font-semibold shadow-sm ring-1 ring-border"
        >
          <ChevronRight className="h-4 w-4" />
          الفهرس
        </button>

        <button
          type="button"
          onClick={() => setShowTafsirPicker(true)}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-sm ring-1 transition',
            tafsir !== 'none'
              ? 'bg-primary text-primary-foreground ring-primary'
              : 'bg-card ring-border',
          )}
        >
          <BookOpen className="h-4 w-4" />
          {tafsir !== 'none' ? tafsirLabel : 'التفسير'}
        </button>
      </header>

      {/* Surah header ornament */}
      <div className="relative mb-1 overflow-hidden rounded-2xl border-2 border-gold/50 bg-card px-4 py-3 text-center shadow-sm">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: 'url(/islamic-pattern.png)', backgroundSize: '160px' }}
        />
        <h2 className="relative font-heading text-2xl font-bold text-primary">
          سُورَةُ {meta.name}
        </h2>
        <p className="relative mt-0.5 text-xs text-muted-foreground">
          {meta.type === 'M' ? 'مكية' : 'مدنية'} · آياتها {toArabicDigits(meta.ayahs)}
        </p>
      </div>

      {isLoading && (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      )}

      {error && !ayahs && (
        <div className="flex h-60 flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">تعذّر تحميل السورة. تحقق من اتصالك.</p>
          <button
            type="button"
            onClick={() => mutate()}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4" /> إعادة المحاولة
          </button>
        </div>
      )}

      {ayahs && (
        <article
          dir="rtl"
          className="rounded-2xl bg-card px-4 py-5 shadow-sm ring-1 ring-border"
        >
          {/* Bismillah (except Al-Fatiha where it's ayah 1, and At-Tawbah) */}
          {surahNumber !== 1 && surahNumber !== 9 && (
            <p className="mb-4 text-center font-quran text-2xl leading-relaxed text-foreground">
              {BISMILLAH}
            </p>
          )}

          {/* Continuous mushaf-style text */}
          <p className="text-justify font-quran text-2xl leading-[2.4] text-foreground">
            {ayahs.map((a) => {
              const text = stripBismillah(a.text, surahNumber, a.numberInSurah)
              const isActive = tafsirAyah === a.numberInSurah
              return (
                <span
                  key={a.number}
                  role={tafsir !== 'none' ? 'button' : undefined}
                  tabIndex={tafsir !== 'none' ? 0 : undefined}
                  onClick={
                    tafsir !== 'none' ? () => setTafsirAyah(a.numberInSurah) : undefined
                  }
                  onKeyDown={
                    tafsir !== 'none'
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setTafsirAyah(a.numberInSurah)
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    'rounded-md transition-colors',
                    tafsir !== 'none' && 'cursor-pointer hover:bg-primary/8',
                    isActive && 'bg-gold/20',
                  )}
                >
                  {text}
                  {/* Ayah-end ornament */}
                  <span className="mx-1 inline-flex h-7 w-7 -translate-y-0.5 items-center justify-center rounded-full bg-primary/10 align-middle text-[0.65rem] font-bold text-primary ring-1 ring-primary/30">
                    {toArabicDigits(a.numberInSurah)}
                  </span>{' '}
                </span>
              )
            })}
          </p>

          {tafsir !== 'none' && (
            <p className="mt-4 border-t border-border pt-3 text-center text-xs text-muted-foreground">
              اضغط على أي آية لعرض تفسيرها
            </p>
          )}
        </article>
      )}

      {/* Prev / next surah nav */}
      {ayahs && (
        <nav className="mt-4 flex items-center justify-between gap-2">
          {surahNumber > 1 ? (
            <button
              type="button"
              onClick={() => onNavigate(surahNumber - 1)}
              className="flex items-center gap-1 rounded-full bg-card px-4 py-2.5 text-xs font-semibold shadow-sm ring-1 ring-border"
            >
              <ChevronRight className="h-4 w-4" />
              {SURAHS[surahNumber - 2].name}
            </button>
          ) : (
            <span />
          )}
          {surahNumber < 114 ? (
            <button
              type="button"
              onClick={() => onNavigate(surahNumber + 1)}
              className="flex items-center gap-1 rounded-full bg-card px-4 py-2.5 text-xs font-semibold shadow-sm ring-1 ring-border"
            >
              {SURAHS[surahNumber].name}
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <span />
          )}
        </nav>
      )}

      {/* Tafsir edition picker sheet */}
      {showTafsirPicker && (
        <BottomSheet title="اختر التفسير" onClose={() => setShowTafsirPicker(false)}>
          <ul className="space-y-2">
            {TAFSIR_EDITIONS.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChangeTafsir(t.id)
                    setTafsirAyah(null)
                    setShowTafsirPicker(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold ring-1 transition',
                    tafsir === t.id
                      ? 'bg-primary text-primary-foreground ring-primary'
                      : 'bg-card ring-border hover:ring-primary/40',
                  )}
                >
                  {t.label}
                  {tafsir === t.id && <span className="text-xs opacity-85">المحدد</span>}
                </button>
              </li>
            ))}
          </ul>
        </BottomSheet>
      )}

      {/* Tafsir content sheet */}
      {tafsirAyah !== null && tafsir !== 'none' && (
        <BottomSheet
          title={`تفسير الآية ${toArabicDigits(tafsirAyah)} — ${tafsirLabel}`}
          onClose={() => setTafsirAyah(null)}
        >
          {selectedTafsirText ? (
            <p dir="rtl" className="text-justify text-base leading-relaxed text-foreground">
              {selectedTafsirText}
            </p>
          ) : (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </BottomSheet>
      )}
    </div>
  )
}
