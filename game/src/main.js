// The Lantern Thief — the game itself: the loop, the state machine, the
// input, and the one shared detection meter the HUD shows.
// Modes: title → playing → (caught → retry) / (levelclear → next) → win.

import { VIEW_W, VIEW_H, SPOT_DECAY } from './config.js';
import { LEVELS } from './levels.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Guard } from './guards.js';
import { SoundBank } from './audio.js';
import { Renderer } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const sounds = new SoundBank();
const renderer = new Renderer(canvas);
const keys = { up: false, down: false, left: false, right: false, run: false };

const game = {
  mode: 'title',
  levelIndex: 0,
  world: null,
  player: null,
  guards: [],
  alert: 0,
  alertCtl: { raise: () => { game.alert = 100; } },
  levelTime: 0,
  totalTime: 0,
  time: 0,
  spots: 0,
  stars: 0,
  levelStars: [0, 0, 0],
  noiseRings: [],
  frozen: false,

  loadLevel(index) {
    this.levelIndex = index;
    this.world = new World(LEVELS[index]);
    this.player = new Player(this.world);
    this.guards = this.world.guardSpawns.map((route) => new Guard(this.world, route, index));
    this.alert = 0;
    this.levelTime = 0;
    this.spots = 0;
    this.noiseRings = [];
  },

  startLevel(index) {
    this.loadLevel(index);
    this.mode = 'playing';
  },

  starsForLevel() {
    if (this.spots === 0) return 3;
    if (this.spots === 1) return 2;
    return 1;
  },
};

function updateAlert(dt) {
  const anyChase = game.guards.some((g) => g.state === 'chase');
  const maxSuspicion = Math.max(0, ...game.guards.map((g) => g.suspicion));
  if (anyChase) {
    game.alert = 100;
  } else {
    game.alert = Math.max(maxSuspicion, game.alert - SPOT_DECAY * dt);
  }
}

function updatePlaying(dt) {
  game.levelTime += dt;
  const event = game.player.update(dt, keys);
  if (event) {
    if (event.type === 'step') sounds.footstep(false);
    if (event.type === 'noise') {
      sounds.footstep(true);
      game.noiseRings.push({ x: event.x, y: event.y, age: 0 });
      for (const guard of game.guards) {
        const d = Math.hypot(guard.x - event.x, guard.y - event.y);
        if (d < event.radius) guard.hearNoise(event.x, event.y);
      }
    }
    if (event.type === 'pickup') {
      sounds.pickup();
      if (game.world.allLanternsTaken()) sounds.levelClear();
    }
  }
  const wasAlarmed = game.guards.some((g) => g.state === 'chase');
  for (const guard of game.guards) {
    const result = guard.update(dt, game.player, game.alertCtl);
    if (result === 'caught') {
      game.mode = 'caught';
      sounds.caught();
      return;
    }
  }
  const isAlarmed = game.guards.some((g) => g.state === 'chase');
  if (isAlarmed && !wasAlarmed) {
    game.spots += 1;
    sounds.alarm();
  }
  updateAlert(dt);
  for (const ring of game.noiseRings) ring.age += dt;
  game.noiseRings = game.noiseRings.filter((ring) => ring.age < 0.6);
  // Reached the exit with every lantern: the level is clear.
  if (game.world.allLanternsTaken() && game.player.atExit()) {
    game.stars = game.starsForLevel();
    game.levelStars[game.levelIndex] = game.stars;
    game.totalTime += game.levelTime;
    sounds.levelClear();
    game.mode = 'levelclear';
  }
}

function updateTitle(dt) {
  // Attract mode: the garden plays itself behind the title.
  for (const guard of game.guards) guard.update(dt, game.player, game.alertCtl);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.frozen) {
    game.time += dt;
    if (game.mode === 'playing') updatePlaying(dt);
    else if (game.mode === 'title') updateTitle(dt);
  }
  renderer.draw(game);
  requestAnimationFrame(frame);
}

function advance() {
  sounds.unlock();
  if (game.mode === 'title') {
    game.startLevel(0);
  } else if (game.mode === 'caught') {
    game.startLevel(game.levelIndex);
  } else if (game.mode === 'levelclear') {
    if (game.levelIndex + 1 < LEVELS.length) game.startLevel(game.levelIndex + 1);
    else game.mode = 'win';
  } else if (game.mode === 'win') {
    game.totalTime = 0;
    game.levelStars = [0, 0, 0];
    game.startLevel(0);
  }
}

window.addEventListener('keydown', (e) => {
  sounds.unlock();
  const k = e.key.toLowerCase();
  if (k === 'arrowup' || k === 'w') keys.up = true;
  if (k === 'arrowdown' || k === 's') keys.down = true;
  if (k === 'arrowleft' || k === 'a') keys.left = true;
  if (k === 'arrowright' || k === 'd') keys.right = true;
  if (k === 'shift') keys.run = true;
  if (k === 'enter' || k === ' ') {
    if (game.mode !== 'playing') advance();
    e.preventDefault();
  }
  if (k === 'r' && game.mode === 'caught') advance();
  if ((k === 'p' || k === 'escape') && (game.mode === 'playing' || game.mode === 'paused')) {
    game.mode = game.mode === 'playing' ? 'paused' : 'playing';
  }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'arrowup' || k === 'w') keys.up = false;
  if (k === 'arrowdown' || k === 's') keys.down = false;
  if (k === 'arrowleft' || k === 'a') keys.left = false;
  if (k === 'arrowright' || k === 'd') keys.right = false;
  if (k === 'shift') keys.run = false;
});

canvas.addEventListener('mousedown', () => {
  sounds.unlock();
  if (game.mode !== 'playing' && game.mode !== 'paused') advance();
});

// Boot: load the garden for the title screen, then honour ?shot=.
game.loadLevel(0);
game.mode = 'title';
const shot = new URLSearchParams(window.location.search).get('shot');
if (shot) applyShot(game, shot);
requestAnimationFrame(frame);
