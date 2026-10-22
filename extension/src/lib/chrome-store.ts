import type { KV } from './data.ts';

export const chromeStore: KV = {
  async get<T>(key: string) {
    const res = await chrome.storage.local.get(key);
    return res[key] as T | undefined;
  },
  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },
};
