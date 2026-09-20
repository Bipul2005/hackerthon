/**
 * game.js — Main Game Scenes
 *
 * Contains two Phaser scenes:
 *   StartScene — Title screen with "Start Game" button
 *   GameScene  — Main combat arena scene
 *
 * The Game Loop:
 *   StartScene → GameScene → (Win/Lose) → StartScene
 */

import Phaser from 'phaser';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { HUD } from './ui.js';
import { BehaviorTracker } from './tracker.js';

// ================================================================
//  START SCENE
// ================================================================

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ---- Background grid ----
    const bg = this.add.graphics();
    bg.lineStyle(1, 0x1a1a3e, 0.6);
    for (let x = 0; x < W; x += 40) bg.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 40) bg.lineBetween(0, y, W, y);

    // ---- Animated scanline overlay ----
    const scanline = this.add.graphics();
    scanline.fillStyle(0x00e5ff, 0.03);
    for (let y = 0; y < H; y += 4) scanline.fillRect(0, y, W, 2);

    // ---- Logo ----
    const logo = this.add.text(W / 2, H * 0.22, 'ADAPT', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '96px',
      color: '#00e5ff',
      stroke: '#003344',
      strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0);

    // Subtitle
    const sub = this.add.text(W / 2, H * 0.37, 'The enemy doesn\'t just get stronger.\nIt learns how you play.', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '16px',
      color: '#7799bb',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setAlpha(0);

    // ---- Feature bullets ----
    const features = [
      '⬡  Adaptive AI Enemy',
      '⬡  Behavior Pattern Recognition',
      '⬡  Dynamic Strategy Switching',
    ];
    const featureTexts = features.map((f, i) =>
      this.add.text(W / 2, H * 0.5 + i * 26, f, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        color: '#556688',
        align: 'center',
      }).setOrigin(0.5).setAlpha(0)
    );

    // ---- Controls info ----
    const controls = this.add.text(W / 2, H * 0.66, 'WASD — Move', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '12px',
      color: '#445566',
    }).setOrigin(0.5).setAlpha(0);

    // ---- Start Button ----
    const btnW = 220, btnH = 52;
    const btnX = W / 2 - btnW / 2;
    const btnY = H * 0.78 - btnH / 2;

    const btnBg = this.add.graphics().setInteractive(
      new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    ).setAlpha(0);

    const btnText = this.add.text(W / 2, H * 0.78, 'START GAME', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '18px',
      color: '#0a0a0f',
    }).setOrigin(0.5).setAlpha(0);

    const drawBtn = (hover = false) => {
      btnBg.clear();
      btnBg.fillStyle(hover ? 0x00ffff : 0x00e5ff, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
      if (hover) {
        btnBg.lineStyle(2, 0xffffff, 0.8);
        btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 6);
      }
    };
    drawBtn();

    btnBg.on('pointerover', () => {
      drawBtn(true);
      this.tweens.add({ targets: btnText, scaleX: 1.05, scaleY: 1.05, duration: 100 });
    });
    btnBg.on('pointerout', () => {
      drawBtn(false);
      this.tweens.add({ targets: btnText, scaleX: 1, scaleY: 1, duration: 100 });
    });
    btnBg.on('pointerdown', () => {
      this.cameras.main.flash(200, 0, 229, 255);
      this.time.delayedCall(300, () => this.scene.start('GameScene', { round: 1 }));
    });

    // ---- Version tag ----
    this.add.text(W - 10, H - 10, 'v0.1.0 — Stage 1', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '10px',
      color: '#334455',
    }).setOrigin(1, 1);

    // ---- Entrance animations ----
    this.tweens.add({ targets: logo, alpha: 1, y: H * 0.22 - 10, duration: 800, ease: 'Cubic.Out', delay: 100 });
    this.tweens.add({ targets: sub, alpha: 1, duration: 700, ease: 'Cubic.Out', delay: 600 });
    featureTexts.forEach((t, i) =>
      this.tweens.add({ targets: t, alpha: 1, duration: 500, delay: 900 + i * 150 })
    );
    this.tweens.add({ targets: controls, alpha: 1, duration: 500, delay: 1400 });
    this.tweens.add({ targets: [btnBg, btnText], alpha: 1, duration: 600, delay: 1600 });

    // Pulse logo
    this.tweens.add({
      targets: logo,
      scaleX: 1.02, scaleY: 1.02,
      yoyo: true, repeat: -1,
      duration: 2000, ease: 'Sine.InOut', delay: 1000,
    });
  }
}

// ================================================================
//  GAME SCENE
// ================================================================

const ARENA_PADDING = 60;
const ARENA_WALL_COLOR = 0x1a1a3e;
const ARENA_FLOOR_COLOR = 0x0d0d1a;

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.round = data?.round || 1;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ---- Build the arena ----
    this._buildArena(W, H);

    // ---- Spawn player (center-left) ----
    this.player = new Player(this, W * 0.28, H / 2);

    // ---- Spawn enemy (center-right) ----
    this.enemy = new Enemy(this, W * 0.72, H / 2);

    // ---- Behavior Tracker (observes player — future use) ----
    this.tracker = new BehaviorTracker(this.player);

    // ---- HUD ----
    this.hud = new HUD(this, this.round);

    // ---- WASD key bindings ----
    this.cursors = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // ---- Game state ----
    this.gameOver = false;
    this.gameWon = false;

    // ---- Round start banner ----
    this.hud.showStatus(`ROUND ${this.round}`, '#ffaa00', 1500);

    // ---- Restart key (R) ----
    this.input.keyboard.on('keydown-R', () => {
      if (this.gameOver || this.gameWon) {
        this.scene.start('StartScene');
      }
    });
  }

  _buildArena(W, H) {
    const gfx = this.add.graphics();

    // Floor
    gfx.fillStyle(ARENA_FLOOR_COLOR, 1);
    gfx.fillRect(0, 0, W, H);

    // Grid overlay
    gfx.lineStyle(1, 0x151530, 1);
    for (let x = 0; x < W; x += 32) gfx.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 32) gfx.lineBetween(0, y, W, y);

    // Outer border
    gfx.lineStyle(3, 0x00e5ff, 0.4);
    gfx.strokeRect(ARENA_PADDING, ARENA_PADDING, W - ARENA_PADDING * 2, H - ARENA_PADDING * 2);

    // Corner accents
    const accentLen = 24;
    const corners = [
      [ARENA_PADDING, ARENA_PADDING],
      [W - ARENA_PADDING, ARENA_PADDING],
      [ARENA_PADDING, H - ARENA_PADDING],
      [W - ARENA_PADDING, H - ARENA_PADDING],
    ];
    gfx.lineStyle(3, 0x00e5ff, 1);
    corners.forEach(([cx, cy]) => {
      const sx = cx === ARENA_PADDING ? 1 : -1;
      const sy = cy === ARENA_PADDING ? 1 : -1;
      gfx.lineBetween(cx, cy, cx + sx * accentLen, cy);
      gfx.lineBetween(cx, cy, cx, cy + sy * accentLen);
    });

    // Center divider (faint)
    gfx.lineStyle(1, 0x00e5ff, 0.08);
    gfx.lineBetween(W / 2, ARENA_PADDING, W / 2, H - ARENA_PADDING);

    // Set world bounds
    this.physics.world.setBounds(
      ARENA_PADDING, ARENA_PADDING,
      W - ARENA_PADDING * 2, H - ARENA_PADDING * 2
    );
  }

  update(time, delta) {
    if (this.gameOver || this.gameWon) return;

    // Update game entities
    this.player.update(this.cursors);
    this.enemy.update(this.player, delta);
    this.tracker.record(this.player, delta);

    // Update HUD
    this.hud.update(
      this.player.healthFraction, this.enemy.healthFraction,
      this.player.health, this.enemy.health
    );

    // ---- Win / Lose checks ----
    if (!this.enemy.alive && !this.gameWon) {
      this.gameWon = true;
      this._onWin();
    } else if (!this.player.alive && !this.gameOver) {
      this.gameOver = true;
      this._onLose();
    }
  }

  _onWin() {
    this.hud.showStatus('ROUND CLEAR', '#00e5ff');
    this.time.delayedCall(2500, () => {
      // Future: advance to next round / trigger AI memory consolidation
      this.hud.showStatus(`PRESS R TO RETURN\nTO TITLE`, '#7799bb');
    });
  }

  _onLose() {
    this.cameras.main.shake(600, 0.025);
    this.hud.showStatus('GAME OVER', '#ff3d71');
    this.time.delayedCall(2000, () => {
      this.hud.showStatus('PRESS R TO RETURN\nTO TITLE', '#7799bb');
    });
  }
}
