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

    // Strategy interface — populated by Adaptive AI in Stage 3+
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
    this._rangeGfx.lineStyle(1, 0xff3d71, 0.3);
    this._rangeGfx.strokeCircle(0, 0, ENEMY_CONFIG.attackRange);
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  /**
   * Called each frame from GameScene.update().
   * Stage 2: chase player + telegraph + execute attack with damage/knockback.
   *
   * Future: delegate to strategy object from adaptiveAI.js
   *
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

    if (!player.alive) {
      this.sprite.setVelocity(0, 0);
      return;
    }

    const dx = player.x - this.sprite.x;
    const dy = player.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // ── Windup (telegraph) phase ──────────────────────────────────
    if (this._isWindingUp) {
      this.sprite.setVelocity(0, 0); // Freeze during windup
      this._windupTimer -= delta;

      if (this._windupTimer <= 0) {
        this._isWindingUp = false;
        this._executeAttack(player, dist);
      }
      return;
    }

    // ── Movement: chase player ────────────────────────────────────
    if (dist > ENEMY_CONFIG.attackRange) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.sprite.setVelocity(nx * this.speed, ny * this.speed);

      const angle = Math.atan2(dy, dx) + Math.PI / 2;
      this.sprite.setRotation(angle);
      this._rangeGfx.setAlpha(0);
    } else {
      // In range — stop and attack if cooldown ready
      this.sprite.setVelocity(0, 0);
      this._attackCooldown -= delta;

      if (this._attackCooldown <= 0) {
        this._beginWindup();
      } else {
        // Pulsing range indicator while waiting on cooldown
        const pulse = 0.1 + 0.1 * Math.sin(Date.now() * 0.006);
        this._rangeGfx.setAlpha(pulse);
      }
    }
  }

  // ─── Attack Lifecycle ────────────────────────────────────────────────────────

  _beginWindup() {
    this._isWindingUp = true;
    this._windupTimer = ENEMY_CONFIG.windupDuration;
    this._attackCooldown = ENEMY_CONFIG.attackCooldown;

    // Telegraph: flash orange ring at attack range
    this._rangeGfx.setAlpha(0.7);
    this.sprite.setTint(0xff7700);

    this.scene.tweens.add({
      targets: this._rangeGfx,
      alpha: 0,
      duration: ENEMY_CONFIG.windupDuration,
    });
  }

  _executeAttack(player, dist) {
    this.sprite.clearTint();

    // Re-measure distance after windup
    const dx2 = player.x - this.sprite.x;
    const dy2 = player.y - this.sprite.y;
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    if (dist2 <= ENEMY_CONFIG.attackRange * 1.2) {
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
        if (this.sprite?.active) this.sprite.clearTint();
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
      if (this.sprite?.active && this.alive) this.sprite.clearTint();
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

  // ─── Future AI Hook ──────────────────────────────────────────────────────────

  /**
   * Assign a strategy object from adaptiveAI.js (Stage 3+).
   * @param {object} strategyObj
   */
  applyStrategy(strategyObj) {
    // TODO (Stage 3): implement adaptive strategy application
    this.strategy = strategyObj;
    if (strategyObj.speedMultiplier) {
      this.speed = ENEMY_CONFIG.speed * strategyObj.speedMultiplier;
    }
  }
}
