# The Lantern Thief

[![Competition](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![Rank](https://make.fun/badge/best-stealth-game-20261121-1759/Dhanzganz/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![Reward](https://make.fun/badge/best-stealth-game-20261121-1759/Dhanzganz/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

Entry for the make.fun bounty **best-stealth-game-20261121-1759** ("Make the best stealth game").

## The game

**The Lantern Thief** — a top-down stealth game. You are Mira, a thief slipping
through a moonlit estate to steal the golden lanterns and reach the exit unseen.

- **Guards with vision cones** patrol fixed routes. Step into a cone and the
  detection meter fills — faster up close, faster in lamplight, slower in
  shadow, not at all while you hide in a bush.
- **Noise matters**: running is faster but loud. Guards hear it and come to
  investigate the sound.
- **Get spotted and the alarm sounds**: guards chase. Break line of sight,
  vanish into a bush, and they lose you.
- **3 levels**, each with more guards, tighter patrols and trickier routes.
  Steal every lantern, then slip out the exit. Finish a level unseen for
  3 stars.

## Controls

- **WASD / Arrow keys** — move (walk, silent)
- **Shift** — run (fast, noisy)
- **P** or **Esc** — pause
- **R** — retry after being caught
- **Enter / Click** — menus and buttons

## How it works

- `game/index.html` + `game/src/*.js` — plain static files, no libraries,
  no network. Canvas 2D art drawn procedurally, WebAudio sounds synthesized
  in code.
- `main.ts` — copies `game/` and `screenshots/` to the output and writes
  `dossier.json` with the vendored `vendor/makefun-game.ts`.
- `screenshots/` — real renders of the game in a browser (title, gameplay,
  patrol, win screen).

## License

MIT — see `LICENSE`.
