// The Lantern Thief — the guards. Each one walks a patrol route, looks
// down a vision cone, and remembers what it saw:
//   patrol     — walk the waypoints, pause, look around
//   investigate — heard a noise: walk to it, look around, go back
//   chase      — the thief is spotted: run at them until they vanish
// A guard only sees the thief inside its cone, inside its range, with a
// clear line of sight, and never while the thief hides in a bush.

import {
  TILE, GUARD_PATROL_SPEED, GUARD_CHASE_SPEED, GUARD_INVESTIGATE_SPEED,
  GUARD_RADIUS, GUARD_CATCH_RADIUS, CONE_HALF_ANGLE, CONE_RANGE,
  SPOT_RATE_CLOSE, SPOT_RATE_FAR, SPOT_SHADOW_FACTOR, SPOT_DECAY,
  ALARM_HOLD, BUSH_HIDE_TIME,
} from './config.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Guard {
  constructor(world, route, levelIndex) {
    this.world = world;
    this.route = route.waypoints.map(([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }));
    this.pauseTime = route.pause ?? 1;
    this.range = CONE_RANGE[levelIndex] ?? CONE_RANGE[0];
    this.x = this.route[0].x;
    this.y = this.route[0].y;
    this.targetIndex = 1;
    this.state = 'patrol'; // patrol | investigate | chase | return
    this.facing = 0;
    this.pauseLeft = 0;
    this.lookTimer = 0;
    this.investigateAt = null;
    this.lastSeen = null;
    this.unseenTimer = 0;
    this.hiddenTimer = 0;
    this.suspicion = 0; // 0..100, this guard's own sense of the thief
    this.turnSpeed = 2.6;
  }

  // Can this guard see the thief right now? Bushes hide the thief outright.
  canSee(player) {
    if (player.hidden) return false;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.range) return false;
    const angle = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(angle, this.facing)) > CONE_HALF_ANGLE) return false;
    return this.world.hasLineOfSight(this.x, this.y, player.x, player.y);
  }

  // How fast suspicion grows while the thief is visible: closer and better
  // lit means faster; shadow slows it; a bush stops it entirely.
  spotRate(player, dist) {
    const near = 1 - Math.min(1, dist / this.range);
    let rate = SPOT_RATE_FAR + (SPOT_RATE_CLOSE - SPOT_RATE_FAR) * near;
    if (!player.inLight) rate *= SPOT_SHADOW_FACTOR;
    return rate;
  }

  update(dt, player, alert) {
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    const sees = this.canSee(player);
    if (sees) {
      this.suspicion = Math.min(100, this.suspicion + this.spotRate(player, dist) * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.unseenTimer = 0;
      this.hiddenTimer = 0;
    } else {
      this.suspicion = Math.max(0, this.suspicion - SPOT_DECAY * dt);
      this.unseenTimer += dt;
      if (player.hidden) this.hiddenTimer += dt;
      else this.hiddenTimer = 0;
    }

    // A full meter means the alarm is up: chase the thief.
    if (this.suspicion >= 100 && this.state !== 'chase') {
      this.state = 'chase';
      alert.raise();
    }
    if (this.state === 'chase') {
      if (this.lastSeen && (this.unseenTimer > ALARM_HOLD || this.hiddenTimer > BUSH_HIDE_TIME)) {
        this.state = 'investigate';
        this.investigateAt = { ...this.lastSeen };
        this.lastSeen = null;
      }
    }

    switch (this.state) {
      case 'patrol':
        this.walkPatrol(dt);
        break;
      case 'investigate':
        this.walkTo(dt, this.investigateAt, GUARD_INVESTIGATE_SPEED, () => {
          this.state = 'patrol';
          this.targetIndex = this.nearestWaypoint();
        });
        break;
      case 'chase': {
        const target = sees ? { x: player.x, y: player.y } : this.lastSeen;
        if (target) this.walkTo(dt, target, GUARD_CHASE_SPEED, null);
        break;
      }
      default:
        break;
    }

    // Touching the thief while the alarm is up ends the run.
    if (this.state === 'chase' && dist < GUARD_CATCH_RADIUS + 4) return 'caught';
    return null;
  }

  // Called when the guard hears a noise: turn and go look at it.
  hearNoise(x, y) {
    if (this.state === 'chase') return;
    this.state = 'investigate';
    this.investigateAt = { x, y };
  }

  nearestWaypoint() {
    let best = 0;
    let bestDist = Infinity;
    this.route.forEach((wp, i) => {
      const d = Math.hypot(wp.x - this.x, wp.y - this.y);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return (best + 1) % this.route.length;
  }

  walkPatrol(dt) {
    if (this.pauseLeft > 0) {
      this.pauseLeft -= dt;
      // Look around while waiting: slow scan of the surroundings.
      this.lookTimer += dt;
      this.facing += Math.sin(this.lookTimer * 1.4) * 0.9 * dt;
      return;
    }
    const target = this.route[this.targetIndex];
    const arrived = this.walkTo(dt, target, GUARD_PATROL_SPEED, () => {
      this.targetIndex = (this.targetIndex + 1) % this.route.length;
      this.pauseLeft = this.pauseTime;
      this.lookTimer = 0;
    });
    if (!arrived) {
      const want = Math.atan2(target.y - this.y, target.x - this.x);
      this.turnToward(want, dt);
    }
  }

  // Walk toward a point at a speed; call done() on arrival. Returns true
  // when it arrives this step.
  walkTo(dt, target, speed, done) {
    if (!target) return true;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) {
      if (done) done();
      return true;
    }
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    // Guards never walk through walls: stop and wait if blocked.
    if (this.world.isDiscClear(nx, this.y, GUARD_RADIUS)) this.x = nx;
    if (this.world.isDiscClear(this.x, ny, GUARD_RADIUS)) this.y = ny;
    const want = Math.atan2(dy, dx);
    this.turnToward(want, dt);
    return false;
  }

  turnToward(want, dt) {
    const diff = angleDiff(want, this.facing);
    const turn = Math.max(-this.turnSpeed * dt, Math.min(this.turnSpeed * dt, diff));
    this.facing += turn;
  }
}
