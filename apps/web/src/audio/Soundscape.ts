import type { Settings } from '@deadline/shared';
import { DEFAULT_SETTINGS } from '@deadline/shared';

export type MusicState = 'MAIN_MENU' | 'APARTMENT' | 'TASK_TERMINAL' | 'PHONE_DIALOGUE' | 'COMBAT' | 'PLAYER_DEATH' | 'MISSION_CLEARED';
const tracks: Record<MusicState, string> = {
  MAIN_MENU: 'menu', APARTMENT: 'apartment', TASK_TERMINAL: 'terminal', PHONE_DIALOGUE: 'dialogue',
  COMBAT: 'combat', PLAYER_DEATH: 'death', MISSION_CLEARED: 'victory',
};
interface PlayingTrack { source: AudioBufferSourceNode; gain: GainNode; stopped: boolean; name: string }

/** Owns the complete audio graph. All recordings are original generated PCM assets. */
class Soundscape {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private effects: GainNode | null = null;
  private settings: Settings = DEFAULT_SETTINGS;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private active = new Set<PlayingTrack>();
  private current: PlayingTrack | null = null;
  private currentState: MusicState = 'MAIN_MENU';
  private stateSerial = 0;
  private lastSfx = new Map<string, number>();
  private paused = false;
  private unlocked = false;
  private error = '';

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain(); this.music = this.context.createGain(); this.effects = this.context.createGain();
      this.music.connect(this.master); this.effects.connect(this.master); this.master.connect(this.context.destination);
      this.applyVolumes();
    }
    try {
      await this.context.resume();
      if (!this.unlocked) { this.unlocked = true; await this.playState(this.currentState); }
      this.report();
    } catch (error) { this.audioError(error); }
  }
  setSettings(settings: Settings) { this.settings = settings; this.applyVolumes(); }
  setPaused(paused: boolean) { this.paused = paused; this.applyVolumes(); }
  setState(state: MusicState) {
    if (state === this.currentState && this.current) return;
    this.currentState = state;
    if (this.unlocked) void this.playState(state);
    this.report();
  }
  private async load(name: string): Promise<AudioBuffer> {
    const context = this.context;
    if (!context) throw new Error('Audio requires a user gesture');
    let promise = this.buffers.get(name);
    if (!promise) {
      promise = fetch(`/assets/audio/${name}.wav`).then(async response => {
        if (!response.ok) throw new Error(`Audio ${name}: HTTP ${response.status}`);
        return context.decodeAudioData(await response.arrayBuffer());
      });
      this.buffers.set(name, promise);
      promise.catch(() => this.buffers.delete(name));
    }
    return promise;
  }
  private async playState(state: MusicState) {
    if (!this.context || !this.music) return;
    const serial = ++this.stateSerial;
    if (state === 'PLAYER_DEATH') for (const playing of this.active) this.stop(playing, .045);
    try {
      const buffer = await this.load(tracks[state]);
      if (serial !== this.stateSerial || !this.context || !this.music) return;
      const now = this.context.currentTime;
      for (const old of this.active) {
        if (old.name === tracks[state]) {
          // Rapidly reopening an overlay must not layer two copies of a loop.
          old.source.stop(now); old.stopped = true; this.active.delete(old);
        }
      }
      const source = this.context.createBufferSource(); const gain = this.context.createGain();
      source.buffer = buffer; source.loop = state !== 'PLAYER_DEATH' && state !== 'MISSION_CLEARED';
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(1, now + (source.loop ? .9 : .025));
      source.connect(gain); gain.connect(this.music);
      const playing = { source, gain, stopped: false, name: tracks[state] };
      for (const old of this.active) this.stop(old, state === 'PLAYER_DEATH' ? .045 : 1.1);
      this.active.add(playing); this.current = playing;
      source.onended = () => { this.active.delete(playing); source.disconnect(); gain.disconnect(); this.report(); };
      source.start(); this.applyVolumes(); this.report();
    } catch (error) { this.audioError(error); }
  }
  private stop(track: PlayingTrack, duration: number) {
    if (track.stopped || !this.context) return;
    track.stopped = true;
    const now = this.context.currentTime;
    track.gain.gain.cancelScheduledValues(now);
    track.gain.gain.setValueAtTime(track.gain.gain.value, now);
    track.gain.gain.linearRampToValueAtTime(0, now + duration);
    track.source.stop(now + duration + .015);
  }
  sfx(name: string) {
    if (!this.unlocked || !this.context || !this.effects || this.settings.muted) return;
    const now = performance.now();
    const interval = name === 'text' ? 55 : name === 'footstep' ? 180 : 35;
    if (now - (this.lastSfx.get(name) ?? -Infinity) < interval) return;
    this.lastSfx.set(name, now);
    const sound = name === 'text' ? 'menu' : name;
    void this.load(`sfx-${sound}`).then(buffer => {
      if (!this.context || !this.effects) return;
      const source = this.context.createBufferSource(); const gain = this.context.createGain();
      source.buffer = buffer; gain.gain.value = name === 'text' ? .08 : name === 'footstep' ? .28 : .75;
      source.connect(gain); gain.connect(this.effects); source.start();
      source.onended = () => { source.disconnect(); gain.disconnect(); };
    }).catch(error => this.audioError(error));
  }
  private applyVolumes() {
    if (!this.context || !this.master || !this.music || !this.effects) return;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.masterVolume, now, .04);
    const dialogueDuck = this.currentState === 'PHONE_DIALOGUE' ? .45 : 1;
    this.music.gain.setTargetAtTime(this.settings.musicVolume * dialogueDuck * (this.paused ? .35 : 1), now, .1);
    this.effects.gain.setTargetAtTime(this.settings.sfxVolume, now, .04);
    // All shipped music is original synthesis; every track is streamer-safe.
    this.report();
  }
  private audioError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message !== this.error) console.warn(`DEADLINE audio: ${message}`);
    this.error = message; this.report();
  }
  private report() {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.musicState = this.currentState;
    document.documentElement.dataset.audioContext = this.context?.state ?? 'locked';
    document.documentElement.dataset.audioTracks = String(this.active.size);
    document.documentElement.dataset.audioError = this.error;
  }
  inspect() { return { state: this.currentState, context: this.context?.state ?? 'locked', tracks: this.active.size, error: this.error,
    gain: { master: this.master?.gain.value ?? 0, music: this.music?.gain.value ?? 0, sfx: this.effects?.gain.value ?? 0 } }; }
  destroy() {
    this.stateSerial++;
    for (const playing of this.active) this.stop(playing, .02);
    this.buffers.clear(); this.unlocked = false; this.current = null;
    void this.context?.close(); this.context = null;
  }
}
export const soundscape = new Soundscape();
