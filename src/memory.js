/**
 * memory.js — AI Memory (PLANNED — Stage 2+)
 *
 * STATUS: Scaffold / Placeholder
 * This module is not active in Stage 1.
 *
 * PURPOSE:
 *   Persistent (within-session) storage of player behavior profiles
 *   across rounds. Allows the enemy to "remember" what worked and what
 *   didn't across multiple encounters.
 *
 * PLANNED STORAGE FORMAT:
 *   {
 *     rounds: [
 *       {
 *         round: 1,
 *         profile: { ... BehaviorAnalyzer profile ... },
 *         strategyUsed: 'aggressive',
 *         outcome: 'win' | 'lose',
 *         damageTaken: number,
 *         damageDealt: number,
 *       }
 *     ],
 *     aggregateProfile: { ... merged across rounds ... }
 *   }
 *
 * PIPELINE POSITION:
 *   ADAPTIVE AI ↔ [AI MEMORY] (bidirectional: read past, write new)
 */

export class AIMemory {
  constructor() {
    this.rounds = [];
    this.aggregateProfile = null;
  }

  /**
   * Save data from a completed round.
   * @param {object} roundData
   *
   * TODO (Stage 2): Implement real memory consolidation
   */
  saveRound(roundData) {
    this.rounds.push(roundData);
    this._consolidate();
  }

  /**
   * Returns the consolidated profile across all remembered rounds.
   * @returns {object|null}
   *
   * TODO (Stage 2): Return real aggregate
   */
  getProfile() {
    return this.aggregateProfile;
  }

  _consolidate() {
    // TODO (Stage 2): Merge round profiles into aggregate
    this.aggregateProfile = null;
  }

  /**
   * Wipe all memory (new game session).
   */
  reset() {
    this.rounds = [];
    this.aggregateProfile = null;
  }
}
