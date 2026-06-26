'use client'

import { Clock, BookOpen, CircleDot, Compass, BookMarked } from 'lucide-react'
import { useSettings } from '@/lib/settings-context'
import { cn } from '@/lib/utils'

export type TabKey = 'prayers' | 'quran' | 'adhkar' | 'tasbih' | 'qibla'

const TABS: { key: TabKey; labelKey: string; icon: typeof Clock }[] = [
  { key: 'prayers', labelKey: 'nav_prayers', icon: Clock },
  { key: 'quran', labelKey: 'nav_quran', icon: BookMarked },
  { key: 'adhkar', labelKey: 'nav_adhkar', icon: BookOpen },
  { key: 'tasbih', labelKey: 'nav_tasbih', icon: CircleDot },
  { key: 'qibla', labelKey: 'nav_qibla', icon: Compass },
]

export function BottomNav({
  active,
  onChange,
}: {
  active: TabKey
  onChange: (tab: TabKey) => void
}) {
  const { t } = useSettings()

  return (
    <nav
      aria-label={t('appName')}
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around gap-1 rounded-[1.75rem] glass-strong px-1.5 py-1.5 shadow-2xl shadow-black/20">
        {TABS.map(({ key, labelKey, icon: Icon }) => {
          const isActive = active === key
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(key)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-0.5 rounded-2xl py-2 transition-all duration-300',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-full items-center justify-center rounded-2xl transition-all duration-300',
                    isActive && 'bg-primary shadow-lg shadow-primary/30',
                  )}
                >
                  <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    'text-[0.65rem] font-bold transition-colors',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {t(labelKey)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
