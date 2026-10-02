// ARCHITECTURE.md D3: internal render resolution is AB2's true 320x224.
// Split out from screen.js so src/ui/hud.js can import it without a
// circular dependency (screen.js composites the Hud scene, hud.js needs
// these dimensions to place elements in pixel space).
export const GAME_W = 320;
export const GAME_H = 224;
