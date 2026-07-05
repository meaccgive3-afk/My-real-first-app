'use client'

import useSWR from 'swr'
import { useState } from 'react'
import {
  BookMarked,
  Bell,
  BellOff,
  Check,
  ChevronLeft,
  Flame,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useKhatma, TOTAL_PAGES } from '@/lib/use-khatma'
import { toArabicDigits } from '@/lib/prayer-utils'
import { BottomSheet } from './bottom-sheet'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const PRESETS = [30, 60, 90, 120]

type PageResponse = {
  code: number
  data: { ayahs: { surah: { number: number; name: string } }[] }
}

export function KhatmaCard({ onOpenSurah }: { onOpenSurah: (n: number) => void }) {
  const {
    loaded,
    plan,
    status,
    startPlan,
    cancelPlan,
    markTodayDone,
    markExtraDone,
    setRemind,
    requestNotifyPermission,
  } = useKhatma()

  const [setupOpen, setSetupOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [days, setDays] = useState(90)
  const [customDays, setCustomDays] = useState('')
  const [wantRemind, setWantRemind] = useState(true)

  // سورة بداية ورد اليوم (من صفحة البداية)
  const { data: pageData } = useSWR<PageResponse>(
    status && !status.finished
      ? `https://api.alquran.cloud/v1/page/${status.startPage}/quran-uthmani`
      : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
  )
  const startSurah = pageData?.code === 200 ? pageData.data.ayahs[0]?.surah : null

  if (!loaded) return null

  /* ---------- لا توجد خطة: بطاقة البدء ---------- */
  if (!plan || !status) {
    return (
      <>
        <button
          type="button"
          onClick={() => setSetupOpen(true)}
          className="relative mb-4 flex w-full items-center justify-between overflow-hidden rounded-2xl border-2 border-dashed border-primary/35 bg-primary/5 p-4 text-right transition hover:bg-primary/10"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <BookMarked className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-heading text-lg font-bold text-primary">
                ابدأ خطة ختم القرآن
              </span>
              <span className="block text-xs text-muted-foreground">
                حدد عدد الأيام وسنرسم لك مسارك اليومي
              </span>
            </span>
          </span>
          <ChevronLeft className="h-5 w-5 text-primary/60" />
        </button>

        {setupOpen && (
          <BottomSheet title="خطة ختم القرآن" onClose={() => setSetupOpen(false)}>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              اختر المدة التي تريد ختم القرآن خلالها ({toArabicDigits(TOTAL_PAGES)} صفحة)،
              وسيحسب التطبيق وردك اليومي ويتابع تقدمك.
            </p>

            <div className="mb-4 grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setDays(p)
                    setCustomDays('')
                  }}
                  className={cn(
                    'rounded-xl py-3 text-center ring-1 transition',
                    days === p && !customDays
                      ? 'bg-primary text-primary-foreground ring-primary'
                      : 'bg-card ring-border',
                  )}
                >
                  <span className="block font-heading text-lg font-bold">
                    {toArabicDigits(p)}
                  </span>
                  <span className="block text-[0.65rem] opacity-80">يوم</span>
                </button>
              ))}
            </div>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                أو أدخل عدد أيام مخصص (١ – ٦٠٤)
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={604}
                dir="rtl"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="مثال: ٤٥"
                className="w-full rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <button
              type="button"
              onClick={() => setWantRemind((v) => !v)}
              aria-pressed={wantRemind}
              className={cn(
                'mb-4 flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold ring-1 transition',
                wantRemind
                  ? 'bg-primary/10 text-primary ring-primary/30'
                  : 'bg-card text-muted-foreground ring-border',
              )}
            >
              <span className="flex items-center gap-2">
                {wantRemind ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                ذكّرني مساءً إذا لم أكمل وردي
              </span>
              <span className="text-xs opacity-75">{wantRemind ? 'مفعّل' : 'معطّل'}</span>
            </button>

            {(() => {
              const chosen = customDays ? parseInt(customDays, 10) : days
              const valid = Number.isFinite(chosen) && chosen >= 1 && chosen <= 604
              const ppd = valid ? Math.ceil(TOTAL_PAGES / chosen) : 0
              return (
                <>
                  {valid && (
                    <p className="mb-3 rounded-xl bg-gold/10 px-4 py-2.5 text-center text-xs font-semibold text-gold-foreground ring-1 ring-gold/30">
                      وردك اليومي: {toArabicDigits(ppd)}{' '}
                      {ppd === 1 ? 'صفحة' : ppd === 2 ? 'صفحتان' : ppd <= 10 ? 'صفحات' : 'صفحة'}{' '}
                      تقريباً
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={!valid}
                    onClick={async () => {
                      if (wantRemind) await requestNotifyPermission()
                      startPlan(chosen, wantRemind)
                      setSetupOpen(false)
                    }}
                    className="w-full rounded-2xl bg-primary py-3.5 font-heading text-lg font-bold text-primary-foreground shadow-md transition disabled:opacity-50"
                  >
                    ابدأ الختمة بإذن الله
                  </button>
                </>
              )
            })()}
          </BottomSheet>
        )}
      </>
    )
  }

  /* ---------- ختمة مكتملة ---------- */
  if (status.finished) {
    return (
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-primary p-5 text-center text-primary-foreground shadow-md">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{ backgroundImage: 'url(/islamic-pattern.png)', backgroundSize: '200px' }}
        />
        <p className="relative font-heading text-2xl font-bold">
          تقبّل الله — أتممت الختمة!
        </p>
        <p className="relative mt-1 text-sm opacity-90">
          ختمت القرآن في {toArabicDigits(status.doneCount)} يوماً. جعله الله شاهداً لك.
        </p>
        <button
          type="button"
          onClick={cancelPlan}
          className="relative mt-4 rounded-full bg-primary-foreground/15 px-5 py-2 text-sm font-bold"
        >
          ابدأ ختمة جديدة
        </button>
      </div>
    )
  }

  /* ---------- خطة نشطة: ميزان التقدم ---------- */
  const pct = Math.round(status.progress * 100)

  return (
    <div className="mb-4 overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
      {/* رأس البطاقة */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 font-heading text-base font-bold text-primary">
          <BookMarked className="h-4 w-4" />
          ختمة {toArabicDigits(plan.totalDays)} يوماً
        </span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              if (!plan.remind) {
                const ok = await requestNotifyPermission()
                setRemind(ok)
              } else setRemind(false)
            }}
            aria-label={plan.remind ? 'إيقاف التذكير' : 'تفعيل التذكير'}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full ring-1 transition',
              plan.remind
                ? 'bg-primary/10 text-primary ring-primary/30'
                : 'bg-muted text-muted-foreground ring-border',
            )}
          >
            {plan.remind ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            aria-label="إلغاء الخطة"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      </div>

      <div className="p-4">
        {/* ميزان التقدم */}
        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            اليوم {toArabicDigits(status.dayNumber)} من {toArabicDigits(plan.totalDays)}
          </span>
          <span>
            {toArabicDigits(status.doneCount)} / {toArabicDigits(plan.totalDays)} ورداً ·{' '}
            {toArabicDigits(pct)}٪
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="تقدم الختمة"
          className="h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* حالة التأخر */}
        {status.behind > 0 && (
          <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-center text-xs font-bold text-destructive">
            أنت متأخر {toArabicDigits(status.behind)}{' '}
            {status.behind === 1 ? 'ورداً' : status.behind === 2 ? 'وردين' : 'أوراد'} عن
            الجدول — عوّضها بقراءة أوراد إضافية
          </p>
        )}

        {/* ورد اليوم */}
        <div className="mt-3 rounded-xl bg-primary/5 p-3.5 ring-1 ring-primary/15">
          <p className="text-xs font-semibold text-muted-foreground">
            {status.doneToday ? 'الورد التالي (تعويضي)' : 'ورد اليوم'}
          </p>
          <p className="mt-0.5 font-heading text-lg font-bold text-foreground">
            الصفحات {toArabicDigits(status.startPage)} – {toArabicDigits(status.endPage)}
            {startSurah && (
              <span className="text-sm font-normal text-muted-foreground">
                {' '}
                · تبدأ من سورة {startSurah.name.replace(/^سُورَةُ\s*/, '')}
              </span>
            )}
          </p>

          <div className="mt-3 flex gap-2">
            {startSurah && (
              <button
                type="button"
                onClick={() => onOpenSurah(startSurah.number)}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-sm"
              >
                اقرأ الآن
              </button>
            )}
            <button
              type="button"
              onClick={status.doneToday ? markExtraDone : markTodayDone}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold ring-1 transition',
                status.doneToday
                  ? 'bg-gold/15 text-gold-foreground ring-gold/40'
                  : 'bg-card text-primary ring-primary/30',
              )}
            >
              {status.doneToday ? (
                <>
                  <Flame className="h-4 w-4" />
                  أنجزت ورداً إضافياً
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  أتممت وردي
                </>
              )}
            </button>
          </div>

          {status.doneToday && (
            <p className="mt-2 text-center text-xs font-semibold text-primary">
              أحسنت! أتممت ورد اليوم — تقبّل الله منك
            </p>
          )}
        </div>
      </div>

      {/* تأكيد الإلغاء */}
      {confirmCancel && (
        <BottomSheet title="إلغاء الختمة" onClose={() => setConfirmCancel(false)}>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            هل أنت متأكد من إلغاء خطة الختمة الحالية؟ سيُحذف تقدمك (
            {toArabicDigits(status.doneCount)} ورداً منجزاً).
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                cancelPlan()
                setConfirmCancel(false)
              }}
              className="flex-1 rounded-2xl bg-destructive py-3 font-bold text-primary-foreground"
            >
              نعم، إلغاء
            </button>
            <button
              type="button"
              onClick={() => setConfirmCancel(false)}
              className="flex-1 rounded-2xl bg-card py-3 font-bold ring-1 ring-border"
            >
              تراجع
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
