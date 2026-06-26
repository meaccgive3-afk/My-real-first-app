// Quran data via alquran.cloud — a reliable, free, public API.
// Docs: https://alquran.cloud/api

export type SurahMeta = {
  number: number
  name: string // Arabic name
  englishName: string
  englishNameTranslation: string
  numberOfAyahs: number
  revelationType: 'Meccan' | 'Medinan'
}

export type Ayah = {
  number: number
  numberInSurah: number
  text: string
}

export type SurahDetail = {
  number: number
  name: string
  englishName: string
  numberOfAyahs: number
  revelationType: 'Meccan' | 'Medinan'
  arabic: Ayah[]
  translation: Ayah[]
}

const BASE = 'https://api.alquran.cloud/v1'

// Popular reciters with full-surah audio support on alquran.cloud.
export const RECITERS: { id: string; name: string }[] = [
  { id: 'ar.alafasy', name: 'مشاري العفاسي' },
  { id: 'ar.abdulbasitmurattal', name: 'عبد الباسط (مرتل)' },
  { id: 'ar.husary', name: 'محمود الحصري' },
  { id: 'ar.minshawi', name: 'محمد المنشاوي' },
  { id: 'ar.maheralmuaiqly', name: 'ماهر المعيقلي' },
  { id: 'ar.sudais', name: 'عبد الرحمن السديس' },
]

/** Full-surah audio file URL (downloadable MP3). */
export function surahAudioUrl(reciterId: string, surahNumber: number): string {
  // islamic.network CDN serves full-surah MP3s by edition + surah number.
  return `https://cdn.islamic.network/quran/audio-surah/128/${reciterId}/${surahNumber}.mp3`
}

const jsonFetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('network')
    return r.json()
  })

export const surahListFetcher = async (): Promise<SurahMeta[]> => {
  const data = await jsonFetcher(`${BASE}/surah`)
  return data.data as SurahMeta[]
}

/**
 * Fetch a single surah with Arabic text + a translation edition in one call.
 * SWR key is an array: ['surah', surahNumber, translationEdition]
 */
export const surahDetailFetcher = async ([, surahNumber, edition]: [
  string,
  number,
  string,
]): Promise<SurahDetail> => {
  const data = await jsonFetcher(
    `${BASE}/surah/${surahNumber}/editions/quran-uthmani,${edition}`,
  )
  const [arabicEd, transEd] = data.data
  return {
    number: arabicEd.number,
    name: arabicEd.name,
    englishName: arabicEd.englishName,
    numberOfAyahs: arabicEd.numberOfAyahs,
    revelationType: arabicEd.revelationType,
    arabic: arabicEd.ayahs as Ayah[],
    translation: (transEd?.ayahs ?? []) as Ayah[],
  }
}
