'use client'

import useSWR, { preload } from 'swr'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { BISMILLAH, MUSHAF_PAGES, stripBismillah } from '@/lib/quran-data'
import { toArabicDigits } from '@/lib/prayer-utils'
import { BottomSheet } from './bottom-sheet'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type PageAyah = {
  number: number
  text: string
  numberInSurah: number
  juz: number
  page: number
  surah: {
    number: number
    name: string
    numberOfAyahs: number
    revelationType: string
  }
}

type PageResponse = {
  code: number
  data: {
    number: number
    ayahs: PageAyah[]
  }
}

type AyahTafsirResponse = {
  code: number
  data: { text: string }
}

export const TAFSIR_EDITIONS = [
  { id: 'none', label: 'بدون تفسير' },
  { id: 'ar.muyassar', label: 'التفسير الميسّر' },
  { id: 'ar.jalalayn', label: 'تفسير الجلالين' },
  { id: 'ar.qurtubi', label: 'تفسير القرطبي' },
] as const

export type TafsirId = (typeof TAFSIR_EDITIONS)[number]['id']

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const pageUrl = (page: number) =>
  `https://api.alquran.cloud/v1/page/${page}/quran-uthmani`

const SWR_OPTS = { revalidateOnFocus: false, dedupingInterval: 3_600_000 } as const

const SWIPE_THRESHOLD = 64

/* ------------------------------------------------------------------ */
/* Last-read persistence (device preference)                           */
/* ------------------------------------------------------------------ */

function persistLastRead(surah: number, page: number) {
  try {
    localStorage.setItem('quran-last-read', JSON.stringify({ surah, page }))
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Mushaf reader — page-based with swipe navigation                    */
/* ------------------------------------------------------------------ */

export function MushafReader({
  initialPage,
  tafsir,
  onChangeTafsir,
  onBack,
}: {
  initialPage: number
  tafsir: TafsirId
  onChangeTafsir: (t: TafsirId) => void
  onBack: () => void
}) {
  const [page, setPage] = useState(() =>
    Math.min(Math.max(initialPage, 1), MUSHAF_PAGES),
  )
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null)
  const [dragX, setDragX] = useState(0)
  const [showTafsirPicker, setShowTafsirPicker] = useState(false)
  const [tafsirAyah, setTafsirAyah] = useState<PageAyah | null>(null)

  const touchStart = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null)

  const { data, error, isLoading, mutate } = useSWR<PageResponse>(
    pageUrl(page),
    fetcher,
    SWR_OPTS,
  )

  // Prefetch neighbouring pages so flips feel instant
  useEffect(() => {
    if (page < MUSHAF_PAGES) preload(pageUrl(page + 1), fetcher)
    if (page > 1) preload(pageUrl(page - 1), fetcher)
  }, [page])

  const ayahs = data?.code === 200 ? data.data.ayahs : null

  // Persist reading position
  useEffect(() => {
    if (ayahs?.length) persistLastRead(ayahs[0].surah.number, page)
  }, [ayahs, page])

  const goNext = useCallback(() => {
    setPage((p) => {
      if (p >= MUSHAF_PAGES) return p
      setDirection('next')
      return p + 1
    })
  }, [])

  const goPrev = useCallback(() => {
    setPage((p) => {
      if (p <= 1) return p
      setDirection('prev')
      return p - 1
    })
  }, [])

  // Keyboard navigation (RTL: left arrow = forward)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goNext()
      if (e.key === 'ArrowRight') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev])

  /* Touch swipe handling — drag follows the finger, release flips */
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY, horizontal: null }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const start = touchStart.current
    if (!start) return
    const t = e.touches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (start.horizontal === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      start.horizontal = Math.abs(dx) > Math.abs(dy)
    }
    if (start.horizontal) {
      // Dampen drag at book edges
      const atEdge = (dx > 0 && page >= MUSHAF_PAGES) || (dx < 0 && page <= 1)
      setDragX(atEdge ? dx * 0.25 : dx)
    }
  }

  const onTouchEnd = () => {
    const start = touchStart.current
    touchStart.current = null
    if (!start?.horizontal) {
      setDragX(0)
      return
    }
    // RTL mushaf: swiping right (dragX > 0) turns to the NEXT page
    if (dragX > SWIPE_THRESHOLD) goNext()
    else if (dragX < -SWIPE_THRESHOLD) goPrev()
    setDragX(0)
  }

  /* Group ayahs by surah so new surahs get an ornamental header */
  const groups = useMemo(() => {
    if (!ayahs) return null
    const out: { surah: PageAyah['surah']; ayahs: PageAyah[] }[] = []
    for (const a of ayahs) {
      const last = out[out.length - 1]
      if (last && last.surah.number === a.surah.number) last.ayahs.push(a)
      else out.push({ surah: a.surah, ayahs: [a] })
    }
    return out
  }, [ayahs])

  const headerSurah = groups?.[0]?.surah
  const juz = ayahs?.[0]?.juz

  const tafsirLabel = TAFSIR_EDITIONS.find((t) => t.id === tafsir)?.label

  // Fetch tafsir per-ayah, only when an ayah is selected
  const { data: tafsirData } = useSWR<AyahTafsirResponse>(
    tafsirAyah && tafsir !== 'none'
      ? `https://api.alquran.cloud/v1/ayah/${tafsirAyah.number}/${tafsir}`
      : null,
    fetcher,
    SWR_OPTS,
  )

  return (
    <div className="mushaf-root -mx-4 -mt-4 flex min-h-dvh flex-col overflow-hidden pb-32">
      {/* ------------------------------------------------ header ---- */}
      <header className="flex items-center justify-between gap-2 px-4 pt-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="العودة إلى فهرس السور"
            className="mushaf-chip flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="text-right">
            <h2 className="font-heading text-lg font-bold leading-tight text-[#eceadf]">
              {headerSurah ? `سورة ${headerSurah.name.replace(/^سُورَةُ\s*/, '')}` : '\u00a0'}
            </h2>
            <p className="text-[0.7rem] text-[#8d8b83]">
              {headerSurah
                ? `${headerSurah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · ${toArabicDigits(headerSurah.numberOfAyahs)} آية`
                : '\u00a0'}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <p className="font-heading text-base font-bold text-[#c9c6b8]">
            {juz ? `الجزء ${toArabicDigits(juz)}` : '\u00a0'}
          </p>
          <button
            type="button"
            onClick={() => setShowTafsirPicker(true)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] font-semibold transition active:scale-95',
              tafsir !== 'none'
                ? 'bg-[#d8d5c6] text-[#191915]'
                : 'mushaf-chip',
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {tafsir !== 'none' ? tafsirLabel : 'التفسير'}
          </button>
        </div>
      </header>

      {/* Thin reading-progress line */}
      <div className="mx-4 mt-3 h-px overflow-hidden rounded-full bg-[#2c2c30]">
        <div
          className="h-full bg-[#a89f7c] transition-all duration-500"
          style={{ width: `${(page / MUSHAF_PAGES) * 100}%` }}
        />
      </div>

      {/* ------------------------------------------------ page ------ */}
      <div
        className="relative flex-1 touch-pan-y select-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {isLoading && (
          <div className="flex h-[60dvh] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#8d8b83]" />
          </div>
        )}

        {error && !ayahs && (
          <div className="flex h-[60dvh] flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-[#8d8b83]">تعذّر تحميل الصفحة. تحقق من اتصالك.</p>
            <button
              type="button"
              onClick={() => mutate()}
              className="flex items-center gap-2 rounded-full bg-[#eceadf] px-4 py-2 text-sm font-semibold text-[#191915]"
            >
              <RefreshCw className="h-4 w-4" /> إعادة المحاولة
            </button>
          </div>
        )}

        {groups && (
          <article
            key={page}
            dir="rtl"
            className={cn(
              'mx-auto max-w-2xl px-5 pt-7 sm:px-8',
              dragX === 0 && direction === 'next' && 'mushaf-enter-next',
              dragX === 0 && direction === 'prev' && 'mushaf-enter-prev',
            )}
            style={
              dragX !== 0
                ? { transform: `translateX(${dragX}px)`, opacity: 1 - Math.min(Math.abs(dragX) / 480, 0.4) }
                : undefined
            }
          >
            {groups.map((g) => {
              const startsHere = g.ayahs[0].numberInSurah === 1
              return (
                <section key={g.surah.number}>
                  {startsHere && (
                    <SurahHeader
                      name={g.surah.name.replace(/^سُورَةُ\s*/, '')}
                      showBismillah={g.surah.number !== 1 && g.surah.number !== 9}
                    />
                  )}
                  <p className="mushaf-page-text font-quran text-[1.55rem] leading-[2.3] text-[#eceadf] sm:text-[1.9rem] sm:leading-[2.4]">
                    {g.ayahs.map((a) => {
                      const text = stripBismillah(a.text, g.surah.number, a.numberInSurah)
                      const isActive = tafsirAyah?.number === a.number
                      const interactive = tafsir !== 'none'
                      return (
                        <span
                          key={a.number}
                          role={interactive ? 'button' : undefined}
                          tabIndex={interactive ? 0 : undefined}
                          onClick={interactive ? () => setTafsirAyah(a) : undefined}
                          onKeyDown={
                            interactive
                              ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    setTafsirAyah(a)
                                  }
                                }
                              : undefined
                          }
                          className={cn(
                            'rounded-md transition-colors',
                            interactive && 'cursor-pointer hover:bg-[#a89f7c]/10',
                            isActive && 'bg-[#a89f7c]/15',
                          )}
                        >
                          {text}
                          <span
                            className="ayah-marker mx-1 inline-flex h-8 w-8 items-center justify-center align-middle font-sans text-[0.58rem] font-bold text-[#b5ad8e]"
                            aria-label={`الآية ${toArabicDigits(a.numberInSurah)}`}
                          >
                            {toArabicDigits(a.numberInSurah)}
                          </span>{' '}
                        </span>
                      )
                    })}
                  </p>
                </section>
              )
            })}

            {/* -------------------------------------- page footer --- */}
            <footer className="mt-9 flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={goPrev}
                disabled={page <= 1}
                aria-label="الصفحة السابقة"
                className="mushaf-chip flex h-9 w-9 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <span
                className="mushaf-page-number font-heading text-base text-[#c9c6b8]"
                aria-label={`صفحة ${toArabicDigits(page)}`}
              >
                {toArabicDigits(page)}
              </span>

              <button
                type="button"
                onClick={goNext}
                disabled={page >= MUSHAF_PAGES}
                aria-label="الصفحة التالية"
                className="mushaf-chip flex h-9 w-9 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </footer>

            <p className="mt-4 text-center text-[0.65rem] text-[#5d5c56]">
              اسحب يمينًا أو يسارًا لتقليب الصفحات
            </p>
          </article>
        )}
      </div>

      {/* ------------------------------------ tafsir picker sheet --- */}
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

      {/* ------------------------------------ tafsir content sheet -- */}
      {tafsirAyah !== null && tafsir !== 'none' && (
        <BottomSheet
          title={`تفسير الآية ${toArabicDigits(tafsirAyah.numberInSurah)} — ${tafsirAyah.surah.name.replace(/^سُورَةُ\s*/, '')}`}
          onClose={() => setTafsirAyah(null)}
        >
          {tafsirData?.code === 200 ? (
            <p dir="rtl" className="text-justify text-base leading-relaxed text-foreground">
              {tafsirData.data.text}
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

/* ------------------------------------------------------------------ */
/* Ornamental surah header + bismillah                                 */
/* ------------------------------------------------------------------ */

function SurahHeader({ name, showBismillah }: { name: string; showBismillah: boolean }) {
  return (
    <div className="my-5 first:mt-1">
      <div className="surah-banner relative mx-auto flex max-w-md items-center justify-center px-8 py-3">
        <span aria-hidden="true" className="surah-banner-diamond right-3" />
        <h3 className="font-quran text-xl text-[#d8d5c6] sm:text-2xl">
          {'سُورَةُ '}
          {name}
        </h3>
        <span aria-hidden="true" className="surah-banner-diamond left-3" />
      </div>
      {showBismillah && (
        <p className="mt-5 text-center font-quran text-[1.45rem] leading-relaxed text-[#d8d5c6] sm:text-[1.7rem]">
          {BISMILLAH}
        </p>
      )}
    </div>
  )
}
