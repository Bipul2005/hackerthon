// src/dialogue.js
/**
 * DialogueManager – deterministic short lines based on player behavior and AI analysis.
 * No external LLM required.
 */
export class DialogueManager {
  constructor() {
    this.lastStrategy = null;          // previously selected strategy name
    this.lastPreferred = null;         // previously detected preferred attack direction
    this.lastDashCount = 0;            // dash count at last check
    this.lastRound = 0;
    this.lastMessage = null;           // avoid repeating the same line consecutively
  }

  /** Called at the start of each round */
  startRound(round) {
    this.lastRound = round;
    this.lastStrategy = null;
    this.lastPreferred = null;
    this.lastDashCount = 0;
    this.lastMessage = null;
  }

  /**
   * Generate a dialogue line based on the latest analysis and tracker state.
   * Returns a short string or null if nothing new to say.
   */
  generate(analysis, tracker) {
    if (!analysis || !tracker) return null;
    const msgs = [];
    const metrics = analysis.metrics || {};

    // Preferred attack direction comment (once per direction change)
    if (metrics.preferredDirection && metrics.directionConfidence >= 0.6) {
      if (this.lastPreferred !== metrics.preferredDirection) {
        msgs.push(`You always attack from the ${metrics.preferredDirection.toLowerCase()}.`);
        this.lastPreferred = metrics.preferredDirection;
      }
    }

    // Dash usage comment – only when dash frequency becomes noticeable
    const dashCount = tracker.dashCount || 0;
    if (dashCount > this.lastDashCount) {
      const roundDurationSec = tracker.roundDuration || tracker.round?.duration || 1;
      const minutes = roundDurationSec / 60;
      const dpm = dashCount / Math.max(minutes, 0.01);
      if (dpm > 10 && this.lastDashCount === 0) {
        msgs.push('That dash is getting predictable.');
      }
      this.lastDashCount = dashCount;
    }

    // Strategy change / adoption comments
    const stratInfo = analysis.strategyInfo;
    if (stratInfo && stratInfo.name) {
      if (this.lastStrategy && this.lastStrategy !== stratInfo.name) {
        msgs.push("Interesting... you've changed your approach.");
      } else if (!this.lastStrategy) {
        // First time we have a strategy after analysis
        msgs.push("I know what you're going to try.");
      }
      this.lastStrategy = stratInfo.name;
    }

    // Fallback generic comment at round start
    if (msgs.length === 0 && this.lastMessage === null) {
      msgs.push("Let's see what you have for me.");
    }

    // Return first non‑repeated message
    const message = msgs.find(m => m !== this.lastMessage) || null;
    if (message) this.lastMessage = message;
    return message;
  }

  /** Final line to show on the result screen */
  finalMessage(memory) {
    const latest = memory?.getLatest?.();
    if (!latest) return "Thanks for playing.";
    const strat = latest.strategy || 'NONE';
    switch (strat) {
      case 'PROTECT_LEFT':
        return "Your left attacks are etched in my memory.";
      case 'PROTECT_RIGHT':
        return "Right‑side strikes will not catch me again.";
      case 'ANTI_RUSH':
        return "Rushing won\'t work forever.";
      default:
        return "I have learned much from this match.";
    }
  }
}
