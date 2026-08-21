import { DEFAULT_SETTINGS, type SettingsData } from "./types";

const KEY = "dropzone-settings-v1";

export class SettingsManager {
  data: SettingsData;

  constructor() {
    this.data = { ...DEFAULT_SETTINGS };
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SettingsData>;
      this.data = { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      this.data = { ...DEFAULT_SETTINGS };
    }
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignore quota */
    }
  }

  update(partial: Partial<SettingsData>) {
    this.data = { ...this.data, ...partial };
    this.save();
  }
}
