/**
 * effects.js — Combat Visual Effects
 *
 * Provides lightweight, shape-based visual feedback for all combat events.
 * No external assets required — all effects use Phaser Graphics primitives.
 *
 * Effects provided:
 *   spawnAttackSlash()      — Directional slash arc shown when player attacks
 *   spawnHitSpark()         — Burst at hit point (1 Graphics object for performance)
 *   spawnMissEffect()       — Subtle whiff indicator
 *   spawnDashTrail()        — Ghost afterimage during dash
 *   spawnEnemyHitReaction() — Visual knockback flash on enemy hit
 *   spawnEnemyProjectile()  — Enemy fires an energy bolt toward the player
 *   spawnProjectileImpact() — Small burst when a projectile hits or expires
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
  let ox = 40, oy = 0, angle = 0;
  if (typeof dir === 'number') {
    angle = dir;
    ox = Math.cos(angle) * 40;
    oy = Math.sin(angle) * 40;
  } else {
    const info = DIR_OFFSETS[dir] || DIR_OFFSETS.right;
    ox = info.ox; oy = info.oy; angle = info.angle;
  }
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
  // PERF: single Graphics object instead of 9 separate ones
  const NUM = 5;
  const SPREAD = 14;
  const gfx = scene.add.graphics();
  gfx.setDepth(55);
  for (let i = 0; i < NUM; i++) {
    const a = (i / NUM) * Math.PI * 2 + Math.random() * 0.4;
    const r = 2 + Math.random() * 2;
    const px = Math.cos(a) * SPREAD * (0.5 + Math.random() * 0.5);
    const py = Math.sin(a) * SPREAD * (0.5 + Math.random() * 0.5);
    gfx.fillStyle(color, 1);
    gfx.fillCircle(px, py, r);
  }
  gfx.lineStyle(2, color, 0.7);
  gfx.strokeCircle(0, 0, 10);
  gfx.setPosition(x, y);
  scene.tweens.add({
    targets: gfx,
    scaleX: 2.0,
    scaleY: 2.0,
    alpha: 0,
    duration: 220,
    ease: 'Quad.Out',
    onComplete: () => gfx.destroy(),
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
  gfx.fillStyle(0x00e5ff, 0.25);
  gfx.fillRoundedRect(-10, -16, 20, 32, 4);
  gfx.setPosition(x, y);
  gfx.setRotation(rotation);

  scene.tweens.add({
    targets: gfx,
    alpha: 0,
    scaleX: 0.5,
    scaleY: 0.5,
    duration: 170,
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

/**
 * Spawn an enemy energy bolt projectile toward the given angle.
 * Returns { sprite, lifetime, damage } so the enemy can track and clean up.
 *
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} angle - radians (caller should add aim error if desired)
 * @param {number} [speed=310]
 * @param {number} [damage=12]
 */
export function spawnEnemyProjectile(scene, x, y, angle, speed = 310, damage = 12) {
  if (!scene.textures.exists('enemy_bolt')) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xff3d71, 0.18);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xff7799, 1);
    g.fillCircle(8, 8, 4);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(8, 8, 1.5);
    g.generateTexture('enemy_bolt', 16, 16);
    g.destroy();
  }

  const bolt = scene.physics.add.sprite(x, y, 'enemy_bolt');
  bolt.setDepth(30);
  bolt.body.allowGravity = false;
  bolt.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  bolt.setRotation(angle);

  const lifetime = scene.time.delayedCall(1800, () => {
    if (bolt?.active) {
      spawnProjectileImpact(scene, bolt.x, bolt.y);
      bolt.destroy();
    }
  });

  return { sprite: bolt, lifetime, damage };
}

/**
 * Small impact burst when a projectile hits or expires.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} [color=0xff3d71]
 */
export function spawnProjectileImpact(scene, x, y, color = 0xff3d71) {
  const gfx = scene.add.graphics();
  gfx.setDepth(58);
  gfx.fillStyle(color, 0.8);
  gfx.fillCircle(0, 0, 5);
  gfx.lineStyle(2, color, 0.5);
  gfx.strokeCircle(0, 0, 10);
  gfx.setPosition(x, y);

  scene.tweens.add({
    targets: gfx,
    scaleX: 2.0,
    scaleY: 2.0,
    alpha: 0,
    duration: 200,
    ease: 'Quad.Out',
    onComplete: () => gfx.destroy(),
  });
}
