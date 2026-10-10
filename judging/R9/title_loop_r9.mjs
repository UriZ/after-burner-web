// Criterion A over EVERY frame of the title's own 512-tick loop, measured on
// the authored canvas. Ladder table duplicated from src/ui/ladder.js.
import { drawTitleScreen } from '../../src/game/flow/titleScreen.js';
const LADDER=new Set([0,16,25,33,41,49,58,66,74,82,91,99,107,115,123,132,140,148,156,164,173,181,189,197,206,214,222,230,239,247,255]);
const W=320,H=224;
function makeCtx(){
  const px=new Uint8Array(W*H*3); let cur=[0,0,0];
  return { px, set fillStyle(v){ const h=v.replace('#',''); cur=[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }, get fillStyle(){return cur;},
    fillRect(x,y,w,h){ x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);
      for(let j=Math.max(0,y);j<Math.min(H,y+h);j++) for(let i=Math.max(0,x);i<Math.min(W,x+w);i++){const o=(j*W+i)*3;px[o]=cur[0];px[o+1]=cur[1];px[o+2]=cur[2];} } };
}
let worstC=0,worstV=0,off=0,uniq=new Set(),blackFrames=0,sig=new Set();
let coinOn=0;
for(let t=0;t<512;t++){
  const c=makeCtx(); drawTitleScreen(c,W,H,0,t);
  const cols=new Set(), vals=new Set();
  let nonBlack=0;
  for(let i=0;i<W*H;i++){ const r=c.px[i*3],g=c.px[i*3+1],b=c.px[i*3+2];
    cols.add((r<<16)|(g<<8)|b); vals.add(r);vals.add(g);vals.add(b); if(r||g||b) nonBlack++; }
  for(const v of vals) if(!LADDER.has(v)) off++;
  worstC=Math.max(worstC,cols.size); worstV=Math.max(worstV,vals.size);
  for(const v of cols) uniq.add(v);
  if(nonBlack===0) blackFrames++;
  // frame signature for the "is it one image" test
  let hsh=0; for(let i=0;i<W*H*3;i+=7) hsh=(hsh*31+c.px[i])|0;
  sig.add(hsh);
  // coin line present?
  let coin=0; for(let y=184;y<191;y++) for(let x=118;x<205;x++){const o=(y*W+x)*3; if(c.px[o]>100&&c.px[o+2]<60) coin++;}
  if(coin>50) coinOn++;
}
console.log('512 ticks: max colours/frame =',worstC,' max channel values/frame =',worstV,' off-ladder values =',off);
console.log('distinct colours across the whole loop =',uniq.size,' black frames =',blackFrames);
console.log('distinct frame signatures over 512 ticks =',sig.size);
console.log('INSERT COIN visible on',coinOn,'of 512 ticks =',(100*coinOn/512).toFixed(1)+'%');
