import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
const ROOT = '/Users/urizonens/dev/afterburner-three';
const arg=(n,d)=>{const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:d;};
const HOLD = arg('--hold','1')==='1'; // hold missile or not
const PACE = arg('--pace','');
const server = await createServer({ root: ROOT, configFile: path.join(ROOT,'vite.config.js'), server:{host:'127.0.0.1',strictPort:false,hmr:false,watch:null}, logLevel:'error' });
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({ headless:true, args:['--no-sandbox','--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({width:960,height:672});
const pace = PACE?`&pace=${PACE}`:'';
await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=7&invincible=1${pace}`, {waitUntil:'load'});
await page.waitForFunction('window.__frameReady === true',{timeout:15000});
const out = await page.evaluate(async (HOLD) => {
  let ticks=0, withBracket=0, maxBr=0, sumBr=0, hintTicks=0;
  for (let i=0;i<5400;i++){
    window.__setStick({x:0,y:0,missile:HOLD,fire:true});
    window.__step(1);
    const s = window.__combatStats();
    if (!s) continue;
    ticks++;
    // with sight at rest and no missiles flying, brackets drawn = hints (+ any tracked, but tracked needs sight on target, which rest isn't)
    if (s.brackets>0) withBracket++;
    maxBr=Math.max(maxBr,s.brackets);
    sumBr+=s.brackets;
    if (s.brackets>0 && s.locks===0) hintTicks++;
  }
  return {ticks, bracketPresenceFrac:+(withBracket/ticks).toFixed(3), maxBrackets:maxBr, meanBrackets:+(sumBr/ticks).toFixed(3), ticksWithBracketNoLock:hintTicks};
}, HOLD);
console.log(JSON.stringify({hold:HOLD, pace:PACE||'(default)', ...out}));
await browser.close(); await server.close();
