/**
 * main.js — ADAPT Application Entry Point
 *
 * Initializes the Phaser game engine and registers all scenes.
 * This file is the top-level module loaded by index.html.
 */

import Phaser from 'phaser';
import { StartScene } from './game.js';
import { GameScene } from './game.js';

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  parent: 'game-container',
  backgroundColor: '#0a0a0f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 640,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [StartScene, GameScene],
};

// Boot the game
const game = new Phaser.Game(config);

export default game;
