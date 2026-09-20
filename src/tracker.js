/**
 * tracker.js — Behavior Tracker (Stage 2: Event Recording)
 *
 * CURRENT STATE (Stage 2):
 *   Records both positional snapshots (every Nth frame) and named combat events.
 *   Events are emitted by Player on every combat action.
 *   Data accumulates in history arrays for future analysis.
 *
 * EVENT TYPES RECORDED:
 *   PLAYER_ATTACK          — Player pressed attack
 *   PLAYER_ATTACK_LEFT     — Attack aimed left
 *   PLAYER_ATTACK_RIGHT    — Attack aimed right
 *   PLAYER_ATTACK_UP       — Attack aimed up
 *   PLAYER_ATTACK_DOWN     — Attack aimed down
 *   PLAYER_DASH            — Player dashed
 *   PLAYER_MOVE            — Player is moving (velocity non-zero)
 *   PLAYER_HIT             — Player took damage
 *   PLAYER_MISS            — Player attacked and missed
 *   PLAYER_RUSH            — Player moved toward enemy
 *   PLAYER_RETREAT         — Player moved away from enemy
 *
 * FUTURE (Stage 3+):
 *   Will feed events into analyzer.js for pattern detection.
 *
 * PIPELINE POSITION:
 *   PLAYER → [BEHAVIOR TRACKER] → BEHAVIOR ANALYZER → ADAPTIVE AI
 */

// All valid event type strings (for reference + validation)
export const EVENT_TYPES = Object.freeze({
  PLAYER_ATTACK:       'PLAYER_ATTACK',
  PLAYER_ATTACK_LEFT:  'PLAYER_ATTACK_LEFT',
  PLAYER_ATTACK_RIGHT: 'PLAYER_ATTACK_RIGHT',
  PLAYER_ATTACK_UP:    'PLAYER_ATTACK_UP',
  PLAYER_ATTACK_DOWN:  'PLAYER_ATTACK_DOWN',
  PLAYER_DASH:         'PLAYER_DASH',
  PLAYER_MOVE:         'PLAYER_MOVE',
  PLAYER_HIT:          'PLAYER_HIT',
  PLAYER_MISS:         'PLAYER_MISS',
  PLAYER_RUSH:         'PLAYER_RUSH',
  PLAYER_RETREAT:      'PLAYER_RETREAT',
  PLAYER_HIDE:         'PLAYER_HIDE',
});

export class BehaviorTracker {
  constructor() {
    /** Continuous positional snapshots (throttled) */
    this.history = [];

    /** Named combat events with timestamps */
    this.events = [];

    this._frameSkip = 0;
    this._frameSkipMax = 6;

    // Rolling counts per event type for quick statistics
    this.eventCounts = {};
    Object.values(EVENT_TYPES).forEach(t => { this.eventCounts[t] = 0; });
  }

  // ─── Snapshot Recording ──────────────────────────────────────────────────────

  /**
   * Record a positional snapshot of the player state.
   * Throttled to every _frameSkipMax frames.
   *
   * @param {import('./player.js').Player} player
   * @param {number} delta
   */
  record(player, delta) {
    this._frameSkip++;
    if (this._frameSkip < this._frameSkipMax) return;
    this._frameSkip = 0;

    const snapshot = {
      t: Date.now(),
      x: player.x,
      y: player.y,
      hp: player.health,
      vx: player.sprite.body?.velocity.x || 0,
      vy: player.sprite.body?.velocity.y || 0,
      facing: player.facing,
      isDashing: player.isDashing,
      isAttacking: player.isAttacking,
    };

    this.history.push(snapshot);
    if (this.history.length > 600) this.history.shift();
  }

  // ─── Event Recording ─────────────────────────────────────────────────────────

  /**
   * Record a named combat event emitted by the player.
   * Called from Player._emit().
   *
   * @param {string} eventType - One of EVENT_TYPES
   * @param {object} data - Additional event data
   */
  recordEvent(eventType, data = {}) {
    const entry = {
      t: Date.now(),
      type: eventType,
      ...data,
    };

    this.events.push(entry);
    if (this.events.length > 1000) this.events.shift();

    // Increment rolling counter
    if (this.eventCounts[eventType] !== undefined) {
      this.eventCounts[eventType]++;
    }
  }

  // ─── Accessors ───────────────────────────────────────────────────────────────

  getHistory()     { return [...this.history]; }
  getEvents()      { return [...this.events]; }
  getEventCounts() { return { ...this.eventCounts }; }

  /**
   * Get events of a specific type.
   * @param {string} type
   */
  getEventsOfType(type) {
    return this.events.filter(e => e.type === type);
  }

  /**
   * Get a summary of combat behaviour (for future analyzer.js use).
   * @returns {object}
   */
  getSummary() {
    const counts = this.eventCounts;
    const totalAttacks = counts.PLAYER_ATTACK || 0;
    const hits = counts.PLAYER_HIT ? 0 : 0; // Note: PLAYER_HIT = player was hit, not landed
    const misses = counts.PLAYER_MISS || 0;
    const rushes = counts.PLAYER_RUSH || 0;
    const retreats = counts.PLAYER_RETREAT || 0;

    return {
      totalAttacks,
      misses,
      rushes,
      retreats,
      aggressionRatio: (rushes + retreats) > 0 ? rushes / (rushes + retreats) : 0.5,
      favoriteDirection: this._dominantAttackDir(),
    };
  }

  _dominantAttackDir() {
    const dirs = ['LEFT', 'RIGHT', 'UP', 'DOWN'];
    let max = 0, dominant = 'RIGHT';
    dirs.forEach(d => {
      const c = this.eventCounts[`PLAYER_ATTACK_${d}`] || 0;
      if (c > max) { max = c; dominant = d; }
    });
    return dominant;
  }

  reset() {
    this.history = [];
    this.events = [];
    Object.values(EVENT_TYPES).forEach(t => { this.eventCounts[t] = 0; });
  }
}
