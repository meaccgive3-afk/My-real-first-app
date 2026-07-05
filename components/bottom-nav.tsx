'use client'

import { Clock, BookOpen, ScrollText, CircleDot, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabKey = 'prayers' | 'quran' | 'adhkar' | 'tasbih' | 'qibla'

const TABS: { key: TabKey; label: string; icon: typeof Clock }[] = [
  { key: 'prayers', label: 'الصلاة', icon: Clock },
  { key: 'quran', label: 'القرآن', icon: BookOpen },
  { key: 'adhkar', label: 'الأذكار', icon: ScrollText },
  { key: 'tasbih', label: 'السبحة', icon: CircleDot },
  { key: 'qibla', label: 'القبلة', icon: Compass },
]

export function BottomNav({
  active,
  onChange,
}: {
  active: TabKey
  onChange: (tab: TabKey) => void
}) {
  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/90 backdrop-blur-lg"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(key)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-1 rounded-xl py-2 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-12 items-center justify-center rounded-full transition-colors',
                    isActive && 'bg-primary/12',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
