import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
const ROOT = '/Users/urizonens/dev/afterburner-three';
const server = await createServer({ root: ROOT, configFile: path.join(ROOT,'vite.config.js'),
  server:{host:'127.0.0.1',strictPort:false,hmr:false,watch:null}, logLevel:'error' });
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({ headless:true, args:['--no-sandbox','--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({width:960,height:672});
const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/?fixed=1&demo=1&seed=7`, {waitUntil:'load'});
await page.waitForFunction('window.__frameReady === true',{timeout:10000});
const hits=[];
for (let t=0;t<1300;t++){
  const s = await page.evaluate(()=>{
    window.__step(1);
    const st=window.__combatStats&&window.__combatStats();
    if(!st) return null;
    const b=st.enemies.filter(e=>e.type==='battery');
    return b.length? {t:+st.simTime.toFixed(2), b:b.map(e=>({d:+e.depth.toFixed(1),x:+e.ndcX.toFixed(2),y:+e.ndcY.toFixed(2),span:+e.spanFrac.toFixed(3),on:e.onScreen})), shots:st.enemyShots} : null;
  });
  if (s){ s.tick=t; hits.push(s); }
}
console.log('battery-present ticks:', hits.length, 'of 1300');
console.log(JSON.stringify(hits.filter((_,i)=>i%2===0).slice(0,50)));
console.log('pageerrors:', errs.length, errs.slice(0,3));
await browser.close(); await server.close();
