// The Lantern Thief — screenshot presets. A `?shot=` query in the URL
// stages one exact moment of the game and freezes it, so a screenshot
// is the same picture every time it is taken:
//   title  — the title screen over the garden, guards on patrol
//   cover  — mid-heist: the thief hidden in a bush, a guard's cone
//            sweeping toward them, one lantern already stolen
//   patrol — the library: the thief in shadow near the exit, two
//            guards crossing with their cones, two lanterns stolen
//   win    — the final screen, 9 of 9 stars

import { TILE } from './config.js';

function placeGuard(guard, tileX, tileY, facing, suspicion) {
  guard.x = (tileX + 0.5) * TILE;
  guard.y = (tileY + 0.5) * TILE;
  guard.facing = facing;
  guard.suspicion = suspicion;
  guard.state = 'patrol';
}

export function applyShot(game, name) {
  game.frozen = true;
  game.time = 3.7;
  if (name === 'title') {
    game.mode = 'title';
    game.loadLevel(0);
    return;
  }
  if (name === 'cover') {
    game.loadLevel(0);
    game.mode = 'playing';
    game.levelTime = 107;
    // Thief crouched in the top-left bush.
    game.player.x = 2.5 * TILE;
    game.player.y = 2.5 * TILE;
    game.player.hidden = true;
    game.player.facing = Math.PI / 4;
    // One lantern already in the pocket.
    game.world.lanterns[0].taken = true;
    // The nearest guard turns its cone toward the bush, half sure.
    const guard = game.guards[0];
    placeGuard(guard, 13, 5, Math.atan2(2.5 - 5.5, 2.5 - 13.5), 42);
    const other = game.guards[1];
    placeGuard(other, 19, 9, Math.PI / 2, 0);
    game.alert = 42;
    return;
  }
  if (name === 'patrol') {
    game.loadLevel(1);
    game.mode = 'playing';
    game.levelTime = 145;
    // Thief in the shadow by the bottom corridor, two lanterns stolen.
    game.player.x = 26.5 * TILE;
    game.player.y = 15.5 * TILE;
    game.player.facing = Math.PI;
    game.player.hidden = false;
    game.world.lanterns[0].taken = true;
    game.world.lanterns[1].taken = true;
    // Two guards crossing: one mid-corridor, one sweeping the bottom.
    placeGuard(game.guards[2], 12, 7, 0, 0);
    placeGuard(game.guards[3], 20, 15, Math.PI, 12);
    game.alert = 12;
    return;
  }
  if (name === 'win') {
    game.loadLevel(0);
    game.mode = 'win';
    game.totalTime = 512;
    game.levelStars = [3, 3, 3];
    return;
  }
  // Unknown shot name: fall back to the title screen.
  game.mode = 'title';
  game.loadLevel(0);
}
