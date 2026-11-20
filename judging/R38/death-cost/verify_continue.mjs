// R38 death-cost lane: deterministic verification that lives obey the arcade
// rule (GAME_SPEC.md §2, MEASURED): 3 lives per credit, NO refill at stage
// transitions (9-continue partition = [3x9]), continue = a DELIBERATE press
// (rising edge, the coinless stand-in for a coin insert), countdown expiry =
// GAME OVER, score survives the continue.
//
// Scenarios:
//  A. fire HELD through a last-life death -> the held button must NOT buy the
//     continue: state stays 'continue' with lives 0 through the full 10 s
//     countdown -> 'gameover' -> 'title'. (Pre-fix: instant refill to 3,
//     card visible <= 1 tick.)
//  B. same entry, but RELEASE then PRESS during the countdown -> continue
//     consumed: flight, lives 3, SAME stage, score unchanged across the coin.
//  C. lives=2, invincible, step across the stage-1->2 boundary -> lives
//     still 2 (no stage-transition refill exists).
//  D. fire held from gameover into title -> no silent new credit; release
//     then press -> launch starts.
import puppeteer from 'puppeteer';

const BASE = 'http://localhost:5173';
const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 120000 });

async function open(qs) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/?${qs}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__frameReady === true, { timeout: 60000 });
  return page;
}
const snap = (p) => p.evaluate(() => {
  const f = window.__flowState();
  return { state: f.state, stage: f.stageNumber, lives: f.lives, score: Math.floor(f.score) };
});
const stick = (p, s) => p.evaluate((st) => window.__setStick(st), s);
const step = (p, n) => p.evaluate((k) => window.__step(k), n);

const out = {};

// ---- A + B share an entry: lives=1, forced death at t=3 s, fire held from tick 0.
async function enterContinueWithFireHeld() {
  const page = await open('fixed=1&seed=5&lives=1&forcedeath=3');
  await stick(page, { fire: true });
  await step(page, 160);               // 2.7 s: flight, pre-death
  const pre = await snap(page);
  await step(page, 600);               // through the ~6 s death sequence
  const post = await snap(page);       // expect 'continue', lives 0
  return { page, pre, post };
}

// Scenario A: hold fire the whole way; the countdown must run out.
{
  const { page, pre, post } = await enterContinueWithFireHeld();
  const trace = [pre, post];
  // 10 s countdown + margin, fire held throughout; sample each second.
  for (let i = 0; i < 11; i++) { await step(page, 60); trace.push(await snap(page)); }
  await step(page, 60 * 5);            // through GAME_OVER_S=4 into title
  trace.push(await snap(page));
  out.A_fireHeld_countdownExpires = trace;

  // Scenario D on the same page: fire is STILL held at the title.
  await step(page, 120);
  const heldAtTitle = await snap(page); // must still be 'title'
  await stick(page, { fire: false });
  await step(page, 5);                  // one button-up tick arms the latch
  await stick(page, { fire: true });
  await step(page, 10);
  const afterPress = await snap(page);  // must be 'launch'
  out.D_titleHeldThenPress = { heldAtTitle, afterPress };
  await page.close();
}

// Scenario B: release then press during the countdown -> continue consumed.
{
  const { page, post } = await enterContinueWithFireHeld();
  await step(page, 120);               // 2 s into the countdown, fire still held
  const midHeld = await snap(page);    // must still be 'continue'
  await stick(page, { fire: false });
  await step(page, 5);
  await stick(page, { fire: true });
  await step(page, 5);
  const afterCoin = await snap(page);  // flight, lives 3, same stage, score == post.score
  out.B_releaseThenPress = { atContinue: post, midHeld, afterCoin };
  await page.close();
}

// Scenario C: lives carry across a stage boundary untouched.
{
  const page = await open('fixed=1&seed=1&invincible=1&lives=2');
  await step(page, 20);
  const s1 = await snap(page);
  await step(page, 2100);              // past the ~32 s stage-1 boundary
  const s2 = await snap(page);         // stage 2 (or the next state), lives must be 2
  out.C_stageBoundaryKeepsLives = { s1, s2 };
  await page.close();
}

console.log(JSON.stringify(out, null, 1));
await browser.close();
