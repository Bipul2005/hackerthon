# ADAPT — AI System Documentation

> ⚠️ **This document describes the planned AI architecture.**
> Stage 1 only includes a basic behavior tracker scaffold.
> Stages 2+ will implement the full system described here.

---

## Overview

The ADAPT AI system is a **behavior-reactive, memory-augmented strategy engine**.

Unlike traditional game AI that simply scales enemy stats, ADAPT's enemy:
1. **Observes** how the player moves and fights
2. **Analyzes** recorded data to extract behavioral patterns
3. **Selects** a counter-strategy from a library of approaches
4. **Remembers** what worked across rounds and adjusts accordingly

---

## AI Pipeline

```
PLAYER
  │
  ▼
┌─────────────────────────────────┐
│  BEHAVIOR TRACKER (tracker.js)  │  ← Stage 1: Active (scaffold)
│  - Records position snapshots   │
│  - Records velocity, HP         │
│  - Frame-sampled history        │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  BEHAVIOR ANALYZER              │  ← Stage 2: PLANNED
│   (analyzer.js)                 │
│  - Movement heatmap             │
│  - Aggression score             │
│  - Dodge timing detection       │
│  - Preferred range calculation  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  ADAPTIVE AI (adaptiveAI.js)    │  ← Stage 2+: PLANNED
│  - Strategy selection engine    │
│  - Reads: profile + memory      │
│  - Outputs: strategy object     │
└────────────┬──────┬─────────────┘
             │      │
             ▼      ▼
┌────────────┐  ┌───────────────────┐
│ AI MEMORY  │  │  ENEMY STRATEGY   │
│(memory.js) │  │  - Aggressive     │
│- Stores    │  │  - Flanking       │
│  round     │  │  - Retreating     │
│  outcomes  │  │  - Unpredictable  │
└────────────┘  └────────┬──────────┘
                         │
                         ▼
                      ENEMY
```

---

## Behavior Metrics (Planned)

| Metric             | Description                                              |
|--------------------|----------------------------------------------------------|
| Movement bias      | Preferred direction (left/right/top/bottom of arena)     |
| Aggression score   | Ratio of time spent approaching vs retreating            |
| Preferred range    | Average combat distance maintained from enemy            |
| Dodge timing       | Detected delay between threat signal and evasion         |
| Pattern confidence | How consistent the detected patterns are (0–1)           |

---

## Strategy Library (Planned)

### Aggressive
- High speed multiplier
- Relentless chase
- Short attack cooldown
- **Counters**: retreating players

### Flanking
- Circles the player to attack from the side
- Medium speed
- **Counters**: stationary or slow players

### Retreating / Bait
- Moves away when player approaches
- Punishes committed attacks
- **Counters**: aggressive players

### Unpredictable
- Randomizes all patterns every few seconds
- **Counters**: players who have learned to read patterns

---

## Memory System (Planned)

The AI retains behavioral profiles across rounds within a session:

```json
{
  "rounds": [
    {
      "round": 1,
      "profile": { "aggressionScore": 0.3, "preferredRange": 120 },
      "strategyUsed": "aggressive",
      "outcome": "win",
      "damageTaken": 40,
      "damageDealt": 150
    }
  ],
  "aggregateProfile": { ... }
}
```

The aggregate profile is updated after each round, allowing the AI to improve its read on the player over time.

---

## Implementation Roadmap

| Stage | Feature                        | Module          | Status     |
|-------|--------------------------------|-----------------|------------|
| 1     | Tracker scaffold               | tracker.js      | ✅ Active   |
| 2     | Live behavior recording        | tracker.js      | 🔲 Planned  |
| 2     | Pattern analysis               | analyzer.js     | 🔲 Planned  |
| 3     | Strategy selection             | adaptiveAI.js   | 🔲 Planned  |
| 3     | Enemy strategy application     | enemy.js        | 🔲 Planned  |
| 4     | Cross-round memory             | memory.js       | 🔲 Planned  |
| 5     | Strategy visualization (HUD)   | ui.js           | 🔲 Planned  |
| 6     | Multi-strategy library         | adaptiveAI.js   | 🔲 Planned  |
