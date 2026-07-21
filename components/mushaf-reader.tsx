'use client'

import useSWR, { preload } from 'swr'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { BISMILLAH, MUSHAF_PAGES, stripBismillah } from '@/lib/quran-data'
import { toArabicDigits } from '@/lib/prayer-utils'
import { cn } from '@/lib/utils'

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
  data: { number: number; ayahs: PageAyah[] }
}

export const TAFSIR_EDITIONS = [
  { id: 'none', label: 'بدون تفسير' },
  { id: 'ar.muyassar', label: 'التفسير الميسّر' },
  { id: 'ar.jalalayn', label: 'تفسير الجلالين' },
  { id: 'ar.qurtubi', label: 'تفسير القرطبي' },
] as const

export type TafsirId = (typeof TAFSIR_EDITIONS)[number]['id']

const fetcher = (url: string) => fetch(url).then((response) => response.json())
const pageUrl = (page: number) =>
  `https://api.alquran.cloud/v1/page/${page}/quran-uthmani`
const SWR_OPTS = { revalidateOnFocus: false, dedupingInterval: 3_600_000 } as const
const SWIPE_THRESHOLD = 64
const JUZ_NAMES = [
  'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع',
  'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر',
  'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر',
  'التاسع عشر', 'العشرون', 'الحادي والعشرون', 'الثاني والعشرون',
  'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون',
  'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون',
  'التاسع والعشرون', 'الثلاثون',
] as const

function persistLastRead(surah: number, page: number) {
  try {
    localStorage.setItem('quran-last-read', JSON.stringify({ surah, page }))
  } catch {
    // Reading position is an optional device preference.
  }
}

export function MushafReader({
  initialPage,
  onBack,
}: {
  initialPage: number
  tafsir: TafsirId
  onChangeTafsir: (tafsir: TafsirId) => void
  onBack: () => void
}) {
  const [page, setPage] = useState(() =>
    Math.min(Math.max(initialPage, 1), MUSHAF_PAGES),
  )
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null)
  const [dragX, setDragX] = useState(0)
  const touchStart = useRef<{
    x: number
    y: number
    horizontal: boolean | null
  } | null>(null)

  const { data, error, isLoading, mutate } = useSWR<PageResponse>(
    pageUrl(page),
    fetcher,
    SWR_OPTS,
  )

  useEffect(() => {
    if (page < MUSHAF_PAGES) preload(pageUrl(page + 1), fetcher)
    if (page > 1) preload(pageUrl(page - 1), fetcher)
  }, [page])

  const ayahs = data?.code === 200 ? data.data.ayahs : null

  useEffect(() => {
    if (ayahs?.length) persistLastRead(ayahs[0].surah.number, page)
  }, [ayahs, page])

  const goNext = useCallback(() => {
    setPage((current) => {
      if (current >= MUSHAF_PAGES) return current
      setDirection('next')
      return current + 1
    })
  }, [])

  const goPrev = useCallback(() => {
    setPage((current) => {
      if (current <= 1) return current
      setDirection('prev')
      return current - 1
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') goNext()
      if (event.key === 'ArrowRight') goPrev()
      if (event.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goNext, goPrev, onBack])

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0]
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      horizontal: null,
    }
  }

  const onTouchMove = (event: React.TouchEvent) => {
    const start = touchStart.current
    if (!start) return
    const touch = event.touches[0]
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (start.horizontal === null) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return
      start.horizontal = Math.abs(deltaX) > Math.abs(deltaY)
    }
    if (start.horizontal) {
      const atEdge =
        (deltaX > 0 && page >= MUSHAF_PAGES) ||
        (deltaX < 0 && page <= 1)
      setDragX(atEdge ? deltaX * 0.25 : deltaX)
    }
  }

  const onTouchEnd = () => {
    const start = touchStart.current
    touchStart.current = null
    if (!start?.horizontal) {
      setDragX(0)
      return
    }
    if (dragX > SWIPE_THRESHOLD) goNext()
    else if (dragX < -SWIPE_THRESHOLD) goPrev()
    setDragX(0)
  }

  const groups = useMemo(() => {
    if (!ayahs) return null
    const grouped: { surah: PageAyah['surah']; ayahs: PageAyah[] }[] = []
    for (const ayah of ayahs) {
      const last = grouped[grouped.length - 1]
      if (last?.surah.number === ayah.surah.number) last.ayahs.push(ayah)
      else grouped.push({ surah: ayah.surah, ayahs: [ayah] })
    }
    return grouped
  }, [ayahs])

  const headerSurah = groups?.[0]?.surah
  const juz = ayahs?.[0]?.juz

  return (
    <div className="mushaf-root fixed inset-0 z-[60] overflow-y-auto overscroll-none">
      <main className="mushaf-sheet mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-3 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-5">
        <header className="mushaf-meta flex items-center justify-between" dir="rtl">
          <p className="font-sans text-base font-bold sm:text-lg">
            {juz ? `الجزء ${JUZ_NAMES[juz - 1]}` : '\u00a0'}
          </p>
          <button
            type="button"
            onClick={onBack}
            className="font-sans text-base font-bold transition-opacity hover:opacity-80 sm:text-lg"
            aria-label="العودة إلى فهرس السور"
          >
            {headerSurah
              ? headerSurah.name.replace(/^سُورَةُ\s*/, '').replace(/[ًٌٍَُِّْ]/g, '')
              : '\u00a0'}
          </button>
        </header>

        <div
          className="relative flex-1 touch-pan-y select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {isLoading && (
            <div className="flex h-[70dvh] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-[#777985]" />
              <span className="sr-only">جارٍ تحميل صفحة المصحف</span>
            </div>
          )}

          {error && !ayahs && (
            <div className="flex h-[70dvh] flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-[#777985]">تعذّر تحميل الصفحة. تحقق من اتصالك.</p>
              <button
                type="button"
                onClick={() => mutate()}
                className="flex items-center gap-2 rounded-full border border-[#777985] px-5 py-2 text-sm text-[#E7E7EA]"
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
                'mushaf-content pt-4 sm:pt-5',
                dragX === 0 && direction === 'next' && 'mushaf-enter-next',
                dragX === 0 && direction === 'prev' && 'mushaf-enter-prev',
              )}
              style={
                dragX !== 0
                  ? {
                      transform: `translateX(${dragX}px)`,
                      opacity: 1 - Math.min(Math.abs(dragX) / 480, 0.4),
                    }
                  : undefined
              }
            >
              {groups.map((group) => {
                const startsHere = group.ayahs[0].numberInSurah === 1
                return (
                  <section key={group.surah.number}>
                    {startsHere && (
                      <SurahHeader
                        name={group.surah.name.replace(/^سُورَةُ\s*/, '')}
                        showBismillah={
                          group.surah.number !== 1 && group.surah.number !== 9
                        }
                      />
                    )}
                    <p className="mushaf-page-text font-quran text-[#E7E7EA]">
                      {group.ayahs.map((ayah) => (
                        <span key={ayah.number}>
                          {stripBismillah(
                            ayah.text,
                            group.surah.number,
                            ayah.numberInSurah,
                          )}
                          <span
                            className="ayah-marker mx-1.5 inline-flex items-center justify-center align-middle font-quran text-[#9A9CA6]"
                            aria-label={`الآية ${toArabicDigits(ayah.numberInSurah)}`}
                          >
                            {toArabicDigits(ayah.numberInSurah)}
                          </span>{' '}
                        </span>
                      ))}
                    </p>
                  </section>
                )
              })}

              <footer className="mt-10 flex justify-start" dir="ltr">
                <div className="mushaf-page-number font-quran text-xl text-[#CFD0D5] sm:text-2xl">
                  {toArabicDigits(page)}
                </div>
              </footer>
            </article>
          )}
        </div>
      </main>
    </div>
  )
}

function SurahHeader({ name, showBismillah }: { name: string; showBismillah: boolean }) {
  return (
    <div className="mb-3">
      <div className="surah-banner relative flex items-center justify-center px-10 py-1.5">
        <h3 className="surah-title relative z-10 bg-[#18181B] px-5 font-quran text-2xl text-[#E3E3E6] sm:text-3xl">
          {'سُورَةُ '}
          {name}
        </h3>
      </div>
      {showBismillah && (
        <p className="mt-3 text-center font-quran text-2xl leading-relaxed text-[#E3E3E6] sm:text-3xl">
          {BISMILLAH}
        </p>
      )}
    </div>
  )
}
