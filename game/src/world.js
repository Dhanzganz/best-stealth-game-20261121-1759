// The Lantern Thief — the world: a tile map parsed once per level, with
// every question the game asks about it (is this a wall? a bush? lit?).

import { TILE, COLS, ROWS, LAMP_RADIUS } from './config.js';

export class World {
  constructor(level) {
    this.name = level.name;
    this.grid = level.map.map((row) => [...row]);
    this.lanterns = [];
    this.lamps = [];
    this.bushes = [];
    this.playerStart = { x: 1.5 * TILE, y: 16.5 * TILE };
    this.exit = { x: 29.5 * TILE, y: 16.5 * TILE };
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const c = this.grid[y][x];
        const cx = (x + 0.5) * TILE;
        const cy = (y + 0.5) * TILE;
        if (c === 'P') this.playerStart = { x: cx, y: cy };
        if (c === 'E') this.exit = { x: cx, y: cy };
        if (c === '*') this.lanterns.push({ x: cx, y: cy, taken: false });
        if (c === 'L') this.lamps.push({ x: cx, y: cy });
        if (c === 'B') this.bushes.push({ x: cx, y: cy });
      }
    }
    this.guardSpawns = level.guards;
  }

  tileAt(px, py) {
    const x = Math.floor(px / TILE);
    const y = Math.floor(py / TILE);
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return '#';
    return this.grid[y][x];
  }

  isWall(px, py) {
    return this.tileAt(px, py) === '#';
  }

  isBush(px, py) {
    return this.tileAt(px, py) === 'B';
  }

  // True when the point sits inside any lamp's pool of light.
  isLit(px, py) {
    for (const lamp of this.lamps) {
      const dx = px - lamp.x;
      const dy = py - lamp.y;
      if (dx * dx + dy * dy < LAMP_RADIUS * LAMP_RADIUS) return true;
    }
    return false;
  }

  // Circle-vs-wall test: is a disc of radius r centred at (px, py) clear?
  isDiscClear(px, py, r) {
    const steps = [0, 0.5, 1];
    for (const a of steps) {
      for (const b of steps) {
        const ox = (a - 0.5) * 2 * r;
        const oy = (b - 0.5) * 2 * r;
        if (this.isWall(px + ox, py + oy)) return false;
      }
    }
    return true;
  }

  // Line of sight between two points: sample the segment and fail on any
  // wall tile it crosses. Bushes do not block sight.
  hasLineOfSight(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 8));
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      if (this.isWall(ax + dx * t, ay + dy * t)) return false;
    }
    return true;
  }

  lanternsLeft() {
    return this.lanterns.filter((lantern) => !lantern.taken).length;
  }

  allLanternsTaken() {
    return this.lanternsLeft() === 0;
  }
}
