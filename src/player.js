/**
 * player.js — Player Class (Stage 2: Combat System)
 *
 * Controls:
 *   W/A/S/D  — Movement
 *   SPACE    — Directional attack (based on facing direction)
 *   SHIFT    — Dash (short burst, cooldown)
 *
 * Combat:
 *   HP:            100
 *   Attack damage: 20
 *   Attack range:  70px cone in facing direction
 *   Attack duration: 180ms active hitbox window
 *   Attack cooldown: 500ms
 *   Dash duration:   160ms
 *   Dash cooldown:   1200ms
 *   Dash speed:      520px/s
 *
 * Behavior Tracker Hooks (Stage 2):
 *   Emits named events to BehaviorTracker on every combat action.
 *   Events: PLAYER_ATTACK, PLAYER_ATTACK_LEFT/RIGHT/UP/DOWN,
 *           PLAYER_DASH, PLAYER_MOVE, PLAYER_HIT, PLAYER_MISS,
 *           PLAYER_RUSH, PLAYER_RETREAT
 */

import {
  spawnAttackSlash,
  spawnHitSpark,
  spawnMissEffect,
  spawnDashTrail,
  spawnDamageNumber,
} from './effects.js';

// ─── Config ───────────────────────────────────────────────────────────────────

export const PLAYER_CONFIG = {
  speed: 200,
  maxHealth: 100,
  size: 20,
  color: 0x00e5ff,
  attackDamage: 20,
  attackRange: 70,        // distance in pixels
  attackDuration: 180,    // ms the hitbox is active
  attackCooldown: 500,    // ms between attacks
  dashSpeed: 520,
  dashDuration: 160,      // ms of dash movement
  dashCooldown: 1200,     // ms between dashes
  invincibleDuration: 600,
};

// Facing directions (also defines attack direction)
export const DIRECTIONS = { right: 'right', left: 'left', up: 'up', down: 'down' };

// ─── Player Class ──────────────────────────────────────────────────────────────

export class Player {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = PLAYER_CONFIG.maxHealth;
    this.maxHealth = PLAYER_CONFIG.maxHealth;
    this.speed = PLAYER_CONFIG.speed;

    // State flags
    this.alive = true;
    this.isInvincible = false;
    this.isAttacking = false;
    this.isDashing = false;

    // Cooldown timers (ms remaining)
    this._attackCooldown = 0;
    this._dashCooldown = 0;
    this._dashTimer = 0;
    this._attackTimer = 0;

    // Dash velocity stored during dash
    this._dashVX = 0;
    this._dashVY = 0;

    // Facing direction — determines attack direction
    this.facing = DIRECTIONS.right;

    // Previous position for RUSH/RETREAT detection
    this._prevX = x;
    this._prevY = y;

    // Reference to tracker (injected from GameScene)
    this.tracker = null;

    // Dash input flag — set by keydown listener in GameScene
    this._dashPressed = false;
    // Attack input flag
    this._attackPressed = false;

    // ── Build sprite texture ──────────────────────────────────────
    const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
    const s = PLAYER_CONFIG.size;

    // Body
    gfx.fillStyle(PLAYER_CONFIG.color, 1);
    gfx.fillRect(0, 0, s * 2, s * 2);

    // Direction indicator (arrow pointing right by default)
    gfx.fillStyle(0x003344, 1);
    gfx.fillTriangle(s * 2 - 4, s, s + 4, s - 7, s + 4, s + 7);

    // Inner highlight
    gfx.fillStyle(0xffffff, 0.18);
    gfx.fillRect(3, 3, s * 2 - 6, s - 2);

    gfx.generateTexture('player_tex', s * 2, s * 2);
    gfx.destroy();

    this.sprite = scene.physics.add.sprite(x, y, 'player_tex');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);

    // ── Cooldown bars (rendered above player sprite) ──────────────
    this._cdGfx = scene.add.graphics().setDepth(20);

    this._flashTimer = null;
  }

  /**
   * Inject the BehaviorTracker so this player can emit events.
   * @param {import('./tracker.js').BehaviorTracker} tracker
   */
  setTracker(tracker) {
    this.tracker = tracker;
  }

  // ─── Main Update ─────────────────────────────────────────────────────────────

  /**
   * @param {object} keys - { W, A, S, D, SPACE, SHIFT }
   * @param {import('./enemy.js').Enemy} enemy - Reference for attack hit detection
   * @param {number} delta - Frame time ms
   */
  update(keys, enemy, delta) {
    if (!this.alive) return;

    this._tickCooldowns(delta);
    this._handleMovement(keys, delta);
    this._handleDash(delta);
    this._handleAttack(enemy);
    this._drawCooldownBars();
  }

  // ─── Movement ────────────────────────────────────────────────────────────────

  _handleMovement(keys, delta) {
    if (this.isDashing) return; // Dash overrides movement input

    let vx = 0, vy = 0;
    let moving = false;

    if (keys.W.isDown) { vy = -1; moving = true; }
    if (keys.S.isDown) { vy =  1; moving = true; }
    if (keys.A.isDown) { vx = -1; moving = true; }
    if (keys.D.isDown) { vx =  1; moving = true; }

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len; vy /= len;
    }

    this.sprite.setVelocity(vx * this.speed, vy * this.speed);

    if (moving) {
      // Update facing direction (last pressed cardinal wins)
      if (Math.abs(vx) >= Math.abs(vy)) {
        this.facing = vx > 0 ? DIRECTIONS.right : DIRECTIONS.left;
      } else {
        this.facing = vy > 0 ? DIRECTIONS.down : DIRECTIONS.up;
      }
      this._setRotationFromFacing();

      // Emit PLAYER_MOVE
      this._emit('PLAYER_MOVE', { vx, vy });

      // RUSH / RETREAT detection (relative to enemy)
      if (this.tracker && this.scene.enemy) {
        const dx = this.scene.enemy.x - this.sprite.x;
        const dy = this.scene.enemy.y - this.sprite.y;
        const dot = vx * dx + vy * dy;
        if (dot > 0) this._emit('PLAYER_RUSH', {});
        else         this._emit('PLAYER_RETREAT', {});
      }
    } else {
      this.sprite.setVelocity(0, 0);
    }
  }

  _setRotationFromFacing() {
    const rotMap = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
    this.sprite.setRotation(rotMap[this.facing] + Math.PI / 2);
  }

  // ─── Dash ─────────────────────────────────────────────────────────────────────

  _handleDash(delta) {
    if (this._dashPressed) {
      this._dashPressed = false;
      if (this._dashCooldown <= 0 && !this.isDashing) {
        this._startDash();
      }
    }

    if (this.isDashing) {
      this._dashTimer -= delta;

      // Spawn afterimage trail
      if (Math.random() < 0.6) {
        spawnDashTrail(this.scene, this.sprite.x, this.sprite.y, this.sprite.rotation);
      }

      if (this._dashTimer <= 0) {
        this.isDashing = false;
        this.sprite.clearTint();
      }
    }
  }

  _startDash() {
    this.isDashing = true;
    this._dashTimer = PLAYER_CONFIG.dashDuration;
    this._dashCooldown = PLAYER_CONFIG.dashCooldown;

    // Dash in facing direction
    const dirVec = { right: [1,0], left: [-1,0], up: [0,-1], down: [0,1] };
    const [dvx, dvy] = dirVec[this.facing];
    this.sprite.setVelocity(dvx * PLAYER_CONFIG.dashSpeed, dvy * PLAYER_CONFIG.dashSpeed);

    // Visual: bright tint during dash
    this.sprite.setTint(0x88ffff);

    this._emit('PLAYER_DASH', { dir: this.facing });
  }

  // ─── Attack ──────────────────────────────────────────────────────────────────

  _handleAttack(enemy) {
    if (!this._attackPressed) return;
    this._attackPressed = false;
    if (this._attackCooldown > 0 || this.isAttacking) return;
    this._startAttack(enemy);
  }

  _startAttack(enemy) {
    this.isAttacking = true;
    this._attackCooldown = PLAYER_CONFIG.attackCooldown;
    this._attackTimer = PLAYER_CONFIG.attackDuration;

    const dir = this.facing;
    const { x, y } = this.sprite;

    // Show slash effect
    spawnAttackSlash(this.scene, x, y, dir);

    // Emit generic + directional attack events
    this._emit('PLAYER_ATTACK', { dir });
    this._emit(`PLAYER_ATTACK_${dir.toUpperCase()}`, {});

    // ── Hit detection ─────────────────────────────────────────────
    const hit = this._checkAttackHit(enemy, dir);

    if (hit) {
      enemy.takeDamage(PLAYER_CONFIG.attackDamage);
      spawnHitSpark(this.scene, enemy.x, enemy.y, 0x00e5ff);
      spawnDamageNumber(this.scene, enemy.x, enemy.y - 10, PLAYER_CONFIG.attackDamage, '#00e5ff');
      this._emit('PLAYER_HIT', { dir, damage: PLAYER_CONFIG.attackDamage });
    } else {
      spawnMissEffect(this.scene, x, y, dir);
      this._emit('PLAYER_MISS', { dir });
    }

    // End attack state after duration
    this.scene.time.delayedCall(PLAYER_CONFIG.attackDuration, () => {
      this.isAttacking = false;
    });
  }

  /**
   * Check if the enemy falls within the attack cone in the given direction.
   * @param {import('./enemy.js').Enemy} enemy
   * @param {string} dir
   * @returns {boolean}
   */
  _checkAttackHit(enemy, dir) {
    if (!enemy || !enemy.alive) return false;

    const dx = enemy.x - this.sprite.x;
    const dy = enemy.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > PLAYER_CONFIG.attackRange) return false;

    // Directional cone check — enemy must be within ±70° of attack direction
    const dirVec = { right: [1,0], left: [-1,0], up: [0,-1], down: [0,1] };
    const [ax, ay] = dirVec[dir];
    const dot = (dx / dist) * ax + (dy / dist) * ay;

    return dot > 0.34; // cos(70°) ≈ 0.34
  }

  // ─── Damage & Death ──────────────────────────────────────────────────────────

  /**
   * Apply damage to the player (respects invincibility frames).
   * @param {number} amount
   */
  takeDamage(amount) {
    if (this.isInvincible || !this.alive) return;

    this.health = Math.max(0, this.health - amount);
    this.isInvincible = true;

    this.sprite.setTint(0xff3d71);
    spawnDamageNumber(this.scene, this.sprite.x, this.sprite.y - 20, amount, '#ff3d71');

    this._flashTimer = this.scene.time.delayedCall(PLAYER_CONFIG.invincibleDuration, () => {
      if (this.sprite?.active) this.sprite.clearTint();
      this.isInvincible = false;
    });

    this._emit('PLAYER_HIT', { amount });

    if (this.health <= 0) this.die();
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  die() {
    this.alive = false;
    this.sprite.setTint(0x334455);
    this.sprite.setVelocity(0, 0);
    this.sprite.setAlpha(0.5);
    this._cdGfx.clear();
    this.scene.cameras.main.shake(400, 0.025);
  }

  // ─── Cooldown Ticking ────────────────────────────────────────────────────────

  _tickCooldowns(delta) {
    if (this._attackCooldown > 0) this._attackCooldown -= delta;
    if (this._dashCooldown > 0)   this._dashCooldown -= delta;
  }

  // ─── Cooldown Bar (small indicators above player sprite) ─────────────────────

  _drawCooldownBars() {
    this._cdGfx.clear();
    if (!this.alive) return;

    const px = this.sprite.x;
    const py = this.sprite.y - 28;
    const W = 34;
    const H = 3;

    // Attack cooldown (cyan)
    const atkFrac = Math.max(0, 1 - this._attackCooldown / PLAYER_CONFIG.attackCooldown);
    this._cdGfx.fillStyle(0x003344, 0.7);
    this._cdGfx.fillRect(px - W / 2, py, W, H);
    this._cdGfx.fillStyle(0x00e5ff, 0.9);
    this._cdGfx.fillRect(px - W / 2, py, W * atkFrac, H);

    // Dash cooldown (yellow, below attack bar)
    const dshFrac = Math.max(0, 1 - this._dashCooldown / PLAYER_CONFIG.dashCooldown);
    this._cdGfx.fillStyle(0x332200, 0.7);
    this._cdGfx.fillRect(px - W / 2, py + H + 2, W, H);
    this._cdGfx.fillStyle(0xffaa00, 0.9);
    this._cdGfx.fillRect(px - W / 2, py + H + 2, W * dshFrac, H);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Emit an event to the BehaviorTracker */
  _emit(eventType, data = {}) {
    if (this.tracker) {
      this.tracker.recordEvent(eventType, {
        x: this.sprite.x,
        y: this.sprite.y,
        hp: this.health,
        ...data,
      });
    }
  }

  get healthFraction() { return this.health / this.maxHealth; }
  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  destroy() {
    if (this._flashTimer) this._flashTimer.remove();
    this._cdGfx.destroy();
    this.sprite.destroy();
  }
}
