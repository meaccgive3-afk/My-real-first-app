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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <ul className="glass-nav pointer-events-auto mx-auto flex max-w-md items-center justify-around gap-0.5 rounded-[2.25rem] p-1.5">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(key)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-0.5 rounded-[1.75rem] px-1 py-2 transition-all duration-300',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground active:scale-95',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span
                  className={cn(
                    'text-[0.65rem] font-bold leading-none',
                    !isActive && 'font-semibold',
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
