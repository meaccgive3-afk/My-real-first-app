'use client'

import { useState } from 'react'
import { Settings } from 'lucide-react'
import { BottomNav, type TabKey } from './bottom-nav'
import { PrayerTimesScreen } from './prayer-times-screen'
import { QuranScreen } from './quran-screen'
import { AdhkarScreen } from './adhkar-screen'
import { TasbihScreen } from './tasbih-screen'
import { QiblaScreen } from './qibla-screen'
import { LocationSheet } from './location-sheet'
import { SettingsSheet } from './settings-sheet'
import { useLocation } from '@/lib/use-location'
import { useSettings } from '@/lib/settings-context'

export function AppShell() {
  const [tab, setTab] = useState<TabKey>('prayers')
  const [locationOpen, setLocationOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { location, setLocation, detectLocation, geoError, geoLoading } = useLocation()
  const { t } = useSettings()

  return (
    <div className="relative min-h-dvh">
      <div className="app-bg" aria-hidden="true" />

      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t('appName')}</h1>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label={t('settings')}
          className="flex h-10 w-10 items-center justify-center rounded-full glass text-foreground transition active:scale-90"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      <main className="min-h-dvh">
        {tab === 'prayers' && (
          <PrayerTimesScreen location={location} onOpenLocation={() => setLocationOpen(true)} />
        )}
        {tab === 'quran' && <QuranScreen />}
        {tab === 'adhkar' && <AdhkarScreen />}
        {tab === 'tasbih' && <TasbihScreen />}
        {tab === 'qibla' && <QiblaScreen location={location} />}
      </main>

      <BottomNav active={tab} onChange={setTab} />

      {locationOpen && (
        <LocationSheet
          current={location}
          onClose={() => setLocationOpen(false)}
          onSelect={(loc) => {
            setLocation(loc)
            setLocationOpen(false)
          }}
          onDetect={detectLocation}
          geoLoading={geoLoading}
          geoError={geoError}
        />
      )}

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
