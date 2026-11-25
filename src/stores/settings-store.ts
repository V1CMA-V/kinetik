import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

type ColorSchemePreference = 'system' | 'light' | 'dark';

type SettingsState = {
  colorScheme: ColorSchemePreference;
  setColorScheme: (value: ColorSchemePreference) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      colorScheme: 'system',
      setColorScheme: (colorScheme) => set({ colorScheme }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
