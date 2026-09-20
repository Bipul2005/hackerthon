# ADAPT

> **"The enemy doesn't just get stronger. It learns how you play."**

ADAPT is a browser-based 2D combat game where an AI enemy observes your play style, detects your patterns, and dynamically changes its strategy to counter you. The longer you fight, the smarter it gets.

---

## 🎮 Play Now

```bash
npm install
npm run dev
```
Then open `http://localhost:5173` in your browser.

---

## ✅ Implemented Features (Stage 1)

- **Start Screen** — Animated title screen with game description and Start button
- **Combat Arena** — Bounded top-down arena with cyberpunk grid aesthetic
- **Player** — WASD movement, 100 HP, invincibility frames after damage
- **Enemy** — Tracks and chases the player, contact-based attacks (10 HP / 800ms cooldown)
- **HUD** — Player HP bar, Enemy HP bar, Round counter, Status messages
- **Game Loop** — Start Screen → Combat → Win/Lose → Return to Title
- **Behavior Tracker scaffold** — Records player snapshots every frame (data not yet analyzed)

---

## 🔲 Planned Features (Stage 2+)

- **Live behavior analysis** — Pattern detection from recorded movement history
- **Adaptive strategy switching** — Enemy changes approach mid-fight based on your patterns
- **AI memory** — Enemy remembers how you played in previous rounds
- **Multiple enemy strategies** — Aggressive, Flanking, Retreating, Unpredictable
- **Strategy announcements** — HUD shows when enemy adapts ("ENEMY ADAPTED: FLANKING")
- **Player abilities** — Dash, shield, special attacks
- **Multiple rounds** with increasing adaptation
- **Score and performance tracking**

---

## 🛠 Technology Stack

| Layer       | Technology          |
|-------------|---------------------|
| Game Engine | Phaser.js 3         |
| Language    | JavaScript (ESM)    |
| Build Tool  | Vite                |
| Runtime     | Browser             |
| Styling     | CSS3 + Google Fonts |

---

## 🕹 Controls

| Key   | Action                          |
|-------|---------------------------------|
| W     | Move Up                         |
| A     | Move Left                       |
| S     | Move Down                       |
| D     | Move Right                      |
| R     | Return to Title (after win/lose)|

---

## 📁 Project Structure

```
hackerthon/
├── README.md
├── LICENSE
├── .gitignore
├── package.json
│
├── index.html          ← Game entry point
├── style.css           ← Global styles (dark cyberpunk theme)
│
├── src/
│   ├── main.js         ← Phaser init + scene registration
│   ├── game.js         ← StartScene + GameScene
│   ├── player.js       ← Player class (movement, health)
│   ├── enemy.js        ← Enemy class (AI, attacks, strategy hook)
│   ├── ui.js           ← HUD (HP bars, round, status)
│   ├── tracker.js      ← [Stage 1] Behavior recorder scaffold
│   ├── analyzer.js     ← [Stage 2] Behavior pattern analyzer (planned)
│   ├── adaptiveAI.js   ← [Stage 2+] Strategy selection engine (planned)
│   └── memory.js       ← [Stage 2+] Cross-round AI memory (planned)
│
├── assets/
│   ├── player/         ← Player sprites (TBD)
│   ├── enemy/          ← Enemy sprites (TBD)
│   ├── map/            ← Arena tiles (TBD)
│   ├── effects/        ← VFX sprites (TBD)
│   └── sounds/         ← Audio (TBD)
│
├── docs/
│   ├── architecture.md ← System architecture + module map
│   ├── gameplay.md     ← Game design + loop documentation
│   └── ai-system.md    ← Full AI pipeline documentation
│
└── screenshots/        ← Game screenshots
```

---

## 🧠 Future AI Architecture

```
PLAYER
  │
  ▼
BEHAVIOR TRACKER     ← Observes and records player actions
  │
  ▼
BEHAVIOR ANALYZER    ← Extracts patterns (movement bias, aggression, timing)
  │
  ▼
ADAPTIVE AI          ← Selects counter-strategy from strategy library
  │
  ▼
AI MEMORY            ← Stores strategy effectiveness across rounds
  │
  ▼
ENEMY STRATEGY       ← Applied to enemy behavior in real-time
  │
  ▼
ENEMY
```

---

## 🚀 Installation & Running

**Prerequisites:** Node.js 18+

```bash
# 1. Clone the repository
git clone https://github.com/Bipul2005/hackerthon.git
cd hackerthon

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open in browser
# → http://localhost:5173
```

---

## 📖 Documentation

| Document                            | Contents                              |
|-------------------------------------|---------------------------------------|
| [docs/architecture.md](docs/architecture.md) | System design, module map, stage roadmap |
| [docs/gameplay.md](docs/gameplay.md)          | Game loop, controls, HUD, mechanics  |
| [docs/ai-system.md](docs/ai-system.md)        | Full AI pipeline design              |

---

## 📌 Stage 1 Goals

- [x] Project scaffold and repository structure
- [x] Phaser.js integration with Vite
- [x] Animated start screen
- [x] Top-down arena with physics bounds
- [x] WASD player movement
- [x] Enemy chase behavior + contact attacks
- [x] HP system with invincibility frames
- [x] HUD (HP bars, round, status)
- [x] Win/Lose game loop
- [x] Behavior tracker scaffold
- [x] AI module stubs (analyzer, adaptiveAI, memory)
- [x] Documentation (architecture, gameplay, ai-system)

---

*ADAPT — Stage 1 | Built for Hackathon*
