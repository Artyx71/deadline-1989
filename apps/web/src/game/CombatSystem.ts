import Phaser from 'phaser';
import type { GameHud, GamePort, MissionStats, WorldMap } from '@deadline/shared';
import { BALANCE } from './constants';
import { actorRect, clearPath, firstImpact, lineOfSight } from './geometry';
import { HitStop, WeaponState } from './WeaponState';
import { nextEnemyState, type EnemyState } from './enemyState';
import type { Point } from './geometry';
import { findPath } from './pathfinding';

interface Enemy {
  sprite: Phaser.Physics.Arcade.Sprite;
  kind: 'grunt' | 'gunner'; hp: number; state: EnemyState; stateSince: number;
  nextAttack: number; nextPath: number; path: Point[]; home: Point; lastSeen: Point; lastSeenAt: number;
  attackAt: number | null; attackTarget: Point;
  blood: Phaser.GameObjects.Ellipse | null;
}
interface Bullet { image: Phaser.GameObjects.Image; x: number; y: number; dx: number; dy: number; enemy: boolean; life: number }
interface CombatOptions {
  scene: Phaser.Scene; player: Phaser.Physics.Arcade.Sprite; world: WorldMap;
  solids: Phaser.Physics.Arcade.StaticGroup; port: GamePort; training: boolean; ammunition: number;
  effects: () => boolean;
}
export class CombatSystem {
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private weapon: WeaponState;
  private kills = 0;
  private hits = 0;
  private shots = 0;
  private meleeKills = 0;
  private elapsed = 0;
  private outcome = false;
  private disposed = false;
  private lastHud = '';
  private clock = 0;
  private hitStop = new HitStop();
  private authorizedShot: { x: number; y: number; angle: number } | null = null;
  private effectSprites = new Set<Phaser.GameObjects.Sprite>();
  private group: Phaser.Physics.Arcade.Group;
  private readonly options: CombatOptions;

  constructor(options: CombatOptions) {
    this.options = options;
    const ammunition = options.training ? 36 : options.ammunition;
    this.weapon = new WeaponState(ammunition);
    this.group = options.scene.physics.add.group();
    const starts = options.training ? [{ type: 'grunt' as const, x: 604, y: 290 }] : options.world.enemies ?? [];
    for (const start of starts) {
      const key = start.type === 'gunner' ? 'enemy-gunner' : 'enemy';
      const sprite = options.scene.physics.add.sprite(start.x, start.y, key, 0).setDepth(15);
      sprite.setSize(16, 16).setOffset(8, 8).setCollideWorldBounds(true);
      this.group.add(sprite);
      if (options.training) sprite.setTint(0x77e6d7);
      this.enemies.push({ sprite, kind: start.type, hp: start.type === 'gunner' ? 2 : 1, state: 'IDLE', stateSince: 0,
        nextAttack: 0, nextPath: 0, path: [], home: { x: start.x, y: start.y }, lastSeen: { x: start.x, y: start.y }, lastSeenAt: 0,
        attackAt: null, attackTarget: { x: start.x, y: start.y }, blood: null });
    }
    options.scene.physics.add.collider(this.group, options.solids);
    options.scene.physics.add.collider(this.group, this.group);
    for (let i = 0; i < 48; i++) {
      const image = options.scene.add.image(-100, -100, 'bullet').setDepth(19).setVisible(false);
      this.bullets.push({ image, x: 0, y: 0, dx: 0, dy: 0, enemy: false, life: 0 });
    }
    this.emitHud();
  }
  private get scene() { return this.options.scene; }
  private get player() { return this.options.player; }
  get finished() { return this.outcome; }
  get waitingForShot() { return this.weapon.shotPending; }
  get reloading() { return this.weapon.reloading; }
  get hitStopped() { return this.hitStop.active; }
  diagnostics() {
    return { actors: this.enemies.map(enemy => ({ x: Math.round(enemy.sprite.x * 10) / 10, y: Math.round(enemy.sprite.y * 10) / 10,
      hp: Math.max(0, enemy.hp), type: enemy.kind, state: enemy.state })), magazine: this.weapon.magazine, reserve: this.weapon.reserve,
    shotPending: this.weapon.shotPending, hitStopped: this.hitStop.active };
  }
  advanceHitStop(delta: number) { return this.hitStop.advance(delta); }
  setSimulationPaused(paused: boolean) {
    for (const enemy of this.enemies) {
      if (paused) { enemy.sprite.setVelocity(0); enemy.sprite.anims.pause(); }
      else enemy.sprite.anims.resume();
    }
    for (const sprite of this.effectSprites) { if (paused) sprite.anims.pause(); else sprite.anims.resume(); }
  }

  update(delta: number, pointer: Phaser.Input.Pointer, controls: { reload: boolean; melee: boolean; fire?: boolean }, paused: boolean) {
    if (this.disposed || this.outcome || paused) {
      for (const enemy of this.enemies) enemy.sprite.setVelocity(0);
      return;
    }
    this.clock += delta; this.elapsed += delta;
    if (this.weapon.advance(this.clock)) this.options.port.emit({ type: 'tutorial', action: 'reloaded' });
    if (this.authorizedShot) {
      const shot = this.authorizedShot; this.authorizedShot = null;
      this.launch(shot.x, shot.y, shot.angle, false);
      this.player.play('player-shoot');
      this.options.port.emit({ type: 'sound', name: 'gunshot' });
      this.options.port.emit({ type: 'tutorial', action: 'shot' });
      if (this.options.effects()) this.scene.cameras.main.shake(55, .002);
      const casing = this.scene.add.image(shot.x + 6, shot.y + 5, 'casing').setDepth(3).setRotation(this.clock);
      this.scene.tweens.add({ targets: casing, alpha: 0, delay: 2500, duration: 1500, onComplete: () => casing.destroy() });
    }
    if (controls.reload) this.reload();
    if (controls.melee || pointer.rightButtonDown()) this.melee();
    if (controls.fire || pointer.leftButtonDown()) {
      if (this.weapon.magazine > 0) void this.shoot(); else this.melee();
    }
    if (this.options.training) {
      for (const enemy of this.enemies) {
        if (enemy.state === 'DEAD' && this.clock - enemy.stateSince > 1100) {
          enemy.blood?.destroy(); enemy.blood = null;
          enemy.hp = 1; enemy.state = 'IDLE'; enemy.sprite.setPosition(604, 290).setTint(0x77e6d7).setAlpha(1).setDepth(15).setRotation(0).play('enemy-idle');
          (enemy.sprite.body as Phaser.Physics.Arcade.Body).enable = true;
        }
      }
    } else this.updateEnemies(delta);
    this.updateBullets(delta);
    this.emitHud();
  }
  private animate(sprite: Phaser.Physics.Arcade.Sprite, action: string, kind = 'enemy') {
    const key = `${kind}-${action}`;
    if (['idle', 'walk', 'run', 'aim'].includes(action) && sprite.anims.isPlaying && sprite.anims.currentAnim?.repeat === 0) return;
    if (this.scene.anims.exists(key)) sprite.play(key, true);
  }
  private transition(enemy: Enemy, next: EnemyState) {
    if (enemy.state === next) return;
    enemy.state = next; enemy.stateSince = this.clock;
  }
  private updateEnemies(_delta: number) {
    for (const enemy of this.enemies) {
      if (enemy.state === 'DEAD') continue;
      const distance = Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, this.player.x, this.player.y);
      const visible = distance < 290 && lineOfSight(enemy.sprite, this.player, this.options.world.colliders);
      if (visible) {
        enemy.lastSeen = { x: this.player.x, y: this.player.y };
        enemy.lastSeenAt = this.clock;
      }
      const range = enemy.kind === 'gunner' ? 220 : 29;
      const next = nextEnemyState({ state: enemy.state, since: enemy.stateSince, lastSeenAt: enemy.lastSeenAt,
        now: this.clock, visible, distance, attackRange: range });
      const changed = next !== enemy.state;
      this.transition(enemy, next);
      if (changed) {
        if (next === 'ALERT') enemy.sprite.setTint(0xff949c);
        else enemy.sprite.clearTint();
      }
      if (enemy.state === 'ALERT' || enemy.state === 'IDLE') {
        enemy.sprite.setVelocity(0);
        this.animate(enemy.sprite, enemy.kind === 'gunner' ? 'aim' : 'idle', enemy.kind === 'gunner' ? 'enemy-gunner' : 'enemy');
        continue;
      }
      // Attack deadlines use simulation time. They cannot resolve during pause
      // or hit stop, and both range and occlusion are checked at impact time.
      if (enemy.attackAt !== null && this.clock >= enemy.attackAt) {
        enemy.attackAt = null; enemy.sprite.clearTint();
        if (visible) {
          if (enemy.kind === 'gunner') {
            const fireAngle = Phaser.Math.Angle.Between(enemy.sprite.x, enemy.sprite.y, enemy.attackTarget.x, enemy.attackTarget.y);
            this.launch(enemy.sprite.x, enemy.sprite.y, fireAngle, true);
            this.animate(enemy.sprite, 'shoot', 'enemy-gunner');
            this.options.port.emit({ type: 'sound', name: 'gunshot' });
          } else if (distance < 35) this.die();
        }
      }
      if (this.outcome) return;
      const angle = Phaser.Math.Angle.Between(enemy.sprite.x, enemy.sprite.y, this.player.x, this.player.y);
      if (enemy.state === 'ATTACK') {
        enemy.sprite.setRotation(angle).setVelocity(0);
        if (enemy.kind === 'gunner' && distance < 100) enemy.sprite.setVelocity(-Math.cos(angle) * 75, -Math.sin(angle) * 75);
        if (enemy.attackAt === null && this.clock >= enemy.nextAttack) {
          enemy.nextAttack = this.clock + (enemy.kind === 'gunner' ? 1250 : 1000);
          enemy.attackAt = this.clock + (enemy.kind === 'gunner' ? 390 : 310);
          enemy.attackTarget = { x: this.player.x, y: this.player.y };
          enemy.sprite.setTint(0xff4b75);
          if (enemy.kind === 'grunt') this.animate(enemy.sprite, 'melee');
        }
        this.animate(enemy.sprite, 'aim', enemy.kind === 'gunner' ? 'enemy-gunner' : 'enemy');
        continue;
      }
      const destination = enemy.state === 'PATROL'
        ? { x: enemy.home.x + Math.sin(this.clock / 1800) * 35, y: enemy.home.y + Math.cos(this.clock / 1800) * 26 }
        : visible ? this.player : enemy.lastSeen;
      if (this.clock >= enemy.nextPath) {
        enemy.path = findPath(enemy.sprite, destination, this.options.world.colliders, this.options.world.width, this.options.world.height);
        enemy.nextPath = this.clock + 400;
      }
      let point: Point | undefined;
      if (clearPath(enemy.sprite, destination, this.options.world.colliders)) point = destination;
      else {
        point = enemy.path[0];
        if (point && Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, point.x, point.y) < 3) { enemy.path.shift(); point = enemy.path[0]; }
      }
      if (point && Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, point.x, point.y) > 3) {
        const heading = Phaser.Math.Angle.Between(enemy.sprite.x, enemy.sprite.y, point.x, point.y);
        const speed = enemy.state === 'PATROL' ? 44 : enemy.kind === 'grunt' ? 112 : 82;
        enemy.sprite.setRotation(heading).setVelocity(Math.cos(heading) * speed, Math.sin(heading) * speed);
        this.animate(enemy.sprite, enemy.state === 'PATROL' ? 'walk' : 'run', enemy.kind === 'gunner' ? 'enemy-gunner' : 'enemy');
      } else {
        enemy.sprite.setVelocity(0);
        this.animate(enemy.sprite, enemy.kind === 'gunner' ? 'aim' : 'idle', enemy.kind === 'gunner' ? 'enemy-gunner' : 'enemy');
      }
    }
  }
  private launch(x: number, y: number, angle: number, enemy: boolean) {
    const bullet = this.bullets.find(item => item.life <= 0);
    if (!bullet) return;
    bullet.x = x; bullet.y = y;
    bullet.dx = Math.cos(angle) * (enemy ? 310 : BALANCE.bulletSpeed); bullet.dy = Math.sin(angle) * (enemy ? 310 : BALANCE.bulletSpeed);
    bullet.enemy = enemy; bullet.life = 1300;
    bullet.image.setPosition(bullet.x, bullet.y).setRotation(angle).setTint(enemy ? 0xff6388 : 0xffe3a0).setVisible(true);
    const muzzle = { x: x + Math.cos(angle) * 20, y: y + Math.sin(angle) * 20 };
    const obstacle = firstImpact({ x, y }, muzzle, this.options.world.colliders, []);
    const distance = obstacle ? Math.max(0, obstacle.fraction * 20 - 1) : 20;
    this.effect(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 0xffe3a0, 7);
    for (const action of ['muzzle', 'smoke']) {
      const sprite = this.scene.add.sprite(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 'effects').setDepth(20).setRotation(angle).setAlpha(action === 'smoke' ? .65 : 1).play(action);
      this.effectSprites.add(sprite);
      sprite.once('animationcomplete', () => { this.effectSprites.delete(sprite); sprite.destroy(); });
    }
  }
  private async shoot() {
    if (this.outcome || this.disposed || !this.weapon.requestShot(this.clock)) return;
    const origin = { x: this.player.x, y: this.player.y, angle: this.player.rotation };
    try {
      const allowed = this.options.training || await this.options.port.spendShot();
      if (this.weapon.resolveShot(this.clock, allowed)) {
        this.shots++;
        // An authorization may resolve while a form owns focus. Launch on the
        // next active simulation frame, never from an asynchronous callback.
        if (!this.disposed && !this.outcome) this.authorizedShot = origin;
      }
    } catch (error) {
      this.weapon.resolveShot(this.clock, false);
      if (!this.disposed) this.options.port.emit({ type: 'error', message: error instanceof Error ? error.message : 'Не удалось подтвердить расход патрона. Подключитесь и повторите попытку.' });
    } finally { if (!this.disposed) this.emitHud(); }
  }
  reload() {
    if (this.outcome || this.disposed) return;
    if (this.options.training && !this.weapon.reserve) this.weapon.reserve = 36;
    if (!this.weapon.reload(this.clock)) return;
    this.player.play('player-reload');
    this.options.port.emit({ type: 'sound', name: 'reload' }); this.emitHud();
  }
  melee() {
    if (this.outcome || this.disposed || !this.weapon.melee(this.clock)) return;
    this.player.play('player-melee');
    this.options.port.emit({ type: 'sound', name: 'melee' });
    this.options.port.emit({ type: 'tutorial', action: 'melee' });
    const arc = this.scene.add.arc(this.player.x, this.player.y, 34, Phaser.Math.RadToDeg(this.player.rotation) - 48, Phaser.Math.RadToDeg(this.player.rotation) + 48, false, 0x75f8e9, .18).setDepth(20);
    this.scene.tweens.add({ targets: arc, alpha: 0, duration: 100, onComplete: () => arc.destroy() });
    for (const enemy of this.enemies) {
      if (enemy.state === 'DEAD') continue;
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y) <= BALANCE.meleeRange && Math.abs(Phaser.Math.Angle.Wrap(angle - this.player.rotation)) < 1.15 && lineOfSight(this.player, enemy.sprite, this.options.world.colliders)) this.hitEnemy(enemy, true);
    }
  }
  private updateBullets(delta: number) {
    for (const bullet of this.bullets) {
      if (this.outcome) break;
      if (bullet.life <= 0) continue;
      const start = { x: bullet.x, y: bullet.y };
      const end = { x: bullet.x + bullet.dx * delta / 1000, y: bullet.y + bullet.dy * delta / 1000 };
      const targets: { rect: ReturnType<typeof actorRect>; value: Enemy | 'player' }[] = bullet.enemy
        ? [{ rect: actorRect(this.player, 7), value: 'player' }]
        : this.enemies.filter(enemy => enemy.state !== 'DEAD').map(enemy => ({ rect: actorRect(enemy.sprite, 8), value: enemy }));
      const impact = firstImpact(start, end, this.options.world.colliders, targets);
      if (impact) {
        const { fraction, target } = impact;
        bullet.life = 0; bullet.image.setVisible(false);
        this.effect(start.x + (end.x - start.x) * fraction, start.y + (end.y - start.y) * fraction, target ? 0xe52d69 : 0xe9ba8b, target ? 9 : 4);
        this.options.port.emit({ type: 'sound', name: 'impact' });
        if (target === 'player') this.die(); else if (target) { this.hits++; this.hitEnemy(target, false); }
      } else {
        bullet.x = end.x; bullet.y = end.y; bullet.life -= delta;
        bullet.image.setPosition(end.x, end.y).setVisible(bullet.life > 0);
      }
    }
  }
  private hitEnemy(enemy: Enemy, melee: boolean) {
    enemy.hp -= melee ? 2 : 1;
    if (enemy.hp > 0) {
      enemy.sprite.setTint(0xff3e69); this.animate(enemy.sprite, 'hit', 'enemy-gunner');
      this.scene.time.delayedCall(110, () => { if (!this.disposed) enemy.sprite.clearTint(); });
      this.transition(enemy, 'CHASE'); return;
    }
    enemy.attackAt = null;
    this.transition(enemy, 'DEAD');
    enemy.sprite.setVelocity(0).setDepth(4).setTint(0x9d4b68);
    (enemy.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    this.animate(enemy.sprite, 'death', enemy.kind === 'gunner' ? 'enemy-gunner' : 'enemy');
    const pool = this.scene.add.ellipse(enemy.sprite.x, enemy.sprite.y, 29, 23, 0x711d3e, .7).setDepth(2);
    enemy.blood = pool;
    pool.setRotation(enemy.sprite.rotation);
    this.kills++; if (melee) this.meleeKills++;
    if (this.options.effects()) { this.scene.cameras.main.shake(70, .002); this.hitStop.request(35); }
    if (!this.options.training && this.enemies.every(item => item.state === 'DEAD')) this.finish('cleared');
    this.emitHud();
  }
  private effect(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const pixel = this.scene.add.rectangle(x, y, 2, 2, color).setDepth(20);
      const angle = i * 2.4 + this.clock;
      this.scene.tweens.add({ targets: pixel, x: x + Math.cos(angle) * (10 + i * 2), y: y + Math.sin(angle) * (10 + i * 2), alpha: 0, duration: 160 + i * 12, onComplete: () => pixel.destroy() });
    }
  }
  private die() {
    if (this.outcome || this.options.training) return;
    this.player.setVelocity(0).play('player-hit');
    this.scene.time.delayedCall(60, () => { if (!this.disposed) this.player.play('player-death'); });
    if (this.options.effects()) { this.hitStop.request(35); this.scene.cameras.main.flash(110, 180, 12, 50); }
    this.options.port.emit({ type: 'sound', name: 'death' });
    this.finish('dead');
  }
  private finish(result: 'dead' | 'cleared') {
    if (this.outcome) return;
    this.outcome = true; this.player.setVelocity(0);
    for (const enemy of this.enemies) enemy.sprite.setVelocity(0);
    // Wait for a committed in-flight shot so settlement matches the durable ledger.
    const settle = () => {
      if (this.disposed) return;
      if (this.weapon.shotPending) { this.scene.time.delayedCall(35, settle); return; }
      this.options.port.emit({ type: 'outcome', result, stats: this.stats() });
    };
    this.scene.time.delayedCall(result === 'dead' ? 650 : 550, settle);
  }
  stats(): MissionStats {
    return { kills: Math.min(6, this.kills), shotsFired: this.shots, hits: this.hits, meleeKills: Math.min(6, this.meleeKills), durationMs: Math.round(this.elapsed), emptyMagazine: this.weapon.magazine === 0 };
  }
  private emitHud() {
    const hud: GameHud = { scene: this.options.training ? 'training' : 'combat', magazine: this.weapon.magazine, reserve: this.weapon.reserve,
      kills: this.kills, enemies: this.options.training ? 1 : this.enemies.length, reloading: this.reloading, weapon: this.weapon.magazine || this.weapon.reserve ? 'pistol' : 'melee' };
    const serialized = JSON.stringify(hud);
    if (serialized !== this.lastHud) { this.lastHud = serialized; this.options.port.emit({ type: 'hud', hud }); }
  }
  destroy() { this.disposed = true; this.group.destroy(true); this.bullets.forEach(bullet => bullet.image.destroy()); this.effectSprites.forEach(sprite => sprite.destroy()); this.effectSprites.clear(); }
}
