'use client'

import { useState } from 'react'
import { BottomNav, type TabKey } from './bottom-nav'
import { PrayerTimesScreen } from './prayer-times-screen'
import { AdhkarScreen } from './adhkar-screen'
import { TasbihScreen } from './tasbih-screen'
import { QiblaScreen } from './qibla-screen'
import { LocationSheet } from './location-sheet'
import { useLocation } from '@/lib/use-location'

export function AppShell() {
  const [tab, setTab] = useState<TabKey>('prayers')
  const [locationOpen, setLocationOpen] = useState(false)
  const { location, setLocation, detectLocation, geoError, geoLoading } = useLocation()

  return (
    <div className="min-h-dvh bg-background">
      <main className="min-h-dvh">
        {tab === 'prayers' && (
          <PrayerTimesScreen
            location={location}
            onOpenLocation={() => setLocationOpen(true)}
          />
        )}
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
    </div>
  )
}
