import type { SettingsData } from "./types";

/** Procedural SFX via Web Audio — no external audio files required. */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private musicTimer: number | null = null;
  private stormOsc: OscillatorNode | null = null;
  private stormGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  enabled = true;

  private ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.sfx.connect(this.master);
    this.music.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.noise = this.makeNoise(1);
  }

  resume() {
    this.ensure();
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  apply(s: SettingsData) {
    this.ensure();
    if (!this.master || !this.sfx || !this.music) return;
    this.master.gain.value = s.master;
    this.sfx.gain.value = s.sfx;
    this.music.gain.value = s.music;
  }

  ui() {
    this.blip(880, 0.05, 0.08, "square");
  }

  pickup() {
    this.blip(523, 0.06, 0.1, "sine");
    this.blip(784, 0.08, 0.12, "sine", 0.06);
  }

  hit() {
    this.blip(1400, 0.04, 0.07, "square");
  }

  kill() {
    this.blip(220, 0.12, 0.16, "sawtooth");
    this.blip(440, 0.1, 0.12, "square", 0.08);
  }

  hurt() {
    this.noiseBurst(0.12, 0.18, 400, 0.04);
  }

  reload() {
    this.blip(180, 0.08, 0.08, "square");
    this.blip(240, 0.1, 0.1, "square", 0.18);
    this.blip(320, 0.06, 0.08, "square", 0.55);
  }

  zoneWarn() {
    this.blip(310, 0.25, 0.14, "triangle");
    this.blip(248, 0.3, 0.16, "triangle", 0.28);
  }

  footstep(sprint: boolean) {
    this.noiseBurst(sprint ? 0.08 : 0.05, sprint ? 0.07 : 0.045, 180, 0.01);
  }

  victory() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => this.blip(n, 0.22, 0.12, "triangle", i * 0.14));
  }

  defeat() {
    this.blip(196, 0.4, 0.18, "sawtooth");
    this.blip(147, 0.5, 0.2, "sawtooth", 0.2);
  }

  shot(kind: string, dist = 0) {
    const atten = Math.max(0.12, 1 - dist / 90);
    switch (kind) {
      case "smg":
        this.gun(900, 0.05, 0.12 * atten, 0.04);
        break;
      case "shotgun":
        this.gun(180, 0.16, 0.28 * atten, 0.08);
        this.noiseBurst(0.22 * atten, 0.14, 900, 0.02);
        break;
      case "sniper":
        this.gun(140, 0.22, 0.3 * atten, 0.09);
        this.blip(880, 0.08, 0.06 * atten, "sine");
        break;
      case "pistol":
        this.gun(420, 0.07, 0.16 * atten, 0.05);
        break;
      case "lmg":
        this.gun(260, 0.07, 0.18 * atten, 0.05);
        break;
      case "burst":
        this.gun(380, 0.06, 0.16 * atten, 0.045);
        break;
      default:
        this.gun(340, 0.07, 0.18 * atten, 0.05);
    }
  }

  startMusic() {
    this.ensure();
    if (!this.ctx || !this.music) return;
    this.stopMusic();
    const playChord = () => {
      if (!this.ctx || !this.music) return;
      const notes = [110, 164.8, 196];
      const now = this.ctx.currentTime;
      for (const f of notes) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.04, now + 0.8);
        g.gain.linearRampToValueAtTime(0.02, now + 3.5);
        g.gain.linearRampToValueAtTime(0, now + 5);
        o.connect(g);
        g.connect(this.music);
        o.start(now);
        o.stop(now + 5.1);
      }
    };
    playChord();
    this.musicTimer = window.setInterval(playChord, 5200);
  }

  stopMusic() {
    if (this.musicTimer != null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  setStorm(on: boolean) {
    this.ensure();
    if (!this.ctx || !this.sfx) return;
    if (on && !this.stormOsc) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sawtooth";
      o.frequency.value = 42;
      g.gain.value = 0.03;
      o.connect(g);
      g.connect(this.sfx);
      o.start();
      this.stormOsc = o;
      this.stormGain = g;
    } else if (!on && this.stormOsc) {
      try {
        this.stormOsc.stop();
      } catch {
        /* already stopped */
      }
      this.stormOsc.disconnect();
      this.stormGain?.disconnect();
      this.stormOsc = null;
      this.stormGain = null;
    }
  }

  dispose() {
    this.stopMusic();
    this.setStorm(false);
    void this.ctx?.close();
    this.ctx = null;
  }

  private blip(
    freq: number,
    dur: number,
    vol: number,
    type: OscillatorType,
    delay = 0,
  ) {
    this.ensure();
    if (!this.ctx || !this.sfx) return;
    const now = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.6), now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.connect(g);
    g.connect(this.sfx);
    o.start(now);
    o.stop(now + dur + 0.02);
  }

  private gun(freq: number, dur: number, vol: number, noiseDur: number) {
    this.blip(freq, dur, vol, "square");
    this.noiseBurst(vol * 0.7, noiseDur, 1800, 0);
  }

  private noiseBurst(vol: number, dur: number, freq: number, delay: number) {
    this.ensure();
    if (!this.ctx || !this.sfx || !this.noise) return;
    const now = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  private makeNoise(seconds: number) {
    this.ensure();
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}
