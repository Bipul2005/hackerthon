/**
 * tracker.js — Behavior Tracker (Stage 1: Recording scaffold)
 *
 * CURRENT STATE (Stage 1):
 *   Records basic player actions and positions each frame.
 *   Data is stored in memory but not yet analyzed.
 *
 * FUTURE (Stage 2+):
 *   Will feed recorded data into analyzer.js for pattern detection.
 *   Metrics to track include:
 *     - Movement direction tendencies
 *     - Dodge timing relative to enemy attacks
 *     - Preferred combat range
 *     - Aggression level (approach vs retreat ratio)
 *     - Attack rhythm patterns
 *
 * PIPELINE POSITION:
 *   PLAYER → [BEHAVIOR TRACKER] → BEHAVIOR ANALYZER → ADAPTIVE AI
 */

export class BehaviorTracker {
  /**
   * @param {import('./player.js').Player} player
   */
  constructor(player) {
    this.player = player;
    this.history = [];
    this._frameSkip = 0;
    this._frameSkipMax = 6; // Record every Nth frame to save memory
  }

  /**
   * Record a snapshot of the player's current state.
   * Called from GameScene.update() every frame.
   *
   * @param {import('./player.js').Player} player
   * @param {number} delta - Frame time in ms
   */
  record(player, delta) {
    this._frameSkip++;
    if (this._frameSkip < this._frameSkipMax) return;
    this._frameSkip = 0;

    const snapshot = {
      timestamp: Date.now(),
      x: player.x,
      y: player.y,
      hp: player.health,
      velocityX: player.sprite.body?.velocity.x || 0,
      velocityY: player.sprite.body?.velocity.y || 0,
    };

    this.history.push(snapshot);

    // Keep history bounded (last 500 snapshots ≈ ~50 seconds at 10fps)
    if (this.history.length > 500) {
      this.history.shift();
    }
  }

  /**
   * Returns a copy of the recorded history for the analyzer.
   * @returns {Array<object>}
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clear all recorded history.
   */
  reset() {
    this.history = [];
  }
}
