// The Lantern Thief — the thief. Walks silently, runs fast and loud,
// hides in bushes, and pockets lanterns by touching them.

import {
  TILE, PLAYER_WALK_SPEED, PLAYER_RUN_SPEED, PLAYER_RADIUS, NOISE_RADIUS, NOISE_TICK,
} from './config.js';

export class Player {
  constructor(world) {
    this.world = world;
    this.reset();
  }

  reset() {
    this.x = this.world.playerStart.x;
    this.y = this.world.playerStart.y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 0; // radians; 0 faces right
    this.running = false;
    this.noiseTimer = 0;
    this.hidden = false; // inside a bush right now
    this.inLight = false;
    this.stepTimer = 0;
    this.moving = false;
  }

  // keys: {up, down, left, right, run}. dt in seconds.
  // Returns an event object when something worth a sound happens.
  update(dt, keys) {
    let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    const len = Math.hypot(dx, dy);
    this.moving = len > 0;
    this.running = this.moving && !!keys.run;
    const speed = this.running ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
    if (len > 0) {
      dx /= len;
      dy /= len;
      this.facing = Math.atan2(dy, dx);
    }
    this.vx = dx * speed;
    this.vy = dy * speed;
    this.moveAxis(dt, this.vx, 0);
    this.moveAxis(dt, 0, this.vy);

    this.hidden = this.world.isBush(this.x, this.y);
    this.inLight = this.world.isLit(this.x, this.y);

    // Footsteps: walking ticks quietly, running pings loudly enough for
    // guards to hear. The caller plays the sound and warns the guards.
    let event = null;
    if (this.moving) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.running ? NOISE_TICK : 0.42;
        event = { type: this.running ? 'noise' : 'step', x: this.x, y: this.y, radius: NOISE_RADIUS };
      }
    } else {
      this.stepTimer = 0;
    }

    // Pocket any lantern touched.
    for (const lantern of this.world.lanterns) {
      if (!lantern.taken && Math.hypot(lantern.x - this.x, lantern.y - this.y) < TILE * 0.7) {
        lantern.taken = true;
        event = { type: 'pickup', x: lantern.x, y: lantern.y, radius: 0 };
      }
    }
    return event;
  }

  // Move along one axis, stopping at walls instead of sliding through them.
  moveAxis(dt, vx, vy) {
    const nx = this.x + vx * dt;
    const ny = this.y + vy * dt;
    if (this.world.isDiscClear(nx, this.y, PLAYER_RADIUS)) this.x = nx;
    if (this.world.isDiscClear(this.x, ny, PLAYER_RADIUS)) this.y = ny;
    this.x = Math.max(PLAYER_RADIUS, Math.min(32 * TILE - PLAYER_RADIUS, this.x));
    this.y = Math.max(PLAYER_RADIUS, Math.min(18 * TILE - PLAYER_RADIUS, this.y));
  }

  atExit() {
    return Math.hypot(this.world.exit.x - this.x, this.world.exit.y - this.y) < TILE * 0.75;
  }
}
