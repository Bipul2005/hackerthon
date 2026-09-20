# ADAPT — Gameplay Documentation

## Core Concept

> "The enemy doesn't just get stronger. It learns how you play."

ADAPT is a top-down 2D combat game where the player faces a single adaptive AI enemy. As you fight, the enemy analyzes your play style — your movement patterns, your preferred range, your dodge timing — and changes its strategy to counter you.

---

## Controls

| Key   | Action       |
|-------|--------------|
| W     | Move Up      |
| A     | Move Left    |
| S     | Move Down    |
| D     | Move Right   |
| R     | Return to Title (after win/lose) |

---

## Stage 1 Gameplay Loop

```
Title Screen
     │
     └─► [Start Game]
              │
              ▼
         Game Arena
     ┌────────────────┐
     │  Player vs     │
     │  Enemy         │
     │                │
     │  Enemy moves   │
     │  toward player │
     │  & attacks     │
     └────┬───────────┘
          │
     ┌────┴────┐
     │         │
   WIN        LOSE
(Enemy HP=0) (Player HP=0)
     │         │
     └────┬────┘
          │
    [R] Return to Title
```

---

## Player

- **Health**: 100 HP
- **Movement**: WASD, top-down, normalized diagonal movement
- **Invincibility frames**: 500ms after taking damage (prevents instant death)

## Enemy (Stage 1)

- **Health**: 150 HP
- **Behavior**: Chases player using direct pathfinding
- **Attack**: Contact-based, 10 HP per hit, 800ms cooldown
- **Visual**: Pulsing red circle with inner core

---

## HUD Elements

| Element        | Location         | Description                |
|----------------|------------------|----------------------------|
| Player HP bar  | Bottom-left      | Cyan → Yellow → Red        |
| Enemy HP bar   | Bottom-right     | Red → Orange → Yellow      |
| Round number   | Top-center       | Current round              |
| Status message | Center           | Win/Lose/Round start       |

---

## Arena

- Bounded 2D arena with physics world bounds
- Cyberpunk grid floor aesthetic
- Corner accent lights mark the play boundary
- 960×640 pixels

---

## Planned Gameplay Additions (Future Stages)

- **Multiple rounds** with enemy adaptation between rounds
- **Enemy special attacks** (dash, ranged projectile, AoE)
- **Player special ability** (dash, shield, counterattack)
- **Enemy strategy announcements** (e.g., "ENEMY ADAPTED: FLANKING")
- **Score / performance tracking**
- **Multiple enemy types**
