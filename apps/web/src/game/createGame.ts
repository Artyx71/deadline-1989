import Phaser from 'phaser';
import type { GameController, GamePort } from '@deadline/shared';
import { WorldScene } from './WorldScene';

export function createGame(parent: HTMLElement, port: GamePort): GameController {
  let disposed = false;
  let paused = true;
  const world = new WorldScene(port, () => paused);
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, width: 768, height: 480, backgroundColor: '#0b0b15', pixelArt: true, roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 768, height: 480 },
    render: { antialias: false, pixelArt: true, transparent: false },
    physics: { default: 'arcade', arcade: { debug: false, gravity: { x: 0, y: 0 }, fps: 60, fixedStep: true } },
    fps: { target: 60, forceSetTimeOut: false },
    audio: { noAudio: true }, scene: [world],
    callbacks: { postBoot: bootGame => { bootGame.canvas.setAttribute('aria-label', 'Мир DEADLINE. WASD — движение, E — действие, Tab — задачи.'); bootGame.canvas.setAttribute('role', 'img'); } },
  });
  game.events.on('ready', () => { if (!disposed) world.externallyPaused = paused; });
  return {
    setPaused(value) { paused = value; world.setInputPaused(value); },
    enter(scene, ammunition = 0) {
      if (disposed) return;
      game.canvas.dataset.scene = 'loading';
      delete game.canvas.dataset.playerX;
      delete game.canvas.dataset.playerY;
      game.scene.start('world', { sceneId: scene, ammunition });
      // Scene readiness is emitted through the port; host reapplies its focus state.
    },
    setEffects(reducedMotion) { world.reducedMotion = reducedMotion; },
    setPhoneRinging(ringing) { world.setPhoneRinging(ringing); },
    destroy() { if (disposed) return; disposed = true; game.destroy(true); },
  };
}
