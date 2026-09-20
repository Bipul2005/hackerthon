// tests/adaptiveAI.test.js
import assert from 'assert';
import { AdaptiveAI } from '../src/adaptiveAI.js';

// Simple mock tracker that returns a summary object
function mockTracker(summary) {
  return {
    getSummary() { return summary; },
  };
}

function runTest(name, summary, expectedStrategy) {
  const tracker = mockTracker(summary);
  const enemy = { applyStrategy: () => {} }; // dummy enemy
  const ai = new AdaptiveAI(tracker, enemy);
  ai.analyzePlayer();
  ai.chooseStrategy();
  const result = ai.getCurrentStrategy();
  try {
    assert.strictEqual(result.name, expectedStrategy, `${name}: expected ${expectedStrategy}, got ${result.name}`);
    console.log(`${name}: PASS`);
  } catch (e) {
    console.error(`${name}: FAIL -`, e.message);
    process.exit(1);
  }
}

// 1. Player attacks mostly LEFT
runTest('LeftHeavy', {
  totalAttacks: 20,
  leftAttacks: 15,
  rightAttacks: 2,
  upAttacks: 2,
  downAttacks: 1,
  dashCount: 0,
  roundDuration: 120,
  timeClose: 30,
  timeFar: 30,
  rushCount: 1,
  retreatCount: 1,
}, 'PROTECT_LEFT');

// 2. Player attacks mostly RIGHT
runTest('RightHeavy', {
  totalAttacks: 20,
  leftAttacks: 2,
  rightAttacks: 15,
  upAttacks: 2,
  downAttacks: 1,
  dashCount: 0,
  roundDuration: 120,
  timeClose: 30,
  timeFar: 30,
  rushCount: 1,
  retreatCount: 1,
}, 'PROTECT_RIGHT');

// 3. Player constantly rushes
runTest('Rushy', {
  totalAttacks: 30,
  leftAttacks: 5,
  rightAttacks: 5,
  upAttacks: 5,
  downAttacks: 5,
  dashCount: 0,
  roundDuration: 180,
  timeClose: 80,
  timeFar: 20,
  rushCount: 10,
  retreatCount: 1,
}, 'ANTI_RUSH');

// 4. Player dashes frequently
runTest('Dashy', {
  totalAttacks: 10,
  leftAttacks: 2,
  rightAttacks: 2,
  upAttacks: 3,
  downAttacks: 3,
  dashCount: 30,
  roundDuration: 60,
  timeClose: 30,
  timeFar: 30,
  rushCount: 1,
  retreatCount: 1,
}, 'ANTI_DASH');

// 5. Player stays defensive/far away
runTest('Defensive', {
  totalAttacks: 5,
  leftAttacks: 1,
  rightAttacks: 1,
  upAttacks: 1,
  downAttacks: 2,
  dashCount: 0,
  roundDuration: 200,
  timeClose: 20,
  timeFar: 150,
  rushCount: 1,
  retreatCount: 10,
}, 'ANTI_DEFENSIVE');

// 6. Player stands stationary
runTest('Stationary', {
  totalAttacks: 5,
  leftAttacks: 1,
  rightAttacks: 1,
  upAttacks: 1,
  downAttacks: 2,
  dashCount: 0,
  roundDuration: 60,
  timeStationary: 40,
  stationaryStreak: 3.5,
  timeClose: 30,
  timeFar: 10,
  rushCount: 1,
  retreatCount: 1,
}, 'ANTI_STATIONARY');

console.log('All AdaptiveAI tests completed');
