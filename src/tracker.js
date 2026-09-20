/**
 * tracker.js — Behavior Tracker (Stage 3: Discrete Metrics)
 *
 * Observes what the player does during a round.
 * Does NOT decide how the enemy reacts.
 *
 * Metrics Tracked:
 * - Attacks (total, left, right, up, down, successful, missed)
 * - Movement (time moving, time stationary, distance traveled)
 * - Aggression (time close, time far, rushes, retreats)
 * - Dash (count)
 * - Combat (damage dealt, damage received)
 * - Round Info (start, end, duration)
 */

export class BehaviorTracker {
  constructor() {
    this.reset();
  }

  reset() {
    // Attack metrics
    this.attacks = {
      total: 0,
      left: 0,
      right: 0,
      up: 0,
      down: 0,
      hits: 0,
      misses: 0,
    };

    // Movement metrics
    this.movement = {
      timeMoving: 0,       // seconds
      timeStationary: 0,   // seconds
      distanceTraveled: 0, // pixels
    };

    // Aggression metrics
    this.aggression = {
      timeClose: 0,        // seconds (< 150px)
      timeFar: 0,          // seconds (> 300px)
      rushes: 0,
      retreats: 0,
    };

    // Defense & Dash
    this.defense = {
      dashCount: 0,
      timeHiding: 0,       // (unused for now, ready for obstacles)
    };

    // Combat
    this.combat = {
      damageDealt: 0,
      damageReceived: 0,
    };

    // Round Info
    this.round = {
      startTime: 0,
      endTime: 0,
      duration: 0, // seconds
      isActive: false,
    };

    // Internal state for continuous tracking
    this._lastPlayerPos = { x: 0, y: 0 };
    this._prevDistanceToEnemy = 0;
  }

  // ─── Round Management ────────────────────────────────────────────────────────

  recordRoundStart() {
    this.round.startTime = Date.now();
    this.round.isActive = true;
  }

  recordRoundEnd() {
    this.round.endTime = Date.now();
    this.round.duration = (this.round.endTime - this.round.startTime) / 1000;
    this.round.isActive = false;
  }

  // ─── Continuous Tracking (Called every frame) ────────────────────────────────

  /**
   * @param {number} delta - Frame time in ms
   * @param {import('./player.js').Player} player
   * @param {import('./enemy.js').Enemy} enemy
   */
  update(delta, player, enemy) {
    if (!this.round.isActive || !player || !player.alive) return;

    const dtSec = delta / 1000;

    // Movement
    const isMoving = Math.abs(player.sprite.body.velocity.x) > 0 || Math.abs(player.sprite.body.velocity.y) > 0;
    if (isMoving) {
      this.movement.timeMoving += dtSec;
    } else {
      this.movement.timeStationary += dtSec;
    }

    // Distance traveled
    if (this._lastPlayerPos.x !== 0 || this._lastPlayerPos.y !== 0) {
      const dx = player.x - this._lastPlayerPos.x;
      const dy = player.y - this._lastPlayerPos.y;
      this.movement.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
    }
    this._lastPlayerPos.x = player.x;
    this._lastPlayerPos.y = player.y;

    // Proximity to enemy
    if (enemy && enemy.alive) {
      const ex = enemy.x - player.x;
      const ey = enemy.y - player.y;
      const dist = Math.sqrt(ex * ex + ey * ey);

      if (dist < 150) this.aggression.timeClose += dtSec;
      if (dist > 300) this.aggression.timeFar += dtSec;

      this._prevDistanceToEnemy = dist;
    }
  }

  // ─── Discrete Events ─────────────────────────────────────────────────────────

  recordAttack(direction) {
    this.attacks.total++;
    const dir = direction.toLowerCase();
    if (this.attacks[dir] !== undefined) {
      this.attacks[dir]++;
    }
  }

  recordHit() {
    this.attacks.hits++;
  }

  recordMiss() {
    this.attacks.misses++;
  }

  recordDamageDealt(amount) {
    this.combat.damageDealt += amount;
  }

  recordDamageReceived(amount) {
    this.combat.damageReceived += amount;
  }

  recordDash() {
    this.defense.dashCount++;
  }

  recordRush() {
    this.aggression.rushes++;
  }

  recordRetreat() {
    this.aggression.retreats++;
  }

  recordHide() {
    // Currently no obstacles, but hook is ready
  }

  // ─── Reporting ───────────────────────────────────────────────────────────────

  /**
   * Returns structured summary for the BehaviorAnalyzer
   */
  getSummary() {
    // Calculate current round duration if still active
    let currentDuration = this.round.duration;
    if (this.round.isActive) {
      currentDuration = (Date.now() - this.round.startTime) / 1000;
    }

    return {
      // Attacks
      totalAttacks: this.attacks.total,
      leftAttacks: this.attacks.left,
      rightAttacks: this.attacks.right,
      upAttacks: this.attacks.up,
      downAttacks: this.attacks.down,
      hits: this.attacks.hits,
      misses: this.attacks.misses,

      // Movement & Dash
      timeMoving: this.movement.timeMoving,
      timeStationary: this.movement.timeStationary,
      distanceTraveled: this.movement.distanceTraveled,
      dashCount: this.defense.dashCount,

      // Aggression
      timeClose: this.aggression.timeClose,
      timeFar: this.aggression.timeFar,
      rushCount: this.aggression.rushes,
      retreatCount: this.aggression.retreats,
      hidingTime: this.defense.timeHiding,

      // Combat
      damageDealt: this.combat.damageDealt,
      damageReceived: this.combat.damageReceived,

      // Round Info
      roundDuration: currentDuration,
    };
  }
}
