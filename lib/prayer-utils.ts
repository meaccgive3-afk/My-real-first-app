export type PrayerKey = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'

export const PRAYER_LABELS: Record<PrayerKey, string> = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
}

// Prayers that count for "next prayer" countdown (Sunrise is informational)
export const MAIN_PRAYERS: PrayerKey[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
export const ALL_TIMINGS: PrayerKey[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

export type Timings = Record<PrayerKey, string>

export type PrayerData = {
  timings: Timings
  hijri: {
    day: string
    month: string
    year: string
    weekday: string
  }
  gregorian: {
    date: string
    weekday: string
  }
  meta: {
    timezone: string
    method: string
  }
}

/** Convert "HH:MM" (24h) for today into a Date object. */
export function timeToDate(hhmm: string, base = new Date()): Date {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10))
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d
}

/** Format "HH:MM" 24h into Arabic 12h string with ص/م. */
export function formatTime12(hhmm: string): { time: string; period: string } {
  const [hRaw, m] = hhmm.split(':').map((n) => parseInt(n, 10))
  const period = hRaw >= 12 ? 'مساءً' : 'صباحاً'
  let h = hRaw % 12
  if (h === 0) h = 12
  const mm = m.toString().padStart(2, '0')
  return { time: `${h}:${mm}`, period }
}

export type NextPrayerInfo = {
  key: PrayerKey
  label: string
  at: Date
  msUntil: number
  isTomorrow: boolean
}

/** Determine the next upcoming prayer from the timings. */
export function getNextPrayer(timings: Timings, now = new Date()): NextPrayerInfo {
  for (const key of MAIN_PRAYERS) {
    const at = timeToDate(timings[key], now)
    if (at.getTime() > now.getTime()) {
      return {
        key,
        label: PRAYER_LABELS[key],
        at,
        msUntil: at.getTime() - now.getTime(),
        isTomorrow: false,
      }
    }
  }
  // All passed -> next is tomorrow's Fajr
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const at = timeToDate(timings.Fajr, tomorrow)
  return {
    key: 'Fajr',
    label: PRAYER_LABELS.Fajr,
    at,
    msUntil: at.getTime() - now.getTime(),
    isTomorrow: true,
  }
}

/** Which prayer is the "current" active one (most recent passed). */
export function getCurrentPrayer(timings: Timings, now = new Date()): PrayerKey | null {
  let current: PrayerKey | null = null
  for (const key of MAIN_PRAYERS) {
    const at = timeToDate(timings[key], now)
    if (at.getTime() <= now.getTime()) current = key
  }
  return current
}

/** Format a millisecond duration into Arabic "س ٥ : د ٢٣ : ث ١٠" style HH:MM:SS. */
export function formatCountdown(ms: number): string {
  if (ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/** Convert western digits to Arabic-Indic numerals. */
export function toArabicDigits(input: string | number): string {
  const map = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return input.toString().replace(/[0-9]/g, (d) => map[parseInt(d, 10)])
}

const HIJRI_MONTHS: Record<string, string> = {
  '1': 'محرّم',
  '2': 'صفر',
  '3': 'ربيع الأول',
  '4': 'ربيع الآخر',
  '5': 'جمادى الأولى',
  '6': 'جمادى الآخرة',
  '7': 'رجب',
  '8': 'شعبان',
  '9': 'رمضان',
  '10': 'شوّال',
  '11': 'ذو القعدة',
  '12': 'ذو الحجّة',
}

export function hijriMonthName(num: string): string {
  return HIJRI_MONTHS[num] ?? ''
}

/**
 * Calculate the Qibla direction (bearing from north, in degrees)
 * from a given lat/lng towards the Kaaba in Makkah.
 */
const KAABA_LAT = 21.4225
const KAABA_LNG = 39.8262

export function qiblaBearing(lat: number, lng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const phiK = toRad(KAABA_LAT)
  const phi = toRad(lat)
  const dLng = toRad(KAABA_LNG - lng)
  const y = Math.sin(dLng)
  const x = Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(dLng)
  let bearing = toDeg(Math.atan2(y, x))
  return (bearing + 360) % 360
}
