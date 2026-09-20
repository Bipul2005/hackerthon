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
    this._enemyHPText = scene.add.text(W - PADDING - BAR_W - 36, H - PADDING - BAR_H + 1, '150', HUD_STYLE)
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

    // ---- Small hint bottom-center ----
    this._hintText = scene.add.text(W / 2, H - PADDING, 'WASD to move', {
      ...LABEL_STYLE,
      fontSize: '10px',
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(102);

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

  destroy() {
    [
      this._playerBarBg, this._playerBarFill, this._playerLabel, this._playerHPText,
      this._enemyBarBg, this._enemyBarFill, this._enemyLabel, this._enemyHPText,
      this._roundText, this._statusText, this._hintText,
    ].forEach(o => o && o.destroy());
  }
}
