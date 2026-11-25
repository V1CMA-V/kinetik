import { createMMKV } from 'react-native-mmkv';

/** Fast key-value storage for non-sensitive data (preferences, cache). */
export const storage = createMMKV({ id: 'kinetik' });

/** Adapter for zustand's `persist` middleware. */
export const zustandStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => {
    storage.remove(name);
  },
};
