/**
 * enemy.js — Enemy Class (Stage 2: Combat System)
 *
 * Stage 2 improvements:
 *   - HP reduced to 100 (was 150)
 *   - Damage set to 15 per hit
 *   - Clear attack range with visual windup
 *   - Knockback on player hit
 *   - Visible attack flash / telegraph
 *   - Can be defeated by player attacks
 *   - Strategy hook preserved for future Adaptive AI (Stage 3+)
 *
 * Future stages will:
 *   - Accept strategy objects from adaptiveAI.js
 *   - Read behavior profiles from memory.js
 *   - Change movement/attack patterns based on analyzer.js output
 */

import {
  spawnHitSpark,
  spawnEnemyHitReaction,
  spawnDamageNumber,
} from './effects.js';

// ─── Config ────────────────────────────────────────────────────────────────────

export const ENEMY_CONFIG = {
  speed: 95,
  maxHealth: 100,
  size: 18,
  color: 0xff3d71,
  attackDamage: 15,
  attackCooldown: 1100, // ms between attacks
  attackRange: 48,      // pixels — contact range
  windupDuration: 280,  // ms of telegraph before attack resolves
  knockbackForce: 180,  // px/s applied to player on hit
};

// ─── Enemy Class ──────────────────────────────────────────────────────────────

export class Enemy {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = ENEMY_CONFIG.maxHealth;
    this.maxHealth = ENEMY_CONFIG.maxHealth;
    this.speed = ENEMY_CONFIG.speed;
    this.alive = true;

    this._attackCooldown = 0; // ms remaining before next attack
    this._isWindingUp = false; // telegraphing an attack
    this._windupTimer = 0;
    this._recoveryTimer = 0;  // post-attack recovery period

    // Intelligent movement state
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeTimer = 1500 + Math.random() * 1500;
    this.dodgeCooldown = 0;
    this.isDodging = false;
    this.dodgeTimer = 0;

    // Strategy interface — populated by Adaptive AI
    this.strategy = null;

    // ── Build sprite texture ──────────────────────────────────────
    const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
    const s = ENEMY_CONFIG.size;

    // Outer glow ring
    gfx.lineStyle(3, 0xaa0033, 0.8);
    gfx.strokeCircle(s, s, s - 1);

    // Body
    gfx.fillStyle(ENEMY_CONFIG.color, 1);
    gfx.fillCircle(s, s, s - 4);

    // Inner rings (threat pattern)
    gfx.lineStyle(1, 0xff7777, 0.5);
    gfx.strokeCircle(s, s, s / 2);

    // Core
    gfx.fillStyle(0xffffff, 0.5);
    gfx.fillCircle(s, s, 4);

    gfx.generateTexture('enemy_tex', s * 2, s * 2);
    gfx.destroy();

    this.sprite = scene.physics.add.sprite(x, y, 'enemy_tex');
    this.sprite.setDepth(9);
    this.sprite.setCollideWorldBounds(true);

    // Attack range indicator (faint circle, visible during windup)
    this._rangeGfx = scene.add.graphics().setDepth(5).setAlpha(0);
    this._rangeGfx.lineStyle(1.5, 0xff3d71, 0.5);
    this._rangeGfx.strokeCircle(0, 0, ENEMY_CONFIG.attackRange);
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  /**
   * Called each frame from GameScene.update().
   * @param {import('./player.js').Player} player
   * @param {number} delta - ms
   */
  update(player, delta) {
    if (!this.alive) {
      this.sprite.setVelocity(0, 0);
      this._rangeGfx.setAlpha(0);
      return;
    }

    // Position range indicator
    this._rangeGfx.setPosition(this.sprite.x, this.sprite.y);

    if (!player || !player.alive) {
      this.sprite.setVelocity(0, 0);
      return;
    }

    // Tick timers
    if (this._attackCooldown > 0) this._attackCooldown -= delta;
    if (this.dodgeCooldown > 0)  this.dodgeCooldown -= delta;
    if (this._recoveryTimer > 0) this._recoveryTimer -= delta;

    // Strafe direction switching timer
    this.strafeTimer -= delta;
    if (this.strafeTimer <= 0) {
      this.strafeDir *= -1;
      this.strafeTimer = 1500 + Math.random() * 2000;
    }

    // Check player attacks for reactive dodging
    this._checkReactiveDodge(player);

    // ── Dodge phase ──────────────────────────────────────────────
    if (this.isDodging) {
      this.dodgeTimer -= delta;
      if (this.dodgeTimer <= 0) {
        this.isDodging = false;
        this.sprite.clearTint();
      }
      return; // Dodge velocity handles movement
    }

    // ── Windup (telegraph) phase ──────────────────────────────────
    if (this._isWindingUp) {
      this.sprite.setVelocity(0, 0); // Freeze during windup
      this._windupTimer -= delta;

      if (this._windupTimer <= 0) {
        this._isWindingUp = false;
        const dx = player.x - this.sprite.x;
        const dy = player.y - this.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this._executeAttack(player, dist);
      }
      return;
    }

    // ── Post-attack recovery pause ──────────────────────────────
    if (this._recoveryTimer > 0) {
      // Slow step back during recovery
      const dx = this.sprite.x - player.x;
      const dy = this.sprite.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      this.sprite.setVelocity((dx / dist) * 35, (dy / dist) * 35);
      return;
    }

    // Calculate distance & angle to player
    const dx = player.x - this.sprite.x;
    const dy = player.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angleToPlayer = Math.atan2(dy, dx);
    this.sprite.setRotation(angleToPlayer + Math.PI / 2);

    // ── Combat Movement & Attack Decision ─────────────────────────
    if (dist <= ENEMY_CONFIG.attackRange + 4 && this._attackCooldown <= 0) {
      this._beginWindup();
    } else {
      this._handleCombatMovement(player, dx, dy, dist, angleToPlayer);
    }
  }

  // ─── Reactive Dodging ────────────────────────────────────────────────────────

  _checkReactiveDodge(player) {
    if (this.isDodging || this.dodgeCooldown > 0 || this._isWindingUp || !player.isAttacking) return;

    const dx = this.sprite.x - player.x;
    const dy = this.sprite.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 130) return; // Only dodge if player is within threat distance

    // Check if player aim angle is pointing toward enemy
    const playerAim = player.aimAngle || 0;
    const angleToEnemy = Math.atan2(dy, dx);
    let diff = Math.abs(Phaser.Math.Angle.Normalize(angleToEnemy - playerAim));
    if (diff > Math.PI) diff = Math.PI * 2 - diff;

    if (diff < 0.8) {
      // Determine dodge chance based on round / strategy
      const round = this.scene.round || 1;
      let dodgeChance = 0.15 + round * 0.15; // R1: 0.30, R2: 0.45, R3: 0.60
      if (this.strategy?.name === 'ANTI_RUSH' || this.strategy?.name === 'ANTI_DASH') {
        dodgeChance += 0.15;
      }

      if (Math.random() < dodgeChance) {
        this._executeDodge(playerAim);
      } else {
        this.dodgeCooldown = 800; // Cooldown before checking dodge again
      }
    }
  }

  _executeDodge(playerAimAngle) {
    this.isDodging = true;
    this.dodgeTimer = 180; // ms
    this.dodgeCooldown = 2200; // ms cooldown

    // Perpendicular dodge direction (sidestep)
    const perpAngle = playerAimAngle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    const dodgeSpeed = this.speed * 2.4;
    this.sprite.setVelocity(Math.cos(perpAngle) * dodgeSpeed, Math.sin(perpAngle) * dodgeSpeed);

    // Visual cue for dodge
    this.sprite.setTint(0x00ffff);
  }

  // ─── Intelligent Combat Movement ─────────────────────────────────────────────

  _handleCombatMovement(player, dx, dy, dist, angleToPlayer) {
    let moveAngle = angleToPlayer;

    const round = this.scene.round || 1;
    const isStationary = this.strategy?.name === 'ANTI_STATIONARY' ||
      (player.tracker && player.tracker.movement?.stationaryStreak > 2.0);

    // Directional Protection adjustment
    if (this.strategy?.name === 'PROTECT_LEFT') {
      // Move to player's right side
      moveAngle = angleToPlayer + Math.PI / 4;
    } else if (this.strategy?.name === 'PROTECT_RIGHT') {
      // Move to player's left side
      moveAngle = angleToPlayer - Math.PI / 4;
    }

    if (isStationary) {
      // Anti-stationary: circle around behind player's aim cone before lunging
      const aimAngle = player.aimAngle || 0;
      const behindAngle = aimAngle + Math.PI;
      const angleFromPlayer = Math.atan2(-dy, -dx);
      let angleDiff = Math.abs(Phaser.Math.Angle.Normalize(angleFromPlayer - behindAngle));
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

      if (angleDiff > 0.5) {
        // Circle around player
        moveAngle = angleToPlayer + (this.strafeDir * Math.PI / 2.2);
      } else {
        // In position behind player — aggressive lunge!
        moveAngle = angleToPlayer;
      }
    } else if (dist > 170) {
      // APPROACH state: close in with slight diagonal curve
      moveAngle = angleToPlayer + (this.strafeDir * 0.25);
    } else if (dist > ENEMY_CONFIG.attackRange + 10) {
      // STRAFE state: blend approach with lateral movement
      const strafeWeight = (round >= 2) ? 0.75 : 0.45;
      const tangentAngle = angleToPlayer + (this.strafeDir * Math.PI / 2);
      moveAngle = angleToPlayer * (1 - strafeWeight) + tangentAngle * strafeWeight;
    }

    const vx = Math.cos(moveAngle) * this.speed;
    const vy = Math.sin(moveAngle) * this.speed;
    this.sprite.setVelocity(vx, vy);

    // Range indicator pulsing when waiting
    if (this._attackCooldown > 0) {
      const pulse = 0.1 + 0.1 * Math.sin(Date.now() * 0.008);
      this._rangeGfx.setAlpha(pulse);
    } else {
      this._rangeGfx.setAlpha(0);
    }
  }

  // ─── Attack Lifecycle ────────────────────────────────────────────────────────

  _beginWindup() {
    this._isWindingUp = true;
    this._windupTimer = ENEMY_CONFIG.windupDuration;
    this._attackCooldown = ENEMY_CONFIG.attackCooldown;

    // Telegraph: flash orange ring at attack range & bright tint
    this._rangeGfx.setAlpha(0.85);
    this.sprite.setTint(0xff6600);

    this.scene.tweens.add({
      targets: this._rangeGfx,
      alpha: 0,
      duration: ENEMY_CONFIG.windupDuration,
    });
  }

  _executeAttack(player, dist) {
    this.sprite.clearTint();
    this._recoveryTimer = 400; // 400ms recovery window after attacking

    // Re-measure distance after windup
    const dx2 = player.x - this.sprite.x;
    const dy2 = player.y - this.sprite.y;
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    if (dist2 <= ENEMY_CONFIG.attackRange * 1.25) {
      // Deal damage
      player.takeDamage(ENEMY_CONFIG.attackDamage);

      // Apply knockback to player
      if (player.sprite?.body) {
        const nx = dx2 / Math.max(dist2, 1);
        const ny = dy2 / Math.max(dist2, 1);
        player.sprite.body.velocity.x += nx * ENEMY_CONFIG.knockbackForce;
        player.sprite.body.velocity.y += ny * ENEMY_CONFIG.knockbackForce;
      }

      // Attack flash on enemy
      this.sprite.setTint(0xffaa00);
      this.scene.time.delayedCall(150, () => {
        if (this.sprite?.active && !this.isDodging) this.sprite.clearTint();
      });

      // Hit spark at player
      spawnHitSpark(this.scene, player.x, player.y, 0xff3d71);
    }
  }

  // ─── Damage / Death ──────────────────────────────────────────────────────────

  /**
   * @param {number} amount
   */
  takeDamage(amount) {
    if (!this.alive) return;

    this.health = Math.max(0, this.health - amount);

    // Hit reaction effects
    spawnEnemyHitReaction(this.scene, this.sprite.x, this.sprite.y);

    // Brief white flash
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(120, () => {
      if (this.sprite?.active && this.alive && !this.isDodging) this.sprite.clearTint();
    });

    // Brief knockback away from player
    if (this.scene.player?.sprite?.body) {
      const pdx = this.sprite.x - this.scene.player.x;
      const pdy = this.sprite.y - this.scene.player.y;
      const pd = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
      this.sprite.body.velocity.x += (pdx / pd) * 120;
      this.sprite.body.velocity.y += (pdy / pd) * 120;
    }

    if (this.health <= 0) this.die();
  }

  get healthFraction() { return this.health / this.maxHealth; }
  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  die() {
    this.alive = false;
    this._isWindingUp = false;
    this.sprite.setTint(0x880000);
    this.sprite.setVelocity(0, 0);
    this.sprite.setAlpha(0.55);
    this._rangeGfx.setAlpha(0);

    // Death flash
    this.scene.cameras.main.flash(350, 255, 80, 0, false, null, null, 0.25);
    this.scene.cameras.main.shake(250, 0.015);
  }

  destroy() {
    this._rangeGfx.destroy();
    this.sprite.destroy();
  }

  // ─── Strategy Hook ──────────────────────────────────────────────────────────

  /**
   * Assign a strategy object from adaptiveAI.js
   * @param {object} strategyObj
   */
  applyStrategy(strategyObj) {
    this.strategy = strategyObj;
    if (strategyObj.speedMultiplier) {
      this.speed = ENEMY_CONFIG.speed * strategyObj.speedMultiplier;
    }
    // Visual cue for current strategy
    const tintMap = {
      PROTECT_LEFT: 0x3333ff,
      PROTECT_RIGHT: 0xff33ff,
      ANTI_RUSH: 0x00ff00,
      ANTI_DASH: 0xffff00,
      ANTI_DEFENSIVE: 0xff0000,
      ANTI_STATIONARY: 0xffaa00,
    };
    const tint = tintMap[strategyObj.name] || 0xffffff;
    this.sprite.setTint(tint);
  }
}
