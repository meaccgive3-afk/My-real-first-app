'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { surahAudioUrl } from './quran'

type DownloadState = 'idle' | 'downloading' | 'downloaded' | 'error'

/**
 * Manages playback + optional offline download of a full-surah recitation.
 * Downloaded audio is held as an in-memory object URL so it can be played
 * without re-streaming. The user explicitly chooses to download or stream.
 */
export function useSurahAudio(reciterId: string, surahNumber: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [downloadPct, setDownloadPct] = useState(0)
  const blobUrlRef = useRef<string | null>(null)

  const onlineUrl = surahAudioUrl(reciterId, surahNumber)

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio()
      a.preload = 'none'
      a.addEventListener('timeupdate', () => setProgress(a.currentTime))
      a.addEventListener('loadedmetadata', () => setDuration(a.duration || 0))
      a.addEventListener('ended', () => setPlaying(false))
      a.addEventListener('pause', () => setPlaying(false))
      a.addEventListener('play', () => setPlaying(true))
      audioRef.current = a
    }
    return audioRef.current
  }, [])

  // Reset everything when reciter or surah changes
  useEffect(() => {
    const a = audioRef.current
    if (a) {
      a.pause()
      a.removeAttribute('src')
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setPlaying(false)
    setProgress(0)
    setDuration(0)
    setDownloadState('idle')
    setDownloadPct(0)
  }, [reciterId, surahNumber])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const toggle = useCallback(() => {
    const a = ensureAudio()
    if (playing) {
      a.pause()
      return
    }
    // Prefer the offline blob when available, otherwise stream online.
    const src = blobUrlRef.current ?? onlineUrl
    if (a.src !== src) a.src = src
    void a.play().catch(() => setPlaying(false))
  }, [ensureAudio, playing, onlineUrl])

  const seek = useCallback(
    (time: number) => {
      const a = ensureAudio()
      a.currentTime = time
      setProgress(time)
    },
    [ensureAudio],
  )

  const download = useCallback(async () => {
    if (downloadState === 'downloading' || downloadState === 'downloaded') return
    setDownloadState('downloading')
    setDownloadPct(0)
    try {
      const res = await fetch(onlineUrl)
      if (!res.ok || !res.body) throw new Error('network')
      const total = Number(res.headers.get('content-length')) || 0
      const reader = res.body.getReader()
      const chunks: Uint8Array[] = []
      let received = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          received += value.length
          if (total) setDownloadPct(Math.round((received / total) * 100))
        }
      }
      const blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      // If currently playing the online stream, swap to offline source seamlessly.
      const a = audioRef.current
      if (a && a.src === onlineUrl) {
        const t = a.currentTime
        a.src = url
        a.currentTime = t
      }
      setDownloadState('downloaded')
      setDownloadPct(100)
    } catch {
      setDownloadState('error')
    }
  }, [onlineUrl, downloadState])

  return {
    playing,
    progress,
    duration,
    toggle,
    seek,
    download,
    downloadState,
    downloadPct,
  }
}
