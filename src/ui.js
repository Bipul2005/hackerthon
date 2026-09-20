/**
 * ui.js — HUD / Interface Manager
 *
 * Renders the in-game HUD:
 *   - Player HP bar
 *   - Enemy HP bar
 *   - Round number
 *   - Game status messages
 *
 * Uses Phaser Graphics + Text objects pinned to the camera (setScrollFactor(0)).
 */

/**
 * Safe-cancel helper: works for both Phaser TimerEvent (.remove) and Tween (.stop).
 * @param {Phaser.Time.TimerEvent|Phaser.Tweens.Tween|null} t
 */
function _cancelTimer(t) {
  if (!t) return;
  if (typeof t.stop === 'function') t.stop();
  else if (typeof t.remove === 'function') t.remove();
}

const HUD_STYLE = {
  fontFamily: 'Orbitron, monospace',
  fontSize: '13px',
  color: '#e0e0f0',
  stroke: '#000000',
  strokeThickness: 3,
};

const LABEL_STYLE = {
  fontFamily: 'Orbitron, monospace',
  fontSize: '11px',
  color: '#7777aa',
  stroke: '#000000',
  strokeThickness: 2,
};

const STATUS_STYLE = {
  fontFamily: 'Orbitron, monospace',
  fontSize: '28px',
  color: '#00e5ff',
  stroke: '#000000',
  strokeThickness: 6,
  align: 'center',
};

const BAR_W = 200;
const BAR_H = 16;
const PADDING = 16;

export class HUD {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} round - Current round number
   */
  constructor(scene, round = 1) {
    this.scene = scene;
    this.round = round;

    const W = scene.scale.width;
    const H = scene.scale.height;

    // ---- Player HP bar (bottom-left) ----
    this._playerBarBg = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this._playerBarFill = scene.add.graphics().setScrollFactor(0).setDepth(101);
    this._playerLabel = scene.add.text(PADDING, H - PADDING - BAR_H - 18, 'PLAYER', LABEL_STYLE)
      .setScrollFactor(0).setDepth(102);
    this._playerHPText = scene.add.text(PADDING + BAR_W + 8, H - PADDING - BAR_H + 1, '100', HUD_STYLE)
      .setScrollFactor(0).setDepth(102);

    // ---- Enemy HP bar (bottom-right) ----
    this._enemyBarBg = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this._enemyBarFill = scene.add.graphics().setScrollFactor(0).setDepth(101);
    this._enemyLabel = scene.add.text(W - PADDING - BAR_W, H - PADDING - BAR_H - 18, 'ENEMY', LABEL_STYLE)
      .setScrollFactor(0).setDepth(102);
    this._enemyHPText = scene.add.text(W - PADDING - BAR_W - 36, H - PADDING - BAR_H + 1, '100', HUD_STYLE)
      .setScrollFactor(0).setDepth(102);

    // ---- Round counter (top-center) ----
    this._roundText = scene.add.text(W / 2, PADDING, `ROUND ${this.round}`, {
      ...HUD_STYLE,
      fontSize: '16px',
      color: '#ffaa00',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(102);

    // ---- Status message (center screen) ----
    this._statusText = scene.add.text(W / 2, H / 2, '', STATUS_STYLE)
      .setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(200).setAlpha(0);

    // ---- Dialogue Text (bottom-left) ----
    this._dialogueText = scene.add.text(PADDING, H - PADDING - BAR_H - 30, '', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '12px',
      color: '#ffdd55',
      stroke: '#000000',
      strokeThickness: 2,
    }).setScrollFactor(0).setDepth(304);

    // ---- Small hint bottom-center ----
    this._hintText = scene.add.text(W / 2, H - PADDING, 'WASD · Move    SPACE · Attack    SHIFT · Dash', {
      ...LABEL_STYLE,
      fontSize: '10px',
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(102);

    // ---- Combat event flash (top-left corner) ----
    this._combatText = scene.add.text(PADDING, PADDING + 24, '', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '11px',
      color: '#00e5ff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(102).setAlpha(0);

    this._barY_player = H - PADDING - BAR_H;
    this._barX_enemy = W - PADDING - BAR_W;

    // Initial draw
    this._drawBars(1, 1);
  }

  /**
   * Update HUD with current game state.
   * @param {number} playerHP - fraction [0..1]
   * @param {number} enemyHP - fraction [0..1]
   * @param {number} playerHPVal - raw HP value
   * @param {number} enemyHPVal - raw HP value
   */
  update(playerHP, enemyHP, playerHPVal, enemyHPVal) {
    this._drawBars(playerHP, enemyHP);
    this._playerHPText.setText(Math.ceil(playerHPVal).toString());
    this._enemyHPText.setText(Math.ceil(enemyHPVal).toString());
  }

  _drawBars(playerFrac, enemyFrac) {
    const { scene, _barY_player: py, _barX_enemy: ex } = this;

    // --- Player bar ---
    this._playerBarBg.clear();
    this._playerBarBg.fillStyle(0x222244, 1);
    this._playerBarBg.fillRect(PADDING, py, BAR_W, BAR_H);
    this._playerBarBg.lineStyle(1, 0x3333aa, 0.8);
    this._playerBarBg.strokeRect(PADDING, py, BAR_W, BAR_H);

    this._playerBarFill.clear();
    const pColor = playerFrac > 0.5 ? 0x00e5ff : playerFrac > 0.25 ? 0xffaa00 : 0xff3d71;
    this._playerBarFill.fillStyle(pColor, 1);
    this._playerBarFill.fillRect(PADDING + 1, py + 1, Math.max(0, (BAR_W - 2) * playerFrac), BAR_H - 2);

    // --- Enemy bar ---
    this._enemyBarBg.clear();
    this._enemyBarBg.fillStyle(0x442222, 1);
    this._enemyBarBg.fillRect(ex, py, BAR_W, BAR_H);
    this._enemyBarBg.lineStyle(1, 0xaa3333, 0.8);
    this._enemyBarBg.strokeRect(ex, py, BAR_W, BAR_H);

    this._enemyBarFill.clear();
    const eColor = enemyFrac > 0.5 ? 0xff3d71 : enemyFrac > 0.25 ? 0xff7700 : 0xffaa00;
    this._enemyBarFill.fillStyle(eColor, 1);
    this._enemyBarFill.fillRect(ex + 1, py + 1, Math.max(0, (BAR_W - 2) * enemyFrac), BAR_H - 2);
  }

  setRound(n) {
    this.round = n;
    this._roundText.setText(`ROUND ${n}`);
  }

  /**
   * Show a status message in the center of the screen.
   * @param {string} msg
   * @param {string} [color='#00e5ff']
   * @param {number} [duration=0] - Auto-hide after ms (0 = stay)
   */
  showStatus(msg, color = '#00e5ff', duration = 0) {
    // Safe-cancel: TimerEvent uses .remove(), Tween uses .stop()
    _cancelTimer(this._statusTimer);
    _cancelTimer(this._statusFadeTween);
    this._statusTimer = null;
    this._statusFadeTween = null;

    this._statusText.setText(msg).setColor(color).setAlpha(1);
    if (duration > 0) {
      this._statusTimer = this.scene.time.delayedCall(duration, () => {
        this._statusFadeTween = this.scene.tweens.add({
          targets: this._statusText,
          alpha: 0,
          duration: 400,
          onComplete: () => { this._statusFadeTween = null; },
        });
      });
    }
  }

  hideStatus() {
    this._statusText.setAlpha(0);
  }

  /**
   * Show an AI dialogue line in the bottom-left HUD area.
   * @param {string} msg - dialogue text
   * @param {number} [duration=3000] - auto-hide after ms (0 = stay)
   */
  showDialogue(msg, duration = 3000) {
    // Safe-cancel: TimerEvent uses .remove(), Tween uses .stop()
    _cancelTimer(this._dialogueTimer);
    _cancelTimer(this._dialogueFadeTween);
    this._dialogueTimer = null;
    this._dialogueFadeTween = null;

    this._dialogueText.setText(msg).setAlpha(1);
    if (duration > 0) {
      this._dialogueTimer = this.scene.time.delayedCall(duration, () => {
        this._dialogueFadeTween = this.scene.tweens.add({
          targets: this._dialogueText,
          alpha: 0,
          duration: 400,
          onComplete: () => { this._dialogueFadeTween = null; },
        });
      });
    }
  }

  flashCombatEvent(msg, color = '#00e5ff') {
    this._combatText.setText(msg).setColor(color).setAlpha(1);
    this.scene.tweens.add({
      targets: this._combatText,
      alpha: 0,
      duration: 600,
      ease: 'Quad.Out',
    });
  }

  /**
   * Preserved hook for AI background updates (no permanent visual panel).
   * @param {object} summary 
   * @param {object} analysis 
   */
  updateDebugPanel(summary, analysis) {
    // Permanent visual panel removed for clean gameplay.
  }

  /**
   * Show a dramatic FINAL BATTLE banner for Round 3.
   * Larger text, red color, brief pulse.
   */
  showFinalBattleBanner() {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    if (this._finalBanner) return; // already shown

    const banner = this.scene.add.text(W / 2, H / 2 - 60, 'ROUND 3', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '52px',
      color: '#ff3d71',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(210).setAlpha(0);

    const sub = this.scene.add.text(W / 2, H / 2 + 10, 'FINAL BATTLE', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '22px',
      color: '#ffaa00',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(210).setAlpha(0);

    this._finalBanner = { banner, sub };

    this.scene.tweens.add({
      targets: [banner, sub],
      alpha: 1,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 400,
      ease: 'Back.Out',
      yoyo: true,
      hold: 1400,
      onComplete: () => {
        this.scene.tweens.add({
          targets: [banner, sub],
          alpha: 0,
          duration: 500,
          onComplete: () => { banner.destroy(); sub.destroy(); this._finalBanner = null; },
        });
      },
    });
  }

  destroy() {
    [
      this._playerBarBg, this._playerBarFill, this._playerLabel, this._playerHPText,
      this._enemyBarBg, this._enemyBarFill, this._enemyLabel, this._enemyHPText,
      this._roundText, this._statusText, this._hintText, this._combatText,
      this._dialogueText,
    ].forEach(o => o && o.destroy());
    _cancelTimer(this._statusTimer);
    _cancelTimer(this._statusFadeTween);
    _cancelTimer(this._dialogueTimer);
    _cancelTimer(this._dialogueFadeTween);
  }
}
