'use client'

import useSWR, { preload } from 'swr'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Loader2,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  Maximize,
  Minimize,
  Minus,
  Plus,
  WifiOff,
  Share2,
  Check,
} from 'lucide-react'
import { BISMILLAH, MUSHAF_PAGES, stripBismillah } from '@/lib/quran-data'
import { toArabicDigits } from '@/lib/prayer-utils'
import { cn } from '@/lib/utils'

type PageAyah = {
  number: number
  text: string
  numberInSurah: number
  juz: number
  hizbQuarter?: number
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
const SWR_OPTS = {
  revalidateOnFocus: false,
  revalidateIfStale: false,
  dedupingInterval: 3_600_000,
  errorRetryCount: 4,
  errorRetryInterval: 1_200,
  keepPreviousData: true,
} as const
const SWIPE_THRESHOLD = 64
const FLICK_VELOCITY = 0.45
const FONT_KEY = 'quran-font-scale'
const BOOKMARK_KEY = 'quran-bookmark-page'
const JUZ_NAMES = [
  'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع',
  'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر',
  'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر',
  'التاسع عشر', 'العشرون', 'الحادي والعشرون', 'الثاني والعشرون',
  'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون',
  'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون',
  'التاسع والعشرون', 'الثلاثون',
] as const

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

function removeStorage(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {}
}

function persistLastRead(surah: number, page: number) {
  writeStorage('quran-last-read', JSON.stringify({ surah, page }))
}

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator)
      navigator.vibrate(pattern)
  } catch {}
}

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    let lock: { release: () => Promise<void> } | null = null
    let cancelled = false
    const request = async () => {
      try {
        const anyNav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> }
        }
        if (!anyNav.wakeLock) return
        const acquired = await anyNav.wakeLock.request('screen')
        if (cancelled) acquired.release().catch(() => {})
        else lock = acquired
      } catch {}
    }
    request()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      lock?.release().catch(() => {})
    }
  }, [active])
}

function useOnline() {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    setOnline(navigator.onLine)
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
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
  const [fontScale, setFontScale] = useState(1)
  const [immersive, setImmersive] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [activeAyah, setActiveAyah] = useState<number | null>(null)
  const [copiedAyah, setCopiedAyah] = useState<number | null>(null)
  const [showJump, setShowJump] = useState(false)
  const touchStart = useRef<{
    x: number
    y: number
    time: number
    horizontal: boolean | null
  } | null>(null)
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null)
  const lastTap = useRef(0)
  const wheelLock = useRef(0)
  const rafId = useRef(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const online = useOnline()
  const reducedMotion = usePrefersReducedMotion()

  useWakeLock(true)

  useEffect(() => {
    const stored = Number(readStorage(FONT_KEY))
    if (stored >= 0.75 && stored <= 1.6) setFontScale(stored)
  }, [])

  useEffect(() => {
    setBookmarked(readStorage(BOOKMARK_KEY) === String(page))
  }, [page])

  const { data, error, isLoading, isValidating, mutate } = useSWR<PageResponse>(
    online ? pageUrl(page) : null,
    fetcher,
    SWR_OPTS,
  )

  useEffect(() => {
    if (!online) return
    const idle =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback
        : (fn: () => void) => window.setTimeout(fn, 300)
    const handle = idle(() => {
      for (const offset of [1, -1, 2, -2]) {
        const target = page + offset
        if (target >= 1 && target <= MUSHAF_PAGES)
          preload(pageUrl(target), fetcher)
      }
    })
    return () => {
      if (typeof cancelIdleCallback === 'function')
        cancelIdleCallback(handle as number)
      else window.clearTimeout(handle as number)
    }
  }, [page, online])

  useEffect(() => {
    if (online) mutate()
  }, [online, mutate])

  const ayahs = data?.code === 200 ? data.data.ayahs : null

  useEffect(() => {
    if (ayahs?.length) persistLastRead(ayahs[0].surah.number, page)
  }, [ayahs, page])

  const goTo = useCallback((target: number) => {
    setPage((current) => {
      const next = Math.min(Math.max(target, 1), MUSHAF_PAGES)
      if (next === current) return current
      setDirection(next > current ? 'next' : 'prev')
      vibrate(8)
      return next
    })
    setActiveAyah(null)
  }, [])

  const goNext = useCallback(() => {
    setPage((current) => {
      if (current >= MUSHAF_PAGES) return current
      setDirection('next')
      vibrate(8)
      return current + 1
    })
    setActiveAyah(null)
  }, [])

  const goPrev = useCallback(() => {
    setPage((current) => {
      if (current <= 1) return current
      setDirection('prev')
      vibrate(8)
      return current - 1
    })
    setActiveAyah(null)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'PageDown') goNext()
      if (event.key === 'ArrowRight' || event.key === 'PageUp') goPrev()
      if (event.key === 'Home') goTo(1)
      if (event.key === 'End') goTo(MUSHAF_PAGES)
      if (event.key === 'Escape') onBack()
      if (event.key === '+' || event.key === '=') adjustFont(0.05)
      if (event.key === '-') adjustFont(-0.05)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useEffect(() => {
    const onFullscreenChange = () =>
      setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const adjustFont = useCallback((delta: number) => {
    setFontScale((current) => {
      const next = Math.min(Math.max(current + delta, 0.75), 1.6)
      writeStorage(FONT_KEY, String(next))
      return next
    })
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await rootRef.current?.requestFullscreen()
    } catch {}
  }, [])

  const toggleBookmark = useCallback(() => {
    setBookmarked((current) => {
      if (current) removeStorage(BOOKMARK_KEY)
      else writeStorage(BOOKMARK_KEY, String(page))
      vibrate(current ? 8 : [10, 40, 10])
      return !current
    })
  }, [page])

  const shareAyah = useCallback(async (ayah: PageAyah) => {
    const text = `${stripBismillah(ayah.text, ayah.surah.number, ayah.numberInSurah)} ﴿${toArabicDigits(ayah.numberInSurah)}﴾ — ${ayah.surah.name}`
    try {
      if (navigator.share) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        setCopiedAyah(ayah.number)
        setTimeout(() => setCopiedAyah(null), 1_600)
      }
      vibrate(12)
    } catch {}
  }, [])

  const onTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      const [a, b] = [event.touches[0], event.touches[1]]
      pinchStart.current = {
        distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        scale: fontScale,
      }
      touchStart.current = null
      return
    }
    const touch = event.touches[0]
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: performance.now(),
      horizontal: null,
    }
  }

  const onTouchMove = (event: React.TouchEvent) => {
    if (event.touches.length === 2 && pinchStart.current) {
      const [a, b] = [event.touches[0], event.touches[1]]
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      const next = Math.min(
        Math.max(
          pinchStart.current.scale * (distance / pinchStart.current.distance),
          0.75,
        ),
        1.6,
      )
      setFontScale(next)
      writeStorage(FONT_KEY, String(next))
      return
    }
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
      cancelAnimationFrame(rafId.current)
      rafId.current = requestAnimationFrame(() =>
        setDragX(atEdge ? deltaX * 0.25 : deltaX),
      )
    }
  }

  const onTouchEnd = () => {
    pinchStart.current = null
    const start = touchStart.current
    touchStart.current = null
    cancelAnimationFrame(rafId.current)
    if (!start) {
      setDragX(0)
      return
    }
    if (!start.horizontal) {
      const now = performance.now()
      if (now - lastTap.current < 280) {
        setImmersive((current) => !current)
        vibrate(6)
        lastTap.current = 0
      } else {
        lastTap.current = now
      }
      setDragX(0)
      return
    }
    const elapsed = Math.max(performance.now() - start.time, 1)
    const velocity = Math.abs(dragX) / elapsed
    const flick = velocity > FLICK_VELOCITY && Math.abs(dragX) > 24
    if (dragX > SWIPE_THRESHOLD || (flick && dragX > 0)) goNext()
    else if (dragX < -SWIPE_THRESHOLD || (flick && dragX < 0)) goPrev()
    setDragX(0)
  }

  const onWheel = (event: React.WheelEvent) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
    const now = performance.now()
    if (now - wheelLock.current < 450) return
    wheelLock.current = now
    if (event.deltaX < -20) goNext()
    else if (event.deltaX > 20) goPrev()
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
  const hizbQuarter = ayahs?.[0]?.hizbQuarter
  const progress = (page / MUSHAF_PAGES) * 100

  return (
    <div
      ref={rootRef}
      className="mushaf-root fixed inset-0 z-[60] overflow-y-auto overscroll-none"
    >
      <div
        className="fixed inset-x-0 top-0 z-[70] h-0.5 bg-transparent"
        role="progressbar"
        aria-valuenow={page}
        aria-valuemin={1}
        aria-valuemax={MUSHAF_PAGES}
      >
        <div
          className="h-full bg-[#9A9CA6]/60"
          style={{
            width: `${progress}%`,
            transition: reducedMotion ? 'none' : 'width 320ms ease',
          }}
        />
      </div>

      {!online && (
        <div
          className="fixed inset-x-0 top-2 z-[70] flex justify-center"
          role="status"
        >
          <div className="flex items-center gap-2 rounded-full border border-[#777985]/40 bg-[#18181B]/95 px-4 py-1.5 text-xs text-[#CFD0D5] shadow-lg">
            <WifiOff className="h-3.5 w-3.5" />
            لا يوجد اتصال بالإنترنت
          </div>
        </div>
      )}

      <main className="mushaf-sheet mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-3 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-5">
        <header
          className={cn(
            'mushaf-meta flex items-center justify-between',
            immersive && 'pointer-events-none opacity-0',
            !reducedMotion && 'transition-opacity duration-300',
          )}
          dir="rtl"
        >
          <div className="flex items-center gap-2">
            <Ornament src="/ornaments/juz-marker.svg" className="h-8 w-16" />
            <p className="font-sans text-sm font-bold sm:text-base">
              {juz ? `الجزء ${JUZ_NAMES[juz - 1]}` : '\u00a0'}
            </p>
            {hizbQuarter ? (
              <Ornament src="/ornaments/hizb-marker.svg" className="h-7 w-7" />
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            {isValidating && !isLoading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#777985]" />
            )}
            <button
              type="button"
              onClick={onBack}
              className="font-sans text-base font-bold transition-opacity hover:opacity-80 sm:text-lg"
              aria-label="العودة إلى فهرس السور"
            >
              {headerSurah
                ? headerSurah.name.replace(/^سُورَةُ\s*/, '').replace(/[ًٌٍَُِّْ]/g, '')
                : '\u00a0'}
            </button>
          </div>
        </header>

        <div
          className={cn(
            'mt-2 flex items-center justify-between gap-2',
            immersive && 'pointer-events-none opacity-0',
            !reducedMotion && 'transition-opacity duration-300',
          )}
          dir="rtl"
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleBookmark}
              className="rounded-full p-2 text-[#9A9CA6] transition-colors hover:text-[#E7E7EA]"
              aria-label={bookmarked ? 'إزالة العلامة المرجعية' : 'إضافة علامة مرجعية'}
              aria-pressed={bookmarked}
            >
              {bookmarked ? (
                <BookmarkCheck className="h-4.5 w-4.5 text-[#E7E7EA]" />
              ) : (
                <Bookmark className="h-4.5 w-4.5" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-full p-2 text-[#9A9CA6] transition-colors hover:text-[#E7E7EA]"
              aria-label={isFullscreen ? 'الخروج من وضع ملء الشاشة' : 'وضع ملء الشاشة'}
            >
              {isFullscreen ? (
                <Minimize className="h-4.5 w-4.5" />
              ) : (
                <Maximize className="h-4.5 w-4.5" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => adjustFont(-0.05)}
              disabled={fontScale <= 0.75}
              className="rounded-full p-2 text-[#9A9CA6] transition-colors hover:text-[#E7E7EA] disabled:opacity-30"
              aria-label="تصغير الخط"
            >
              <Minus className="h-4.5 w-4.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setFontScale(1)
                writeStorage(FONT_KEY, '1')
              }}
              className="min-w-12 rounded-full px-2 py-1 text-center font-sans text-xs tabular-nums text-[#9A9CA6] transition-colors hover:text-[#E7E7EA]"
              aria-label="إعادة ضبط حجم الخط"
            >
              {Math.round(fontScale * 100)}٪
            </button>
            <button
              type="button"
              onClick={() => adjustFont(0.05)}
              disabled={fontScale >= 1.6}
              className="rounded-full p-2 text-[#9A9CA6] transition-colors hover:text-[#E7E7EA] disabled:opacity-30"
              aria-label="تكبير الخط"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        <div
          className="relative flex-1 touch-pan-y select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onWheel={onWheel}
        >
          {isLoading && !ayahs && (
            <div className="flex h-[70dvh] flex-col items-center justify-center gap-6">
              <Loader2 className="h-7 w-7 animate-spin text-[#777985]" />
              <span className="sr-only">جارٍ تحميل صفحة المصحف</span>
              <div className="w-full max-w-md space-y-3 px-4" aria-hidden="true">
                {[92, 100, 96, 88, 100, 94, 84].map((width, index) => (
                  <div
                    key={index}
                    className="h-5 animate-pulse rounded bg-[#777985]/15"
                    style={{
                      width: `${width}%`,
                      animationDelay: `${index * 90}ms`,
                      marginInlineStart: 'auto',
                    }}
                  />
                ))}
              </div>
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
                'mushaf-content mushaf-page-frame relative mt-4 px-4 pb-5 pt-5 sm:px-8 sm:pb-7 sm:pt-7',
                !reducedMotion &&
                  dragX === 0 &&
                  direction === 'next' &&
                  'mushaf-enter-next',
                !reducedMotion &&
                  dragX === 0 &&
                  direction === 'prev' &&
                  'mushaf-enter-prev',
              )}
              style={{
                fontSize: `${fontScale}em`,
                ...(dragX !== 0
                  ? {
                      transform: `translateX(${dragX}px) rotate(${dragX / 90}deg)`,
                      opacity: 1 - Math.min(Math.abs(dragX) / 480, 0.4),
                      willChange: 'transform, opacity',
                    }
                  : {}),
              }}
            >
              <div className="mushaf-corners pointer-events-none absolute inset-0" aria-hidden="true">
                <Ornament src="/ornaments/page-corners.svg" className="corner corner-tl" />
                <Ornament src="/ornaments/page-corners.svg" className="corner corner-tr" />
                <Ornament src="/ornaments/page-corners.svg" className="corner corner-bl" />
                <Ornament src="/ornaments/page-corners.svg" className="corner corner-br" />
              </div>
              <div className="relative">
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
                      {group.ayahs.map((ayah) => {
                        const isActive = activeAyah === ayah.number
                        return (
                          <span key={ayah.number}>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={() =>
                                setActiveAyah((current) =>
                                  current === ayah.number ? null : ayah.number,
                                )
                              }
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  setActiveAyah((current) =>
                                    current === ayah.number ? null : ayah.number,
                                  )
                                }
                              }}
                              className={cn(
                                'cursor-pointer rounded transition-colors duration-200',
                                isActive && 'bg-[#777985]/15',
                              )}
                            >
                              {stripBismillah(
                                ayah.text,
                                group.surah.number,
                                ayah.numberInSurah,
                              )}
                            </span>
                            <span
                              className="ayah-marker mx-1 inline-flex items-center justify-center align-middle font-quran"
                              aria-label={`الآية ${toArabicDigits(ayah.numberInSurah)}`}
                            >
                              <Ornament src="/ornaments/verse-marker.svg" className="absolute inset-0 size-full" />
                              <span className="relative">{toArabicDigits(ayah.numberInSurah)}</span>
                            </span>
                            {isActive && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  shareAyah(ayah)
                                }}
                                className="mx-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#777985]/40 align-middle text-[#9A9CA6] transition-colors hover:text-[#E7E7EA]"
                                aria-label="مشاركة الآية"
                              >
                                {copiedAyah === ayah.number ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Share2 className="h-3 w-3" />
                                )}
                              </button>
                            )}{' '}
                          </span>
                        )
                      })}
                    </p>
                  </section>
                )
              })}

              <footer className="mt-10 flex items-center justify-between" dir="ltr">
                <button
                  type="button"
                  onClick={() => setShowJump((current) => !current)}
                  className="mushaf-page-number font-quran text-xl text-[#CFD0D5] transition-opacity hover:opacity-80 sm:text-2xl"
                  aria-label="الانتقال إلى صفحة"
                  aria-expanded={showJump}
                >
                  {toArabicDigits(page)}
                </button>
                <span
                  className="font-sans text-xs tabular-nums text-[#777985]"
                  dir="rtl"
                >
                  {toArabicDigits(page)} / {toArabicDigits(MUSHAF_PAGES)}
                </span>
              </footer>

              {showJump && (
                <div className="mt-4 px-1" dir="ltr">
                  <input
                    type="range"
                    min={1}
                    max={MUSHAF_PAGES}
                    value={page}
                    onChange={(event) => goTo(Number(event.target.value))}
                    className="w-full accent-[#9A9CA6]"
                    aria-label="شريط الانتقال بين الصفحات"
                    style={{ direction: 'rtl' }}
                  />
                </div>
              )}
              </div>
            </article>
          )}
        </div>
      </main>
    </div>
  )
}

function Ornament({ src, className }: { src: string; className?: string }) {
  return <img src={src} className={className} alt="" aria-hidden="true" draggable={false} />
}

function SurahHeader({ name, showBismillah }: { name: string; showBismillah: boolean }) {
  return (
    <header className="mb-5">
      <div className="surah-banner relative flex items-center justify-center">
        <Ornament src="/ornaments/surah-title-frame.svg" className="w-full" />
        <h3 className="sr-only">{'سورة '}{name}</h3>
      </div>
      {showBismillah && (
        <div className="mt-3 flex flex-col items-center gap-1">
          <Ornament src="/ornaments/bismillah-divider.svg" className="bismillah-divider" />
          <p className="text-center font-quran text-2xl leading-relaxed text-[#E3E3E6] sm:text-3xl">
            {BISMILLAH}
          </p>
          <Ornament src="/ornaments/bismillah-divider.svg" className="bismillah-divider rotate-180" />
        </div>
      )}
    </header>
  )
}
