/**
 * adaptiveAI.js — Adaptive Enemy AI (Stage 5)
 *
 * Uses the BehaviorTracker summary and BehaviorAnalyzer output to select a
 * rule‑based strategy for the enemy. The strategy is then applied to the
 * enemy instance via `enemy.applyStrategy`.
 */

import { BehaviorAnalyzer } from './analyzer.js';

export class AdaptiveAI {
  /**
   * @param {import('./tracker.js').BehaviorTracker} tracker
   * @param {import('./enemy.js').Enemy} enemy
   */
  constructor(tracker, enemy) {
    this.tracker = tracker;
    this.enemy = enemy;
    this.analyzer = new BehaviorAnalyzer();
    this.currentStrategy = null; // { name, confidence, reason }
  }

  /** Analyse the latest tracker data */
  analyzePlayer() {
    const summary = this.tracker.getSummary();
    this.analysis = this.analyzer.analyze(summary);
    this.summary = summary;
  }

  /** Choose the most relevant strategy based on analysis */
  chooseStrategy() {
    if (!this.analysis) return;
    const { metrics } = this.analysis;
    const s = this.summary;
    const strategies = [];

    // 1. Directional protection
    if (metrics.preferredDirection === 'LEFT' && metrics.directionConfidence >= 0.6) {
      strategies.push({
        name: 'PROTECT_LEFT',
        confidence: metrics.directionConfidence,
        reason: `Player prefers LEFT attacks (${(metrics.directionConfidence * 100).toFixed(0)}%).`,
        speedMultiplier: 0.9,
      });
    }
    if (metrics.preferredDirection === 'RIGHT' && metrics.directionConfidence >= 0.6) {
      strategies.push({
        name: 'PROTECT_RIGHT',
        confidence: metrics.directionConfidence,
        reason: `Player prefers RIGHT attacks (${(metrics.directionConfidence * 100).toFixed(0)}%).`,
        speedMultiplier: 0.9,
      });
    }

    // 2. Rush detection
    if (s.rushCount > s.retreatCount * 2 && s.rushCount > 3) {
      const conf = Math.min(1, s.rushCount / (s.rushCount + s.retreatCount + 1));
      strategies.push({
        name: 'ANTI_RUSH',
        confidence: conf,
        reason: 'Player frequently rushes toward the enemy.',
        speedMultiplier: 0.8,
      });
    }

    // 3. Dash detection (dash per minute)
    const mins = (s.roundDuration || 1) / 60;
    const dpm = s.dashCount / mins;
    if (dpm > 10) {
      const conf = Math.min(1, (dpm - 10) / 20);
      strategies.push({
        name: 'ANTI_DASH',
        confidence: conf,
        reason: 'Player uses dash frequently.',
        speedMultiplier: 0.85,
      });
    }

    // 4. Defensive / far behaviour
    if (s.timeFar / (s.timeClose + s.timeFar || 1) > 0.6) {
      const conf = s.timeFar / (s.timeClose + s.timeFar);
      strategies.push({
        name: 'ANTI_DEFENSIVE',
        confidence: conf,
        reason: 'Player stays far away or hides often.',
      });
    }

    // Pick the strategy with highest confidence
    if (strategies.length === 0) {
      this.currentStrategy = { name: 'NONE', confidence: 0, reason: 'No dominant behaviour detected.' };
    } else {
      strategies.sort((a, b) => b.confidence - a.confidence);
      this.currentStrategy = strategies[0];
    }
  }

  /** Apply the selected strategy to the enemy */
  applyStrategy() {
    if (!this.enemy) return;
    if (!this.currentStrategy) return;
    this.enemy.applyStrategy(this.currentStrategy);
  }

  /** Public getters */
  getCurrentStrategy() { return this.currentStrategy; }
  getConfidence() { return this.currentStrategy?.confidence || 0; }
  getReason() { return this.currentStrategy?.reason || ''; }

  /** Reset for a new round */
  reset() {
    this.currentStrategy = null;
    this.analysis = null;
    this.summary = null;
  }

  /**
   * Pre-seed the strategy from a memory record saved at the end of a previous round.
   * This gives the AI a head-start on rounds 2+.
   * @param {object} memoryRecord - record from Memory.getLatest()
   */
  seedFromMemory(memoryRecord) {
    if (!memoryRecord || !memoryRecord.strategy) return;
    if (memoryRecord.strategy === 'NONE') return;
    this.currentStrategy = {
      name:       memoryRecord.strategy,
      confidence: memoryRecord.confidence || 0.5,
      reason:     memoryRecord.reason || 'Learned from previous round.',
    };
    // Apply immediately so the enemy starts adapted
    this.applyStrategy();
  }
}

