import { create } from 'zustand';
import type { GameHud, SceneId } from '@deadline/shared';

export type Overlay = 'none' | 'terminal' | 'pause' | 'settings' | 'credits' | 'loadout' | 'dialogue' | 'outcome' | 'recovery';
interface UiState {
  screen: 'boot' | 'menu' | 'game';
  overlay: Overlay;
  scene: SceneId;
  hud: GameHud;
  prompt: string | null;
  error: string | null;
  setScreen(screen: UiState['screen']): void;
  setOverlay(overlay: Overlay): void;
  setScene(scene: SceneId): void;
  setHud(hud: GameHud): void;
  setPrompt(prompt: string | null): void;
  setError(error: string | null): void;
}
export const useUi = create<UiState>(set => ({
  screen: 'boot', overlay: 'none', scene: 'apartment', prompt: null, error: null,
  hud: { scene: 'apartment', magazine: 0, reserve: 0, kills: 0, enemies: 0, reloading: false, weapon: 'pistol' },
  setScreen: screen => set({ screen }), setOverlay: overlay => set({ overlay }),
  setScene: scene => set({ scene }), setHud: hud => set({ hud }),
  setPrompt: prompt => set({ prompt }), setError: error => set({ error }),
}));
