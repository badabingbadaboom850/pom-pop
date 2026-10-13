/* Canvas scenery, tactile feedback and game-screen controls. */
function playSound(kind){
  if(!soundEnabled)return;
  try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const notes=kind==='win'?[523,659,784,1046]:kind==='lose'?[330,220,165]:kind==='merge'?[523+combo*25,784+combo*20]:[280,420];notes.forEach((freq,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+i*.075;o.type='sine';o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.045,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+.16);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+.18)})}catch(e){}
}
function drawRoom(c,th){
  const floor=H-32;c.save();
  const glow=c.createRadialGradient(W*.76,55,0,W*.76,55,W*.75);glow.addColorStop(0,'#f6cc9b24');glow.addColorStop(1,'#f6cc9b00');c.fillStyle=glow;c.fillRect(0,0,W,H);
  for(let y=148;y<H-60;y+=70)for(let x=22+(Math.floor(y/70)%2)*32;x<W;x+=66){c.save();c.translate(x,y);c.rotate(-.25);c.fillStyle='#dfb7d20c';c.beginPath();c.ellipse(0,4,6,5,0,0,7);c.fill();for(const [px,py] of [[-7,-3],[0,-7],[7,-3]]){c.beginPath();c.ellipse(px,py,2.6,3.1,0,0,7);c.fill()}c.restore()}
  const ww=Math.min(92,W*.21),wx=W-ww-20,wy=34,wh=Math.min(112,H*.23);c.fillStyle='#56435e';c.beginPath();c.roundRect(wx-5,wy-5,ww+10,wh+10,ww/2);c.fill();const sky=c.createLinearGradient(0,wy,0,wy+wh);sky.addColorStop(0,'#9684a759');sky.addColorStop(1,'#f2b3af55');c.fillStyle=sky;c.beginPath();c.roundRect(wx,wy,ww,wh,ww/2);c.fill();c.strokeStyle='#bd9baa55';c.lineWidth=3;c.beginPath();c.moveTo(wx+ww/2,wy+3);c.lineTo(wx+ww/2,wy+wh);c.moveTo(wx,wy+wh*.55);c.lineTo(wx+ww,wy+wh*.55);c.stroke();c.fillStyle='#ab869166';c.beginPath();c.roundRect(wx-10,wy+wh,ww+20,7,3);c.fill();
  c.save();c.translate(27,38);c.rotate(-.09);c.fillStyle='#bc8e8766';c.beginPath();c.roundRect(0,0,37,42,6);c.fill();c.fillStyle='#362840';c.fillRect(5,5,27,32);c.fillStyle='#eab6c1a0';c.font='21px serif';c.textAlign='center';c.fillText('♥',19,30);c.restore();
  c.fillStyle='#76526855';c.fillRect(0,floor,W,H-floor);c.fillStyle='#bb8d9b55';c.fillRect(0,floor,W,3);c.fillStyle='#af6d8930';c.beginPath();c.ellipse(W/2,H-14,W*.33,22,0,0,7);c.fill();c.strokeStyle='#e4acc330';c.lineWidth=2;c.beginPath();c.ellipse(W/2,H-14,W*.29,16,0,0,7);c.stroke();
  for(const side of [0,1]){const px=side?W-22:22;c.fillStyle='#c4919699';c.beginPath();c.roundRect(px-10,floor-9,20,24,4);c.fill();c.strokeStyle='#849b8588';c.lineWidth=3;c.beginPath();c.moveTo(px,floor-7);c.lineTo(px,floor-48);c.stroke();c.fillStyle='#8faf9188';for(let j=0;j<4;j++){c.beginPath();c.ellipse(px+(j%2?7:-7),floor-15-j*8,9,4,j%2?-.6:.6,0,7);c.fill()}}
  c.fillStyle='#c493a577';c.beginPath();c.ellipse(69,floor,29,10,0,0,7);c.fill();c.fillStyle='#d7bbce55';c.beginPath();c.ellipse(69,floor-3,22,6,0,0,7);c.fill();
  c.setLineDash([7,8]);c.lineWidth=2;c.strokeStyle='#f29daf88';c.beginPath();c.moveTo(12,dangerY());c.lineTo(W-12,dangerY());c.stroke();c.setLineDash([]);const atRisk=balls.some(b=>b.dangerTime>.2);c.fillStyle=atRisk?'#ffb7be':'#c59eb45c';c.font='700 6px Trebuchet MS';c.textAlign='left';c.fillText(atRisk?'TOO MUCH FLOOF!':'FLOOF LIMIT',15,dangerY()-6);if(atRisk){c.globalAlpha=.12+.08*Math.sin(performance.now()/140);c.fillStyle='#ff899d';c.fillRect(0,dangerY()-4,W,8)}c.restore();
}
function drawAim(c){
  if(gameOver||menuOpen||dropCooldown>0)return;
  const sx=W/2,sy=launchY(),ax=aimX||sx,ay=aimY||H*.6,dx=ax-sx,dy=ay-sy,len=Math.max(1,Math.hypot(dx,dy)),vx=dx/len*520,vy=dy/len*520;c.save();c.fillStyle=dragging?'#ffe2a9':'#e4baca';for(let i=1;i<=20;i++){const t=i*.033,x=sx+vx*t,y=sy+vy*t+325*t*t;if(x<12||x>W-12||y>H-20)break;c.globalAlpha=(dragging?.65:.25)*(1-i/24);c.beginPath();c.arc(x,y,dragging?2.6:1.7,0,7);c.fill()}c.restore();
}
function drawMergeFeedback(c){
  for(const f of mergeFlashes){c.save();c.globalAlpha=f.life;c.strokeStyle='#ffdf96';c.lineWidth=3*f.life;c.beginPath();c.arc(f.x,f.y,f.r+(1-f.life)*45,0,Math.PI*2);c.stroke();c.restore()}
  for(const f of floatScores){c.save();c.globalAlpha=f.life;c.font='900 20px Trebuchet MS';c.textAlign='center';c.strokeStyle='#30233f';c.lineWidth=4;c.strokeText(f.text,f.x,f.y);c.fillStyle='#ffe19b';c.fillText(f.text,f.x,f.y);c.restore()}
}
function drawClosetRiko(cv){if(!cv)return;const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);drawPom(c,150,158,92,4);c.fillStyle='#f1cad0';c.font='900 11px Trebuchet MS';c.textAlign='center';c.fillText('RIKO · QUEEN OF THE FLOOF',150,302)}
function initPresentation(){
  const sound=document.getElementById('soundToggle'),setSound=()=>{sound.setAttribute('aria-pressed',String(soundEnabled));sound.setAttribute('aria-label',soundEnabled?'Mute sound':'Enable sound');sound.title=soundEnabled?'Sound on':'Sound off'};setSound();sound.onclick=()=>{soundEnabled=!soundEnabled;localStorage.pomSound=soundEnabled?'on':'off';setSound();playSound('merge')};
  let helpWasPaused=false;const openHelp=()=>{helpWasPaused=menuOpen;menuOpen=true;document.getElementById('playGuide').hidden=false;const cv=document.getElementById('guidePom'),c=cv.getContext('2d');c.clearRect(0,0,260,120);drawPom(c,60,65,25,0);drawPom(c,122,65,33,1);drawPom(c,198,65,44,7);document.getElementById('helpClose').focus()};
  const closeHelp=()=>{document.getElementById('playGuide').hidden=true;menuOpen=helpWasPaused;localStorage.pomTutorialSeen='yes';document.getElementById('helpToggle').focus()};document.getElementById('helpToggle').onclick=openHelp;document.getElementById('helpClose').onclick=closeHelp;document.getElementById('helpPlay').onclick=closeHelp;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!document.getElementById('playGuide').hidden)closeHelp();else if(menuOpen)closeMobileMenu();else openMobileMenu()}});
  for(const [id,power] of [['powerBall','ball'],['powerLeash','leash'],['powerCup','cup'],['powerGlam','glam']])document.getElementById(id).onclick=()=>{if(gameOver||menuOpen||toyCooldown>0)return;next={kind:'power',power};toyCooldown=2;updateUI();playSound('shoot');document.querySelectorAll('.toyButton').forEach(b=>{b.classList.toggle('selected',b.id===id);b.disabled=true});toast(powerDefs[power].desc)};
  const c=document.getElementById('sistersPortrait').getContext('2d');drawSister(c,82,78,39,'dog');drawSister(c,196,78,39,'cat');new ResizeObserver(()=>resize()).observe(document.getElementById('boardWrap'));
  if(!localStorage.pomTutorialSeen)openHelp();
}
