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

export interface RecordsData {
  bestPlacement: number;
  bestKills: number;
  wins: number;
  matches: number;
}

const RECORDS_KEY = "dropzone-records-v1";

export class RecordsManager {
  data: RecordsData = { bestPlacement: 99, bestKills: 0, wins: 0, matches: 0 };

  constructor() {
    try {
      const raw = localStorage.getItem(RECORDS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<RecordsData>;
      this.data = { ...this.data, ...parsed };
    } catch {
      /* keep defaults */
    }
  }

  record(placement: number, kills: number, victory: boolean) {
    const d = this.data;
    d.matches++;
    d.bestPlacement = Math.min(d.bestPlacement, placement);
    d.bestKills = Math.max(d.bestKills, kills);
    if (victory) d.wins++;
    this.save();
  }

  private save() {
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(this.data));
    } catch {
      /* ignore quota */
    }
  }
}
