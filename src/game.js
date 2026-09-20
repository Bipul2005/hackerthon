/**
 * game.js — Main Game Scenes
 *
 * Stage 8: Three-Round Game System
 *   START SCREEN → ROUND 1 (AI observes) → AI LEARNED screen
 *   → ROUND 2 (AI adapts) → AI LEARNED screen → ROUND 3 (final)
 *   → RESULT SCREEN
 *
 * Stage 9: AI Personality & Dialogue
 *   DialogueManager generates short deterministic lines from real analysis.
 *   Dialogue triggers at round start, analysis ticks, strategy changes,
 *   and the final result screen.
 */

import Phaser from 'phaser';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { HUD } from './ui.js';
import { BehaviorTracker } from './tracker.js';
import { BehaviorAnalyzer } from './analyzer.js';
import { AdaptiveAI } from './adaptiveAI.js';
import { Memory } from './memory.js';
import { DialogueManager } from './dialogue.js';

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

    // ---- Scanline overlay ----
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
    const sub = this.add.text(W / 2, H * 0.37, "The enemy doesn't just get stronger.\nIt learns how you play.", {
      fontFamily: 'Orbitron, monospace',
      fontSize: '16px',
      color: '#7799bb',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setAlpha(0);

    // ---- Feature bullets ----
    const features = [
      '\u2b21  Adaptive AI Enemy',
      '\u2b21  Behavior Pattern Recognition',
      '\u2b21  Dynamic Strategy Switching',
    ];
    const featureTexts = features.map((f, i) =>
      this.add.text(W / 2, H * 0.5 + i * 26, f, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        color: '#556688',
        align: 'center',
      }).setOrigin(0.5).setAlpha(0)
    );

    // ---- Controls ----
    const controls = this.add.text(W / 2, H * 0.655, 'WASD \u00b7 Move    SPACE \u00b7 Attack    SHIFT \u00b7 Dash', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '12px',
      color: '#445566',
      align: 'center',
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
      // Reset shared memory on each new game
      GameScene.resetMemory();
      this.cameras.main.flash(200, 0, 229, 255);
      this.time.delayedCall(300, () => this.scene.start('GameScene', { round: 1 }));
    });

    // ---- Version tag ----
    this.add.text(W - 10, H - 10, 'v0.9.0 \u2014 ADAPT', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '10px',
      color: '#334455',
    }).setOrigin(1, 1);

    // ---- Animations ----
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
const ARENA_FLOOR_COLOR = 0x0d0d1a;
const MAX_ROUNDS = 3;

export class GameScene extends Phaser.Scene {
  // ---- Shared memory (persists across rounds) ----
  static _memory = null;
  static resetMemory() { GameScene._memory = null; }

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.round = data?.round || 1;
    if (!GameScene._memory) GameScene._memory = new Memory();
    this.memory = GameScene._memory;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ---- Arena ----
    this._buildArena(W, H);

    // ---- Behavior Tracker & Analyzer ----
    this.tracker = new BehaviorTracker();
    this.analyzer = new BehaviorAnalyzer();
    this.tracker.recordRoundStart();

    // ---- Spawn entities ----
    this.player = new Player(this, W * 0.28, H / 2);
    this.player.setTracker(this.tracker);
    this.enemy = new Enemy(this, W * 0.72, H / 2);

    // ---- Adaptive AI ----
    this.adaptiveAI = new AdaptiveAI(this.tracker, this.enemy);

    // On rounds 2+, seed the AI with what it learned
    if (this.round > 1) {
      const prev = this.memory.getLatest();
      if (prev && typeof this.adaptiveAI.seedFromMemory === 'function') {
        this.adaptiveAI.seedFromMemory(prev);
      }
    }

    // ---- HUD ----
    this.hud = new HUD(this, this.round);

    // ---- Dialogue ----
    this.dialogueManager = new DialogueManager();
    this.dialogueManager.startRound(this.round);
    this._dialogueTimer = 0;

    // ---- Key bindings ----
    this.keys = {
      W:     this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A:     this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S:     this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D:     this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      SHIFT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };

    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.player && this.player.alive) this.player._attackPressed = true;
    });
    this.input.keyboard.on('keydown-SHIFT', () => {
      if (this.player && this.player.alive) this.player._dashPressed = true;
    });

    // ---- Game state ----
    this.gameOver     = false;
    this.gameWon      = false;
    this._roundEnding = false;
    this._lastStrategy = null;
    this._analyzeTimer = 0;

    // Round start banner + opening line
    this.hud.showStatus(`ROUND ${this.round}`, '#ffaa00', 1800);
    const openingLine = this._roundOpeningLine();
    if (openingLine) {
      this.time.delayedCall(2100, () => this.hud.showDialogue(openingLine, 3500));
    }

    // R to restart only after final result (loss or final win)
    this.input.keyboard.on('keydown-R', () => {
      if (this.gameOver || (this.gameWon && this.round >= MAX_ROUNDS)) {
        GameScene.resetMemory();
        this.scene.start('StartScene');
      }
    });

    // ESC debug dump
    this.input.keyboard.on('keydown-ESC', () => {
      console.log('[ADAPT Tracker]', this.tracker.getSummary());
      console.log('[ADAPT Analyzer]', this.analyzer.analyze(this.tracker.getSummary()));
      console.log('[ADAPT Memory]', this.memory.getAll());
    });

    // Clean up key listeners on scene shutdown
    this.events.once('shutdown', () => {
      if (this.input?.keyboard) {
        this.input.keyboard.off('keydown-SPACE');
        this.input.keyboard.off('keydown-SHIFT');
        this.input.keyboard.off('keydown-R');
        this.input.keyboard.off('keydown-ESC');
      }
    });
  }

  // ----------------------------------------------------------------
  //  Round opening dialogue
  // ----------------------------------------------------------------
  _roundOpeningLine() {
    if (this.round === 1) return "Let's see what you have for me.";
    const prev = this.memory.getLatest();
    if (this.round === 2) {
      if (!prev) return "I've been watching.";
      const dir = prev.behavior?.preferredDirection;
      if (dir && dir !== 'BALANCED') {
        return `You prefer ${dir.toLowerCase()} attacks. That won't work again.`;
      }
      return "I know your patterns. Let's begin.";
    }
    if (this.round === 3) {
      return "Final round. I know what you're going to try.";
    }
    return null;
  }

  // ----------------------------------------------------------------
  //  Arena construction
  // ----------------------------------------------------------------
  _buildArena(W, H) {
    const gfx = this.add.graphics();

    gfx.fillStyle(ARENA_FLOOR_COLOR, 1);
    gfx.fillRect(0, 0, W, H);

    gfx.lineStyle(1, 0x151530, 1);
    for (let x = 0; x < W; x += 32) gfx.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 32) gfx.lineBetween(0, y, W, y);

    gfx.lineStyle(3, 0x00e5ff, 0.4);
    gfx.strokeRect(ARENA_PADDING, ARENA_PADDING, W - ARENA_PADDING * 2, H - ARENA_PADDING * 2);

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

    gfx.lineStyle(1, 0x00e5ff, 0.08);
    gfx.lineBetween(W / 2, ARENA_PADDING, W / 2, H - ARENA_PADDING);

    this.physics.world.setBounds(
      ARENA_PADDING, ARENA_PADDING,
      W - ARENA_PADDING * 2, H - ARENA_PADDING * 2
    );
  }

  // ----------------------------------------------------------------
  //  Update loop
  // ----------------------------------------------------------------
  update(_time, delta) {
    if (this.gameOver || this.gameWon || this._roundEnding) return;

    this.player.update(this.keys, this.enemy, delta);
    this.enemy.update(this.player, delta);
    this.tracker.update(delta, this.player, this.enemy);

    // Analyze + AI + dialogue tick (every 500 ms)
    this._analyzeTimer += delta;
    if (this._analyzeTimer >= 500) {
      this._analyzeTimer = 0;

      const summary  = this.tracker.getSummary();
      const analysis = this.analyzer.analyze(summary);

      this.adaptiveAI.analyzePlayer();
      this.adaptiveAI.chooseStrategy();
      this.adaptiveAI.applyStrategy();

      const strategyInfo = this.adaptiveAI.getCurrentStrategy();
      const analysisWithStrategy = { ...analysis, strategyInfo };
      this.hud.updateDebugPanel(summary, analysisWithStrategy);

      // Dialogue generation
      const line = this.dialogueManager.generate(analysisWithStrategy, summary);
      if (line) this.hud.showDialogue(line, 3500);

      // Strategy-change quip
      const newStrat = strategyInfo?.name;
      if (this._lastStrategy && newStrat && newStrat !== this._lastStrategy) {
        this.hud.showDialogue("Interesting\u2026 you've changed your approach.", 3500);
      }
      this._lastStrategy = newStrat;
    }

    // HUD bars
    this.hud.update(
      this.player.healthFraction, this.enemy.healthFraction,
      this.player.health, this.enemy.health
    );

    // Win / lose checks
    if (!this.enemy.alive && !this.gameWon) {
      this.gameWon = true;
      this._onWin();
    } else if (!this.player.alive && !this.gameOver) {
      this.gameOver = true;
      this._onLose();
    }
  }

  // ----------------------------------------------------------------
  //  Helper: build "AI Learned" banner text
  // ----------------------------------------------------------------
  _buildLearnedText(analysis, strategy) {
    const dir   = analysis?.metrics?.preferredDirection || 'BALANCED';
    const style = analysis?.metrics?.playStyle || 'BALANCED';
    const strat = strategy?.name || 'OBSERVING';
    const conf  = strategy?.confidence != null
      ? `${(strategy.confidence * 100).toFixed(0)}%`
      : '—';
    return [
      '\u{1F9E0}  AI LEARNED',
      '',
      `You prefer ${dir} attacks.`,
      `You fight ${style}.`,
      '',
      `Strategy: ${strat}`,
      `Confidence: ${conf}`,
    ].join('\n');
  }

  // ----------------------------------------------------------------
  //  Win handler
  // ----------------------------------------------------------------
  _onWin() {
    if (this._roundHandled) return;
    this._roundHandled = true;
    this._roundEnding = true;
    this.tracker.recordRoundEnd();

    const summary  = this.tracker.getSummary();
    const analysis = this.analyzer.analyze(summary);
    const strategy = this.adaptiveAI.getCurrentStrategy();

    // Save round to memory
    this.memory.addRecord({
      round:      this.round,
      behavior:   analysis.metrics,
      strategy:   strategy?.name  || 'NONE',
      confidence: strategy?.confidence || 0,
      reason:     strategy?.reason || '',
    });

    this.adaptiveAI.reset();

    console.log('[ADAPT] Round', this.round, 'won. Summary:', summary);
    console.log('[ADAPT] Strategy:', strategy);

    if (this.round < MAX_ROUNDS) {
      // Between-round: show ROUND CLEAR → AI Learned → next round
      this.hud.showStatus('ROUND CLEAR', '#00e5ff', 1800);
      this.time.delayedCall(2000, () => {
        const learnedText = this._buildLearnedText(analysis, strategy);
        this.hud.showStatus(learnedText, '#ffdd55', 0);
        this.time.delayedCall(4500, () => {
          this.hud.showStatus(`ROUND ${this.round + 1} INCOMING\u2026`, '#ffaa00', 1600);
          this.time.delayedCall(1900, () => {
            this.scene.start('GameScene', { round: this.round + 1 });
          });
        });
      });
    } else {
      // Final round victory
      const finalLine = this.dialogueManager.finalMessage(this.memory);
      this.hud.showStatus('\u{1F3C6}  VICTORY', '#00e5ff', 2500);
      this.time.delayedCall(2600, () => {
        this.hud.showDialogue(finalLine, 0);
        this.hud.showStatus(this._buildResultScreen(true), '#00ffaa', 0);
      });
      this.time.delayedCall(7000, () => {
        this.hud.showStatus('PRESS R TO PLAY AGAIN', '#7799bb', 0);
      });
    }
  }

  // ----------------------------------------------------------------
  //  Lose handler
  // ----------------------------------------------------------------
  _onLose() {
    if (this._roundHandled) return;
    this._roundHandled = true;
    this._roundEnding = true;
    this.tracker.recordRoundEnd();
    this.cameras.main.shake(600, 0.025);

    const summary  = this.tracker.getSummary();
    const analysis = this.analyzer.analyze(summary);
    const strategy = this.adaptiveAI.getCurrentStrategy();

    this.memory.addRecord({
      round:      this.round,
      behavior:   analysis.metrics,
      strategy:   strategy?.name  || 'NONE',
      confidence: strategy?.confidence || 0,
      reason:     strategy?.reason || '',
    });

    this.adaptiveAI.reset();

    this.hud.showDialogue('Unexpected.', 3200);
    this.hud.showStatus('GAME OVER', '#ff3d71', 2200);
    this.time.delayedCall(2600, () => {
      this.hud.showStatus(this._buildResultScreen(false), '#ff7755', 0);
    });
    this.time.delayedCall(7000, () => {
      this.hud.showStatus('PRESS R TO PLAY AGAIN', '#7799bb', 0);
    });
  }

  // ----------------------------------------------------------------
  //  Result screen summary
  // ----------------------------------------------------------------
  _buildResultScreen(won) {
    const all = this.memory.getAll();
    const lines = ['\u2500\u2500\u2500 MATCH SUMMARY \u2500\u2500\u2500', ''];
    all.forEach(r => {
      const pct = r.confidence != null ? ` (${(r.confidence * 100).toFixed(0)}%)` : '';
      lines.push(`Round ${r.round}: ${r.strategy}${pct}`);
    });
    lines.push('');
    lines.push(won ? '\u{1F3C6}  YOU DEFEATED ADAPT' : '\u{1F480}  ADAPT LEARNED TOO WELL');
    return lines.join('\n');
  }
}
