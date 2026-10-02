// Public audio API — the only thing other modules should import from
// src/audio/**. Every method is a safe no-op when muted/headless (see
// engine.js header); callers never need to check audio state themselves.
import { setMasterVolume as _setMasterVolume } from './engine.js';
import { play as _play, setEngineSpeed as _setEngineSpeed, stopEngine as _stopEngine } from './sfx.js';
import { setState as _setMusicState } from './music.js';

export const AudioBus = {
  // name: 'vulcan' | 'missileLaunch' | 'lockOn' | 'explosion' | 'enemyFlyPast'
  //     | 'playerDeath' | 'respawnReady' | 'tallyTick' | 'menuStart'
  // opts: per-event, all optional — { side, big, panFrom, panTo }
  play(name, opts) {
    _play(name, opts);
  },
  // speedFrac: 0..1 throttle fraction. Call every frame while flying;
  // pass 0 (or call stopEngine()) when the jet isn't in flight.
  setEngine(speedFrac) {
    _setEngineSpeed(speedFrac);
  },
  stopEngine() {
    _stopEngine();
  },
  // state: 'flight' | 'title' | 'off'
  music(state) {
    _setMusicState(state);
  },
  setMasterVolume(v) {
    _setMasterVolume(v);
  },
};
