// The Lantern Thief — every pixel the player sees: the moonlit estate,
// the guards' vision cones, the thief, the lanterns, the HUD, and all
// the screens. Pure canvas 2D, drawn procedurally, no image files.

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, CONE_HALF_ANGLE, PALETTE, LEVEL_NAMES } from './config.js';

function star(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  draw(game) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    this.drawWorld(game);
    if (game.mode === 'title') this.drawTitle(game);
    else this.drawHud(game);
    if (game.mode === 'caught') this.drawCaught(game);
    if (game.mode === 'levelclear') this.drawLevelClear(game);
    if (game.mode === 'win') this.drawWin(game);
    if (game.mode === 'paused') this.drawPaused();
    this.drawVignette();
  }

  drawWorld(game) {
    const ctx = this.ctx;
    const world = game.world;
    // Floor: two-tone stone tiles with a faint moonlit gradient.
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const tile = world.grid[y][x];
        const px = x * TILE;
        const py = y * TILE;
        if (tile === '#') continue;
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      }
    }
    // Lamplight pools.
    for (const lamp of world.lamps) {
      const g = ctx.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, 95);
      g.addColorStop(0, 'rgba(255, 205, 110, 0.22)');
      g.addColorStop(1, 'rgba(255, 205, 110, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(lamp.x - 95, lamp.y - 95, 190, 190);
      ctx.fillStyle = '#3a2f1c';
      ctx.fillRect(lamp.x - 3, lamp.y - 3, 6, 6);
      ctx.fillStyle = PALETTE.lampCore;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Bushes: dark green cover the thief can hide in.
    for (const bush of world.bushes) {
      ctx.fillStyle = PALETTE.bush;
      ctx.beginPath();
      ctx.arc(bush.x - 8, bush.y + 4, 15, 0, Math.PI * 2);
      ctx.arc(bush.x + 9, bush.y + 5, 14, 0, Math.PI * 2);
      ctx.arc(bush.x, bush.y - 8, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.bushLight;
      ctx.beginPath();
      ctx.arc(bush.x - 5, bush.y - 4, 5, 0, Math.PI * 2);
      ctx.arc(bush.x + 7, bush.y - 2, 4, 0, Math.PI * 2);
      ctx.arc(bush.x + 1, bush.y + 7, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Walls: dark face, lighter top edge so the level reads at a glance.
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (world.grid[y][x] !== '#') continue;
        const px = x * TILE;
        const py = y * TILE;
        ctx.fillStyle = PALETTE.wallFace;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(px, py, TILE, 6);
        ctx.strokeStyle = PALETTE.wallEdge;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      }
    }
    // Exit door: locked grey until every lantern is stolen, then green.
    const exit = world.exit;
    const open = world.allLanternsTaken();
    ctx.fillStyle = open ? PALETTE.exitOpen : PALETTE.exitLocked;
    roundRect(ctx, exit.x - 16, exit.y - 18, 32, 36, 6);
    ctx.fill();
    ctx.fillStyle = '#0d1420';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'EXIT' : 'LOCK', exit.x, exit.y);
    if (open) {
      const pulse = 0.5 + 0.3 * Math.sin(game.time * 4);
      ctx.strokeStyle = `rgba(125, 255, 154, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(exit.x - 20, exit.y - 22, 40, 44);
      ctx.lineWidth = 1;
    }
    // Lanterns: a golden glow and a swinging diamond.
    for (const lantern of world.lanterns) {
      if (lantern.taken) continue;
      const bob = Math.sin(game.time * 2.4 + lantern.x * 0.05) * 3;
      const g = ctx.createRadialGradient(lantern.x, lantern.y + bob, 2, lantern.x, lantern.y + bob, 30);
      g.addColorStop(0, 'rgba(255, 210, 74, 0.55)');
      g.addColorStop(1, 'rgba(255, 210, 74, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(lantern.x - 30, lantern.y + bob - 30, 60, 60);
      ctx.fillStyle = PALETTE.lantern;
      ctx.beginPath();
      ctx.moveTo(lantern.x, lantern.y + bob - 11);
      ctx.lineTo(lantern.x + 8, lantern.y + bob);
      ctx.lineTo(lantern.x, lantern.y + bob + 11);
      ctx.lineTo(lantern.x - 8, lantern.y + bob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(lantern.x, lantern.y + bob, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Vision cones first (under the guards), then the guards, then the thief.
    for (const guard of game.guards) this.drawCone(game, guard);
    for (const guard of game.guards) this.drawGuard(game, guard);
    if (game.mode !== 'title') this.drawPlayer(game);
    // Noise rings while running.
    for (const ring of game.noiseRings) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, 0.5 - ring.age)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, 14 + ring.age * 90, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  drawCone(game, guard) {
    const ctx = this.ctx;
    const alert = game.alert;
    let fill = PALETTE.coneCalm;
    if (alert >= 100 || guard.state === 'chase') fill = PALETTE.coneAlarm;
    else if (guard.suspicion > 35) fill = PALETTE.coneSuspicious;
    const range = guard.range;
    const g = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, range);
    g.addColorStop(0, fill);
    g.addColorStop(1, 'rgba(255, 214, 110, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, range, guard.facing - CONE_HALF_ANGLE, guard.facing + CONE_HALF_ANGLE);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 220, 130, 0.35)';
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing - CONE_HALF_ANGLE) * range, guard.y + Math.sin(guard.facing - CONE_HALF_ANGLE) * range);
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing + CONE_HALF_ANGLE) * range, guard.y + Math.sin(guard.facing + CONE_HALF_ANGLE) * range);
    ctx.stroke();
  }

  drawGuard(game, guard) {
    const ctx = this.ctx;
    const alarmed = guard.state === 'chase' || guard.suspicion >= 100;
    // Body: a red cloak with a darker hood.
    ctx.fillStyle = alarmed ? '#ff5a4a' : PALETTE.guardCloak;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.facing) * 5, guard.y + Math.sin(guard.facing) * 5, 8, 0, Math.PI * 2);
    ctx.fill();
    // Eyes look where the guard looks.
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.facing) * 8, guard.y + Math.sin(guard.facing) * 8 - 2, 1.8, 0, Math.PI * 2);
    ctx.arc(guard.x + Math.cos(guard.facing) * 8, guard.y + Math.sin(guard.facing) * 8 + 2, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Suspicion: a small "!" and a meter over an uneasy guard; a "?" while
    // the guard is walking over to investigate a noise it heard.
    if (guard.state === 'investigate') {
      ctx.fillStyle = '#9ecbff';
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', guard.x, guard.y - 24);
    }
    if (guard.suspicion > 5 && guard.suspicion < 100) {
      ctx.fillStyle = '#ffd24a';
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', guard.x, guard.y - 24);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(guard.x - 14, guard.y - 32, 28, 4);
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(guard.x - 14, guard.y - 32, 28 * (guard.suspicion / 100), 4);
    }
    if (alarmed) {
      ctx.fillStyle = '#ff5a4a';
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', guard.x, guard.y - 24);
    }
  }

  drawPlayer(game) {
    const ctx = this.ctx;
    const p = game.player;
    ctx.save();
    if (p.hidden) ctx.globalAlpha = 0.55;
    // Hooded cloak: blue body, darker hood, a glint of the lantern.
    ctx.fillStyle = PALETTE.playerHood;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.facing) * 4, p.y + Math.sin(p.facing) * 4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d1420';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.facing) * 7, p.y + Math.sin(p.facing) * 7 - 2, 1.6, 0, Math.PI * 2);
    ctx.arc(p.x + Math.cos(p.facing) * 7, p.y + Math.sin(p.facing) * 7 + 2, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (p.hidden) {
      ctx.fillStyle = '#7dff9a';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HIDDEN', p.x, p.y - 24);
    }
  }

  drawHud(game) {
    const ctx = this.ctx;
    const world = game.world;
    ctx.fillStyle = PALETTE.hudBg;
    roundRect(ctx, 0, 0, VIEW_W, 46, 0);
    ctx.fill();
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Level ${game.levelIndex + 1} — ${LEVEL_NAMES[game.levelIndex]}`, 16, 24);
    // Lanterns collected.
    const total = world.lanterns.length;
    const got = total - world.lanternsLeft();
    ctx.textAlign = 'center';
    for (let i = 0; i < total; i += 1) {
      const x = 560 + i * 30;
      ctx.fillStyle = i < got ? PALETTE.lantern : 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x + 8, 24);
      ctx.lineTo(x, 34);
      ctx.lineTo(x - 8, 24);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText(`${got}/${total} lanterns`, 640, 24);
    // Detection meter: an eye and a bar that fills as guards grow sure.
    const alert = game.alert;
    ctx.textAlign = 'left';
    ctx.fillStyle = alert >= 100 ? '#ff5a4a' : alert > 35 ? '#ffb13d' : PALETTE.hudText;
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(alert >= 100 ? 'SPOTTED!' : 'DETECTION', 760, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(880, 15, 160, 16);
    ctx.fillStyle = alert >= 100 ? '#ff5a4a' : alert > 35 ? '#ffb13d' : '#7dff9a';
    ctx.fillRect(880, 15, 160 * (alert / 100), 16);
    // Timer and times spotted.
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(this.formatTime(game.levelTime), 1180, 24);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(`spotted ×${game.spots}`, 1264, 24);
    // Objective line under the bar.
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const objective = world.allLanternsTaken()
      ? 'All lanterns stolen — reach the EXIT unseen!'
      : 'Steal every lantern, then slip out the EXIT unseen. Shift runs — but guards hear it.';
    ctx.fillText(objective, VIEW_W / 2, 64);
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  drawTitle(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6, 9, 18, 0.66)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.titleGold;
    ctx.font = '700 74px Georgia, serif';
    ctx.fillText('THE LANTERN THIEF', VIEW_W / 2, 210);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '400 24px Georgia, serif';
    ctx.fillText('Steal the golden lanterns. Slip past the guards. Reach the exit unseen.', VIEW_W / 2, 275);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText('WASD / Arrows — move    •    Shift — run (loud!)    •    Bushes hide you    •    Lamplight gives you away', VIEW_W / 2, 340);
    ctx.fillText('3 levels  •  3 lanterns a level  •  finish unseen for 3 stars', VIEW_W / 2, 372);
    const pulse = 0.65 + 0.35 * Math.sin(game.time * 3);
    ctx.fillStyle = `rgba(255, 210, 74, ${pulse})`;
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', VIEW_W / 2, 450);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText('A complete stealth game — guards with vision cones, noise, hiding, alarm and chase.', VIEW_W / 2, 510);
  }

  drawCaught(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(60, 5, 5, 0.62)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff6a5a';
    ctx.font = '700 64px Georgia, serif';
    ctx.fillText('CAUGHT!', VIEW_W / 2, 300);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '400 22px Georgia, serif';
    ctx.fillText('The guards were faster than your shadow.', VIEW_W / 2, 360);
    ctx.fillStyle = PALETTE.titleGold;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('Press R or click to try this level again', VIEW_W / 2, 420);
  }

  drawLevelClear(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6, 12, 8, 0.68)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7dff9a';
    ctx.font = '700 56px Georgia, serif';
    ctx.fillText('LEVEL CLEAR', VIEW_W / 2, 250);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '400 22px Georgia, serif';
    ctx.fillText(`${LEVEL_NAMES[game.levelIndex]} — finished in ${this.formatTime(game.levelTime)}`, VIEW_W / 2, 310);
    for (let i = 0; i < 3; i += 1) {
      star(ctx, VIEW_W / 2 - 70 + i * 70, 380, 30, i < game.stars ? PALETTE.lantern : 'rgba(255,255,255,0.18)');
    }
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText(game.stars === 3 ? 'Unseen. A perfect shadow.' : game.stars === 2 ? 'Spotted once — the guards almost had you.' : 'Loud and lucky. Try it unseen for 3 stars.', VIEW_W / 2, 440);
    ctx.fillStyle = PALETTE.titleGold;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('Click or press Enter for the next level', VIEW_W / 2, 500);
  }

  drawWin(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8, 10, 4, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.titleGold;
    ctx.font = '700 60px Georgia, serif';
    ctx.fillText('THE VAULT IS YOURS', VIEW_W / 2, 230);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '400 22px Georgia, serif';
    ctx.fillText(`All three lanterns stolen in ${this.formatTime(game.totalTime)} — and no guard ever laid a hand on you.`, VIEW_W / 2, 295);
    let totalStars = 0;
    game.levelStars.forEach((s) => { totalStars += s; });
    for (let i = 0; i < 9; i += 1) {
      star(ctx, VIEW_W / 2 - 200 + i * 50, 370, 20, i < totalStars ? PALETTE.lantern : 'rgba(255,255,255,0.18)');
    }
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText(`${totalStars} of 9 stars — Mira the Lantern Thief vanishes into the night.`, VIEW_W / 2, 430);
    ctx.fillStyle = PALETTE.titleGold;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('Click or press Enter to play again', VIEW_W / 2, 500);
  }

  drawPaused() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6, 9, 18, 0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '700 48px Georgia, serif';
    ctx.fillText('PAUSED', VIEW_W / 2, 330);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillText('Press P or Esc to keep sneaking', VIEW_W / 2, 390);
  }

  drawVignette() {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
