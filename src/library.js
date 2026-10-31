/**
 * Freely redistributable homebrew bundled in public/roms/. Each was checked to
 * run on the VisualFC core; licenses and sources are in public/roms/LICENSES.txt.
 */
export const DEMO_ID = "orbital-lab";

export const GAMES = Object.freeze([
  {
    id: DEMO_ID,
    title: "Orbital Lab",
    author: "VisualFC",
    year: 2026,
    license: "MIT",
    source: "https://github.com/yili6ms/VisualFC",
    description: "VisualFC's built-in demo cartridge. Fly the ship around with the D-pad.",
    builtIn: true,
  },
  {
    id: "falling",
    title: "Falling",
    author: "tragicmuffin",
    year: 2018,
    license: "MIT",
    source: "https://github.com/tragicmuffin/falling-nes",
    description: "Fall through the sky and land on drifting platforms, in day, sunset or night mode.",
  },
  {
    id: "lunar-limit",
    title: "Lunar Limit",
    author: "Pubby",
    year: 2017,
    license: "MIT",
    source: "https://github.com/pubby/lunarlimit",
    description: "Early-80s-style arcade shooter: defend Mini Earth with the Moon Cannon.",
  },
  {
    id: "ralph-4",
    title: "RALPH 4",
    author: "Pubby",
    year: 2016,
    license: "MIT",
    source: "https://github.com/pubby/Ralph-4",
    description: "Guide Ralph the dwarf through 20 floors of the Evil Bear Lair.",
  },
  {
    id: "star-evil",
    title: "Star Evil",
    author: "Pubby",
    year: 2018,
    license: "MIT",
    source: "https://forums.nesdev.org/viewtopic.php?t=16993",
    description: "Fast-paced vertical shooter, remade from the Atari 5200 classic.",
  },
  {
    id: "concentration-room",
    title: "Concentration Room",
    author: "Damian Yerrick",
    year: 2010,
    license: "GPL-3.0+ (ROM exception)",
    source: "https://github.com/pinobatch/croom-nes",
    description: "Card-matching game with story, solitaire, 2-player and vs. CPU modes.",
  },
  {
    id: "robotfindskitten",
    title: "robotfindskitten",
    author: "Damian Yerrick",
    year: 2014,
    license: "zlib",
    source: "https://github.com/pinobatch/rfk-nes",
    description: "A Zen simulation: you are robot, and your job is to find kitten. For one or two players.",
  },
]);

export function findGame(id) {
  return GAMES.find((game) => game.id === id);
}

export const romUrl = (game) => `/roms/${game.id}.nes`;
export const thumbnailUrl = (game) => `/roms/${game.id}.png`;
