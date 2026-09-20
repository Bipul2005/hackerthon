// src/memory.js
/**
 * Memory module – stores per‑round analysis results for the Adaptive AI.
 * Allows the AI to recall what it learned previously while still being able
 * to adapt when the player's behavior changes.
 */
export class Memory {
  constructor() {
    this._records = [];
  }

  /**
   * Record memory of a round.
   * @param {object} param
   * @param {number} param.round - round number
   * @param {object} param.behavior - behavior summary (e.g., metrics from Analyzer)
   * @param {string} param.strategy - selected strategy name
   * @param {number} param.confidence - confidence (0‑1)
   * @param {string} param.reason - human readable reason
   * @param {Array<string>} [param.events] - notable events for the round
   */
  addRecord({ round, behavior, strategy, confidence, reason, events = [] }) {
    this._records.push({ round, behavior, strategy, confidence, reason, events });
  }

  /** Return all stored records */
  getAll() {
    return this._records.slice(); // shallow copy
  }

  /** Return the most recent record */
  getLatest() {
    return this._records[this._records.length - 1] || null;
  }

  /** Clear memory (for testing or new session) */
  reset() {
    this._records = [];
  }

  /**
   * Helper for UI display – returns an array of formatted strings.
   * Example: "Round 1 → Preferred LEFT attacks → Aggressive → Strategy: PROTECT_LEFT"
   */
  getDisplayData() {
    return this._records.map(r => {
      const pref = r.behavior?.preferredDirection || 'UNKNOWN';
      const style = r.behavior?.playStyle || 'UNKNOWN';
      return `Round ${r.round} → Preferred ${pref} attacks → ${style} → Strategy: ${r.strategy}`;
    });
  }
}
