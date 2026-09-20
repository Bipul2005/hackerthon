/**
 * enemy.js — Enemy Class
 *
 * Stage 1: Basic enemy that moves toward the player and deals contact damage.
 * Architecture is designed to be extended in later stages by the Adaptive AI system.
 *
 * Future stages will:
 *   - Accept strategy objects from adaptiveAI.js
 *   - Read behavior profiles from memory.js
 *   - Change movement/attack patterns based on analyzer.js output
 */

export const ENEMY_CONFIG = {
  speed: 90,
  maxHealth: 150,
  size: 18,
  color: 0xff3d71,      // red/pink
  attackDamage: 10,
  attackCooldown: 800,  // ms between attacks
  attackRange: 40,      // pixels — contact range
};

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
    this._attackTimer = 0;

    // Strategy interface (populated by Adaptive AI in future stages)
    this.strategy = null;

    // --- Generate enemy texture ---
    const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
    const s = ENEMY_CONFIG.size;

    // Outer glow ring
    gfx.lineStyle(2, 0xff7700, 0.6);
    gfx.strokeCircle(s, s, s - 1);

    // Body (hexagon approximation via circle)
    gfx.fillStyle(ENEMY_CONFIG.color, 1);
    gfx.fillCircle(s, s, s - 3);

    // Inner core
    gfx.fillStyle(0xffffff, 0.4);
    gfx.fillCircle(s, s, 5);

    gfx.generateTexture('enemy_tex', s * 2, s * 2);
    gfx.destroy();

    this.sprite = scene.physics.add.sprite(x, y, 'enemy_tex');
    this.sprite.setDepth(9);
    this.sprite.setCollideWorldBounds(true);
  }

  /**
   * Update enemy behavior each frame.
   * In Stage 1 this is simple "chase player" logic.
   * Future stages will delegate to strategy objects from adaptiveAI.js.
   *
   * @param {import('./player.js').Player} player
   * @param {number} delta - Frame delta time in ms
   */
  update(player, delta) {
    if (!this.alive || !player.alive) {
      this.sprite.setVelocity(0, 0);
      return;
    }

    // --- Movement: chase the player ---
    const dx = player.x - this.sprite.x;
    const dy = player.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.sprite.setVelocity(nx * this.speed, ny * this.speed);

      // Rotate toward player
      const angle = Math.atan2(dy, dx) + Math.PI / 2;
      this.sprite.setRotation(angle);
    } else {
      this.sprite.setVelocity(0, 0);
    }

    // --- Attack: deal damage when close enough ---
    this._attackTimer -= delta;
    if (dist <= ENEMY_CONFIG.attackRange && this._attackTimer <= 0) {
      player.takeDamage(ENEMY_CONFIG.attackDamage);
      this._attackTimer = ENEMY_CONFIG.attackCooldown;

      // Attack flash
      this.sprite.setTint(0xffaa00);
      this.scene.time.delayedCall(150, () => {
        if (this.sprite && this.sprite.active) this.sprite.clearTint();
      });
    }
  }

  /**
   * Apply damage to the enemy.
   * @param {number} amount
   */
  takeDamage(amount) {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite && this.sprite.active) this.sprite.clearTint();
    });
    if (this.health <= 0) this.die();
  }

  get healthFraction() {
    return this.health / this.maxHealth;
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  die() {
    this.alive = false;
    this.sprite.setTint(0x880000); // visible dark red corpse
    this.sprite.setVelocity(0, 0);
    this.sprite.setAlpha(0.6);
    this.scene.cameras.main.flash(300, 255, 60, 0, false, null, null, 0.3);
  }

  destroy() {
    this.sprite.destroy();
  }

  // -------------------------------------------------------
  // FUTURE AI HOOK — Stage 2+
  // -------------------------------------------------------
  /**
   * Assign a strategy object from adaptiveAI.js.
   * The strategy object can override speed, attackPattern, movement, etc.
   * @param {object} strategyObj
   */
  applyStrategy(strategyObj) {
    // TODO (Stage 2): implement adaptive strategy application
    this.strategy = strategyObj;
  }
}
