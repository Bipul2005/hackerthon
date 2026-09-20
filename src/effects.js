/**
 * effects.js — Combat Visual Effects
 *
 * Provides lightweight, shape-based visual feedback for all combat events.
 * No external assets required — all effects use Phaser Graphics primitives.
 *
 * Effects provided:
 *   spawnAttackSlash()  — Directional slash arc shown when player attacks
 *   spawnHitSpark()     — Burst of particles at hit point
 *   spawnMissEffect()   — Subtle whiff indicator
 *   spawnDashTrail()    — Ghost afterimage during dash
 *   spawnEnemyReaction()— Visual knockback flash on enemy hit
 */

// Direction vectors for attack slash positioning
const DIR_OFFSETS = {
  right: { ox: 40, oy: 0,  angle: 0 },
  left:  { ox: -40, oy: 0, angle: Math.PI },
  down:  { ox: 0, oy: 40,  angle: Math.PI / 2 },
  up:    { ox: 0, oy: -40, angle: -Math.PI / 2 },
};

/**
 * Show a slash effect in the player's attack direction.
 * @param {Phaser.Scene} scene
 * @param {number} x - Origin X (player center)
 * @param {number} y - Origin Y
 * @param {string} dir - 'left' | 'right' | 'up' | 'down'
 */
export function spawnAttackSlash(scene, x, y, dir) {
  const { ox, oy, angle } = DIR_OFFSETS[dir] || DIR_OFFSETS.right;
  const cx = x + ox;
  const cy = y + oy;

  const gfx = scene.add.graphics();
  gfx.setDepth(50);

  // Outer arc glow
  gfx.lineStyle(4, 0x00e5ff, 0.9);
  gfx.beginPath();
  gfx.arc(0, 0, 36, -0.9, 0.9);
  gfx.strokePath();

  // Inner arc
  gfx.lineStyle(2, 0xffffff, 0.6);
  gfx.beginPath();
  gfx.arc(0, 0, 28, -0.7, 0.7);
  gfx.strokePath();

  // Center flash
  gfx.fillStyle(0x00e5ff, 0.5);
  gfx.fillCircle(0, 0, 6);

  gfx.setPosition(cx, cy);
  gfx.setRotation(angle);

  // Fade + scale out
  scene.tweens.add({
    targets: gfx,
    alpha: 0,
    scaleX: 1.4,
    scaleY: 1.4,
    duration: 180,
    ease: 'Quad.Out',
    onComplete: () => gfx.destroy(),
  });
}

/**
 * Show a hit spark burst at the impact point.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} [color=0xffaa00] - Spark color
 */
export function spawnHitSpark(scene, x, y, color = 0xffaa00) {
  const NUM_PARTICLES = 8;
  const SPEED = 90;

  for (let i = 0; i < NUM_PARTICLES; i++) {
    const angle = (i / NUM_PARTICLES) * Math.PI * 2;
    const gfx = scene.add.graphics();
    gfx.setDepth(55);
    gfx.fillStyle(color, 1);
    gfx.fillCircle(0, 0, Phaser.Math.Between(2, 4));
    gfx.setPosition(x, y);

    const vx = Math.cos(angle) * SPEED * (0.6 + Math.random() * 0.8);
    const vy = Math.sin(angle) * SPEED * (0.6 + Math.random() * 0.8);

    scene.tweens.add({
      targets: gfx,
      x: x + vx * 0.25,
      y: y + vy * 0.25,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: Phaser.Math.Between(150, 280),
      ease: 'Quad.Out',
      onComplete: () => gfx.destroy(),
    });
  }

  // Ring flash
  const ring = scene.add.graphics();
  ring.setDepth(54);
  ring.lineStyle(3, color, 0.8);
  ring.strokeCircle(0, 0, 10);
  ring.setPosition(x, y);
  scene.tweens.add({
    targets: ring,
    scaleX: 2.5,
    scaleY: 2.5,
    alpha: 0,
    duration: 220,
    ease: 'Quad.Out',
    onComplete: () => ring.destroy(),
  });
}

/**
 * Show a subtle "miss" whiff effect.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {string} dir
 */
export function spawnMissEffect(scene, x, y, dir) {
  const { ox, oy } = DIR_OFFSETS[dir] || DIR_OFFSETS.right;
  const gfx = scene.add.graphics();
  gfx.setDepth(48);
  gfx.lineStyle(2, 0x334466, 0.7);
  gfx.lineBetween(-12, -4, 12, 4);
  gfx.lineBetween(-12, 4, 12, -4);
  gfx.setPosition(x + ox * 0.7, y + oy * 0.7);

  scene.tweens.add({
    targets: gfx,
    alpha: 0,
    y: gfx.y - 15,
    duration: 350,
    ease: 'Quad.Out',
    onComplete: () => gfx.destroy(),
  });
}

/**
 * Spawn a ghost afterimage at the player's current position during dash.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} rotation
 */
export function spawnDashTrail(scene, x, y, rotation) {
  const gfx = scene.add.graphics();
  gfx.setDepth(8);
  gfx.fillStyle(0x00e5ff, 0.35);
  gfx.fillRect(-20, -20, 40, 40);
  gfx.setPosition(x, y);
  gfx.setRotation(rotation);

  scene.tweens.add({
    targets: gfx,
    alpha: 0,
    scaleX: 0.6,
    scaleY: 0.6,
    duration: 200,
    ease: 'Linear',
    onComplete: () => gfx.destroy(),
  });
}

/**
 * Flash the enemy sprite on hit — brief white outline pop.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 */
export function spawnEnemyHitReaction(scene, x, y) {
  const gfx = scene.add.graphics();
  gfx.setDepth(60);
  gfx.lineStyle(3, 0xffffff, 1);
  gfx.strokeCircle(0, 0, 22);
  gfx.setPosition(x, y);

  scene.tweens.add({
    targets: gfx,
    scaleX: 1.8,
    scaleY: 1.8,
    alpha: 0,
    duration: 200,
    ease: 'Quad.Out',
    onComplete: () => gfx.destroy(),
  });
}

/**
 * Floating damage number at hit location.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} amount
 * @param {number} [color=0xffffff]
 */
export function spawnDamageNumber(scene, x, y, amount, color = '#ffffff') {
  const text = scene.add.text(x, y, `-${amount}`, {
    fontFamily: 'Orbitron, monospace',
    fontSize: '16px',
    color,
    stroke: '#000000',
    strokeThickness: 4,
  }).setOrigin(0.5).setDepth(70);

  scene.tweens.add({
    targets: text,
    y: y - 40,
    alpha: 0,
    duration: 700,
    ease: 'Quad.Out',
    onComplete: () => text.destroy(),
  });
}
