/**
 * player.js — Player Class
 *
 * Manages player state, movement (WASD), health, and rendering.
 * The player is a top-down character controlled by keyboard input.
 */

export const PLAYER_CONFIG = {
  speed: 200,
  maxHealth: 100,
  size: 20,        // half-width/height of the rectangle sprite
  color: 0x00e5ff, // cyan
  invincibleDuration: 500, // ms of invincibility after being hit
};

export class Player {
  /**
   * @param {Phaser.Scene} scene - The Phaser scene this player belongs to
   * @param {number} x - Initial X position
   * @param {number} y - Initial Y position
   */
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = PLAYER_CONFIG.maxHealth;
    this.maxHealth = PLAYER_CONFIG.maxHealth;
    this.speed = PLAYER_CONFIG.speed;
    this.isInvincible = false;
    this.alive = true;

    // --- Create physics sprite using a generated texture ---
    const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(PLAYER_CONFIG.color, 1);
    const s = PLAYER_CONFIG.size;
    // Body
    gfx.fillRect(0, 0, s * 2, s * 2);
    // Direction indicator (triangle pointing up)
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillTriangle(s, 2, s - 7, s, s + 7, s);
    gfx.generateTexture('player_tex', s * 2, s * 2);
    gfx.destroy();

    this.sprite = scene.physics.add.sprite(x, y, 'player_tex');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);

    // Glowing tint effect container
    this._flashTimer = null;
  }

  /**
   * Called every frame from the scene's update().
   * @param {Phaser.Types.Input.Keyboard.CursorKeys} cursors - WASD keys object
   */
  update(cursors) {
    if (!this.alive) return;

    const { sprite, speed } = this;
    sprite.setVelocity(0, 0);

    let moving = false;
    let vx = 0;
    let vy = 0;

    if (cursors.W.isDown) { vy = -1; moving = true; }
    if (cursors.S.isDown) { vy = 1;  moving = true; }
    if (cursors.A.isDown) { vx = -1; moving = true; }
    if (cursors.D.isDown) { vx = 1;  moving = true; }

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len;
      vy /= len;
    }

    sprite.setVelocity(vx * speed, vy * speed);

    // Rotate sprite to face movement direction
    if (moving) {
      const angle = Math.atan2(vy, vx) + Math.PI / 2;
      sprite.setRotation(angle);
    }
  }

  /**
   * Apply damage to the player. Respects invincibility frames.
   * @param {number} amount - Damage amount
   */
  takeDamage(amount) {
    if (this.isInvincible || !this.alive) return;

    this.health = Math.max(0, this.health - amount);
    this.isInvincible = true;

    // Flash red when hit
    this.sprite.setTint(0xff3d71);
    this._flashTimer = this.scene.time.delayedCall(PLAYER_CONFIG.invincibleDuration, () => {
      if (this.sprite && this.sprite.active) {
        this.sprite.clearTint();
      }
      this.isInvincible = false;
    });

    if (this.health <= 0) {
      this.die();
    }
  }

  /**
   * Heal the player.
   * @param {number} amount
   */
  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /**
   * Returns health as a fraction [0, 1]
   */
  get healthFraction() {
    return this.health / this.maxHealth;
  }

  /** Returns the sprite's world position */
  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  die() {
    this.alive = false;
    this.sprite.setTint(0x555555);
    this.sprite.setVelocity(0, 0);
    // Death flash
    this.scene.cameras.main.shake(400, 0.02);
  }

  destroy() {
    if (this._flashTimer) this._flashTimer.remove();
    this.sprite.destroy();
  }
}
