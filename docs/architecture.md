# ADAPT — Architecture Documentation

## Overview

ADAPT is a browser-based 2D game built with **Phaser.js** (v3). The architecture is designed to be modular and extensible, with clear separation between game logic and the AI system.

---

## Technology Stack

| Layer         | Technology              |
|---------------|-------------------------|
| Runtime       | Browser (Chromium/Firefox) |
| Game Engine   | Phaser.js 3             |
| Language      | JavaScript (ES Modules) |
| Build Tool    | Vite                    |
| Styling       | CSS3 + Google Fonts     |

---

## Module Architecture

```
src/
├── main.js        ← Application entry point — boots Phaser, loads scenes
├── game.js        ← StartScene + GameScene (core game loop)
├── player.js      ← Player class (movement, health, state)
├── enemy.js       ← Enemy class (behavior, health, strategy hook)
├── ui.js          ← HUD rendering (HP bars, round counter, status)
│
├── tracker.js     ← [Stage 1: Active] Records player behavior snapshots
├── analyzer.js    ← [Stage 2: Planned] Extracts behavior patterns
├── adaptiveAI.js  ← [Stage 2+: Planned] Strategy selection engine
└── memory.js      ← [Stage 2+: Planned] Cross-round AI memory
```

---

## AI System Pipeline (Full — Stages 1–N)

```
PLAYER
  │
  ▼
BEHAVIOR TRACKER (tracker.js)
  │  Records: position, velocity, HP, timing snapshots
  │
  ▼
BEHAVIOR ANALYZER (analyzer.js)                [Stage 2]
  │  Detects: movement bias, aggression score, dodge timing
  │
  ▼
ADAPTIVE AI (adaptiveAI.js)                    [Stage 2+]
  │  Selects: strategy based on profile + memory
  │
  ▼
AI MEMORY (memory.js)                          [Stage 2+]
  │  Stores: round outcomes, strategy effectiveness
  │
  ▼
ENEMY STRATEGY
  │  Applied via Enemy.applyStrategy()
  │
  ▼
ENEMY
```

---

## Game Scene Flow

```
StartScene
  │
  └─► [Start Game] ──► GameScene
                          │
                    ┌─────┴──────┐
                    │            │
                  WIN          LOSE
                    │            │
                    └────────────┘
                          │
                    [R] → StartScene
```

---

## Stage Status

| Stage | Feature                              | Status     |
|-------|--------------------------------------|------------|
| 1     | Project foundation + basic game loop | ✅ Done     |
| 2     | Behavior tracking (live data)        | 🔲 Planned  |
| 3     | Pattern analysis engine              | 🔲 Planned  |
| 4     | Adaptive strategy switching          | 🔲 Planned  |
| 5     | Cross-round AI memory                | 🔲 Planned  |
| 6     | Multi-strategy enemy behaviors       | 🔲 Planned  |
