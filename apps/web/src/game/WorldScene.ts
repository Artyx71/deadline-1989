import Phaser from 'phaser';
import type { GamePort, SceneId, WorldInteraction, WorldMap, WorldRect } from '@deadline/shared';
import { ACTIONS, BALANCE } from './constants';
import { movement } from './geometry';
import { CombatSystem } from './CombatSystem';
import { readWorldMap } from './mapData';
import { addTrainingRange } from './TrainingRange';
import { InputLatch, type DiscreteAction } from './InputLatch';
import { interactionLabels } from './interactionText';

interface SceneData { sceneId?: SceneId; ammunition?: number }
export class WorldScene extends Phaser.Scene {
  sceneId: SceneId = 'apartment';
  externallyPaused = false;
  reducedMotion = false;
  private port: GamePort;
  private worldData!: WorldMap;
  private player!: Phaser.Physics.Arcade.Sprite;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private controls!: Record<string, Phaser.Input.Keyboard.Key>;
  private combat: CombatSystem | null = null;
  private nearest: WorldInteraction | null = null;
  private prompt = '';
  private ammunition = 0;
  private dashUntil = 0;
  private dashCooldownUntil = 0;
  private dashDirection = { x: 1, y: 0 };
  private elapsed = 0;
  private stepTime = 0;
  private moved = false;
  private aimed = false;
  private frameCount = 0;
  private maxDelta = 0;
  private frameTotal = 0;
  private wakeUntil = 0;
  private lastPos = { x: 0, y: 0 };
  private lastPointer = { x: 0, y: 0 };
  private simulationPaused: boolean | null = null;
  private phoneRinging = false;
  private phoneSprite: Phaser.GameObjects.Sprite | null = null;
  private environmentSprites: Phaser.GameObjects.Sprite[] = [];
  private doors: { sprite: Phaser.GameObjects.Sprite; open: boolean }[] = [];
  private actions = new InputLatch();
  private firePoint: { x: number; y: number } | null = null;

  constructor(port: GamePort, private desiredPause: () => boolean = () => false) { super('world'); this.port = port; }
  init(data: SceneData) {
    this.sceneId = data.sceneId ?? 'apartment'; this.ammunition = data.ammunition ?? 0;
    this.combat = null; this.nearest = null; this.prompt = ''; this.elapsed = 0; this.stepTime = 0;
    this.moved = false; this.aimed = false; this.dashUntil = 0; this.dashCooldownUntil = 0;
    this.phoneSprite = null; this.environmentSprites = []; this.doors = []; this.simulationPaused = null; this.wakeUntil = 0;
    this.frameCount = 0; this.maxDelta = 0; this.frameTotal = 0;
    this.actions.clear();
    this.firePoint = null;
  }
  preload() {
    const mapId = this.sceneId === 'combat' ? 'combat' : 'apartment';
    this.load.image(`${mapId}-art`, `/assets/${mapId}.png`);
    this.load.json(`${mapId}-data`, `/assets/${mapId}.json`);
    this.load.tilemapTiledJSON(`${mapId}-tiled`, `/assets/${mapId}.tiled.json`);
    for (const key of ['player', 'enemy', 'enemy-gunner']) this.load.spritesheet(key, `/assets/${key}.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('phone-ring', '/assets/phone-ring.png', { frameWidth: 40, frameHeight: 44 });
    this.load.spritesheet('computer-screen', '/assets/computer-screen.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('tv-static', '/assets/tv-static.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('neon-flicker', '/assets/neon-flicker.png', { frameWidth: 32, frameHeight: 16 });
    this.load.spritesheet('doors', '/assets/doors.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('effects', '/assets/effects.png', { frameWidth: 16, frameHeight: 16 });
    const onProgress = (progress: number) => this.port.emit({ type: 'loading', progress });
    const onError = (file: Phaser.Loader.File) => this.port.emit({ type: 'error', message: `Не удалось загрузить ${file.key}. Терминал задач доступен.` });
    this.load.on('progress', onProgress); this.load.on('loaderror', onError);
    const cleanup = () => { this.load.off('progress', onProgress); this.load.off('loaderror', onError); this.load.off('complete', cleanup); this.events.off('shutdown', cleanup); };
    this.load.once('complete', cleanup); this.events.once('shutdown', cleanup);
  }
  create() {
    const mapId = this.sceneId === 'combat' ? 'combat' : 'apartment';
    try { this.worldData = readWorldMap(this.cache.json.get(`${mapId}-data`)); }
    catch { this.port.emit({ type: 'error', message: 'Не удалось прочитать данные локации. Продолжайте работу в терминале задач.' }); return; }
    if (!this.textures.exists(`${mapId}-art`)) { this.port.emit({ type: 'error', message: 'Графика локации недоступна. Терминал задач продолжает работать.' }); return; }
    const { width, height, spawn } = this.worldData;
    this.add.image(0, 0, `${mapId}-art`).setOrigin(0).setDepth(0);
    // Tiled object layers are the authoritative map collision/interaction export.
    const tiled = this.make.tilemap({ key: `${mapId}-tiled` });
    const objects = tiled.getObjectLayer('Collisions')?.objects;
    if (objects?.length) this.worldData.colliders = objects.map(object => ({ x: object.x ?? 0, y: object.y ?? 0, width: object.width ?? 0, height: object.height ?? 0 }));
    this.physics.world.setBounds(0, 0, width, height);
    this.solids = this.physics.add.staticGroup();
    for (const rect of this.worldData.colliders) {
      const solid = this.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height).setVisible(false);
      this.physics.add.existing(solid, true); this.solids.add(solid);
    }
    this.createAnimations();
    if (!this.textures.exists('bullet')) {
      const graphic = this.add.graphics(); graphic.fillStyle(0xffffff); graphic.fillRect(0, 0, 10, 2); graphic.generateTexture('bullet', 10, 2); graphic.destroy();
      const casing = this.add.graphics(); casing.fillStyle(0xc39962); casing.fillRect(0, 0, 3, 2); casing.generateTexture('casing', 3, 2); casing.destroy();
    }
    const position = this.sceneId === 'training' ? { x: 530, y: 290 } : spawn;
    this.player = this.physics.add.sprite(position.x, position.y, 'player', 0).setDepth(16).setCollideWorldBounds(true);
    this.player.setSize(14, 14).setOffset(9, 9);
    this.physics.add.collider(this.player, this.solids);
    this.lastPos = { x: this.player.x, y: this.player.y };
    this.lastPointer = { x: this.input.activePointer.x, y: this.input.activePointer.y };
    const camera = this.cameras.main;
    camera.setBounds(0, 0, width, height).startFollow(this.player, true, .09, .09).setRoundPixels(true);
    camera.setBackgroundColor('#0b0b15');
    if (!this.input.keyboard) throw new Error('Управление с клавиатуры недоступно');
    this.controls = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D', dash: 'SHIFT', interact: 'E', reload: 'R', melee: 'F' }) as Record<string, Phaser.Input.Keyboard.Key>;
    const keyHandlers: { event: string; handle: (event: KeyboardEvent) => void }[] = [];
    for (const [key, action] of [['E', 'interact'], ['R', 'reload'], ['F', 'melee'], ['SHIFT', 'dash']] satisfies [string, DiscreteAction][]) {
      const eventName = `keydown-${key}`;
      const handle = (event: KeyboardEvent) => { if (!this.externallyPaused) this.actions.press(action, event.repeat); };
      this.input.keyboard.on(eventName, handle); keyHandlers.push({ event: eventName, handle });
    }
    const onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (this.externallyPaused || pointer.downElement !== this.game.canvas) return;
      if (pointer.button === 0) {
        this.actions.press('fire');
        this.firePoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      } else if (pointer.button === 2) this.actions.press('melee');
    };
    this.input.on('pointerdown', onPointerDown);
    this.input.mouse?.disableContextMenu();
    if (this.sceneId !== 'apartment') this.combat = new CombatSystem({ scene: this, player: this.player, world: this.worldData, solids: this.solids, port: this.port, training: this.sceneId === 'training', ammunition: this.ammunition, effects: () => !this.reducedMotion });
    else {
      this.player.play('player-wake'); this.wakeUntil = 650;
      this.port.emit({ type: 'hud', hud: { scene: 'apartment', magazine: 0, reserve: 0, kills: 0, enemies: 0, reloading: false, weapon: 'pistol' } });
    }
    if (this.sceneId !== 'combat') this.addEnvironment();
    if (this.sceneId === 'training') addTrainingRange(this);
    this.setInputPaused(this.desiredPause());
    this.port.emit({ type: 'ready', scene: this.sceneId });
    this.port.emit({ type: 'loading', progress: 1 });
    const onBlur = () => this.setInputPaused(true);
    this.game.events.on('blur', onBlur);
    this.events.once('shutdown', () => {
      this.game.events.off('blur', onBlur); this.combat?.destroy(); this.combat = null;
      for (const handler of keyHandlers) this.input.keyboard?.off(handler.event, handler.handle);
      this.input.off('pointerdown', onPointerDown);
      this.actions.clear();
      this.firePoint = null;
      this.input.keyboard?.resetKeys(); this.input.keyboard?.removeAllKeys(true);
      this.tweens.killAll(); this.time.removeAllEvents();
      this.port.emit({ type: 'prompt', label: null });
    });
    // Read-only diagnostic data supports reproducible browser smoke checks.
    this.game.canvas.dataset.scene = this.sceneId;
  }
  private createAnimations() {
    for (const key of ['player', 'enemy', 'enemy-gunner']) {
      for (const [row, action] of ACTIONS.entries()) {
        const name = `${key}-${action}`;
        if (this.anims.exists(name)) continue;
        this.anims.create({ key: name, frames: this.anims.generateFrameNumbers(key, { start: row * 8, end: row * 8 + 7 }), frameRate: action === 'idle' ? 5 : action === 'walk' ? 10 : 14,
          repeat: ['idle', 'walk', 'run', 'aim'].includes(action) ? -1 : 0 });
      }
    }
    for (const key of ['phone-ring', 'computer-screen', 'tv-static', 'neon-flicker']) {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }), frameRate: key === 'tv-static' ? 9 : 5, repeat: -1 });
    }
    for (const [name, frames, rate] of [['door-open', [0, 1, 2, 3], 10], ['door-close', [3, 2, 1, 0], 10], ['muzzle', [0, 1, 2, 3, 4, 5, 6, 7], 32], ['smoke', [16, 17, 18, 19, 20, 21, 22, 23], 10]] as const) {
      if (!this.anims.exists(name)) this.anims.create({ key: name, frames: frames.map(frame => ({ key: name.startsWith('door') ? 'doors' : 'effects', frame })), frameRate: rate, repeat: 0 });
    }
  }
  private addEnvironment() {
    this.phoneSprite = this.add.sprite(689, 314, 'phone-ring').setDepth(7);
    this.setPhoneRinging(this.phoneRinging);
    this.environmentSprites.push(this.phoneSprite,
      this.add.sprite(595, 363, 'computer-screen').play('computer-screen').setDepth(7),
      this.add.sprite(323, 100, 'tv-static').play('tv-static').setDepth(7).setAlpha(.5));
    this.environmentSprites.push(this.add.sprite(693, 281, 'neon-flicker').play('neon-flicker').setDepth(8).setAlpha(.65));
    for (const [x, y] of [[384, 444], [704, 424]]) {
      const sprite = this.add.sprite(x!, y!, 'doors', 0).setDepth(7);
      this.doors.push({ sprite, open: false }); this.environmentSprites.push(sprite);
    }
    for (const [x, y, color] of [[620, 360, 0x3ce5df], [695, 312, 0xff246f], [108, 75, 0xf34197], [643, 65, 0x4b87be]]) {
      const light = this.add.ellipse(x!, y!, 90, 66, color!, .035).setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: light, alpha: .075, duration: 1300 + x!, yoyo: true, repeat: -1 });
    }
    for (let i = 0; i < 10; i++) {
      const dust = this.add.rectangle(52 + i * 67, 70 + i * 31, 1, 1, 0xc7a8d5, .25).setDepth(11);
      this.tweens.add({ targets: dust, y: dust.y - 20, x: dust.x + 5, alpha: .05, duration: 4200 + i * 180, yoyo: true, repeat: -1 });
    }
  }
  setPhoneRinging(ringing: boolean) {
    this.phoneRinging = ringing;
    if (!this.phoneSprite?.active) return;
    if (ringing) this.phoneSprite.play('phone-ring', true);
    else this.phoneSprite.stop().setFrame(0);
    if (this.simulationPaused) this.phoneSprite.anims.pause();
  }
  private setSimulationPaused(paused: boolean) {
    if (!this.player?.active || this.simulationPaused === paused) return;
    this.simulationPaused = paused;
    if (paused) {
      this.player.setVelocity(0); this.player.anims.pause();
      this.physics.world.pause(); this.time.paused = true; this.tweens.pauseAll();
    } else {
      this.physics.world.resume(); this.time.paused = false; this.tweens.resumeAll(); this.player.anims.resume();
    }
    this.combat?.setSimulationPaused(paused);
    for (const sprite of this.environmentSprites) {
      if (paused) sprite.anims.pause(); else sprite.anims.resume();
    }
  }
  setInputPaused(paused: boolean) {
    this.externallyPaused = paused;
    if (paused) { this.actions.clear(); this.firePoint = null; }
    if (!this.player?.active || !this.input || !this.physics?.world) return;
    if (paused) {
      this.player?.setVelocity(0); this.input.keyboard?.resetKeys(); this.input.activePointer.reset();
      this.lastPointer = { x: this.input.activePointer.x, y: this.input.activePointer.y };
    }
    this.setSimulationPaused(paused || Boolean(this.combat?.hitStopped));
  }
  update(_time: number, rawDelta: number) {
    if (!this.player?.active || !this.controls) return;
    const delta = Math.min(rawDelta, 50);
    this.frameCount++; this.frameTotal += rawDelta; this.maxDelta = Math.max(this.maxDelta, rawDelta);
    if (this.externallyPaused) {
      this.writeDiagnostics();
      this.player.setVelocity(0); this.combat?.update(0, this.input.activePointer, { reload: false, melee: false }, true); return;
    }
    if (this.combat?.hitStopped) {
      if (this.combat.advanceHitStop(delta)) { this.setSimulationPaused(true); this.writeDiagnostics(); return; }
      this.setSimulationPaused(false);
    }
    if (this.combat?.finished) {
      this.writeDiagnostics();
      this.player.setVelocity(0); this.combat.update(0, this.input.activePointer, { reload: false, melee: false }, true); return;
    }
    this.elapsed += delta;
    const get = (name: string) => this.controls[name]?.isDown ? 1 : 0;
    const x = get('right') - get('left'), y = get('down') - get('up');
    const isMoving = Boolean(x || y);
    if (this.actions.consume('dash') && this.elapsed > this.dashCooldownUntil) {
      this.dashUntil = this.elapsed + BALANCE.dashDuration; this.dashCooldownUntil = this.elapsed + BALANCE.dashCooldown;
      this.dashDirection = isMoving ? movement(x, y, 1) : { x: Math.cos(this.player.rotation), y: Math.sin(this.player.rotation) };
    }
    const velocity = this.elapsed < this.dashUntil ? movement(this.dashDirection.x, this.dashDirection.y, BALANCE.dashSpeed) : movement(x, y, BALANCE.speed);
    this.player.setVelocity(velocity.x, velocity.y);
    const pointer = this.input.activePointer;
    const worldPointer = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (pointer.x || pointer.y) this.player.setRotation(Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPointer.x, worldPointer.y));
    if (this.elapsed > this.wakeUntil && !this.combat?.reloading) {
      const current = this.player.anims.currentAnim?.key ?? '';
      if (!this.player.anims.isPlaying || ['idle', 'walk', 'run', 'aim'].some(action => current.endsWith(action))) this.player.play(`player-${this.elapsed < this.dashUntil ? 'run' : isMoving ? 'walk' : this.combat ? 'aim' : 'idle'}`, true);
    }
    if (!this.moved && Phaser.Math.Distance.Between(this.lastPos.x, this.lastPos.y, this.player.x, this.player.y) > 18) {
      this.moved = true; this.port.emit({ type: 'tutorial', action: 'moved' });
    }
    if (!this.aimed && this.sceneId === 'training' && Math.hypot(pointer.x - this.lastPointer.x, pointer.y - this.lastPointer.y) > 6) { this.aimed = true; this.port.emit({ type: 'tutorial', action: 'aimed' }); }
    if (isMoving && this.elapsed > this.stepTime) { this.port.emit({ type: 'sound', name: 'footstep' }); this.stepTime = this.elapsed + 290; }
    this.updateInteraction();
    for (const door of this.doors) {
      const open = Phaser.Math.Distance.Between(this.player.x, this.player.y, door.sprite.x, door.sprite.y) < 64;
      if (open !== door.open) { door.open = open; door.sprite.play(open ? 'door-open' : 'door-close'); }
    }
    if (this.actions.consume('interact') && this.nearest) this.port.emit({ type: 'interaction', id: this.nearest.id });
    const fire = this.actions.consume('fire');
    if (fire && this.firePoint) this.player.setRotation(Phaser.Math.Angle.Between(this.player.x, this.player.y, this.firePoint.x, this.firePoint.y));
    this.firePoint = null;
    const combatControls = { reload: this.actions.consume('reload'), melee: this.actions.consume('melee'), fire };
    this.combat?.update(delta, pointer, combatControls, false);
    if (this.combat?.hitStopped) this.setSimulationPaused(true);
    this.writeDiagnostics();
  }
  private writeDiagnostics() {
    if (this.frameCount % 12 === 0) {
      const canvas = this.game.canvas;
      canvas.dataset.playerX = this.player.x.toFixed(1); canvas.dataset.playerY = this.player.y.toFixed(1);
      canvas.dataset.frames = String(this.frameCount); canvas.dataset.avgFrameMs = (this.frameTotal / this.frameCount).toFixed(2); canvas.dataset.maxFrameMs = this.maxDelta.toFixed(2);
      canvas.dataset.enemies = String(this.combat?.stats().kills ?? 0);
      const combat = this.combat?.diagnostics();
      canvas.dataset.enemyActors = JSON.stringify(combat?.actors ?? []);
      canvas.dataset.magazine = String(combat?.magazine ?? 0);
      canvas.dataset.reserve = String(combat?.reserve ?? 0);
      canvas.dataset.shotPending = String(combat?.shotPending ?? false);
      canvas.dataset.hitStopped = String(combat?.hitStopped ?? false);
      canvas.dataset.externallyPaused = String(this.externallyPaused);
    }
  }
  private updateInteraction() {
    const interactions = this.sceneId === 'combat' ? [] : this.worldData.interactions;
    this.nearest = null;
    let closest = Infinity;
    for (const item of interactions) {
      if (this.sceneId === 'training' && item.id !== 'training' && item.id !== 'computer') continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
      if (distance < (item.radius ?? 60) && distance < closest) { closest = distance; this.nearest = item; }
    }
    const label = this.nearest ? this.sceneId === 'training' && this.nearest.id === 'training' ? 'ВЕРНУТЬСЯ В КВАРТИРУ' : interactionLabels[this.nearest.id] ?? this.nearest.label : '';
    if (label !== this.prompt) { this.prompt = label; this.port.emit({ type: 'prompt', label: label || null }); }
  }
  collisionGeometry(): WorldRect[] { return this.worldData.colliders; }
}
