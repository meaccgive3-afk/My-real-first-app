'use client'

import { useCallback, useEffect, useState } from 'react'

/** عدد صفحات مصحف المدينة */
export const TOTAL_PAGES = 604

export type KhatmaPlan = {
  /** إجمالي أيام الخطة */
  totalDays: number
  /** تاريخ البداية بصيغة YYYY-MM-DD */
  startDate: string
  /** الأيام المنجزة بصيغة YYYY-MM-DD */
  doneDays: string[]
  /** تفعيل التذكير اليومي */
  remind: boolean
}

const PLAN_KEY = 'khatma-plan'
const NOTIFIED_KEY = 'khatma-notified-on'
/** الساعة التي يبدأ عندها التذكير مساءً */
const REMINDER_HOUR = 20

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function loadPlan(): KhatmaPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY)
    return raw ? (JSON.parse(raw) as KhatmaPlan) : null
  } catch {
    return null
  }
}

function savePlan(plan: KhatmaPlan | null) {
  try {
    if (plan) localStorage.setItem(PLAN_KEY, JSON.stringify(plan))
    else localStorage.removeItem(PLAN_KEY)
  } catch {
    /* ignore */
  }
}

export type KhatmaStatus = {
  plan: KhatmaPlan
  /** رقم اليوم الحالي منذ بداية الخطة (1-based) */
  dayNumber: number
  /** عدد صفحات الورد اليومي */
  pagesPerDay: number
  /** أول صفحة في ورد اليوم */
  startPage: number
  /** آخر صفحة في ورد اليوم */
  endPage: number
  /** عدد الأيام المنجزة */
  doneCount: number
  /** نسبة الإنجاز 0..1 */
  progress: number
  /** هل أُنجز ورد اليوم */
  doneToday: boolean
  /** عدد الأيام المتأخرة عن الجدول */
  behind: number
  /** هل اكتملت الختمة */
  finished: boolean
}

export function computeStatus(plan: KhatmaPlan): KhatmaStatus {
  const pagesPerDay = Math.ceil(TOTAL_PAGES / plan.totalDays)
  const doneCount = plan.doneDays.length
  const startPage = Math.min(doneCount * pagesPerDay + 1, TOTAL_PAGES)
  const endPage = Math.min((doneCount + 1) * pagesPerDay, TOTAL_PAGES)
  const start = new Date(`${plan.startDate}T00:00:00`)
  const dayNumber = Math.max(
    1,
    Math.floor((Date.now() - start.getTime()) / 86_400_000) + 1,
  )
  const doneToday = plan.doneDays.includes(todayISO())
  const finished = doneCount * pagesPerDay >= TOTAL_PAGES
  const behind = finished ? 0 : Math.max(0, dayNumber - doneCount - (doneToday ? 0 : 1))
  return {
    plan,
    dayNumber,
    pagesPerDay,
    startPage,
    endPage,
    doneCount,
    progress: Math.min(1, doneCount / plan.totalDays),
    doneToday,
    behind,
    finished,
  }
}

export function useKhatma() {
  const [plan, setPlanState] = useState<KhatmaPlan | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setPlanState(loadPlan())
    setLoaded(true)
  }, [])

  const startPlan = useCallback((totalDays: number, remind: boolean) => {
    const p: KhatmaPlan = {
      totalDays,
      startDate: todayISO(),
      doneDays: [],
      remind,
    }
    savePlan(p)
    setPlanState(p)
  }, [])

  const cancelPlan = useCallback(() => {
    savePlan(null)
    setPlanState(null)
  }, [])

  const markTodayDone = useCallback(() => {
    setPlanState((prev) => {
      if (!prev) return prev
      const t = todayISO()
      if (prev.doneDays.includes(t)) return prev
      const next = { ...prev, doneDays: [...prev.doneDays, t] }
      savePlan(next)
      return next
    })
  }, [])

  /** تسجيل يوم إضافي (لتعويض الأيام الفائتة) */
  const markExtraDone = useCallback(() => {
    setPlanState((prev) => {
      if (!prev) return prev
      // نستخدم مفاتيح فريدة للأيام التعويضية
      const key = `${todayISO()}#${prev.doneDays.length}`
      const next = { ...prev, doneDays: [...prev.doneDays, key] }
      savePlan(next)
      return next
    })
  }, [])

  const setRemind = useCallback((remind: boolean) => {
    setPlanState((prev) => {
      if (!prev) return prev
      const next = { ...prev, remind }
      savePlan(next)
      return next
    })
  }, [])

  /* --------------------------------------------------------------
   * التذكير اليومي: إذا حلّ المساء ولم يُنجز ورد اليوم بعد،
   * يُرسل إشعار واحد فقط في اليوم.
   * -------------------------------------------------------------- */
  useEffect(() => {
    if (!plan || !plan.remind) return

    const check = () => {
      const status = computeStatus(plan)
      if (status.finished || status.doneToday) return
      const now = new Date()
      if (now.getHours() < REMINDER_HOUR) return
      try {
        const t = todayISO()
        if (localStorage.getItem(NOTIFIED_KEY) === t) return
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('تذكير ورد الختمة', {
            body: `لم تكمل وردك اليوم بعد — صفحات ${status.startPage} إلى ${status.endPage}. لا تدع يومك يمضي دون نصيبك من القرآن.`,
            tag: 'khatma-reminder',
            icon: '/icon-192.png',
          })
          localStorage.setItem(NOTIFIED_KEY, t)
        }
      } catch {
        /* ignore */
      }
    }

    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [plan])

  const requestNotifyPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    const res = await Notification.requestPermission()
    return res === 'granted'
  }, [])

  return {
    loaded,
    plan,
    status: plan ? computeStatus(plan) : null,
    startPlan,
    cancelPlan,
    markTodayDone,
    markExtraDone,
    setRemind,
    requestNotifyPermission,
  }
}
