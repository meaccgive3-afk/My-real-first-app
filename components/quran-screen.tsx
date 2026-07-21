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
  const mushafPage = ayahs?.[0]?.page
  const juz = ayahs?.[0]?.juz

  return (
    <div className="quran-reader -mx-4 -mt-4 min-h-dvh bg-[#171719] px-5 pb-36 pt-5 text-[#e7e7ea] sm:px-8">
      <header className="mb-10 flex items-start justify-between gap-3 text-[#85858f]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="العودة إلى فهرس السور"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#343439] bg-[#202023] text-[#d7d7dc] transition hover:bg-[#29292d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#85858f]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="text-right">
            <h2 className="font-heading text-lg font-bold leading-tight text-[#d7d7dc]">
              سورة {meta.name}
            </h2>
            <p className="text-xs">{meta.type === 'M' ? 'مكية' : 'مدنية'} · {toArabicDigits(meta.ayahs)} آية</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {juz && <p className="font-heading text-lg font-bold">الجزء {toArabicDigits(juz)}</p>}
          <button
            type="button"
            onClick={() => setShowTafsirPicker(true)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#85858f]',
              tafsir !== 'none'
                ? 'border-[#777781] bg-[#d7d7dc] text-[#171719]'
                : 'border-[#343439] bg-[#202023] text-[#a8a8b0]',
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {tafsir !== 'none' ? tafsirLabel : 'التفسير'}
          </button>
        </div>
      </header>

      {isLoading && (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#a8a8b0]" />
        </div>
      )}

      {error && !ayahs && (
        <div className="flex h-60 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-[#a8a8b0]">تعذّر تحميل السورة. تحقق من اتصالك.</p>
          <button
            type="button"
            onClick={() => mutate()}
            className="flex items-center gap-2 rounded-full bg-[#e7e7ea] px-4 py-2 text-sm font-semibold text-[#171719]"
          >
            <RefreshCw className="h-4 w-4" /> إعادة المحاولة
          </button>
        </div>
      )}

      {ayahs && (
        <article dir="rtl" className="mx-auto max-w-3xl">
          {surahNumber !== 1 && surahNumber !== 9 && (
            <p className="mb-8 text-center font-quran text-2xl leading-relaxed text-[#d7d7dc] sm:text-3xl">
              {BISMILLAH}
            </p>
          )}

          <p className="mushaf-text text-justify font-quran text-[1.8rem] leading-[2.35] text-[#e7e7ea] sm:text-[2.15rem] sm:leading-[2.45]">
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
                    tafsir !== 'none' && 'cursor-pointer hover:bg-[#777781]/15',
                    isActive && 'bg-[#777781]/20',
                  )}
                >
                  {text}
                  <span
                    className="ayah-marker mx-1.5 inline-flex h-8 w-8 -translate-y-0.5 items-center justify-center align-middle font-sans text-[0.6rem] font-bold text-[#b2b2ba]"
                    aria-label={`الآية ${toArabicDigits(a.numberInSurah)}`}
                  >
                    {toArabicDigits(a.numberInSurah)}
                  </span>{' '}
                </span>
              )
            })}
          </p>

          {tafsir !== 'none' && (
            <p className="mt-8 border-t border-[#343439] pt-4 text-center text-xs text-[#85858f]">
              اضغط على أي آية لعرض تفسيرها
            </p>
          )}

          {mushafPage && (
            <div className="mt-12 flex justify-center" aria-label={`صفحة ${toArabicDigits(mushafPage)}`}>
              <span className="mushaf-page-number font-heading text-lg text-[#c7c7cd]">
                {toArabicDigits(mushafPage)}
              </span>
            </div>
          )}
        </article>
      )}

      {ayahs && (
        <nav className="mx-auto mt-10 flex max-w-3xl items-center justify-between gap-2 border-t border-[#2e2e32] pt-5">
          {surahNumber > 1 ? (
            <button
              type="button"
              onClick={() => onNavigate(surahNumber - 1)}
              className="flex items-center gap-1 rounded-full border border-[#343439] bg-[#202023] px-4 py-2.5 text-xs font-semibold text-[#c7c7cd] transition hover:bg-[#29292d]"
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
              className="flex items-center gap-1 rounded-full border border-[#343439] bg-[#202023] px-4 py-2.5 text-xs font-semibold text-[#c7c7cd] transition hover:bg-[#29292d]"
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
