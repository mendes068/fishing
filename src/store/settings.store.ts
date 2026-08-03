import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/types'

export type Theme = 'light' | 'dark' | 'system'

export interface SettingsState {
  theme: Theme
  language: Language
  dailyReviewCap: number
  setTheme: (theme: Theme) => void
  setLanguage: (language: Language) => void
  setDailyReviewCap: (cap: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'de',
      dailyReviewCap: 50,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setDailyReviewCap: (dailyReviewCap) => set({ dailyReviewCap }),
    }),
    {
      name: 'fishing-settings',
    },
  ),
)
