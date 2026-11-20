import { createServer } from 'vite';
import puppeteer from 'puppeteer';
const server = await createServer({ server:{host:'127.0.0.1',strictPort:false,hmr:false,watch:null}, logLevel:'error' });
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({ headless:true, args:['--no-sandbox','--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({width:960,height:672});
await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=7&invincible=1`, {waitUntil:'load'});
await page.waitForFunction('window.__frameReady === true', {timeout:20000});
const hits = await page.evaluate(async () => {
  const out=[];
  for (let i=0;i<4200;i+=10){
    window.__setStick({x:0,y:0,fire:false,missile:false,throttleIndex:1});
    window.__step(10);
    const st=window.__combatStats();
    const close=st.enemies.filter(e=>e.pattern==='approach'&&e.depth<9&&e.onScreen).length;
    if(close>=3) out.push({t:i,close});
  }
  return out.slice(0,30);
});
console.log(JSON.stringify(hits));
await browser.close(); await server.close();
