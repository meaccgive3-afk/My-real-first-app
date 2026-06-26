'use client'

import { X, Sun, Moon, Check, Languages, Palette, Info } from 'lucide-react'
import { useSettings } from '@/lib/settings-context'
import { LANGS } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { t, lang, setLang, theme, setTheme } = useSettings()

  return (
    <div className="fixed inset-0 z-[70] flex flex-col animate-fade-in">
      <button
        type="button"
        aria-label={t('close')}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      <div className="relative mt-auto max-h-[88dvh] overflow-y-auto no-scrollbar rounded-t-[2rem] glass-strong pb-[max(2rem,env(safe-area-inset-bottom))] animate-sheet-up">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pb-3 pt-4 glass-strong">
          <h2 className="text-lg font-bold">{t('settings')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 text-foreground transition active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-5 pt-2">
          {/* Language */}
          <section>
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Languages className="h-4 w-4" />
              {t('language')}
            </p>
            <ul className="grid grid-cols-1 gap-2">
              {LANGS.map((l) => {
                const active = l.code === lang
                return (
                  <li key={l.code}>
                    <button
                      type="button"
                      onClick={() => setLang(l.code)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-start transition active:scale-[0.99]',
                        active
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                          : 'glass text-foreground',
                      )}
                    >
                      <span className="flex flex-col">
                        <span className="text-base font-bold">{l.native}</span>
                        <span
                          className={cn(
                            'text-xs',
                            active ? 'text-primary-foreground/80' : 'text-muted-foreground',
                          )}
                        >
                          {l.label}
                        </span>
                      </span>
                      {active && <Check className="h-5 w-5" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Appearance */}
          <section>
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Palette className="h-4 w-4" />
              {t('appearance')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: 'light', label: t('theme_light'), icon: Sun },
                  { key: 'dark', label: t('theme_dark'), icon: Moon },
                ] as const
              ).map(({ key, label, icon: Icon }) => {
                const active = theme === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-2xl py-5 transition active:scale-95',
                      active
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                        : 'glass text-foreground',
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm font-bold">{label}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* About */}
          <section className="rounded-2xl glass p-4">
            <p className="mb-1 flex items-center gap-2 text-sm font-bold">
              <Info className="h-4 w-4 text-primary" />
              {t('about')}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">{t('aboutText')}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
