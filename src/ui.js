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

    // ---- Debug Panel (Top Right) ----
    this._debugBg = scene.add.graphics().setScrollFactor(0).setDepth(300).setAlpha(0.85);
    this._debugText = scene.add.text(W - 250, 40, 'PLAYER BEHAVIOR\n...', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '10px',
      color: '#00ffaa',
      lineSpacing: 4,
    }).setScrollFactor(0).setDepth(301);

    // ---- AI Brain Panel (Below Debug) ----
    this._brainBg = scene.add.graphics().setScrollFactor(0).setDepth(302).setAlpha(0.85);
    this._brainText = scene.add.text(W - 250, 200, 'AI BRAIN\n...', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '10px',
      color: '#ff77ff',
      lineSpacing: 4,
    }).setScrollFactor(0).setDepth(303);

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
    this._statusText.setText(msg).setColor(color).setAlpha(1);
    if (duration > 0) {
      this.scene.time.delayedCall(duration, () => {
        this.scene.tweens.add({
          targets: this._statusText,
          alpha: 0,
          duration: 400,
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
    this._dialogueText.setText(msg).setAlpha(1);
    if (duration > 0) {
      this.scene.time.delayedCall(duration, () => {
        this.scene.tweens.add({
          targets: this._dialogueText,
          alpha: 0,
          duration: 400,
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
   * Update the debug panel with Tracker summary and Analyzer results.
   * @param {object} summary 
   * @param {object} analysis 
   */
  updateDebugPanel(summary, analysis) {
    if (!summary) return;

    let text = `--- PLAYER BEHAVIOR ---\n\n`;
    text += `ATTACKS: ${summary.totalAttacks} (Hits: ${summary.hits}, Misses: ${summary.misses})\n`;
    text += `  [L:${summary.leftAttacks} R:${summary.rightAttacks} U:${summary.upAttacks} D:${summary.downAttacks}]\n`;
    text += `DASHES: ${summary.dashCount}\n`;
    text += `RUSHES: ${summary.rushCount} | RETREATS: ${summary.retreatCount}\n`;
    text += `DIST: Math.floor(${summary.distanceTraveled})px\n`;
    
    if (analysis && analysis.metrics) {
      text += `\n--- ANALYZER ---\n\n`;
      text += `STYLE: ${analysis.metrics.playStyle}\n`;
      text += `PREF DIR: ${analysis.metrics.preferredDirection}\n`;
      text += `DASH USE: ${analysis.metrics.dashUsage}\n`;
      text += `PREDICTABILITY: ${(analysis.metrics.predictability * 100).toFixed(0)}%\n`;
      
      text += `\nOBSERVATIONS:\n`;
      analysis.observations.forEach(obs => {
        text += `- ${obs}\n`;
      });
    }

    this._debugText.setText(text);

    // Update background size
    this._debugBg.clear();
    this._debugBg.fillStyle(0x0a0a1a, 1);
    this._debugBg.lineStyle(1, 0x00ffaa, 0.4);
    
    const bounds = this._debugText.getBounds();
    const bgPadding = 8;
    this._debugBg.fillRect(bounds.x - bgPadding, bounds.y - bgPadding, bounds.width + bgPadding * 2, bounds.height + bgPadding * 2);
    this._debugBg.strokeRect(bounds.x - bgPadding, bounds.y - bgPadding, bounds.width + bgPadding * 2, bounds.height + bgPadding * 2);
  }

  destroy() {
    [
      this._playerBarBg, this._playerBarFill, this._playerLabel, this._playerHPText,
      this._enemyBarBg, this._enemyBarFill, this._enemyLabel, this._enemyHPText,
      this._roundText, this._statusText, this._hintText, this._combatText,
      this._debugText, this._debugBg
    ].forEach(o => o && o.destroy());
  }
}
