// tests/analyzer.test.js
import assert from 'assert';
import { BehaviorAnalyzer } from '../src/analyzer.js';

function runTest(name, summary, expected) {
  const analyzer = new BehaviorAnalyzer();
  const { metrics, observations } = analyzer.analyze(summary);
  try {
    for (const [key, val] of Object.entries(expected.metrics)) {
      assert.strictEqual(metrics[key], val, `${name}: metric ${key} expected ${val} got ${metrics[key]}`);
    }
    console.log(`${name}: PASS`);
  } catch (e) {
    console.error(`${name}: FAIL -`, e.message);
    process.exit(1);
  }
}

// 1. Left‑heavy player
runTest('LeftHeavy', {
  totalAttacks: 20,
  leftAttacks: 15,
  rightAttacks: 2,
  upAttacks: 2,
  downAttacks: 1,
  hits: 14,
  dashCount: 5,
  roundDuration: 120,
  timeClose: 80,
  timeFar: 20,
  rushCount: 8,
  retreatCount: 1,
}, {
  metrics: {
    preferredDirection: 'LEFT',
    directionConfidence: 0.75,
    playStyle: 'AGGRESSIVE',
    dashUsage: 'MEDIUM',
    accuracy: 0.7,
    predictability: 0.7,
  },
});

// 2. Right‑heavy player (balanced otherwise)
runTest('RightHeavy', {
  totalAttacks: 10,
  leftAttacks: 1,
  rightAttacks: 7,
  upAttacks: 1,
  downAttacks: 1,
  hits: 5,
  dashCount: 2,
  roundDuration: 60,
  timeClose: 30,
  timeFar: 20,
  rushCount: 2,
  retreatCount: 3,
}, {
  metrics: {
    preferredDirection: 'RIGHT',
    directionConfidence: 0.7,
    playStyle: 'DEFENSIVE',
    dashUsage: 'LOW',
    accuracy: 0.5,
    predictability: 0.5,
  },
});

// 3. Aggressive player (high rush, many attacks)
runTest('Aggressive', {
  totalAttacks: 40,
  leftAttacks: 10,
  rightAttacks: 10,
  upAttacks: 10,
  downAttacks: 10,
  hits: 30,
  dashCount: 3,
  roundDuration: 180,
  timeClose: 130,
  timeFar: 10,
  rushCount: 12,
  retreatCount: 1,
}, {
  metrics: {
    preferredDirection: 'BALANCED',
    directionConfidence: 0.25,
    playStyle: 'AGGRESSIVE',
    dashUsage: 'LOW',
    accuracy: 0.75,
    predictability: 0.7,
  },
});

// 4. Defensive player (many retreats)
runTest('Defensive', {
  totalAttacks: 5,
  leftAttacks: 1,
  rightAttacks: 1,
  upAttacks: 1,
  downAttacks: 2,
  hits: 1,
  dashCount: 0,
  roundDuration: 200,
  timeClose: 20,
  timeFar: 150,
  rushCount: 1,
  retreatCount: 10,
}, {
  metrics: {
    preferredDirection: 'BALANCED',
    directionConfidence: 0.4,
    playStyle: 'DEFENSIVE',
    dashUsage: 'LOW',
    accuracy: 0.2,
    predictability: 0.5,
  },
});

// 5. High‑dash player
runTest('HighDash', {
  totalAttacks: 10,
  leftAttacks: 2,
  rightAttacks: 2,
  upAttacks: 3,
  downAttacks: 3,
  hits: 6,
  dashCount: 30,
  roundDuration: 60,
  timeClose: 40,
  timeFar: 10,
  rushCount: 3,
  retreatCount: 2,
}, {
  metrics: {
    dashUsage: 'HIGH',
  },
});

// 6. Low‑attack player (few attacks, low accuracy)
runTest('LowAttack', {
  totalAttacks: 2,
  leftAttacks: 0,
  rightAttacks: 1,
  upAttacks: 0,
  downAttacks: 1,
  hits: 0,
  dashCount: 1,
  roundDuration: 120,
  timeClose: 30,
  timeFar: 60,
  rushCount: 0,
  retreatCount: 4,
}, {
  metrics: {
    accuracy: 0,
    playStyle: 'DEFENSIVE',
  },
});

// 7. Random player (balanced directions, moderate dash)
runTest('Random', {
  totalAttacks: 12,
  leftAttacks: 3,
  rightAttacks: 3,
  upAttacks: 3,
  downAttacks: 3,
  hits: 6,
  dashCount: 6,
  roundDuration: 90,
  timeClose: 45,
  timeFar: 30,
  rushCount: 4,
  retreatCount: 4,
}, {
  metrics: {
    preferredDirection: 'BALANCED',
    directionConfidence: 0.25,
    playStyle: 'BALANCED',
    dashUsage: 'MEDIUM',
    accuracy: 0.5,
    predictability: 0.2,
  },
});

// 8. Stationary player
runTest('Stationary', {
  totalAttacks: 5,
  leftAttacks: 1,
  rightAttacks: 2,
  upAttacks: 1,
  downAttacks: 1,
  hits: 2,
  dashCount: 0,
  roundDuration: 60,
  timeStationary: 40,
  stationaryStreak: 3.5,
  timeClose: 30,
  timeFar: 10,
  rushCount: 0,
  retreatCount: 0,
}, {
  metrics: {
    stationaryBehavior: 'HIGH',
  },
});

console.log('All analyzer tests completed');
