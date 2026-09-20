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

    // Facing direction & Mouse aiming
    this.facing = DIRECTIONS.right;
    this.aimAngle = 0;
    this._moveVX = 0;
    this._moveVY = 0;

    // Previous position for RUSH/RETREAT detection
    this._prevX = x;
    this._prevY = y;

    // Reference to tracker (injected from GameScene)
    this.tracker = null;

    // Dash input flag — set by keydown listener in GameScene
    this._dashPressed = false;
    // Attack input flag
    this._attackPressed = false;

    // ── Build futuristic humanoid sprite ───────────────────────
    const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
    const s = PLAYER_CONFIG.size; // base size (10)

    // Shadow (ellipse) – will be a separate sprite later
    // Draw player body (torso)
    gfx.fillStyle(0x001122, 1); // dark armor base
    gfx.fillRoundedRect(s - 4, s, 12, 20, 4);

    // Head (circle)
    gfx.fillStyle(0x0044bb, 1); // cyan helmet
    gfx.fillCircle(s + 2, s - 4, 6);

    // Arms (rectangles)
    gfx.fillStyle(0x003344, 1);
    gfx.fillRect(s - 8, s + 2, 4, 12); // left arm
    gfx.fillRect(s + 12, s + 2, 4, 12); // right arm

    // Energy core (small circle on chest)
    gfx.fillStyle(0x00e5ff, 1);
    gfx.fillCircle(s + 2, s + 8, 3);

    // Generate texture
    gfx.generateTexture('player_futuristic', 32, 48);
    gfx.destroy();

    // Main sprite
    this.sprite = scene.physics.add.sprite(x, y, 'player_futuristic');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
    // Keep original hitbox size
    this.sprite.setSize(PLAYER_CONFIG.size * 2, PLAYER_CONFIG.size * 2);

    // Shadow sprite (simple ellipse)
    const shadowGfx = scene.make.graphics({ x: 0, y: 0, add: false });
    shadowGfx.fillStyle(0x000000, 0.25);
    shadowGfx.fillEllipse(16, 24, 20, 8);
    shadowGfx.generateTexture('player_shadow', 32, 48);
    shadowGfx.destroy();
    this.shadow = scene.add.image(x, y + 4, 'player_shadow');
    this.shadow.setDepth(9);

    // Idle pulse animation (breathing)
    this.scene.tweens.add({
      targets: this.sprite,
      scale: { from: 1, to: 1.02 },
      yoyo: true,
      repeat: -1,
      duration: 1500,
      ease: 'Sine.InOut',
    });

    // ── Cooldown bars & Aim graphics (rendered above player sprite) ──────────────
    this._cdGfx = scene.add.graphics().setDepth(20);
    this._aimGfx = scene.add.graphics().setDepth(15);
    this._crosshairGfx = scene.add.graphics().setDepth(16);

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
    this._handleAiming();
    this._handleMovement(keys, delta);
    this._handleDash(delta);
    this._handleAttack(enemy);
    this._drawCooldownBars();
  }

  // ─── Mouse Aiming ────────────────────────────────────────────────────────────

  _handleAiming() {
    const pointer = this.scene.input.activePointer;
    const px = this.sprite.x;
    const py = this.sprite.y;
    const mx = pointer.worldX;
    const my = pointer.worldY;

    // Angle from player to pointer
    this.aimAngle = Math.atan2(my - py, mx - px);

    // Rotate player sprite toward mouse cursor
    this.sprite.setRotation(this.aimAngle + Math.PI / 2);

    // Map aim angle to cardinal direction quadrant for tracker & facing compatibility
    const deg = (this.aimAngle * 180) / Math.PI;
    if (deg >= -45 && deg < 45) {
      this.facing = DIRECTIONS.right;
    } else if (deg >= 45 && deg < 135) {
      this.facing = DIRECTIONS.down;
    } else if (deg >= -135 && deg < -45) {
      this.facing = DIRECTIONS.up;
    } else {
      this.facing = DIRECTIONS.left;
    }

    this._drawAimIndicator(px, py, mx, my);
  }

  _drawAimIndicator(px, py, mx, my) {
    this._aimGfx.clear();
    this._crosshairGfx.clear();

    if (!this.alive) return;

    // Aim Line extending toward mouse
    const lineLen = 45;
    const endX = px + Math.cos(this.aimAngle) * lineLen;
    const endY = py + Math.sin(this.aimAngle) * lineLen;

    this._aimGfx.lineStyle(1.5, 0x00e5ff, 0.45);
    this._aimGfx.lineBetween(px, py, endX, endY);

    // Aim Arc / Attack Range Cone
    this._aimGfx.lineStyle(1, 0x00e5ff, 0.2);
    this._aimGfx.beginPath();
    this._aimGfx.arc(px, py, PLAYER_CONFIG.attackRange, this.aimAngle - 0.55, this.aimAngle + 0.55);
    this._aimGfx.strokePath();

    // Futuristic Crosshair at mouse pointer
    const ch = 8;
    this._crosshairGfx.lineStyle(1.5, 0x00e5ff, 0.85);
    this._crosshairGfx.strokeCircle(mx, my, 7);
    this._crosshairGfx.lineBetween(mx - ch, my, mx - 3, my);
    this._crosshairGfx.lineBetween(mx + 3, my, mx + ch, my);
    this._crosshairGfx.lineBetween(mx, my - ch, mx, my - 3);
    this._crosshairGfx.lineBetween(mx, my + 3, mx, my + ch);
    this._crosshairGfx.fillStyle(0x00e5ff, 0.9);
    this._crosshairGfx.fillCircle(mx, my, 1.5);
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

    this._moveVX = vx;
    this._moveVY = vy;

    this.sprite.setVelocity(vx * this.speed, vy * this.speed);

    if (moving) {
      // RUSH / RETREAT detection (relative to enemy)
      if (this.tracker && this.scene.enemy) {
        const dx = this.scene.enemy.x - this.sprite.x;
        const dy = this.scene.enemy.y - this.sprite.y;
        const dot = vx * dx + vy * dy;
        if (dot > 0) this.tracker.recordRush();
        else         this.tracker.recordRetreat();
      }
    }
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

    // Dash in movement direction if WASD is pressed, otherwise in mouse aim direction
    let dvx = Math.cos(this.aimAngle);
    let dvy = Math.sin(this.aimAngle);
    if (this._moveVX !== 0 || this._moveVY !== 0) {
      dvx = this._moveVX;
      dvy = this._moveVY;
    }
    this.sprite.setVelocity(dvx * PLAYER_CONFIG.dashSpeed, dvy * PLAYER_CONFIG.dashSpeed);

    // Visual: bright tint during dash
    this.sprite.setTint(0x88ffff);

    if (this.tracker) {
      this.tracker.recordDash();
    }
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

    const { x, y } = this.sprite;

    // Show slash effect toward aimAngle
    spawnAttackSlash(this.scene, x, y, this.aimAngle);

    // Emit attack event to tracker using mapped cardinal direction
    if (this.tracker) {
      this.tracker.recordAttack(this.facing);
    }

    // ── Hit detection ─────────────────────────────────────────────
    const hit = this._checkAttackHit(enemy, this.aimAngle);

    if (hit) {
      enemy.takeDamage(PLAYER_CONFIG.attackDamage);
      spawnHitSpark(this.scene, enemy.x, enemy.y, 0x00e5ff);
      spawnDamageNumber(this.scene, enemy.x, enemy.y - 10, PLAYER_CONFIG.attackDamage, '#00e5ff');
      
      if (this.tracker) {
        this.tracker.recordHit();
        this.tracker.recordDamageDealt(PLAYER_CONFIG.attackDamage);
      }
    } else {
      spawnMissEffect(this.scene, x, y, this.facing);
      if (this.tracker) {
        this.tracker.recordMiss();
      }
    }

    // End attack state after duration
    this.scene.time.delayedCall(PLAYER_CONFIG.attackDuration, () => {
      this.isAttacking = false;
    });
  }

  /**
   * Check if the enemy falls within the attack cone of aimAngle.
   * @param {import('./enemy.js').Enemy} enemy
   * @param {number} aimAngle - angle in radians
   * @returns {boolean}
   */
  _checkAttackHit(enemy, aimAngle) {
    if (!enemy || !enemy.alive) return false;

    const dx = enemy.x - this.sprite.x;
    const dy = enemy.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > PLAYER_CONFIG.attackRange) return false;

    // Angle to enemy
    const enemyAngle = Math.atan2(dy, dx);
    let diff = Math.abs(Phaser.Math.Angle.Normalize(enemyAngle - aimAngle));
    if (diff > Math.PI) diff = Math.PI * 2 - diff;

    return diff <= 1.1; // ~63 degree angle cone
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

    if (this.tracker) {
      this.tracker.recordDamageReceived(amount);
    }

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
    this._aimGfx.clear();
    this._crosshairGfx.clear();
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

  get healthFraction() { return this.health / this.maxHealth; }
  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  destroy() {
    if (this._flashTimer) this._flashTimer.remove();
    this._cdGfx.destroy();
    this._aimGfx.destroy();
    this._crosshairGfx.destroy();
    this.sprite.destroy();
  }
}
