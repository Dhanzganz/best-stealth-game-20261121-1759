// The Lantern Thief — tuning constants. One place for every number the
// game balances on, so a tweak never means hunting through the logic.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const VIEW_W = 1280;
export const VIEW_H = 720;

export const PLAYER_WALK_SPEED = 150; // px per second, silent
export const PLAYER_RUN_SPEED = 235; // px per second, noisy
export const PLAYER_RADIUS = 13;

export const GUARD_PATROL_SPEED = 72;
export const GUARD_CHASE_SPEED = 188;
export const GUARD_INVESTIGATE_SPEED = 110;
export const GUARD_RADIUS = 14;
export const GUARD_CATCH_RADIUS = 20;

export const CONE_HALF_ANGLE = (37 * Math.PI) / 180; // 74 degree cone
export const CONE_RANGE = [205, 225, 245]; // per level, px

// Suspicion fills 0..100 while a guard sees the thief.
export const SPOT_RATE_CLOSE = 95; // per second, point blank in lamplight
export const SPOT_RATE_FAR = 34; // per second, at the edge of the cone
export const SPOT_SHADOW_FACTOR = 0.45; // standing outside lamplight
export const SPOT_DECAY = 30; // per second while unseen
export const ALARM_HOLD = 3.0; // seconds unseen before a chase cools off
export const BUSH_HIDE_TIME = 1.5; // seconds hidden in a bush to lose a chase

export const NOISE_RADIUS = 135; // running is heard this far
export const NOISE_TICK = 0.35; // seconds between footstep pings while running
export const LAMP_RADIUS = 95; // lamplight pool radius, px

export const LEVEL_NAMES = [
  'Moonlit Garden',
  'The Old Library',
  'The Vault Hall',
];

export const PALETTE = {
  floorA: '#232c3d',
  floorB: '#202835',
  floorEdge: '#2e3a4f',
  wallTop: '#4a5872',
  wallFace: '#333f57',
  wallEdge: '#1a2233',
  bush: '#1d4d2b',
  bushLight: '#2a6b3c',
  lampGlow: 'rgba(255, 205, 110, 0.16)',
  lampCore: '#ffd77a',
  coneCalm: 'rgba(255, 214, 110, 0.20)',
  coneSuspicious: 'rgba(255, 170, 60, 0.38)',
  coneAlarm: 'rgba(255, 70, 60, 0.42)',
  exitLocked: '#5a6b8a',
  exitOpen: '#7dff9a',
  lantern: '#ffd24a',
  player: '#8fd0ff',
  playerHood: '#5b7fb8',
  guard: '#e05252',
  guardCloak: '#a03a3a',
  hudBg: 'rgba(8, 12, 22, 0.72)',
  hudText: '#e8ecf4',
  hudDim: '#9aa7bd',
  titleGold: '#ffd24a',
};
