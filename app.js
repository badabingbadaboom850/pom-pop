const C=document.getElementById('canvas'), ctx=C.getContext('2d');
let W=600,H=760,dpr=1;
function resize(){
  const r=C.getBoundingClientRect(); dpr=Math.min(2,devicePixelRatio||1);
  W=r.width;H=r.height;C.width=W*dpr;C.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize',resize); resize();

const coats=[
  {name:'Cream', c:'#fff0dc', ear:'#e9c7b4', face:'#5c3b38'},
  {name:'Orange',c:'#f5a638', ear:'#d57a2c',face:'#5a332d'},
  {name:'Gray',c:'#aaa9bf',ear:'#85859c',face:'#403c52'},
  {name:'Chocolate',c:'#85553d',ear:'#633b30',face:'#332322'},
  {name:'Black & Tan',c:'#3f3a45',ear:'#292733',face:'#17151d',tux:true},
  {name:'White',c:'#fffaf2',ear:'#f0d9df',face:'#4c3c45'}
];
const sizes=[18,25,34,45,58,73,91,112];
const names=['Tiny Pom','Puppy','Fluffy Pom','Big Pom','Mega Floof','Chonk','Royal Floof','MEGA RIKO!'];
const LEVELS=[
  {name:'Cozy Living Room',theme:'cozy',obstacles:[],deadzones:[]},
  {name:'Autumn Backyard',theme:'autumn',obstacles:[{xf:.28,yf:.5,rf:.028},{xf:.72,yf:.5,rf:.028}],deadzones:[]},
  {name:'Spooky Kitchen',theme:'halloween',obstacles:[{xf:.5,yf:.4,rf:.032},{xf:.25,yf:.62,rf:.024},{xf:.75,yf:.62,rf:.024}],deadzones:[{xf:.5,wf:.22,yf:.62}]},
  {name:'Christmas Dog Park',theme:'christmas',obstacles:[{xf:.3,yf:.35,rf:.03},{xf:.7,yf:.35,rf:.03},{xf:.5,yf:.55,rf:.034},{xf:.2,yf:.72,rf:.022},{xf:.8,yf:.72,rf:.022}],deadzones:[{xf:.22,wf:.16},{xf:.78,wf:.16}]},
  {name:'Sakura Garden',theme:'sakura',obstacles:[{xf:.2,yf:.32,rf:.026},{xf:.5,yf:.3,rf:.03},{xf:.8,yf:.32,rf:.026},{xf:.32,yf:.58,rf:.024},{xf:.68,yf:.58,rf:.024},{xf:.5,yf:.75,rf:.03}],deadzones:[{xf:.5,wf:.26}]}
];
const THEME_CYCLE=['cozy','autumn','halloween','christmas','sakura'];
const THEME_DEFS={
  cozy:{bg:['#302e59','#232349','#17172f'],line:'#f06f83',wallpaper:'#d1c9ed',glow:'#f6d7a2',shelf:'#9c95c6',ambient:'sparkle',emoji:'🏠'},
  autumn:{bg:['#4a2f1d','#3a2416','#241408'],line:'#e2793a',wallpaper:'#e0a45a',glow:'#f2b866',shelf:'#c17a3c',ambient:'leaf',emoji:'🍂'},
  halloween:{bg:['#241333','#170a22','#0a0512'],line:'#8fe94f',wallpaper:'#6b4a8f',glow:'#8fe94f',shelf:'#4a2f66',ambient:'bat',emoji:'🎃'},
  christmas:{bg:['#0f2a3d','#0a1e2e','#061420'],line:'#e94f4f',wallpaper:'#bfe3f0',glow:'#e94f4f',shelf:'#3f8f6f',ambient:'snow',emoji:'🎄'},
  sakura:{bg:['#5c3350','#3e2340','#241428'],line:'#ff8fc4',wallpaper:'#ffd9ec',glow:'#ffb6d9',shelf:'#c17aa0',ambient:'petal',emoji:'🌸'}
};
function levelConfig(n){
  if(n<=LEVELS.length) return LEVELS[n-1];
  const extra=n-LEVELS.length, count=Math.min(7,3+extra), obstacles=[];
  for(let i=0;i<count;i++){ obstacles.push({xf:.15+(i/(Math.max(1,count-1)))*.7, yf:.32+((i%3)*.14), rf:.024+(i%2)*.008}); }
  const deadzones=extra%2===0 ? [{xf:.5,wf:Math.min(.34,.2+extra*.02)}] : [{xf:.25,wf:.14},{xf:.75,wf:.14}];
  const theme=THEME_CYCLE[(n-1)%THEME_CYCLE.length];
  return {name:'Chaos Level '+n, theme, obstacles, deadzones};
}
let level=1, curLevel=levelConfig(1), ambient=[], ambientTimer=0;
const powerDefs={
  treat:{name:'DOG TREAT',emoji:'🍖',color:'#d99a5b',desc:'Grow the Pom you touch!'},
  ball:{name:'TENNIS BALL',emoji:'🎾',color:'#d6e35d',desc:'BOING! Launch touched Poms.'},
  leash:{name:'NEW LEASH',emoji:'🦮',color:'#f0a34b',desc:'Pull the touched Pom toward the center.'},
  cup:{name:'PUP CUP',emoji:'☕',color:'#f1c8aa',desc:'Slow every Pom when touched.'},
  glam:{name:'GLAMOUR',emoji:'✨',color:'#e9a2d7',desc:'Turn the touched Pom into a wildcard.'}
};
const sisterDefs={
  cat:{name:'Bijuu the Siamese',emoji:'😼'},
  dog:{name:'Penny the Wiener Dog',emoji:'🌭'}
};
const hazardDefs={
  shower:{name:'Shower Time',emoji:'🚿'},
  vet:{name:'Vet Visit',emoji:'💉'},
  vacuum:{name:'Vacuum Day',emoji:'🧹'}
};
let balls=[], particles=[], score=0,best=+localStorage.pomBest||0,next=null,active=null,aimX=0,aimY=H*.58,gameOver=false,winning=false,dropCooldown=0,last=performance.now(),combo=1,comboTimer=0,merges=0,slowTimer=0;
let gameMode='classic', pendingMode='classic', challengeId=null, rikoMode=false, challengeComplete=false, rushClock=0, comboMax=1, rainbowCount=0, highestFloof=0, rushBest=+localStorage.pomRushBest||0, eventTimer=0, eventName='';
let activeEvent=null, freezeTimer=0, magnetTimer=0, menuOpen=false;

document.getElementById('best').textContent=best;
function randType(){ const roll=Math.random(); if(roll<.28)return 4; return Math.floor(Math.random()*Math.min(5,coats.length)); }
function randShot(){
  const roll=Math.random();
  if(rikoMode && roll<.18){ const rs=['rainbow','wildcard','bomb','magnet','freeze','blessing']; return {kind:rs[Math.floor(Math.random()*rs.length)]}; }
  // Rare toys/events are intentionally exciting but not constant.
  if(gameMode==='rush'){
    if(roll<.035)return {kind:'rainbow'};
    if(roll<.055)return {kind:'wildcard'};
    if(roll<.075)return {kind:'bomb'};
    if(roll<.095)return {kind:'magnet'};
    if(roll<.115)return {kind:'freeze'};
    if(roll<.135)return {kind:'blessing'};
    if(roll<.17)return {kind:'mystery'};
    if(roll<.23)return {kind:'power',power:Object.keys(powerDefs)[Math.floor(Math.random()*Object.keys(powerDefs).length)]};
    if(roll<.30)return {kind:'sister',sister:Math.random()<.5?'cat':'dog'};
    if(roll<.39)return {kind:'hazard',hazard:['shower','vet','vacuum'][Math.floor(Math.random()*3)]};
    return {kind:'pom',type:randType()};
  }
  if(roll<.04)return {kind:'rainbow'};
  if(roll<.055)return {kind:'wildcard'};
  if(roll<.07)return {kind:'bomb'};
  if(roll<.085)return {kind:'magnet'};
  if(roll<.10)return {kind:'freeze'};
  if(roll<.115)return {kind:'blessing'};
  if(roll<.145)return {kind:'mystery'};
  if(roll<.265)return {kind:'power',power:Object.keys(powerDefs)[Math.floor(Math.random()*Object.keys(powerDefs).length)]};
  if(roll<.325)return {kind:'sister',sister:Math.random()<.5?'cat':'dog'};
  if(roll<.405)return {kind:'hazard',hazard:['shower','vet','vacuum'][Math.floor(Math.random()*3)]};
  return {kind:'pom',type:randType()};
}
function makeBall(x,y,type,vx=0,vy=0){
  return {x,y,type,r:sizes[type],vx,vy,rest:false,settle:0,launched:true,kind:'pom',shrinkTimer:0};
}
function applyLevel(showToast){
  curLevel=levelConfig(level);
  if(document.getElementById('levelNum'))document.getElementById('levelNum').textContent=level;
  if(showToast)toast('LEVEL '+level+': '+curLevel.name.toUpperCase()+' '+((THEME_DEFS[curLevel.theme]||THEME_DEFS.cozy).emoji));
}

const CHALLENGES=[
  {id:'combo8',emoji:'🔥',name:'Combo Monster',desc:'Reach a x8 FLOOF COMBO.',check:()=>comboMax>=8},
  {id:'mega',emoji:'👑',name:'Royal Floof',desc:'Reach MEGA RIKO!',check:()=>highestFloof>=8},
  {id:'rainbow3',emoji:'🌈',name:'Rainbow Collector',desc:'Use 3 Rainbow Poms.',check:()=>rainbowCount>=3},
  {id:'merge25',emoji:'✨',name:'Merge Machine',desc:'Make 25 merges.',check:()=>merges>=25},
  {id:'score10k',emoji:'💰',name:'FLOOF Fortune',desc:'Score 10,000 points.',check:()=>score>=10000},
  {id:'big6',emoji:'🐶',name:'Big Floof',desc:'Reach Chonk (size 6).',check:()=>highestFloof>=6}
];
function savedChallenges(){try{return JSON.parse(localStorage.pomChallenges||'{}')}catch(e){return {}}}
function saveChallenge(id){const x=savedChallenges();x[id]=true;localStorage.pomChallenges=JSON.stringify(x)}
function closeMobileMenuSafe(){menuOpen=false;const m=document.getElementById('mobileMenu');if(m)m.style.display='none'}
function showLauncher(){
  closeMobileMenuSafe();
  document.getElementById('launcher').style.display='flex';
  const x=savedChallenges(),done=Object.values(x).filter(Boolean).length;
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val};
  set('launcherBest',best.toLocaleString()); set('launcherCombo','x'+comboMax); set('launcherChallenges',done+'/'+CHALLENGES.length); set('launcherRush',rushBest.toFixed(1)+'s');
  document.getElementById('arcadeBadge').textContent='✨ '+done+'/'+CHALLENGES.length+' missions cleared • more Riko games will live here';
}
function hideLauncher(){document.getElementById('launcher').style.display='none'}
function openChallenges(){
  const box=document.getElementById('challengeList'),x=savedChallenges();box.innerHTML='';
  CHALLENGES.forEach(c=>{const b=document.createElement('button');b.className='challengeItem';b.innerHTML=c.emoji+' <b>'+c.name+(x[c.id]?' ✓':'')+'</b><small>'+c.desc+'</small>';b.onclick=()=>{challengeId=c.id;pendingMode='challenge';hideLauncher();document.getElementById('challengePanel').style.display='none';start();toast('CHALLENGE: '+c.name.toUpperCase()+'! 🎯')};box.appendChild(b)})
  document.getElementById('challengePanel').style.display='flex';
}
function showDex(){
  const old=document.getElementById('infoModal');if(old)old.remove();
  const d=document.createElement('div');d.id='infoModal';d.style.cssText='position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:#101025dd;backdrop-filter:blur(8px);padding:20px';
  const pomRows=names.map((n,i)=>`<div class="challengeItem">🐶 <b>${n}</b><small>Coat tier ${i+1} • ${sizes[i]} radius</small></div>`).join('');
  d.innerHTML=`<div class="challengeBox" style="max-height:90vh;overflow:auto"><h2>📖 POMDEX</h2><div class="small">Every floof, friend and catastrophe in Riko Arcade.</div><div class="challengeList">${pomRows}<div class="challengeItem">🌈 <b>Rainbow Pom</b><small>Boosts Poms it touches.</small></div><div class="challengeItem">🃏 <b>Wild Pom</b><small>Matches anything.</small></div><div class="challengeItem">💣 <b>Bomb Pom</b><small>Blasts nearby Poms.</small></div><div class="challengeItem">🧲 <b>Floof Magnet</b><small>Pulls Poms together.</small></div><div class="challengeItem">❄️ <b>Freeze</b><small>Stops Rush shrinking.</small></div><div class="challengeItem">💖 <b>Riko Blessing</b><small>Everyone gets +1.</small></div><div class="challengeItem">😼 <b>Bijuu</b><small>The combo-breaking cat.</small></div><div class="challengeItem">🌭 <b>Penny</b><small>The professional Pom bonker.</small></div></div><button class="closeBtn" onclick="this.closest('#infoModal').remove()">CLOSE</button></div>`;
  document.body.appendChild(d);
}
function showCollection(){
 const old=document.getElementById('infoModal');if(old)old.remove(); const x=savedChallenges(),done=Object.keys(x).length;
 const d=document.createElement('div');d.id='infoModal';d.style.cssText='position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:#101025dd;backdrop-filter:blur(8px);padding:20px';
 d.innerHTML=`<div class="challengeBox"><h2>👑 RIKO COLLECTION</h2><div class="small">Your little arcade trophy shelf.</div><div class="challengeList"><div class="challengeItem">🏆 <b>Challenges</b><small>${done}/${CHALLENGES.length} cleared</small></div><div class="challengeItem">💰 <b>Best Score</b><small>${best.toLocaleString()}</small></div><div class="challengeItem">🔥 <b>Best Combo</b><small>x${comboMax}</small></div><div class="challengeItem">⚡ <b>Rush Record</b><small>${rushBest.toFixed(1)} seconds</small></div></div><div class="challengeItem" style="text-align:center;margin-bottom:12px!important">💖 <b>RIKO MODE</b><small>Unlocked forever. Maximum floof protocol active.</small></div><button class="closeBtn" onclick="this.closest('#infoModal').remove()">CLOSE</button></div>`;
 document.body.appendChild(d);
}
function checkChallenge(){
 if(gameMode!=='challenge'||challengeComplete)return; const c=CHALLENGES.find(q=>q.id===challengeId); if(c&&c.check()){challengeComplete=true;saveChallenge(c.id);winGame();}
}

function start(){
  gameMode=pendingMode||'classic';
  rikoMode=gameMode==='riko';
  challengeComplete=false;
  rushClock=0; comboMax=1; rainbowCount=0; highestFloof=0; eventTimer=0; activeEvent=null; freezeTimer=0; magnetTimer=0;
  balls=[];particles=[];score=0;merges=0;gameOver=false;winning=false;dropCooldown=0;slowTimer=0;
  ambient=[];level=1;applyLevel(true);
  next=randShot();
  showControls();combo=1;comboTimer=0;
  document.getElementById('modeTag').textContent=gameMode==='riko'?'RIKO MODE • MAXIMUM FLOOF 💖':gameMode==='challenge'?'CHALLENGE MODE 🎯':'CLASSIC MODE';
  document.getElementById('rushMode').textContent='POM RUSH ⚡';
  document.getElementById('mobileRush').textContent='RUSH ⚡';
  document.getElementById('gameover').style.display='none'; document.getElementById('resultModal').classList.remove('win'); document.getElementById('resultTitle').textContent='Too Much FLOOF!'; document.getElementById('resultCrown').textContent='🐾'; document.getElementById('winText').style.display='none'; document.getElementById('nextLevel').style.display='none'; updateUI();
}
function startRush(){
  gameMode='rush';
  rushClock=0; comboMax=1; rainbowCount=0; highestFloof=0; eventTimer=0; activeEvent=null; freezeTimer=0; magnetTimer=0;
  balls=[];particles=[];score=0;merges=0;gameOver=false;winning=false;dropCooldown=0;slowTimer=0;
  ambient=[];level=1;applyLevel(false);combo=1;comboTimer=0;
  next=randShot();
  document.getElementById('modeTag').textContent='POM RUSH • SHRINKING!';
  document.getElementById('rushMode').textContent='CLASSIC MODE';
  document.getElementById('mobileRush').textContent='CLASSIC';
  document.getElementById('gameover').style.display='none';
  document.getElementById('resultModal').classList.remove('win');
  document.getElementById('resultTitle').textContent='Too Much FLOOF!';
  document.getElementById('resultCrown').textContent='🐾';
  document.getElementById('winText').style.display='none';
  document.getElementById('nextLevel').style.display='none';
  // Seed the board with a messy mix of Poms so the clock is already ticking.
  for(let i=0;i<10;i++){
    const type=Math.random()<.22?4:Math.floor(Math.random()*4);
    const r=sizes[type];
    let x=r+10+Math.random()*(W-r*2-20), y=170+r+Math.random()*(H*.42);
    balls.push(makeBall(x,y,type,(Math.random()-.5)*25,(Math.random()-.5)*15));
  }
  for(const b of balls)b.shrinkTimer=Math.random()*2.5;
  showControls();updateUI();
  toast('POM RUSH! KEEP THE FLOOF GROWING! ⚡');
}
document.getElementById('rushMode').onclick=()=>gameMode==='rush'?start():startRush();
document.getElementById('mobileRush').onclick=()=>gameMode==='rush'?start():startRush();
document.getElementById('restart').onclick=start;
document.getElementById('again').onclick=()=>gameMode==='rush'?startRush():start();
document.getElementById('nextLevel').onclick=nextLevel;

function updateUI(){
  document.getElementById('score').textContent=score.toLocaleString(); if(document.getElementById('mobileScoreText'))document.getElementById('mobileScoreText').textContent=score.toLocaleString(); if(document.getElementById('mobileLevelText'))document.getElementById('mobileLevelText').textContent=level;
  document.getElementById('best').textContent=best.toLocaleString();
  if(document.getElementById('merges')) document.getElementById('merges').textContent=merges.toLocaleString();
  if(document.getElementById('comboText')) document.getElementById('comboText').textContent='x'+combo;
  if(document.getElementById('statFLoof'))document.getElementById('statFLoof').textContent=highestFloof; if(document.getElementById('statCombo'))document.getElementById('statCombo').textContent='x'+comboMax; if(document.getElementById('statRush'))document.getElementById('statRush').textContent=rushBest.toFixed(1)+'s'; if(document.getElementById('statRainbows'))document.getElementById('statRainbows').textContent=rainbowCount;
  if(document.getElementById('comboSub')) document.getElementById('comboSub').textContent=combo>1?'FLOOF COMBO!':'Nice Shot!';
  const nb=document.getElementById('nextBox');nb.innerHTML='';
  const cv=document.createElement('canvas');cv.width=100;cv.height=76;nb.appendChild(cv);
  const nc=cv.getContext('2d');  const mn=document.querySelector('#mobileNext canvas'); if(mn){const mc=mn.getContext('2d');mc.clearRect(0,0,mn.width,mn.height); if(next.kind==='pom')drawPom(mc,30,24,Math.min(18,sizes[next.type]*.42),next.type,1); else if(next.kind==='rainbow')drawRainbow(mc,30,24,16); else if(next.kind==='wildcard')drawSpecial(mc,30,24,17,'🃏',''); else if(next.kind==='bomb')drawSpecial(mc,30,24,17,'💣',''); else if(next.kind==='magnet')drawSpecial(mc,30,24,17,'🧲',''); else if(next.kind==='freeze')drawSpecial(mc,30,24,17,'❄️',''); else if(next.kind==='blessing')drawSpecial(mc,30,24,17,'💖',''); else if(next.kind==='mystery')drawSpecial(mc,30,24,17,'❓',''); else if(next.kind==='power')drawPowerShot(mc,30,24,17,next.power); else if(next.kind==='sister')drawSister(mc,30,24,17,next.sister); else if(next.kind==='hazard')drawHazard(mc,30,24,17,next.hazard);}
  if(next.kind==='pom'){ document.getElementById('nextLabel').textContent='NEXT POM'; drawPom(nc,50,38,sizes[next.type]*.72,next.type,1); }
  else if(next.kind==='rainbow'){ document.getElementById('nextLabel').textContent='RARE! RAINBOW POM'; drawRainbow(nc,50,38,25); }
  else if(next.kind==='wildcard'){ document.getElementById('nextLabel').textContent='🃏 WILD POM'; drawSpecial(nc,50,38,27,'🃏','WILD'); }
  else if(next.kind==='bomb'){ document.getElementById('nextLabel').textContent='💣 BOMB POM'; drawSpecial(nc,50,38,27,'💣','BOOM'); }
  else if(next.kind==='magnet'){ document.getElementById('nextLabel').textContent='🧲 FLOOF MAGNET'; drawSpecial(nc,50,38,27,'🧲','PULL'); }
  else if(next.kind==='freeze'){ document.getElementById('nextLabel').textContent='❄️ FREEZE'; drawSpecial(nc,50,38,27,'❄️','FREEZE'); }
  else if(next.kind==='blessing'){ document.getElementById('nextLabel').textContent='💖 RIKO\'S BLESSING'; drawSpecial(nc,50,38,27,'💖','+1 ALL'); }
  else if(next.kind==='mystery'){ document.getElementById('nextLabel').textContent='❓ MYSTERY POM'; drawSpecial(nc,50,38,27,'❓','???'); }
  else if(next.kind==='sister'){ document.getElementById('nextLabel').textContent='UH OH...'; drawSister(nc,50,38,28,next.sister); }
  else if(next.kind==='hazard'){ document.getElementById('nextLabel').textContent='INCOMING!'; drawHazard(nc,50,38,26,next.hazard); }
  else { document.getElementById('nextLabel').textContent='NEXT POWER SHOT'; drawPowerShot(nc,50,38,25,next.power); }
  const lad=document.getElementById('ladder');lad.innerHTML='';
  for(let i=0;i<sizes.length;i++){
    const row=document.createElement('div');row.className='sizeItem';
    const cv=document.createElement('canvas');cv.width=70;cv.height=58;
    drawPom(cv.getContext('2d'),35,29,Math.min(26,sizes[i]*.29),i===sizes.length-1?4:i%coats.length,1);
    row.appendChild(cv);const sp=document.createElement('span');sp.textContent=names[i];if(i===sizes.length-1)sp.className='ultimate';row.appendChild(sp);lad.appendChild(row);
    if(i<sizes.length-1){let a=document.createElement('div');a.className='arrow';a.textContent='↓';lad.appendChild(a)}
  }
}
function drawNextShot(c,x,y,shot){
  if(!shot)return;
  if(shot.kind==='rainbow') drawRainbow(c,x,y,22);
  else if(shot.kind==='power') drawPowerShot(c,x,y,22,shot.power);
  else if(shot.kind==='sister') drawSister(c,x,y,24,shot.sister);
  else if(shot.kind==='hazard') drawHazard(c,x,y,22,shot.hazard);
  else if(shot.kind==='wildcard') drawSpecial(c,x,y,23,'🃏','WILD');
  else if(shot.kind==='bomb') drawSpecial(c,x,y,23,'💣','BOOM');
  else if(shot.kind==='magnet') drawSpecial(c,x,y,23,'🧲','PULL');
  else if(shot.kind==='freeze') drawSpecial(c,x,y,23,'❄️','FREEZE');
  else if(shot.kind==='blessing') drawSpecial(c,x,y,23,'💖','+1 ALL');
  else if(shot.kind==='mystery') drawSpecial(c,x,y,23,'❓','MYSTERY');
  else if(shot.kind==='pom') drawPom(c,x,y,Math.min(23,sizes[shot.type]*.33),shot.type);
}
function drawRainbow(c,x,y,r){
  c.save();c.translate(x,y);
  c.shadowColor='#0008';c.shadowBlur=10;c.shadowOffsetY=3;
  const colors=['#ff5b6e','#ffad4a','#ffe05b','#67d98b','#55c7ff','#9b7cff','#ef82d8'];
  c.lineWidth=Math.max(3,r*.18);
  for(let i=0;i<colors.length;i++){
    c.strokeStyle=colors[i];c.beginPath();c.arc(0,0,r-i*r*.065,0,Math.PI*2);c.stroke();
  }
  c.shadowBlur=0;c.shadowOffsetY=0;
  c.fillStyle='#fff7f0';c.beginPath();c.arc(0,0,r*.48,0,Math.PI*2);c.fill();
  c.fillStyle='#3b2940';c.beginPath();c.arc(-r*.16,-r*.04,r*.055,0,Math.PI*2);c.fill();c.beginPath();c.arc(r*.16,-r*.04,r*.055,0,Math.PI*2);c.fill();
  c.fillStyle='#ef8297';c.beginPath();c.ellipse(0,r*.16,r*.11,r*.07,0,0,Math.PI*2);c.fill();
  c.font=Math.max(9,r*.48)+'px serif';c.textAlign='center';c.textBaseline='middle';c.fillText('+1',0,-r*.56);
  c.restore();
}
function drawPowerShot(c,x,y,r,power){
  const d=powerDefs[power]; c.save();c.translate(x,y);
  c.shadowColor='#0008';c.shadowBlur=10;c.shadowOffsetY=3;
  c.fillStyle='#19182f';c.strokeStyle=d.color;c.lineWidth=3;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.stroke();c.shadowBlur=0;c.shadowOffsetY=0;
  c.font=Math.max(16,r*1.05)+'px serif';c.textAlign='center';c.textBaseline='middle';c.fillText(d.emoji,0,1);c.restore();
}
function powerHit(p){
  if(p.dead)return;
  const candidates=balls.filter(b=>!b.dead&&b.kind!=='power');
  let target=null, bestD=Infinity;
  for(const b of candidates){const d=Math.hypot(b.x-p.x,b.y-p.y);if(d<b.r+p.r+5&&d<bestD){target=b;bestD=d}}
  if(!target)return;
  if(target.kind==='sister'){
    if(p.power==='leash'){
      target.dead=true;score+=200;burst(target.x,target.y,'🦮');toast((target.sister==='cat'?'BIJUU':'PENNY')+' GOT WALKED! Bye-bye! 🦮');
    }else if(p.power==='glam'){
      target.dead=true;balls.push(makeBall(target.x,target.y,0,(Math.random()-.5)*2,-4));
      burst(target.x,target.y,'✨');toast('GLAM MAKEOVER! Now a Pom! ✨');
    }else if(p.power==='ball'){
      for(const b of candidates){const dx=b.x-target.x,dy=b.y-target.y,dist=Math.hypot(dx,dy)||1;if(dist<180){b.vx+=(dx/dist)*330;b.vy+=(dy/dist)*330-180;}}
      burst(target.x,target.y,'🎾');toast('BOING! Sister bounced off! 🎾');
    }else if(p.power==='cup'){
      slowTimer=6;burst(target.x,target.y,'☕');toast('EVEN SISTERS SLOW DOWN ☕');
    }else{
      burst(target.x,target.y,'🙄');toast("SHE DOESN'T WANT IT! 🍖");
    }
    p.dead=true;return;
  }
  if(target.kind==='hazard'){
    if(target.triggered){p.dead=true;return;}
    if(p.power==='leash'||p.power==='ball'){
      target.dead=true;score+=150;burst(target.x,target.y,'💨');toast(hazardDefs[target.hazard].name.toUpperCase()+' DEFUSED! ✅');
    }else if(p.power==='glam'){
      target.dead=true;balls.push(makeBall(target.x,target.y,0,(Math.random()-.5)*2,-4));
      burst(target.x,target.y,'✨');toast('GLAM SAVE! Defused into a Pom! ✨');
    }else if(p.power==='cup'){
      slowTimer=6;burst(target.x,target.y,'☕');toast('SLOWED, BUT STILL COMING... ☕');
    }else{
      burst(target.x,target.y,'🙄');toast('NOT TODAY! 🍖');
    }
    p.dead=true;return;
  }
  const d=powerDefs[p.power];
  if(p.power==='treat'){
    if(target.type<sizes.length-1){target.type++;target.r=sizes[target.type];score+=75*(target.type+1);burst(target.x,target.y,'💖');toast('TREAT TIME! 🍖');}
    else {score+=500;burst(target.x,target.y,'✨');toast('VERY GOOD POM! 🍖');}
  }else if(p.power==='ball'){
    for(const b of candidates){const dx=b.x-target.x,dy=b.y-target.y,dist=Math.hypot(dx,dy)||1;if(dist<180){b.vx+=(dx/dist)*330;b.vy+=(dy/dist)*330-180;}}
    burst(target.x,target.y,'🎾');toast('BOING! 🎾');
  }else if(p.power==='leash'){
    target.vx+=(W/2-target.x)*3.4;target.vy+=(H*.42-target.y)*2.4-180;burst(target.x,target.y,'🦮');toast('COME HERE, FLOOF! 🦮');
  }else if(p.power==='cup'){
    slowTimer=6;burst(target.x,target.y,'☕');toast('PUP CUP TIME! ☕');
  }else if(p.power==='glam'){
    // Glamour lets the touched Pom merge with its first nearby neighbor regardless of coat.
    let other=candidates.filter(b=>b!==target).sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y))[0];
    if(other && Math.hypot(other.x-target.x,other.y-target.y)<target.r+other.r+70){target.wild=true;merge(target,other);toast('GLAM ATTACK! ✨');}
    else {target.wild=true;burst(target.x,target.y,'✨');toast('GLAMMED! ✨');}
  }
  p.dead=true;
}
function drawSpecial(c,x,y,r,emoji,label){c.save();c.translate(x,y);c.shadowBlur=18;c.shadowColor='#ffd56e';c.fillStyle='#292747';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.strokeStyle='#ffd56e';c.lineWidth=3;c.stroke();c.shadowBlur=0;c.font=Math.max(20,r*.9)+'px serif';c.textAlign='center';c.textBaseline='middle';c.fillText(emoji,0,-2);c.font='900 7px system-ui';c.fillStyle='#fff1b7';c.fillText(label,0,r+9);c.restore()}
function drawPom(c,x,y,r,type,scale=1){
  const safeType=Number.isFinite(type)?Math.max(0,Math.min(coats.length-1,Math.floor(type))):0;
  const p=coats[safeType], rr=r*scale;
  c.save();c.translate(x,y);
  // Round, extra-fluffy Pomeranian silhouette inspired by the reference Pom.
  c.shadowColor='#0b0b18';c.shadowBlur=rr*.24;c.shadowOffsetY=rr*.10;
  c.fillStyle=p.c;c.beginPath();
  const n=56;
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2;
    const wob=1+.055*Math.sin(i*4.7)+.022*Math.sin(i*10.9)+.012*Math.sin(i*17.3);
    const q=rr*wob;
    const xx=Math.cos(a)*q, yy=Math.sin(a)*q;
    if(i===0)c.moveTo(xx,yy);else c.lineTo(xx,yy);
  }
  c.closePath();c.fill();c.shadowBlur=0;c.shadowOffsetY=0;

  // The black/tan/cream markings are the signature look of the Pom in the photo.
  if(p.tux){
    c.fillStyle='#d79a63';
    // eyebrows
    c.beginPath();c.ellipse(-rr*.28,-rr*.27,rr*.13,rr*.065,-.15,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(rr*.28,-rr*.27,rr*.13,rr*.065,.15,0,Math.PI*2);c.fill();
    // cheek/side markings
    c.beginPath();c.ellipse(-rr*.42,rr*.03,rr*.16,rr*.11,-.35,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(rr*.42,rr*.03,rr*.16,rr*.11,.35,0,Math.PI*2);c.fill();
    // warm forehead blaze
    c.beginPath();c.ellipse(0,-rr*.29,rr*.085,rr*.13,0,0,Math.PI*2);c.fill();
    // cream chest bib
    c.fillStyle='#f3e6cf';c.beginPath();c.ellipse(0,rr*.48,rr*.40,rr*.48,0,0,Math.PI*2);c.fill();
    // cream muzzle
    c.beginPath();c.ellipse(0,rr*.14,rr*.25,rr*.20,0,0,Math.PI*2);c.fill();
  } else if(safeType===0 || safeType===5){
    // Light coats get a soft cream chest so the silhouette still reads as a fluffy Pom.
    c.fillStyle=safeType===0?'#fff7ea':'#fff4ed';c.globalAlpha=.82;
    c.beginPath();c.ellipse(0,rr*.48,rr*.40,rr*.46,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
  }

  // Tiny tucked ears, still inside the circular silhouette.
  c.fillStyle=p.ear;c.beginPath();c.ellipse(-rr*.39,-rr*.49,rr*.17,rr*.24,-.25,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(rr*.39,-rr*.49,rr*.17,rr*.24,.25,0,Math.PI*2);c.fill();

  // Big bright eyes and tiny nose, matching the cheerful expression in the reference.
  const eyeY=-rr*.035;
  c.fillStyle='#f8f5f0';c.beginPath();c.arc(-rr*.27,eyeY,rr*.105,0,Math.PI*2);c.fill();c.beginPath();c.arc(rr*.27,eyeY,rr*.105,0,Math.PI*2);c.fill();
  c.fillStyle=p.face;c.beginPath();c.arc(-rr*.27,eyeY,rr*.058,0,Math.PI*2);c.fill();c.beginPath();c.arc(rr*.27,eyeY,rr*.058,0,Math.PI*2);c.fill();
  c.fillStyle='#fff';c.beginPath();c.arc(-rr*.29,-rr*.06,rr*.018,0,Math.PI*2);c.fill();c.beginPath();c.arc(rr*.25,-rr*.06,rr*.018,0,Math.PI*2);c.fill();
  c.fillStyle='#17151d';c.beginPath();c.ellipse(0,rr*.13,rr*.105,rr*.075,0,0,Math.PI*2);c.fill();
  c.strokeStyle=p.face;c.lineWidth=Math.max(1,rr*.032);c.lineCap='round';c.beginPath();c.arc(-rr*.02,rr*.17,rr*.14,.12,1.22);c.stroke();
  c.fillStyle='#f0808e';c.beginPath();c.ellipse(0,rr*.25,rr*.09,rr*.12,0,0,Math.PI*2);c.fill();
  c.globalAlpha=.20;c.fillStyle='#fff';c.beginPath();c.arc(-rr*.54,-rr*.27,rr*.12,0,Math.PI*2);c.fill();c.globalAlpha=1;
  c.restore();
}
function drawObstacle(c,x,y,r,themeKey){
  c.save();c.translate(x,y);
  c.shadowColor='#0006';c.shadowBlur=8;c.shadowOffsetY=2;
  if(themeKey==='halloween'){
    c.fillStyle='#e08b2e';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
    c.strokeStyle='#b5691c';c.lineWidth=Math.max(1,r*.09);
    for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(i*r*.32,-r*.85);c.lineTo(i*r*.32,r*.85);c.stroke();}
    c.fillStyle='#2c1810';
    c.beginPath();c.moveTo(-r*.32,-r*.1);c.lineTo(-r*.08,-r*.1);c.lineTo(-r*.2,r*.12);c.closePath();c.fill();
    c.beginPath();c.moveTo(r*.32,-r*.1);c.lineTo(r*.08,-r*.1);c.lineTo(r*.2,r*.12);c.closePath();c.fill();
    c.beginPath();c.moveTo(-r*.25,r*.35);c.lineTo(r*.25,r*.35);c.lineTo(r*.12,r*.5);c.lineTo(0,r*.4);c.lineTo(-r*.12,r*.5);c.closePath();c.fill();
    c.fillStyle='#3a7d2e';c.beginPath();c.ellipse(0,-r*.95,r*.14,r*.1,0,0,Math.PI*2);c.fill();
  }else if(themeKey==='christmas'){
    c.save();c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.clip();
    c.fillStyle='#c9302c';c.fillRect(-r,-r,r*2,r*2);
    c.strokeStyle='#fff';c.lineWidth=Math.max(2,r*.22);
    for(let i=-r*2;i<r*2;i+=r*.6){c.beginPath();c.moveTo(i,-r);c.lineTo(i+r*2,r);c.stroke();}
    c.restore();c.shadowBlur=0;c.shadowOffsetY=0;
    c.fillStyle='#2a5c3f';c.fillRect(-r*.12,-r*1.15,r*.24,r*.22);
    c.fillStyle='#e8c84f';c.beginPath();c.arc(0,-r*1.15,r*.12,0,Math.PI*2);c.fill();
  }else if(themeKey==='autumn'){
    c.fillStyle='#c9762f';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
    c.fillStyle='#ffd9a0';
    for(let i=0;i<3;i++){c.save();c.rotate(i*2.1);c.beginPath();c.ellipse(r*.4,0,r*.28,r*.14,0,0,Math.PI*2);c.fill();c.restore();}
  }else if(themeKey==='sakura'){
    c.fillStyle='#7a4a63';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
    c.fillStyle='#ffb6d9';
    for(let i=0;i<5;i++){c.save();c.rotate(i*(Math.PI*2/5));c.beginPath();c.ellipse(r*.42,0,r*.3,r*.18,0,0,Math.PI*2);c.fill();c.restore();}
    c.fillStyle='#ffe9f4';c.beginPath();c.arc(0,0,r*.16,0,Math.PI*2);c.fill();
  }else{
    c.fillStyle='#8b7fd1';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
    c.strokeStyle='#c9c2ff';c.lineWidth=Math.max(1,r*.12);
    for(let i=0;i<3;i++){c.beginPath();c.arc(0,0,r*.55,i*2*Math.PI/3,i*2*Math.PI/3+1.4);c.stroke();}
    c.fillStyle='#efeaff';c.beginPath();c.arc(-r*.3,-r*.3,r*.16,0,Math.PI*2);c.fill();
  }
  c.restore();
}
function drawHazard(c,x,y,r,hazard){
  c.save();c.translate(x,y);
  c.shadowColor='#0006';c.shadowBlur=8;c.shadowOffsetY=2;
  if(hazard==='shower'){
    c.fillStyle='#5fa8d3';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
    c.fillStyle='#eaf6ff';c.beginPath();c.roundRect(-r*.42,-r*.5,r*.84,r*.22,r*.08);c.fill();
    c.strokeStyle='#eaf6ff';c.lineWidth=Math.max(1,r*.05);
    for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(i*r*.13,-r*.22);c.lineTo(i*r*.13,r*.15+(Math.abs(i)%2)*r*.1);c.stroke();}
    c.fillStyle='#bfe4ff';
    c.beginPath();c.arc(-r*.3,r*.45,r*.07,0,Math.PI*2);c.fill();
    c.beginPath();c.arc(r*.05,r*.55,r*.06,0,Math.PI*2);c.fill();
    c.beginPath();c.arc(r*.35,r*.4,r*.07,0,Math.PI*2);c.fill();
  }else if(hazard==='vet'){
    c.fillStyle='#f4f1ea';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
    c.fillStyle='#d94c4c';
    c.beginPath();c.roundRect(-r*.14,-r*.5,r*.28,r,r*.06);c.fill();
    c.beginPath();c.roundRect(-r*.5,-r*.14,r,r*.28,r*.06);c.fill();
  }else{
    c.fillStyle='#8a8f99';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
    c.strokeStyle='#cfd3d8';c.lineWidth=Math.max(1,r*.09);
    c.beginPath();c.arc(0,0,r*.5,0,Math.PI*1.5);c.stroke();
    c.beginPath();c.arc(0,0,r*.25,0,Math.PI*1.1);c.stroke();
    c.fillStyle='#cfd3d8';c.beginPath();c.arc(r*.45,-r*.1,r*.1,0,Math.PI*2);c.fill();
  }
  c.restore();
}
function drawSister(c,x,y,r,kind){
  c.save();c.translate(x,y);
  c.shadowColor='#0b0b18';c.shadowBlur=r*.22;c.shadowOffsetY=r*.09;
  if(kind==='cat'){
    c.fillStyle='#e9dcc2';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
    c.fillStyle='#4a3c33';
    c.beginPath();c.moveTo(-r*.55,-r*.55);c.lineTo(-r*.15,-r*.95);c.lineTo(-r*.05,-r*.35);c.closePath();c.fill();
    c.beginPath();c.moveTo(r*.55,-r*.55);c.lineTo(r*.15,-r*.95);c.lineTo(r*.05,-r*.35);c.closePath();c.fill();
    c.beginPath();c.ellipse(0,-r*.02,r*.42,r*.28,0,0,Math.PI*2);c.fill();
    c.fillStyle='#bfe8ef';
    c.beginPath();c.ellipse(-r*.2,-r*.03,r*.11,r*.14,-.2,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(r*.2,-r*.03,r*.11,r*.14,.2,0,Math.PI*2);c.fill();
    c.fillStyle='#16232a';
    c.beginPath();c.ellipse(-r*.2,0,r*.045,r*.09,0,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(r*.2,0,r*.045,r*.09,0,0,Math.PI*2);c.fill();
    c.fillStyle='#c98a8f';c.beginPath();c.moveTo(-r*.05,r*.14);c.lineTo(r*.05,r*.14);c.lineTo(0,r*.22);c.closePath();c.fill();
    c.strokeStyle='#4a3c33';c.lineWidth=Math.max(1,r*.035);c.lineCap='round';
    c.beginPath();c.moveTo(0,r*.22);c.quadraticCurveTo(r*.14,r*.28,r*.22,r*.2);c.stroke();
    c.beginPath();c.moveTo(0,r*.22);c.quadraticCurveTo(-r*.14,r*.28,-r*.22,r*.2);c.stroke();
    c.strokeStyle='#00000055';c.lineWidth=1;
    c.beginPath();c.moveTo(-r*.15,r*.16);c.lineTo(-r*.65,r*.10);c.moveTo(-r*.15,r*.22);c.lineTo(-r*.65,r*.24);c.stroke();
    c.beginPath();c.moveTo(r*.15,r*.16);c.lineTo(r*.65,r*.10);c.moveTo(r*.15,r*.22);c.lineTo(r*.65,r*.24);c.stroke();
  }else{
    c.fillStyle='#e8b563';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
    c.fillStyle='#c98f3f';
    c.beginPath();c.ellipse(-r*.62,-r*.05,r*.24,r*.42,-.3,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(r*.62,-r*.05,r*.24,r*.42,.3,0,Math.PI*2);c.fill();
    c.fillStyle='#f3d9a8';c.beginPath();c.ellipse(0,r*.22,r*.34,r*.26,0,0,Math.PI*2);c.fill();
    c.fillStyle='#3a2a1c';
    c.beginPath();c.arc(-r*.22,-r*.05,r*.07,0,Math.PI*2);c.fill();
    c.beginPath();c.arc(r*.22,-r*.05,r*.07,0,Math.PI*2);c.fill();
    c.fillStyle='#2a2018';c.beginPath();c.ellipse(0,r*.2,r*.09,r*.07,0,0,Math.PI*2);c.fill();
    c.strokeStyle='#8a5f28';c.lineWidth=Math.max(1,r*.05);c.lineCap='round';
    c.beginPath();c.moveTo(-r*.32,-r*.22);c.lineTo(-r*.12,-r*.16);c.stroke();
    c.beginPath();c.moveTo(r*.32,-r*.22);c.lineTo(r*.12,-r*.16);c.stroke();
  }
  c.restore();
}

let controlsTimer=null;
let controlsHidden=false;
function hideControls(){
  if(controlsHidden)return;
  controlsHidden=true;
  document.querySelector('.bottomControls')?.classList.add('hidden');
  if(controlsTimer){clearTimeout(controlsTimer);controlsTimer=null;}
}
function showControls(){
  controlsHidden=false;
  document.querySelector('.bottomControls')?.classList.remove('hidden');
  if(controlsTimer)clearTimeout(controlsTimer);
  controlsTimer=setTimeout(hideControls,10000);
}
function spawnAt(x, targetY){
  if(gameOver||dropCooldown>0)return;
  const sx=W/2, sy=72;
  x=Math.max(25,Math.min(W-25,x));
  targetY=Math.max(150,Math.min(H-120,targetY ?? H*.58));
  const dx=x-sx, dy=targetY-sy, len=Math.max(1,Math.hypot(dx,dy)), speed=520;
  if(next.kind==='rainbow'){
    const shot={x:sx,y:sy,r:25,vx:dx/len*speed,vy:dy/len*speed,kind:'rainbow',dead:false,hits:new Set(),settle:0};
    balls.push(shot); rainbowCount++; burst(sx,sy,'🌈'); toast('RAINBOW POM! +1 TO EVERY POM IT TOUCHES! 🌈');
  }else if(next.kind==='power'){
    const shot={x:sx,y:sy,r:20,vx:dx/len*speed,vy:dy/len*speed,kind:'power',power:next.power,dead:false,settle:0};
    balls.push(shot); burst(sx,sy,powerDefs[next.power].emoji); toast(powerDefs[next.power].name+'! '+powerDefs[next.power].emoji);
  }else if(next.kind==='wildcard'||next.kind==='bomb'||next.kind==='magnet'||next.kind==='freeze'||next.kind==='blessing'||next.kind==='mystery'){
    let k=next.kind, actual=k==='mystery'?['pom','wildcard','bomb','magnet','freeze'][Math.floor(Math.random()*5)]:k;
    if(actual==='pom'){const t=randType();balls.push(makeBall(sx,sy,t,dx/len*speed,dy/len*speed));}
    else { const shot={x:sx,y:sy,r:24,vx:dx/len*speed,vy:dy/len*speed,kind:actual,dead:false,settle:0,triggered:false}; balls.push(shot); }
    if(actual==='blessing'){}
    burst(sx,sy,actual==='wildcard'?'🃏':actual==='bomb'?'💣':actual==='magnet'?'🧲':actual==='freeze'?'❄️':'❓');
  }else if(next.kind==='sister'){
    const s={x:sx,y:sy,r:30,vx:dx/len*speed,vy:dy/len*speed,kind:'sister',sister:next.sister,dead:false,settle:0};
    balls.push(s); burst(sx,sy,sisterDefs[next.sister].emoji); toast(sisterDefs[next.sister].name.toUpperCase()+' CRASHED IN! '+sisterDefs[next.sister].emoji);
  }else if(next.kind==='hazard'){
    const hz={x:sx,y:sy,r:28,vx:dx/len*speed,vy:dy/len*speed,kind:'hazard',hazard:next.hazard,dead:false,triggered:false,hits:new Set(),settle:0};
    balls.push(hz); burst(sx,sy,hazardDefs[next.hazard].emoji); toast(hazardDefs[next.hazard].name.toUpperCase()+' INCOMING! '+hazardDefs[next.hazard].emoji);
  }else{
    balls.push(makeBall(sx,sy,next.type,dx/len*speed,dy/len*speed));
  }
  next=randShot();dropCooldown=.28;updateUI();
}
let dragging=false;
function pointer(e){
  const r=C.getBoundingClientRect();
  aimX=Math.max(25,Math.min(W-25,e.clientX-r.left));
  aimY=Math.max(145,Math.min(H-90,e.clientY-r.top));
}
C.addEventListener('pointerdown',e=>{
  if(gameOver)return;
  e.preventDefault(); hideControls(); dragging=true; C.setPointerCapture?.(e.pointerId); pointer(e);
});
C.addEventListener('pointermove',e=>{ if(dragging){e.preventDefault();pointer(e)} });
C.addEventListener('pointerup',e=>{
  if(!dragging)return;
  e.preventDefault(); dragging=false; pointer(e);
  spawnAt(aimX,aimY);
});
C.addEventListener('pointercancel',()=>dragging=false);
addEventListener('keydown',e=>{
  if(e.key===' '){e.preventDefault();if(!gameOver){hideControls();spawnAt(aimX||W/2,aimY||H*.58)}}
});
function collide(a,b){
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.r+b.r;
  if(d<min && d>0){
    const nx=dx/d,ny=dy/d,over=min-d;
    a.x-=nx*over*.5;a.y-=ny*over*.5;b.x+=nx*over*.5;b.y+=ny*over*.5;
    const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
    if(rv<0){const impulse=-rv*.35;a.vx-=nx*impulse;a.vy-=ny*impulse;b.vx+=nx*impulse;b.vy+=ny*impulse}
    return true;
  } return false;
}
function merge(a,b){
  if(a.kind==='power'||b.kind==='power')return;
  if(a.type!==b.type && !a.wild && !b.wild)return;
  const x=(a.x+b.x)/2,y=(a.y+b.y)/2; let t=Math.max(a.type,b.type)+1;
  if(Math.random()<.025 && t<sizes.length-1){ t++; burst(x,y,'🚀'); toast('MEGA MERGE! +2 FLOOF! 🚀'); }
  if(t>=sizes.length){ // Ultimate Pom = the win condition
    highestFloof=sizes.length;
    score+=5000;merges++;combo=Math.min(12,combo+1);comboMax=Math.max(comboMax,combo);comboTimer=2.2;
    a.dead=true;b.dead=true;
    balls.push({x,y,type:sizes.length-1,r:sizes[sizes.length-1],vx:0,vy:0,rest:true,settle:1,launched:false,ultimate:true,kind:'pom',shrinkTimer:0});
    burst(x,y,'👑');burst(x,y,'✨');burst(x,y,'💖');
    toast('MEGA RIKO! 👑');
    winning=true; winGame();
    return;
  }
  a.dead=true;b.dead=true;merges++;combo=Math.min(12,combo+1);comboMax=Math.max(comboMax,combo);comboTimer=2.2;score+=(t+1)*100*combo; highestFloof=Math.max(highestFloof,t+1);
  balls.push(makeBall(x,y,t,(Math.random()-.5)*2,-4.5));
  burst(x,y,'✨'); if(t>=4)toast(t>=6?'MEGA FLOOF! 💖':'BIG FLOOF! ✨');
}
function sisterMerge(a,b){
  a.dead=true;b.dead=true;score+=150;
  burst((a.x+b.x)/2,(a.y+b.y)/2,a.sister==='cat'?'😹':'🌭');
  toast(a.sister==='cat'?'BIJUU & BIJUU CALLED A TRUCE! 😹':'PENNY PILE-UP CLEARED! 🌭');
}
function hazardTouch(hz,pom){
  if(hz.dead||hz.hits.has(pom)||pom.dead)return;
  hz.hits.add(pom);
  const first=hz.hits.size===1;
  if(hz.hazard==='shower'){
    pom.dead=true;burst(pom.x,pom.y,'💦');
    if(first)toast('SHOWER RINSING THROUGH! 🚿💦');
  }else if(hz.hazard==='vet'){
    if(pom.type>0){pom.type--;pom.r=sizes[pom.type];}
    burst(pom.x,pom.y,'💉');
    if(first)toast('VET ON THE WAY DOWN! 💉😿');
  }else if(hz.hazard==='vacuum'){
    pom.dead=true;burst(pom.x,pom.y,'🧹');
    if(first)toast('VACUUM SUCKING THINGS UP! 🧹😱');
  }
}
function burst(x,y,char){
  for(let i=0;i<18;i++)particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5-1,life:1,char});
}
function toast(t){const el=document.getElementById('toast');el.textContent=t;el.classList.add('show');clearTimeout(window.tt);window.tt=setTimeout(()=>el.classList.remove('show'),700)}
function winGame(){
  if(gameOver)return;
  winning=false;
  gameOver=true;
  if(score>best){best=score;localStorage.pomBest=best;}
  document.getElementById('final').textContent=score.toLocaleString();
  document.getElementById('resultModal').classList.add('win');
  document.getElementById('resultCrown').textContent='👑';
  document.getElementById('resultTitle').textContent=gameMode==='rush'?'POM RUSH CLEARED!':gameMode==='challenge'?'CHALLENGE CLEARED!':gameMode==='riko'?'MEGA RIKO MODE!':'LEVEL '+level+' CLEAR!';
  document.getElementById('winText').style.display='block';
  toast('MEGA RIKO APPROVES! 💖👑');
  document.getElementById('winText').textContent=gameMode==='rush'?'MEGA RIKO SURVIVED THE RUSH! 👑⚡':gameMode==='challenge'?'RIKO APPROVES! MISSION COMPLETE! 🎯💖':gameMode==='riko'?'YOU SURVIVED MAXIMUM FLOOF! 💖👑':'YOU UNLOCKED MEGA RIKO! 👑';
  const wc=document.getElementById('winPomCanvas'), wctx=wc.getContext('2d');
  wctx.clearRect(0,0,150,120);drawPom(wctx,75,60,45,4,1);
  document.getElementById('nextLevel').style.display=(gameMode==='rush'||gameMode==='challenge'||gameMode==='riko')?'none':'inline-block';
  document.getElementById('again').textContent=gameMode==='rush'?'RUSH AGAIN ⚡':gameMode==='challenge'?'TRY CHALLENGE AGAIN 🎯':gameMode==='riko'?'RIKO MODE AGAIN 💖':'RESTART 🐾';
  document.getElementById('gameover').style.display='flex';
  updateUI();
}
function nextLevel(){
  level++;
  balls=[];particles=[];ambient=[];next=randShot();dropCooldown=0;slowTimer=0;combo=1;comboTimer=0;
  gameOver=false;winning=false;
  document.getElementById('gameover').style.display='none';
  applyLevel(true);
  showControls();updateUI();
}
function endGame(){
  if(gameOver||winning)return;
  gameOver=true;
  document.getElementById('final').textContent=score.toLocaleString();
  document.getElementById('resultModal').classList.remove('win');
  document.getElementById('resultCrown').textContent='🐾';
  document.getElementById('resultTitle').textContent='Too Much FLOOF!';
  document.getElementById('winText').style.display='none';
  document.getElementById('nextLevel').style.display='none';
  document.getElementById('again').textContent='TRY AGAIN 🐾';
  document.getElementById('gameover').style.display='flex';
  updateUI();
}

function updateAmbient(dt){
  const th=THEME_DEFS[curLevel.theme]||THEME_DEFS.cozy;
  ambientTimer-=dt;
  if(ambientTimer<=0){
    ambientTimer=th.ambient==='bat'?1.3:th.ambient==='sparkle'?.5:.2;
    if(th.ambient==='snow'){ambient.push({x:Math.random()*W,y:-10,vy:30+Math.random()*28,r:2+Math.random()*3,drift:Math.random()*6,type:'snow'});}
    else if(th.ambient==='leaf'){ambient.push({x:Math.random()*W,y:-10,vx:(Math.random()-.5)*24,vy:26+Math.random()*20,r:5+Math.random()*4,rot:Math.random()*7,vr:(Math.random()-.5)*3,type:'leaf'});}
    else if(th.ambient==='bat'){const fromLeft=Math.random()<.5;ambient.push({x:fromLeft?-20:W+20,y:60+Math.random()*140,vx:(fromLeft?1:-1)*(60+Math.random()*40),phase:Math.random()*6.28,type:'bat'});}
    else if(th.ambient==='sparkle'){ambient.push({x:Math.random()*W,y:Math.random()*H*.6+40,vy:-14,r:2,life:1,type:'sparkle'});}
    else if(th.ambient==='petal'){ambient.push({x:Math.random()*W,y:-10,vx:(Math.random()-.5)*16,vy:16+Math.random()*14,r:4+Math.random()*3,rot:Math.random()*7,vr:(Math.random()-.5)*2,type:'petal'});}
  }
  for(const a of ambient){
    if(a.type==='snow'){a.y+=a.vy*dt;a.x+=Math.sin(a.y*.02+a.drift)*dt*20;}
    else if(a.type==='leaf'){a.y+=a.vy*dt;a.x+=a.vx*dt+Math.sin(a.y*.03)*dt*30;a.rot+=a.vr*dt;}
    else if(a.type==='bat'){a.x+=a.vx*dt;a.phase+=dt*4;a.y+=Math.sin(a.phase)*dt*40;}
    else if(a.type==='sparkle'){a.y+=a.vy*dt;a.life-=dt*.5;}
    else if(a.type==='petal'){a.y+=a.vy*dt;a.x+=a.vx*dt+Math.sin(a.y*.04)*dt*40;a.rot+=a.vr*dt;}
  }
  ambient=ambient.filter(a=>a.type==='bat'?(a.x>-40&&a.x<W+40):a.type==='sparkle'?a.life>0:a.y<H+20);
}
function drawAmbient(){
  for(const a of ambient){
    if(a.type==='snow'){ctx.globalAlpha=.75;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
    else if(a.type==='leaf'){ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.rot);ctx.globalAlpha=.85;ctx.fillStyle=['#e2793a','#c9762f','#f2b866','#8a4a1e'][Math.floor(a.x)%4];ctx.beginPath();ctx.ellipse(0,0,a.r,a.r*.55,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.restore();}
    else if(a.type==='bat'){ctx.save();ctx.translate(a.x,a.y);ctx.globalAlpha=.8;ctx.fillStyle='#1a1420';const flap=Math.sin(a.phase*2)*.5+.5;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-14,-10-flap*8,-22,2);ctx.quadraticCurveTo(-10,2,0,6);ctx.quadraticCurveTo(10,2,22,2);ctx.quadraticCurveTo(14,-10-flap*8,0,0);ctx.fill();ctx.globalAlpha=1;ctx.restore();}
    else if(a.type==='sparkle'){ctx.globalAlpha=a.life*.7;ctx.fillStyle='#ffe9b8';ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
    else if(a.type==='petal'){ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.rot);ctx.globalAlpha=.85;ctx.fillStyle='#ffb6d9';ctx.beginPath();ctx.ellipse(0,0,a.r,a.r*.6,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.restore();}
  }
}
function physics(dt){ if(menuOpen||gameOver||winning)return;
  const rawDt=dt;
  if(gameMode==='rush'){rushClock+=rawDt; if(rushClock>rushBest){rushBest=rushClock;localStorage.pomRushBest=rushBest;}}
  dropCooldown=Math.max(0,dropCooldown-dt);freezeTimer=Math.max(0,freezeTimer-rawDt);magnetTimer=Math.max(0,magnetTimer-rawDt);eventTimer=Math.max(0,eventTimer-rawDt);comboTimer=Math.max(0,comboTimer-dt);slowTimer=Math.max(0,slowTimer-dt);if(comboTimer<=0)combo=1;
  const timeScale=slowTimer>0?.38:1; dt*=timeScale;
  updateAmbient(rawDt);
  if(gameMode==='rush' && eventTimer<=0){
    const ev=Math.random(); eventTimer=10+Math.random()*8;
    if(ev<.25){activeEvent='FLOOF FRENZY';eventTimer=7;toast('⚡ FLOOF FRENZY! SHRINKING SPEED UP!');}
    else if(ev<.50){activeEvent='RAINBOW STORM';eventTimer=6;toast('🌈 RAINBOW STORM!');}
    else if(ev<.72){activeEvent='POM FLOOD';for(let i=0;i<3;i++){const t=randType();balls.push(makeBall(40+Math.random()*(W-80),170,t,(Math.random()-.5)*80,0));}toast('🌊 POM FLOOD!');}
    else if(ev<.88){activeEvent='RIKO TIME';freezeTimer=6;toast('💖 RIKO TIME! SHRINKING PAUSED!');}
    else {activeEvent='SISTER ATTACK';toast('😼🌭 SISTER ATTACK!');}
    const et=document.getElementById('eventTag');if(et){et.style.display='block';et.textContent='⚡ '+activeEvent;}
  }
  if(eventTimer<=0){activeEvent=null;const et=document.getElementById('eventTag');if(et)et.style.display='none';}

  for(const b of balls){
    if(gameMode==='rush' && b.kind==='pom' && !b.ultimate && freezeTimer<=0){
      b.shrinkTimer=(b.shrinkTimer||0)+rawDt;
      // Every few seconds a Pom loses a coat tier. Tiny Poms eventually vanish.
      const shrinkEvery=Math.max(1.9,(activeEvent==='FLOOF FRENZY'?3.5:5.2)-rushClock*.018);
      if(b.shrinkTimer>=shrinkEvery){
        b.shrinkTimer=0;
        if(b.type>0){
          b.type--;b.r=sizes[b.type];
          burst(b.x,b.y,'💨');
          if(b.type===0)toast('POM IS SHRINKING! 😳');
        }else{
          b.dead=true;burst(b.x,b.y,'💨');
          if(Math.random()<.45)toast('A TINY POM VANISHED! 💨');
        }
      }
    }
    b.vy+=650*dt;b.vx*=.999;
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    for(const o of curLevel.obstacles){
      const ox=o.xf*W, oy=o.yf*H, orad=o.rf*Math.min(W,H);
      const dx=b.x-ox, dy=b.y-oy, dist=Math.hypot(dx,dy)||.001, minD=b.r+orad;
      if(dist<minD){
        const nx=dx/dist, ny=dy/dist, overlap=minD-dist;
        b.x+=nx*overlap;b.y+=ny*overlap;
        const vn=b.vx*nx+b.vy*ny;
        if(vn<0){b.vx-=vn*nx*1.7;b.vy-=vn*ny*1.7;}
      }
    }
    if(b.x-b.r<3){b.x=b.r+3;b.vx=Math.abs(b.vx)*.42}
    if(b.x+b.r>W-3){b.x=W-b.r-3;b.vx=-Math.abs(b.vx)*.42}
    let inDead=false;
    for(const dz of curLevel.deadzones){
      const dxc=dz.xf*W, dw=dz.wf*W;
      const dy0=(dz.yf?dz.yf*H:H-46), dh=(dz.hf?dz.hf*H:46); if(b.x>dxc-dw/2 && b.x<dxc+dw/2 && b.y+b.r>dy0 && b.y-b.r<dy0+dh) inDead=true;
    }
    if(b.kind==='hazard'){
      if(!b.triggered && b.y+b.r>H-5){ b.y=H-5-b.r; b.vy*=-.15; b.vx*=.8; b.triggered=true; burst(b.x,b.y,hazardDefs[b.hazard].emoji); b.dead=true; }
      else if(b.triggered){ b.dead=true; }
    } else if(b.kind==='rainbow'){
      if(b.y+b.r>H-5){ b.y=H-5-b.r; b.vy*=-.15; b.vx*=.8; burst(b.x,b.y,'🌈'); b.dead=true; }
    } else if(inDead){
      if(b.y-b.r>H+10){
        b.dead=true;
        if(b.kind==='sister'){score+=80;toast((b.sister==='cat'?'BIJUU':'PENNY')+' FELL IN THE GAP! 😹');}
        else if(Math.random()<.5){toast('OOPS! Lost in the gap! 😳');}
        burst(b.x,H-20,'💨');
      }
      b.settle=0;
    } else {
      if(b.y+b.r>H-5){b.y=H-5-b.r;b.vy*=-.22;b.vx*=.88;b.settle+=dt}
      else b.settle=0;
    }
  }
  for(let i=0;i<balls.length;i++){const p=balls[i];if(p.kind==='power'&&!p.dead){for(let j=0;j<balls.length;j++){const b=balls[j];if(b!==p&&!b.dead&&b.kind!=='power'&&b.kind!=='rainbow'&&Math.hypot(p.x-b.x,p.y-b.y)<p.r+b.r){powerHit(p);break;}}}}
  for(let i=0;i<balls.length;i++){const rp=balls[i];if(rp.kind==='rainbow'&&!rp.dead){for(let j=0;j<balls.length;j++){const b=balls[j];if(b===rp||b.dead||b.kind!=='pom'||rp.hits.has(b))continue;if(Math.hypot(rp.x-b.x,rp.y-b.y)<rp.r+b.r){rp.hits.add(b);if(b.type<sizes.length-1){b.type++;b.r=sizes[b.type];score+=60*(b.type+1);burst(b.x,b.y,'🌈');}else{score+=300;burst(b.x,b.y,'👑');}if(rp.hits.size===1)toast('RAINBOW BOOST! EVERY POM GETS +1! 🌈');}}}}
  // Special Poms: wildcard, bomb, magnet, freeze and Riko's blessing.
  for(const sp of balls){
    if(sp.dead)continue;
    if(sp.kind==='freeze' && sp.y+sp.r>H-20){freezeTimer=5;sp.dead=true;burst(sp.x,sp.y,'❄️');toast('FLOOF FREEZE! SHRINKING PAUSED! ❄️');}
    if(sp.kind==='blessing' && sp.y+sp.r>H-20){sp.dead=true;let boosted=0;for(const b of balls)if(b.kind==='pom'&&!b.dead){if(b.type<sizes.length-1){b.type++;b.r=sizes[b.type];boosted++;}else score+=250;}score+=500*boosted;combo=Math.min(12,combo+2);comboMax=Math.max(comboMax,combo);burst(sp.x,sp.y,'💖');toast("RIKO'S BLESSING! EVERY POM +1! 💖");}
    if(sp.kind==='bomb' && sp.y+sp.r>H-20){sp.dead=true;let n=0;for(const b of balls)if(b.kind==='pom'&&!b.dead&&Math.hypot(b.x-sp.x,b.y-sp.y)<150){b.vx+=(b.x-sp.x)*2.2;b.vy-=220;b.dead=Math.random()<.12;n++;}score+=120*n;burst(sp.x,sp.y,'💥');toast('POM BOMB! BOOOOM! 💣');}
    if(sp.kind==='magnet' && !sp.triggered){sp.triggered=true;magnetTimer=4.5;sp.dead=true;toast('FLOOF MAGNET! COME HERE, POMS! 🧲');}
    if(sp.kind==='wildcard' && !sp.triggered){sp.triggered=true;sp.wild=true;sp.kind='pom';sp.type=Math.floor(Math.random()*Math.min(4,coats.length));sp.r=sizes[sp.type];toast('WILD POM! IT MATCHES ANYTHING! 🃏');}
  }
  if(magnetTimer>0){for(const a of balls)if(a.kind==='pom'&&!a.dead)for(const b of balls)if(b!==a&&b.kind==='pom'&&!b.dead){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;if(d<260){a.vx+=(dx/d)*35*rawDt;a.vy+=(dy/d)*35*rawDt;}}}
  for(let pass=0;pass<3;pass++)for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){
    const a=balls[i],b=balls[j]; if(a.dead||b.dead||a.kind==='power'||b.kind==='power'||a.kind==='rainbow'||b.kind==='rainbow')continue;
    const touching=collide(a,b); if(!touching)continue;
    if(a.kind==='sister'&&b.kind==='sister'){
      if(a.sister===b.sister&&Math.random()<.18)sisterMerge(a,b);
    }else if(a.kind==='hazard'||b.kind==='hazard'){
      const hz=a.kind==='hazard'?a:b, other=a.kind==='hazard'?b:a;
      if(other.kind==='pom')hazardTouch(hz,other);
    }else if(a.kind!=='sister'&&b.kind!=='sister'){
      if(a.type===b.type||a.wild||b.wild)merge(a,b);
    }
  }
  for(const s of balls){
    if(s.kind==='sister'&&!s.dead&&Math.abs(s.vx)<40&&Math.abs(s.vy)<40&&Math.random()<dt*.7){
      const near=balls.filter(b=>b.kind==='pom'&&!b.dead&&Math.hypot(b.x-s.x,b.y-s.y)<s.r+b.r+90);
      if(near.length){
        const t=near[Math.floor(Math.random()*near.length)];
        if(s.sister==='cat'){
          t.vx+=(Math.random()-.5)*260;t.vy-=120;comboTimer=0;combo=1;
          burst(t.x,t.y,'💢');if(Math.random()<.4)toast('BIJUU HISSED! Combo broken! 😾');
        }else{
          t.vx+=(Math.random()-.5)*340;t.vy-=60;
          burst(t.x,t.y,'💨');if(Math.random()<.4)toast('PENNY DUG IN! 🌭');
        }
      }
    }
  }
  balls=balls.filter(b=>!b.dead);
  for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=100*dt;p.life-=dt*1.6}
  particles=particles.filter(p=>p.life>0);
  if(balls.some(b=>b.y-b.r<132 && Math.abs(b.vy)<120 && b.settle>.18)){endGame()}
  if(score>best){best=score;localStorage.pomBest=best} checkChallenge(); if(document.getElementById('comboText')){document.getElementById('comboText').textContent='x'+combo;document.getElementById('comboSub').textContent=combo>1?'FLOOF COMBO!':'Nice Shot!';}
}
function draw(){
  const th=THEME_DEFS[curLevel.theme]||THEME_DEFS.cozy;
  ctx.clearRect(0,0,W,H);
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,th.bg[0]);g.addColorStop(.55,th.bg[1]);g.addColorStop(1,th.bg[2]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // Themed room shapes: window glow, shelves, plants and wallpaper.
  ctx.globalAlpha=.10;ctx.fillStyle=th.glow;ctx.beginPath();ctx.roundRect(W*.70,18,W*.24,H*.25,22);ctx.fill();
  ctx.fillStyle=th.shelf;for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(25+i*86,95+(i%4)*145,18+(i%2)*10,0,7);ctx.fill()}
  ctx.globalAlpha=.08;ctx.fillStyle='#efe7ff';ctx.fillRect(18,H*.30,W-36,2);ctx.fillRect(18,H*.60,W-36,2);ctx.globalAlpha=1;
  ctx.setLineDash([17,14]);ctx.strokeStyle=th.line;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(12,132);ctx.lineTo(W-12,132);ctx.stroke();ctx.setLineDash([]);
  ctx.globalAlpha=.11;ctx.fillStyle=th.wallpaper;for(let i=0;i<9;i++){let px=35+(i*91)%(Math.max(80,W-70)),py=175+(i*83)%(Math.max(100,H-240));ctx.beginPath();ctx.arc(px,py,5,0,7);ctx.fill();ctx.beginPath();ctx.arc(px-9,py-7,3,0,7);ctx.fill();ctx.beginPath();ctx.arc(px+9,py-7,3,0,7);ctx.fill()}ctx.globalAlpha=1;
  for(const dz of curLevel.deadzones){
    const dx=dz.xf*W, dw=dz.wf*W, y0=dz.yf?dz.yf*H:H-46, h=46;
    ctx.save();ctx.beginPath();ctx.rect(dx-dw/2,y0,dw,h);ctx.clip();
    ctx.fillStyle='#1a0f14';ctx.fillRect(dx-dw/2,y0,dw,h);
    ctx.strokeStyle=th.line;ctx.lineWidth=6;
    for(let i=-h;i<dw+h;i+=18){ctx.beginPath();ctx.moveTo(dx-dw/2+i,y0+h);ctx.lineTo(dx-dw/2+i+h,y0);ctx.stroke();}
    ctx.restore();
    ctx.fillStyle=th.line;ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText('⚠ GAP',dx,y0-6);
  }
  for(const o of curLevel.obstacles){
    const ox=o.xf*W, oy=o.yf*H, orad=o.rf*Math.min(W,H);
    drawObstacle(ctx,ox,oy,orad,curLevel.theme);
  }
  drawAmbient();
  // aim line
  if(!gameOver && dropCooldown<=0){
    ctx.globalAlpha=.48;ctx.fillStyle='#eee9dc';
    const sx=W/2, sy=72, ax=aimX||W/2, ay=aimY||H*.58;
    const dx=ax-sx,dy=ay-sy,len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len;
    for(let d=45;d<Math.min(len,520);d+=24){ctx.beginPath();ctx.arc(sx+ux*d,sy+uy*d,3.2,0,7);ctx.fill()}
    ctx.globalAlpha=1;
  }
  for(const b of balls){ if(b.kind==='rainbow'){drawRainbow(ctx,b.x,b.y,b.r);} else if(['wildcard','bomb','magnet','freeze','blessing'].includes(b.kind)){drawSpecial(ctx,b.x,b.y,b.r,b.kind==='wildcard'?'🃏':b.kind==='bomb'?'💣':b.kind==='magnet'?'🧲':b.kind==='freeze'?'❄️':'💖',b.kind.toUpperCase());} else if(b.kind==='power'){drawPowerShot(ctx,b.x,b.y,b.r,b.power);} else if(b.kind==='sister'){drawSister(ctx,b.x,b.y,b.r,b.sister);ctx.save();ctx.strokeStyle='#ff5b6e';ctx.lineWidth=2.4;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(b.x,b.y,b.r+4,0,7);ctx.stroke();ctx.restore();} else if(b.kind==='hazard'){drawHazard(ctx,b.x,b.y,b.r,b.hazard);if(!b.triggered){ctx.save();ctx.strokeStyle='#ffce54';ctx.lineWidth=2.4;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(b.x,b.y,b.r+4,0,7);ctx.stroke();ctx.restore();}} else {drawPom(ctx,b.x,b.y,b.r,b.ultimate?4:b.type);} if(b.wild){ctx.save();ctx.strokeStyle='#f6c6ff';ctx.lineWidth=3;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(b.x,b.y,b.r+5,0,7);ctx.stroke();ctx.restore();}}
  for(const p of particles){ctx.globalAlpha=p.life;ctx.font='20px serif';ctx.textAlign='center';ctx.fillText(p.char,p.x,p.y)}ctx.globalAlpha=1;
  const lx=W/2,ly=78;
  ctx.fillStyle='#111126';ctx.strokeStyle='#e9ae4b';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(lx-43,ly-31,86,68,20);ctx.fill();ctx.stroke();
  ctx.fillStyle='#292747';ctx.beginPath();ctx.arc(lx,ly+8,29,Math.PI,0);ctx.fill();
  ctx.fillStyle='#d9973d';ctx.beginPath();ctx.arc(lx-34,ly+18,4,0,7);ctx.fill();ctx.beginPath();ctx.arc(lx+34,ly+18,4,0,7);ctx.fill();
  drawNextShot(ctx,lx,ly+2,next);
  ctx.font='900 9px system-ui';ctx.textAlign='center';ctx.fillStyle='#d7d0e4';ctx.fillText(dragging?'RELEASE TO SHOOT':'DRAG TO AIM • RELEASE',lx,ly-39);
}


/* RIKO CLOSET + LUCKY FLOOF */
const CLOSET_OUTFITS=[
 {id:'pink',emoji:'🌸',name:'Pink Floof',style:'#f28d9e'},
 {id:'blue',emoji:'🩵',name:'Sky Cute',style:'#8fbde8'},
 {id:'lavender',emoji:'💜',name:'Lavender Dream',style:'#b79adf'},
 {id:'green',emoji:'🍀',name:'Lucky Green',style:'#91c98b'},
 {id:'gold',emoji:'✨',name:'Royal Riko',style:'#ffc85d'}
];
const CLOSET_ACCESSORIES=[
 {id:'bow',emoji:'🎀',name:'Big Bow',slot:'accessory'},
 {id:'flower',emoji:'🌸',name:'Flower',slot:'accessory'},
 {id:'crown',emoji:'👑',name:'Tiny Crown',slot:'hat'},
 {id:'party',emoji:'🎉',name:'Party Hat',slot:'hat'},
 {id:'cat',emoji:'😼',name:'Bijuu Buddy',slot:'accessory'},
 {id:'penny',emoji:'🌭',name:'Penny Buddy',slot:'accessory'}
];
const WHEEL_PRIZES=[
 {label:'50 COINS',coins:50}, {label:'100 COINS',coins:100}, {label:'CUTE OUTFIT',unlock:'outfit'}, {label:'25 COINS',coins:25},
 {label:'150 COINS',coins:150}, {label:'ACCESSORY',unlock:'accessory'}, {label:'75 COINS',coins:75}, {label:'LUCKY 250!',coins:250}
];
function getArcadeData(){try{return JSON.parse(localStorage.rikoArcade||'{}')}catch(e){return {}}}
function saveArcadeData(d){localStorage.rikoArcade=JSON.stringify(d)}
function ensureArcadeData(){const d=getArcadeData();if(!d.coins)d.coins=0;if(!d.outfits)d.outfits=['pink'];if(!d.accessories)d.accessories=['bow'];if(!d.selectedOutfit)d.selectedOutfit='pink';if(!d.selectedAccessory)d.selectedAccessory='bow';if(!d.lastSpin)d.lastSpin='';saveArcadeData(d);return d}
function arcadeCoins(){return ensureArcadeData().coins||0}
function updateArcadeCoins(){const c=arcadeCoins();['closetCoins','wheelCoins'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=c.toLocaleString()})}
function renderCloset(){const d=ensureArcadeData();updateArcadeCoins();const outfits=document.getElementById('closetOutfits'),acc=document.getElementById('closetAccessories');outfits.innerHTML='';acc.innerHTML='';CLOSET_OUTFITS.forEach(x=>{const owned=d.outfits.includes(x.id),b=document.createElement('button');b.className='closetItem'+(d.selectedOutfit===x.id?' selected':'');b.innerHTML=`<span class="ciEmoji">${x.emoji}</span><b>${x.name}</b><small>${owned?'OWNED':'Unlock from Lucky Floof'}</small>`;b.disabled=!owned;b.onclick=()=>{d.selectedOutfit=x.id;saveArcadeData(d);renderCloset()};outfits.appendChild(b)});CLOSET_ACCESSORIES.forEach(x=>{const owned=d.accessories.includes(x.id),b=document.createElement('button');b.className='closetItem'+(d.selectedAccessory===x.id?' selected':'');b.innerHTML=`<span class="ciEmoji">${x.emoji}</span><b>${x.name}</b><small>${owned?'OWNED':'Unlock from Lucky Floof'}</small>`;b.disabled=!owned;b.onclick=()=>{d.selectedAccessory=x.id;saveArcadeData(d);renderCloset()};acc.appendChild(b)});const outfit=CLOSET_OUTFITS.find(x=>x.id===d.selectedOutfit)||CLOSET_OUTFITS[0];const ac=CLOSET_ACCESSORIES.find(x=>x.id===d.selectedAccessory);document.getElementById('dressupOutfit').style.background=outfit.style;document.getElementById('dressupHat').textContent=ac&&ac.slot==='hat'?ac.emoji:'';document.getElementById('dressupAccessory').textContent=ac&&ac.slot==='accessory'?ac.emoji:''}
function openCloset(){ensureArcadeData();document.getElementById('launcher').style.display='none';document.getElementById('game').style.display='none';document.getElementById('closetGame').style.display='block';renderCloset()}
function closeCloset(){document.getElementById('closetGame').style.display='none';document.getElementById('game').style.display='grid';showLauncher()}
function wheelDate(){const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
function renderWheelLabels(){const box=document.getElementById('wheelLabels');if(!box)return;box.innerHTML='';WHEEL_PRIZES.forEach((p,i)=>{const s=document.createElement('span');s.textContent=p.label;s.style.transform=`rotate(${i*45+22.5}deg) translateX(-50%)`;box.appendChild(s)})}
function openWheel(){ensureArcadeData();document.getElementById('launcher').style.display='none';document.getElementById('game').style.display='none';document.getElementById('wheelGame').style.display='block';renderWheelLabels();updateArcadeCoins();const d=ensureArcadeData();document.getElementById('spinWheel').disabled=d.lastSpin===wheelDate();document.getElementById('wheelResult').textContent=d.lastSpin===wheelDate()?'✨ You already spun today! Come back tomorrow.':'Your daily prize awaits!'}
function closeWheel(){document.getElementById('wheelGame').style.display='none';document.getElementById('game').style.display='grid';showLauncher()}
function spinWheel(){const d=ensureArcadeData();if(d.lastSpin===wheelDate())return;const i=Math.floor(Math.random()*WHEEL_PRIZES.length),p=WHEEL_PRIZES[i],wheel=document.getElementById('wheel');const turns=5+Math.floor(Math.random()*3),rotation=turns*360+(360-(i*45+22.5));wheel.style.transform=`rotate(${rotation}deg)`;document.getElementById('spinWheel').disabled=true;setTimeout(()=>{if(p.coins)d.coins+=p.coins;else if(p.unlock==='outfit'){const locked=CLOSET_OUTFITS.find(x=>!d.outfits.includes(x.id));if(locked)d.outfits.push(locked.id);else d.coins+=75}else if(p.unlock==='accessory'){const locked=CLOSET_ACCESSORIES.find(x=>!d.accessories.includes(x.id));if(locked)d.accessories.push(locked.id);else d.coins+=50}d.lastSpin=wheelDate();saveArcadeData(d);updateArcadeCoins();document.getElementById('wheelResult').textContent=p.coins?'🎉 '+p.label+'!':(p.unlock==='outfit'?'👗 NEW OUTFIT UNLOCKED!': '✨ NEW ACCESSORY UNLOCKED!');},4100)}
document.getElementById('launchCloset').onclick=openCloset;document.getElementById('closetBack').onclick=closeCloset;document.getElementById('launchWheel').onclick=openWheel;document.getElementById('wheelBack').onclick=closeWheel;document.getElementById('spinWheel').onclick=spinWheel;
const mmCloset=document.getElementById('mMenuCloset'),mmWheel=document.getElementById('mMenuWheel');if(mmCloset)mmCloset.onclick=()=>{closeMobileMenuSafe();openCloset()};if(mmWheel)mmWheel.onclick=()=>{closeMobileMenuSafe();openWheel()};

/* FLOOF MATCH GAME */
const MATCH_ITEMS=[
  {id:'pom1',type:'pom',value:1},{id:'pom2',type:'pom',value:2},{id:'pom3',type:'pom',value:3},{id:'pom4',type:'pom',value:4},{id:'pom5',type:'pom',value:5},
  {id:'bijuu',type:'sister',value:'cat'},{id:'penny',type:'sister',value:'dog'},
  {id:'flower',type:'emoji',value:'🌸'},{id:'cake',type:'emoji',value:'🍰'},{id:'bow',type:'emoji',value:'🎀'},{id:'bear',type:'emoji',value:'🧸'},
  {id:'berry',type:'emoji',value:'🍓'},{id:'star',type:'emoji',value:'⭐'},{id:'paw',type:'emoji',value:'🐾'},{id:'heart',type:'emoji',value:'💖'},
  {id:'cookie',type:'emoji',value:'🍪'},{id:'boba',type:'emoji',value:'🧋'},{id:'rainbow',type:'emoji',value:'🌈'},{id:'burger',type:'emoji',value:'🍔'},
  {id:'pizza',type:'emoji',value:'🍕'},{id:'icecream',type:'emoji',value:'🍦'},{id:'sparkle',type:'emoji',value:'✨'},{id:'mushroom',type:'emoji',value:'🍄'},
  {id:'donut',type:'emoji',value:'🍩'},{id:'strawberry',type:'emoji',value:'🍓'}
];
// 20 → 30 → 40 → 50 cards. Each step adds 5 new pairs.
const MATCH_LEVEL_CARDS=[20,30,40,50];
let matchOpen=false,matchLevel=1,matchScore=0,matchMoves=0,matchPairs=0,matchSelected=null,matchTiles=[],matchBusy=false;
function matchCardCount(){return MATCH_LEVEL_CARDS[Math.min(matchLevel-1,MATCH_LEVEL_CARDS.length-1)];}
function matchTargetPairs(){return matchCardCount()/2;}
function matchColumns(){const cards=matchCardCount();return cards<=20?5:cards<=30?6:cards<=40?8:10;}
function matchTilePool(){const n=matchTargetPairs(); const pool=[]; const shuffled=[...MATCH_ITEMS].sort(()=>Math.random()-.5); for(let i=0;i<n;i++)pool.push(shuffled[i],shuffled[i]); return pool.sort(()=>Math.random()-.5)}
function openMatch(){matchOpen=true;document.getElementById('launcher').style.display='none';document.getElementById('game').style.display='none';document.getElementById('matchGame').style.display='block';matchLevel=1;matchScore=0;matchNewBoard();}
function closeMatch(){matchOpen=false;document.getElementById('matchGame').style.display='none';document.getElementById('game').style.display='grid';showLauncher();}
function matchNewBoard(){matchSelected=null;matchPairs=0;matchMoves=0;matchBusy=false;matchTiles=matchTilePool().map(t=>({...t,revealed:false,cleared:false}));renderMatch();matchMessage('Tap two tiles to reveal them! 🧠');}
function matchMessage(t){const el=document.getElementById('matchMessage');if(el)el.textContent=t;}
function matchDrawTile(canvas,item){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);if(item.type==='pom')drawPom(c,canvas.width/2,canvas.height/2,Math.min(canvas.width,canvas.height)*.28,item.value,1);else if(item.type==='sister')drawSister(c,canvas.width/2,canvas.height/2,Math.min(canvas.width,canvas.height)*.28,item.value);}
function renderMatch(){
 const board=document.getElementById('matchBoard');board.innerHTML='';board.style.setProperty('--match-cols',matchColumns());
 matchTiles.forEach((item,i)=>{const b=document.createElement('button');b.className='matchTile';b.dataset.index=i;
   if(item.cleared)b.classList.add('empty');
   if(item.revealed)b.classList.add('revealed');else b.classList.add('back');
   if(matchSelected===i)b.classList.add('selected');
   if(item.revealed){
     if(item.type==='emoji'){const sp=document.createElement('span');sp.className='matchEmoji';sp.textContent=item.value;b.appendChild(sp)}
     else{const cv=document.createElement('canvas');cv.width=100;cv.height=100;b.appendChild(cv);matchDrawTile(cv,item)}
   }
   b.onclick=()=>matchPick(i);board.appendChild(b);
 });
 document.getElementById('matchLevel').textContent=matchLevel;document.getElementById('matchScore').textContent=matchScore.toLocaleString();document.getElementById('matchMoves').textContent=matchMoves;document.getElementById('matchPairs').textContent=matchPairs+'/'+matchTargetPairs();
 document.getElementById('matchGoal').innerHTML='Find <b>'+matchTargetPairs()+' pairs</b> • '+matchCardCount()+' tiles';
}
function matchPick(i){
 if(matchBusy||matchTiles[i].cleared||matchTiles[i].revealed)return;
 const tile=matchTiles[i];
 tile.revealed=true;
 if(matchSelected===null){matchSelected=i;renderMatch();matchMessage('Remember it! 👀');return;}
 const first=matchSelected,second=i,a=matchTiles[first],b=matchTiles[second];
 matchSelected=null;matchMoves++;matchBusy=true;renderMatch();
 if(a.id===b.id){
   matchScore+=100+matchLevel*20;matchPairs++;matchMessage('✨ MATCH! Nice memory!');
   const els=document.querySelectorAll('.matchTile');[first,second].forEach(k=>els[k]?.classList.add('matched'));
   setTimeout(()=>{a.cleared=true;b.cleared=true;a.revealed=false;b.revealed=false;matchBusy=false;
     if(matchPairs>=matchTargetPairs()){
       matchScore+=500+matchLevel*100;matchMessage('💖 BOARD CLEARED! Riko approves!');
       setTimeout(()=>{matchLevel++;matchNewBoard();matchMessage(matchLevel>4?'👑 MAX FLOOF! 50 tiles!': '🌟 Level '+matchLevel+'! '+matchCardCount()+' tiles!');},650);
     }else renderMatch();
   },420);
 }else{
   matchScore=Math.max(0,matchScore-10);matchMessage('Nope! HIDE THE FLOOF! 🙈');
   setTimeout(()=>{a.revealed=false;b.revealed=false;matchBusy=false;renderMatch();matchMessage('Try to remember where they were! 🧠')},850);
 }
}
function matchShuffle(){if(matchBusy||matchSelected!==null)return;const live=matchTiles.filter(t=>!t.cleared);live.sort(()=>Math.random()-.5);let j=0;matchTiles=matchTiles.map(t=>t.cleared?t:{...t,revealed:false});const shuffled=matchTiles.filter(t=>!t.cleared);shuffled.sort(()=>Math.random()-.5);j=0;matchTiles=matchTiles.map(t=>t.cleared?t:shuffled[j++]);matchMoves++;matchMessage('🔀 Shuffled!');renderMatch();}
document.getElementById('launchMatch').onclick=openMatch;document.getElementById('matchBack').onclick=closeMatch;document.getElementById('matchRestart').onclick=matchNewBoard;document.getElementById('matchShuffle').onclick=matchShuffle;

document.getElementById('arcadeBack').onclick=()=>{menuOpen=false;document.getElementById('mobileMenu').style.display='none';gameOver=true;showLauncher()};
document.getElementById('launchPom').onclick=()=>{pendingMode='classic';challengeId=null;hideLauncher();start()};
document.getElementById('launchRiko').onclick=()=>{pendingMode='riko';challengeId=null;hideLauncher();start();toast('💖 RIKO MODE! MAXIMUM FLOOF!');};
document.getElementById('launchChallenge').onclick=openChallenges;
document.getElementById('launchRush').onclick=()=>{hideLauncher();startRush()};
document.getElementById('launchDex').onclick=showDex;
document.getElementById('launchCollection').onclick=showCollection;
document.getElementById('closeChallenges').onclick=()=>document.getElementById('challengePanel').style.display='none';

function closeMobileMenu(){menuOpen=false;document.getElementById('mobileMenu').style.display='none';}
function openMobileMenu(){menuOpen=true;document.getElementById('mobileMenu').style.display='flex';}
document.getElementById('mobileMenuBtn').onclick=openMobileMenu;
document.getElementById('mobileMenuClose').onclick=closeMobileMenu;
document.getElementById('mMenuPom').onclick=()=>{closeMobileMenu();pendingMode='classic';challengeId=null;start()};
document.getElementById('mMenuMatch').onclick=()=>{closeMobileMenu();openMatch()};
document.getElementById('mMenuRiko').onclick=()=>{closeMobileMenu();pendingMode='riko';challengeId=null;start();toast('💖 RIKO MODE! MAXIMUM FLOOF!')};
document.getElementById('mMenuChallenge').onclick=()=>{closeMobileMenu();openChallenges()};
document.getElementById('mMenuRush').onclick=()=>{closeMobileMenu();startRush()};
document.getElementById('mMenuDex').onclick=()=>{closeMobileMenu();showDex()};
document.getElementById('mMenuCollection').onclick=()=>{closeMobileMenu();showCollection()};
document.getElementById('mMenuRestart').onclick=()=>{closeMobileMenu();gameMode==='rush'?startRush():start()};
function loop(now){const dt=Math.min(.025,(now-last)/1000);last=now;physics(dt);draw();requestAnimationFrame(loop)}
start();requestAnimationFrame(loop);
