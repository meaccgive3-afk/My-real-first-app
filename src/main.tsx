import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppShell } from '@/components/app-shell'
import { SettingsProvider } from '@/lib/settings-context'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <AppShell />
    </SettingsProvider>
  </StrictMode>,
)
