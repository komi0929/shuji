/* CYBER SURVIVOR — Ultimate Premium Edition */
const GameEngine = (() => {
  'use strict';
  const CFG = {
    playerR:14,playerSpeed:5,playerMaxHP:3,playerTrailLen:12,invincibleTime:800,
    shootInterval:320,bulletSpeed:7,bulletR:3,bulletLifetime:600,
    spawnInterval:800,spawnIntervalMin:200,maxEnemies:35,enemyBaseSpeed:2.8,
    waveDuration:15,waveEnemyMult:1.4,
    powerUpChance:0.12,powerUpDuration:5000,powerUpR:16,
    gridSpacing:50,gridScroll:0.3,shakeDecay:0.88,trailAlpha:0.4,starCount:60,
    nearMissDist:22,nearMissScore:25,
    bossWaveInterval:5,bossHP:20,bossR:35,bossShootInterval:2500,
    hitstopDuration:33,
    // Dash
    dashDistance:80,dashDuration:150,dashCooldownTime:1500,dashIframes:200,
    // Ultimate
    ultKillsNeeded:10,ultDuration:3000,ultRadius:0,
    // Graze
    grazeDist:12,grazeScore:10,
  };
  const NEON={pink:'#ff2d95',blue:'#00d4ff',green:'#39ff14',purple:'#bf40ff',orange:'#ff6a00',yellow:'#ffe100',white:'#ffffff',darkBg:'#0a0a14',gridLine:'rgba(0,212,255,0.08)',gridBright:'rgba(0,212,255,0.18)',gold:'#ffd700',bossColor:'#00ffcc',crimson:'#ff1744'};
  const ENEMY_TYPES={
    drone:{r:10,speed:1.0,hp:1,color:NEON.pink,score:10,shape:'diamond'},
    fast:{r:7,speed:2.8,hp:1,color:NEON.green,score:15,shape:'triangle'},
    tank:{r:18,speed:0.7,hp:5,color:NEON.orange,score:30,shape:'hexagon'},
    bomber:{r:13,speed:1.2,hp:2,color:NEON.purple,score:20,shape:'square'},
    splitter:{r:14,speed:1.0,hp:3,color:'#ff69b4',score:25,shape:'hexagon'},
    mini:{r:5,speed:3.5,hp:1,color:NEON.pink,score:5,shape:'triangle'},
  };
  const POWERUP_TYPES=[
    {type:'shield',color:NEON.blue,label:'SHIELD',icon:'◈'},
    {type:'speed',color:NEON.green,label:'SPEED UP',icon:'⚡'},
    {type:'multishot',color:NEON.pink,label:'MULTI-SHOT',icon:'✦'},
    {type:'heal',color:NEON.yellow,label:'+HP',icon:'♥'},
  ];

  // === WEB AUDIO SFX ===
  const SFX=(()=>{
    let actx=null,master=null,bgmNodes=null,bgmLayers=[];
    function ensure(){if(actx)return true;try{actx=new(window.AudioContext||window.webkitAudioContext)();master=actx.createGain();master.gain.value=0.25;master.connect(actx.destination);return true;}catch(e){return false;}}
    function g(vol){const gn=actx.createGain();gn.gain.value=vol;gn.connect(master);return gn;}
    function shoot(){if(!ensure())return;const t=actx.currentTime,o=actx.createOscillator(),gn=g(0.10);o.type='sine';o.frequency.setValueAtTime(880,t);o.frequency.exponentialRampToValueAtTime(440,t+0.05);gn.gain.setValueAtTime(0.10,t);gn.gain.exponentialRampToValueAtTime(0.001,t+0.06);o.connect(gn);o.start(t);o.stop(t+0.07);}
    function hit(){if(!ensure())return;const t=actx.currentTime,buf=actx.createBuffer(1,actx.sampleRate*0.03,actx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*0.4;const s=actx.createBufferSource();s.buffer=buf;const gn=g(0.08);s.connect(gn);gn.gain.setValueAtTime(0.08,t);gn.gain.exponentialRampToValueAtTime(0.001,t+0.03);s.start(t);}
    function kill(){if(!ensure())return;const t=actx.currentTime,dur=0.15,buf=actx.createBuffer(1,actx.sampleRate*dur,actx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const s=actx.createBufferSource();s.buffer=buf;const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(2000,t);f.frequency.exponentialRampToValueAtTime(200,t+dur);const gn=g(0.15);s.connect(f);f.connect(gn);gn.gain.setValueAtTime(0.15,t);gn.gain.exponentialRampToValueAtTime(0.001,t+dur);s.start(t);}
    function damage(){if(!ensure())return;const t=actx.currentTime,o=actx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(80,t);o.frequency.exponentialRampToValueAtTime(40,t+0.2);const gn=g(0.18);gn.gain.setValueAtTime(0.18,t);gn.gain.exponentialRampToValueAtTime(0.001,t+0.25);o.connect(gn);o.start(t);o.stop(t+0.25);}
    function powerUp(){if(!ensure())return;const t=actx.currentTime;[523,659,784].forEach((freq,i)=>{const o=actx.createOscillator();o.type='sine';o.frequency.value=freq;const gn=g(0.12);const s=t+i*0.07;gn.gain.setValueAtTime(0.001,s);gn.gain.linearRampToValueAtTime(0.12,s+0.02);gn.gain.exponentialRampToValueAtTime(0.001,s+0.12);o.connect(gn);o.start(s);o.stop(s+0.13);});}
    function waveStart(){if(!ensure())return;const t=actx.currentTime,o=actx.createOscillator();o.type='square';o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(600,t+0.2);o.frequency.exponentialRampToValueAtTime(300,t+0.4);const gn=g(0.08);gn.gain.setValueAtTime(0.08,t);gn.gain.setValueAtTime(0.08,t+0.3);gn.gain.exponentialRampToValueAtTime(0.001,t+0.5);o.connect(gn);o.start(t);o.stop(t+0.5);}
    function gameOver(){if(!ensure())return;const t=actx.currentTime;[440,311].forEach((freq,i)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(freq,t+i*0.25);o.frequency.exponentialRampToValueAtTime(freq*0.5,t+i*0.25+0.4);const gn=g(0.15);gn.gain.setValueAtTime(0.001,t+i*0.25);gn.gain.linearRampToValueAtTime(0.15,t+i*0.25+0.05);gn.gain.exponentialRampToValueAtTime(0.001,t+i*0.25+0.5);o.connect(gn);o.start(t+i*0.25);o.stop(t+i*0.25+0.55);});}
    function comboBlip(c){if(!ensure())return;const t=actx.currentTime,o=actx.createOscillator();o.type='sine';o.frequency.value=600+Math.min(c,10)*80;const gn=g(0.07);gn.gain.setValueAtTime(0.07,t);gn.gain.exponentialRampToValueAtTime(0.001,t+0.08);o.connect(gn);o.start(t);o.stop(t+0.09);}
    function nearMiss(){if(!ensure())return;const t=actx.currentTime,o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(1200,t);o.frequency.exponentialRampToValueAtTime(1800,t+0.08);const gn=g(0.06);gn.gain.setValueAtTime(0.06,t);gn.gain.exponentialRampToValueAtTime(0.001,t+0.1);o.connect(gn);o.start(t);o.stop(t+0.11);}
    function bossWarn(){if(!ensure())return;const t=actx.currentTime;for(let i=0;i<3;i++){const o=actx.createOscillator();o.type='square';o.frequency.value=200;const gn=g(0.10);const s=t+i*0.2;gn.gain.setValueAtTime(0.001,s);gn.gain.linearRampToValueAtTime(0.10,s+0.05);gn.gain.exponentialRampToValueAtTime(0.001,s+0.15);o.connect(gn);o.start(s);o.stop(s+0.16);}}
    // NEW: Dash whoosh
    function dash(){if(!ensure())return;const t=actx.currentTime,buf=actx.createBuffer(1,actx.sampleRate*0.12,actx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length)*0.3;const s=actx.createBufferSource();s.buffer=buf;const f=actx.createBiquadFilter();f.type='bandpass';f.frequency.value=800;f.Q.value=2;const gn=g(0.12);s.connect(f);f.connect(gn);s.start(t);}
    // NEW: Ultimate explosion
    function ultimate(){if(!ensure())return;const t=actx.currentTime;const o1=actx.createOscillator();o1.type='sawtooth';o1.frequency.setValueAtTime(100,t);o1.frequency.exponentialRampToValueAtTime(800,t+0.3);o1.frequency.exponentialRampToValueAtTime(50,t+0.8);const gn1=g(0.20);gn1.gain.setValueAtTime(0.001,t);gn1.gain.linearRampToValueAtTime(0.20,t+0.15);gn1.gain.exponentialRampToValueAtTime(0.001,t+1);o1.connect(gn1);o1.start(t);o1.stop(t+1);const buf=actx.createBuffer(1,actx.sampleRate*0.5,actx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=actx.createBufferSource();s.buffer=buf;const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(4000,t+0.1);f.frequency.exponentialRampToValueAtTime(100,t+0.6);const gn2=g(0.18);s.connect(f);f.connect(gn2);gn2.gain.setValueAtTime(0.001,t+0.1);gn2.gain.linearRampToValueAtTime(0.18,t+0.15);gn2.gain.exponentialRampToValueAtTime(0.001,t+0.7);s.start(t+0.1);}
    // NEW: Graze tick
    function graze(){if(!ensure())return;const t=actx.currentTime,o=actx.createOscillator();o.type='sine';o.frequency.value=1600;const gn=g(0.04);gn.gain.setValueAtTime(0.04,t);gn.gain.exponentialRampToValueAtTime(0.001,t+0.04);o.connect(gn);o.start(t);o.stop(t+0.05);}
    // Dynamic BGM
    function startBGM(){if(!ensure())return;if(bgmNodes)stopBGM();const o=actx.createOscillator();o.type='sine';o.frequency.value=55;const lfo=actx.createOscillator();lfo.type='sine';lfo.frequency.value=0.3;const lg=actx.createGain();lg.gain.value=8;lfo.connect(lg);lg.connect(o.frequency);const gn=actx.createGain();gn.gain.value=0.06;gn.connect(master);o.connect(gn);o.start();lfo.start();bgmNodes={osc:o,lfo,gain:gn};}
    function addBGMLayer(layerIdx){
      if(!ensure()||!bgmNodes)return;
      if(bgmLayers[layerIdx])return; // already active
      const t=actx.currentTime;
      if(layerIdx===1){// High pulse 110Hz rhythmic
        const o=actx.createOscillator();o.type='square';o.frequency.value=110;const lfo=actx.createOscillator();lfo.type='square';lfo.frequency.value=4;const lg=actx.createGain();lg.gain.value=0.04;lfo.connect(lg);const gn=actx.createGain();gn.gain.value=0;gn.connect(master);o.connect(lg);lg.connect(gn);o.start();lfo.start();gn.gain.linearRampToValueAtTime(0.04,t+2);bgmLayers[1]={nodes:[o,lfo],gain:gn};
      } else if(layerIdx===2){// Arpeggio
        const notes=[220,330,440,330];let ni=0;const gn=actx.createGain();gn.gain.value=0;gn.connect(master);gn.gain.linearRampToValueAtTime(0.03,t+2);const play=()=>{if(!bgmLayers[2])return;const o=actx.createOscillator();o.type='sine';o.frequency.value=notes[ni%notes.length];ni++;const eg=actx.createGain();eg.gain.setValueAtTime(0.03,actx.currentTime);eg.gain.exponentialRampToValueAtTime(0.001,actx.currentTime+0.15);o.connect(eg);eg.connect(gn);o.start();o.stop(actx.currentTime+0.16);};const iv=setInterval(play,200);bgmLayers[2]={interval:iv,gain:gn};
      }
    }
    function stopBGM(){
      if(bgmNodes){try{bgmNodes.gain.gain.setValueAtTime(bgmNodes.gain.gain.value,actx.currentTime);bgmNodes.gain.gain.exponentialRampToValueAtTime(0.001,actx.currentTime+0.5);const n=bgmNodes;setTimeout(()=>{try{n.osc.stop();n.lfo.stop();}catch(e){}},600);}catch(e){}}bgmNodes=null;
      bgmLayers.forEach((l,i)=>{if(!l)return;try{if(l.interval)clearInterval(l.interval);if(l.nodes)l.nodes.forEach(n=>{try{n.stop();}catch(e){}});if(l.gain){l.gain.gain.setValueAtTime(0.001,actx.currentTime);l.gain.disconnect();}}catch(e){}});bgmLayers=[];
    }
    return{shoot,hit,kill,damage,powerUp,waveStart,gameOver,comboBlip,nearMiss,bossWarn,dash,ultimate,graze,startBGM,addBGMLayer,stopBGM};
  })();

  // === STATE ===
  let active=false,_canvas,_ctx,W,H,animFrame,lastTime=0;
  let player=null,targetX,targetY,touching=false;
  let bullets=[],enemies=[],particles=[],powerUps=[],floatingTexts=[];
  let enemyBullets=[];
  let lastShot=0,lastSpawn=0,spawnInterval;
  let score=0,displayScore=0,combo=0,lastKillTime=0,kills=0,wave=1,waveTimer=0;
  let highScore=parseInt(localStorage.getItem('cyber_highscore')||'0',10);
  let shake={x:0,y:0,intensity:0},gridOffset=0,flashAlpha=0;
  let activePowers={};
  let stars=[],waveBanner=null,vignetteBoost=0,screenPulse=0,spawnFlashes=[];
  let hitstopUntil=0;
  let edgeWarnings={top:0,right:0,bottom:0,left:0};
  let boss=null,bossLastShot=0;
  let comboTimer=0;
  // NEW states
  let dashState={active:false,cooldown:0,dir:{x:0,y:0},timer:0,trail:[]};
  let ultCharge=0,ultActive=false,ultTimer=0,ultRing=0;
  let grazeCount=0,grazeFlash=0;
  let slowMo=1;
  let pointerHistory=[];
  let gameTime=0;
  // Bloom post-processing
  let bloomCanvas=null,bloomCtx=null;
  // Ambient embers
  let embers=[];
  // Speed lines
  let playerVel={x:0,y:0},prevPlayerPos={x:0,y:0};
  // Death rings
  let deathRings=[];
  // === ADAPTIVE QUALITY ===
  const isMobile='ontouchstart' in window||navigator.maxTouchPoints>0;
  let quality='HIGH'; // HIGH, MEDIUM, LOW
  let fpsHistory=[],bloomFrame=0;
  function detectQuality(rawDt){
    fpsHistory.push(1000/Math.max(rawDt,1));if(fpsHistory.length>30)fpsHistory.shift();
    if(fpsHistory.length<20)return;
    const avg=fpsHistory.reduce((a,b)=>a+b,0)/fpsHistory.length;
    if(avg<30&&quality!=='LOW'){quality='LOW';}
    else if(avg<45&&quality==='HIGH'){quality='MEDIUM';}
    else if(avg>55&&quality==='LOW'){quality='MEDIUM';}
    else if(avg>58&&quality==='MEDIUM'){quality='HIGH';}
  }
  function glowM(ctx,color,blur){
    const b=quality==='LOW'?Math.min(blur,4):quality==='MEDIUM'?Math.min(blur,10):blur;
    ctx.shadowColor=color;ctx.shadowBlur=b;
  }

  // === HELPERS ===
  function rand(a,b){return a+Math.random()*(b-a);}
  function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function clamp(v,lo,hi){return v<lo?lo:v>hi?hi:v;}
  function lerp(a,b,t){return a+(b-a)*t;}
  function glow(ctx,color,blur){glowM(ctx,color,blur);}
  function noGlow(ctx){ctx.shadowColor='transparent';ctx.shadowBlur=0;}

  // === STARS + NEBULA + EMBERS ===
  let nebulaClouds=[];
  function initStars(){
    stars=[];for(let i=0;i<CFG.starCount;i++)stars.push({x:Math.random()*W,y:Math.random()*H,brightness:rand(0.1,0.5),size:rand(0.5,1.8),speed:rand(0.05,0.25),phase:rand(0,Math.PI*2)});
    nebulaClouds=[];for(let i=0;i<5;i++)nebulaClouds.push({x:rand(0,W),y:rand(0,H),r:rand(80,200),color:['rgba(0,60,120,','rgba(60,0,80,','rgba(0,80,60,','rgba(80,20,60,','rgba(20,40,80,'][i],drift:rand(-0.08,0.08),phase:rand(0,Math.PI*2)});
    const emberCount=isMobile?12:25;
    embers=[];for(let i=0;i<emberCount;i++)embers.push({x:rand(0,W),y:rand(0,H),vx:rand(-0.15,0.15),vy:rand(-0.3,-0.05),size:rand(0.8,2.2),alpha:rand(0.1,0.35),phase:rand(0,Math.PI*2),color:['#ff6a00','#ff2d95','#00d4ff','#ffd700','#39ff14'][i%5]});
    // Init bloom canvas (1/3 res on mobile, 1/2 on desktop)
    const bloomDiv=isMobile?3:2;
    bloomCanvas=document.createElement('canvas');bloomCanvas.width=Math.ceil(W/bloomDiv);bloomCanvas.height=Math.ceil(H/bloomDiv);bloomCtx=bloomCanvas.getContext('2d');
  }
  function updateStars(){for(const s of stars){s.y+=s.speed;if(s.y>H+5){s.y=-5;s.x=Math.random()*W;}}}
  function updateEmbers(now){for(const e of embers){e.x+=e.vx+Math.sin(now/3000+e.phase)*0.1;e.y+=e.vy;if(e.y<-5){e.y=H+5;e.x=rand(0,W);}if(e.x<-5)e.x=W+5;if(e.x>W+5)e.x=-5;}}
  function drawNebula(ctx,now){for(const c of nebulaClouds){const pulse=0.06+Math.sin(now/5000+c.phase)*0.02;c.x+=c.drift;if(c.x<-c.r)c.x=W+c.r;if(c.x>W+c.r)c.x=-c.r;const gr=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,c.r);gr.addColorStop(0,c.color+pulse+')');gr.addColorStop(1,c.color+'0)');ctx.globalAlpha=1;ctx.fillStyle=gr;ctx.fillRect(c.x-c.r,c.y-c.r,c.r*2,c.r*2);}}
  function drawStars(ctx,now){for(const s of stars){ctx.globalAlpha=s.brightness*(0.5+Math.sin(now/1000+s.phase)*0.5);ctx.fillStyle=NEON.white;ctx.beginPath();ctx.arc(s.x,s.y,s.size,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
  function drawEmbers(ctx,now){for(const e of embers){ctx.globalAlpha=e.alpha*(0.5+Math.sin(now/2000+e.phase)*0.5);glow(ctx,e.color,4);ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(e.x,e.y,e.size,0,Math.PI*2);ctx.fill();}noGlow(ctx);ctx.globalAlpha=1;}
  // Speed lines
  function drawSpeedLines(ctx,now){
    const spd=Math.hypot(playerVel.x,playerVel.y);
    if(spd<1.5&&!dashState.active)return;
    const intensity=dashState.active?0.4:Math.min(spd/8,0.25);
    const count=dashState.active?12:Math.floor(spd*2);
    ctx.globalAlpha=intensity;
    for(let i=0;i<count;i++){
      const a=rand(0,Math.PI*2),r1=rand(W*0.3,W*0.7),r2=r1+rand(20,60);
      const lx=player.x+Math.cos(a)*r1,ly=player.y+Math.sin(a)*r1;
      const lx2=player.x+Math.cos(a)*r2,ly2=player.y+Math.sin(a)*r2;
      ctx.strokeStyle=NEON.blue;ctx.lineWidth=rand(0.5,1.5);
      ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(lx2,ly2);ctx.stroke();
    }ctx.globalAlpha=1;
  }

  // === PLAYER ===
  function createPlayer(){return{x:W/2,y:H*0.65,hp:CFG.playerMaxHP,trail:[],invincible:0,alive:true};}
  function updatePlayer(dt){
    if(!player.alive)return;
    const speed=activePowers.speed?CFG.playerSpeed*1.6:CFG.playerSpeed;
    // Dash movement
    if(dashState.active){
      const dp=dt/CFG.dashDuration;
      player.x+=dashState.dir.x*CFG.dashDistance*dp;
      player.y+=dashState.dir.y*CFG.dashDistance*dp;
      dashState.timer-=dt;
      dashState.trail.push({x:player.x,y:player.y,alpha:1});
      if(dashState.timer<=0){dashState.active=false;player.invincible=Math.max(player.invincible,CFG.dashIframes);}
    } else if(touching){
      const dx=targetX-player.x,dy=targetY-player.y,d=Math.hypot(dx,dy);
      if(d>3){const m=Math.min(speed,d*0.15);player.x+=(dx/d)*m;player.y+=(dy/d)*m;}
    }
    player.x=clamp(player.x,CFG.playerR,W-CFG.playerR);player.y=clamp(player.y,CFG.playerR,H-CFG.playerR);
    player.trail.unshift({x:player.x,y:player.y});if(player.trail.length>CFG.playerTrailLen)player.trail.pop();
    if(player.invincible>0)player.invincible-=dt;
    if(dashState.cooldown>0)dashState.cooldown-=dt;
    // Dash trail fade
    for(let i=dashState.trail.length-1;i>=0;i--){dashState.trail[i].alpha-=0.06;if(dashState.trail[i].alpha<=0)dashState.trail.splice(i,1);}
  }
  function triggerDash(dx,dy){
    if(dashState.cooldown>0||dashState.active||!player.alive)return;
    const d=Math.hypot(dx,dy);if(d<1)return;
    dashState.active=true;dashState.cooldown=CFG.dashCooldownTime;dashState.timer=CFG.dashDuration;
    dashState.dir={x:dx/d,y:dy/d};dashState.trail=[];
    player.invincible=Math.max(player.invincible,CFG.dashDuration+50);
    SFX.dash();
  }
  function drawPlayer(ctx,now){
    if(!player.alive)return;
    // Dash afterimages (ship-shaped)
    for(const dt of dashState.trail){ctx.globalAlpha=dt.alpha*0.3;glow(ctx,NEON.blue,15);ctx.fillStyle=NEON.blue;ctx.save();ctx.translate(dt.x,dt.y);drawShipShape(ctx,CFG.playerR*0.7);ctx.restore();}
    if(player.invincible>0&&!dashState.active&&Math.sin(now/60)>0)return;
    // Engine trail
    for(let i=1;i<player.trail.length;i++){const t=1-i/player.trail.length,p=player.trail[i];ctx.globalAlpha=t*CFG.trailAlpha*0.6;glow(ctx,NEON.blue,10*t);ctx.fillStyle=NEON.blue;ctx.beginPath();ctx.arc(p.x,p.y,CFG.playerR*t*0.4,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;const pulse=1+Math.sin(now/150)*0.08,r=CFG.playerR*pulse;
    // Dash streak
    if(dashState.active){glow(ctx,NEON.white,30);ctx.strokeStyle=NEON.white;ctx.lineWidth=3;ctx.globalAlpha=0.6;ctx.beginPath();ctx.moveTo(player.x-dashState.dir.x*40,player.y-dashState.dir.y*40);ctx.lineTo(player.x,player.y);ctx.stroke();}
    // Ship body — arrow/chevron shape
    ctx.save();ctx.translate(player.x,player.y);
    // Outer glow hull
    glow(ctx,NEON.blue,25);ctx.globalAlpha=1;ctx.fillStyle=NEON.blue;
    drawShipShape(ctx,r);
    // Inner bright core
    noGlow(ctx);ctx.fillStyle='rgba(0,212,255,0.4)';drawShipShape(ctx,r*0.65);
    // Cockpit
    ctx.fillStyle=NEON.white;ctx.beginPath();ctx.arc(0,-r*0.15,r*0.22,0,Math.PI*2);ctx.fill();
    // Engine exhaust glow
    glow(ctx,NEON.blue,15);ctx.globalAlpha=0.5+Math.sin(now/80)*0.3;
    const exGr=ctx.createRadialGradient(0,r*0.6,0,0,r*0.6,r*0.6);
    exGr.addColorStop(0,NEON.white);exGr.addColorStop(0.3,NEON.blue);exGr.addColorStop(1,'rgba(0,212,255,0)');
    ctx.fillStyle=exGr;ctx.fillRect(-r*0.4,r*0.3,r*0.8,r*0.7);
    ctx.restore();
    noGlow(ctx);ctx.globalAlpha=1;
    // Shield
    if(activePowers.shield){ctx.globalAlpha=0.25+Math.sin(now/200)*0.1;glow(ctx,NEON.blue,15);ctx.strokeStyle=NEON.blue;ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.x,player.y,r+12,0,Math.PI*2);ctx.stroke();noGlow(ctx);}
    // Dash cooldown
    if(dashState.cooldown>0){const ratio=dashState.cooldown/CFG.dashCooldownTime;ctx.globalAlpha=0.3;ctx.strokeStyle=NEON.white;ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.x,player.y,r+6,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-ratio));ctx.stroke();}
    ctx.globalAlpha=1;noGlow(ctx);
  }
  function drawShipShape(ctx,r){
    ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*0.65,r*0.7);ctx.lineTo(r*0.2,r*0.4);ctx.lineTo(-r*0.2,r*0.4);ctx.lineTo(-r*0.65,r*0.7);ctx.closePath();ctx.fill();
  }

  // === BULLETS ===
  function autoShoot(now){
    if(!player.alive)return;if(now-lastShot<CFG.shootInterval)return;lastShot=now;
    let nearest=null,nearDist=Infinity;
    for(const e of enemies){const d=dist(player,e);if(d<nearDist){nearDist=d;nearest=e;}}
    if(boss){const d=dist(player,boss);if(d<nearDist){nearDist=d;nearest=boss;}}
    if(!nearest)return;
    const angle=Math.atan2(nearest.y-player.y,nearest.x-player.x);
    fireBullet(angle);SFX.shoot();
    if(activePowers.multishot){fireBullet(angle-0.26);fireBullet(angle+0.26);}
  }
  function fireBullet(angle){bullets.push({x:player.x,y:player.y,vx:Math.cos(angle)*CFG.bulletSpeed,vy:Math.sin(angle)*CFG.bulletSpeed,born:performance.now(),r:CFG.bulletR});}
  function updateBullets(now){for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.x+=b.vx;b.y+=b.vy;if(b.x<-20||b.x>W+20||b.y<-20||b.y>H+20||now-b.born>CFG.bulletLifetime)bullets.splice(i,1);}}
  function drawBullets(ctx){
    for(const b of bullets){
      // Glow trail (gradient line)
      const tx=b.x-b.vx*4,ty=b.y-b.vy*4;
      const trGr=ctx.createLinearGradient(b.x,b.y,tx,ty);
      trGr.addColorStop(0,'rgba(255,225,0,0.7)');trGr.addColorStop(1,'rgba(255,225,0,0)');
      ctx.globalAlpha=0.6;ctx.strokeStyle=trGr;ctx.lineWidth=b.r*1.8;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(tx,ty);ctx.stroke();
      // Bullet core
      ctx.globalAlpha=1;glow(ctx,NEON.yellow,14);ctx.fillStyle=NEON.yellow;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();
      // White hot center
      noGlow(ctx);ctx.fillStyle=NEON.white;ctx.globalAlpha=0.8;ctx.beginPath();ctx.arc(b.x,b.y,b.r*0.45,0,Math.PI*2);ctx.fill();
    }ctx.globalAlpha=1;noGlow(ctx);}

  // === ENEMY BULLETS ===
  function fireEnemyBullet(x,y,angle,sp){enemyBullets.push({x,y,vx:Math.cos(angle)*(sp||3),vy:Math.sin(angle)*(sp||3),r:4,born:performance.now(),grazed:false});}
  function updateEnemyBullets(now){for(let i=enemyBullets.length-1;i>=0;i--){const b=enemyBullets[i];b.x+=b.vx*slowMo;b.y+=b.vy*slowMo;if(b.x<-20||b.x>W+20||b.y<-20||b.y>H+20||now-b.born>3000)enemyBullets.splice(i,1);}}
  function drawEnemyBullets(ctx){for(const b of enemyBullets){ctx.globalAlpha=0.9;glow(ctx,NEON.pink,10);ctx.fillStyle=NEON.pink;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();noGlow(ctx);ctx.fillStyle='rgba(255,255,255,0.6)';ctx.beginPath();ctx.arc(b.x,b.y,b.r*0.4,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;noGlow(ctx);}

  // === ENEMIES ===
  function spawnEnemy(forceType){
    let typeKey=forceType;
    if(!typeKey){const roll=Math.random();if(wave<3)typeKey=roll<0.7?'drone':'fast';else if(wave<5)typeKey=roll<0.35?'drone':roll<0.6?'fast':roll<0.8?'bomber':roll<0.92?'splitter':'tank';else typeKey=roll<0.2?'drone':roll<0.4?'fast':roll<0.6?'bomber':roll<0.8?'splitter':'tank';}
    if(typeKey==='splitter'&&wave<4)typeKey='drone';if(typeKey==='mini')typeKey='drone';
    const type=ENEMY_TYPES[typeKey],speedMult=1+(wave-1)*0.12;
    const side=Math.floor(Math.random()*4);let x,y;
    switch(side){case 0:x=rand(0,W);y=-30;break;case 1:x=W+30;y=rand(0,H);break;case 2:x=rand(0,W);y=H+30;break;case 3:x=-30;y=rand(0,H);break;}
    spawnFlashes.push({x,y,time:performance.now(),color:type.color,r:type.r});
    enemies.push({x,y,hp:type.hp,maxHp:type.hp,r:type.r,speed:type.speed*CFG.enemyBaseSpeed*speedMult,color:type.color,score:type.score,shape:type.shape,phase:rand(0,Math.PI*2),typeKey,nearMissed:false,lastShot:0});
  }
  function spawnMiniDrones(x,y,count){
    for(let i=0;i<count;i++){const a=rand(0,Math.PI*2),sp=rand(2,4);const type=ENEMY_TYPES.mini;enemies.push({x:x+Math.cos(a)*10,y:y+Math.sin(a)*10,hp:type.hp,maxHp:type.hp,r:type.r,speed:type.speed*CFG.enemyBaseSpeed,color:type.color,score:type.score,shape:type.shape,phase:rand(0,Math.PI*2),typeKey:'mini',nearMissed:false,lastShot:0});}
  }
  function updateEnemies(dt,now){
    edgeWarnings={top:0,right:0,bottom:0,left:0};
    for(const e of enemies){
      const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy);
      const spd=e.speed*slowMo;
      if(d>1){const wobble=Math.sin(now/400+e.phase)*0.3;e.x+=(dx/d)*spd+wobble;e.y+=(dy/d)*spd;}
      if(e.y<40)edgeWarnings.top=Math.max(edgeWarnings.top,1-e.y/40);
      if(e.y>H-40)edgeWarnings.bottom=Math.max(edgeWarnings.bottom,1-(H-e.y)/40);
      if(e.x<40)edgeWarnings.left=Math.max(edgeWarnings.left,1-e.x/40);
      if(e.x>W-40)edgeWarnings.right=Math.max(edgeWarnings.right,1-(W-e.x)/40);
      if(!e.nearMissed&&player.alive&&player.invincible<=0){const pd=dist(player,e);if(pd<CFG.nearMissDist&&pd>CFG.playerR+e.r){e.nearMissed=true;score+=CFG.nearMissScore;addFloatingText(player.x,player.y-30,'NEAR MISS +25',NEON.gold);SFX.nearMiss();screenPulse=0.08;}}
      if(e.typeKey==='bomber'&&wave>=4&&now-e.lastShot>2500){e.lastShot=now;const a=Math.atan2(player.y-e.y,player.x-e.x);fireEnemyBullet(e.x,e.y,a);}
    }
  }
  function drawEnemies(ctx,now){
    for(const e of enemies){
      ctx.globalAlpha=1;const pulse=1+Math.sin(now/250+e.phase)*0.1,r=e.r*pulse;
      const pd=dist(player,e);
      if(pd<120){const intensity=(1-pd/120)*0.4;ctx.globalAlpha=intensity;ctx.strokeStyle='#ff0000';ctx.lineWidth=3;glow(ctx,'#ff0000',20);ctx.beginPath();ctx.arc(e.x,e.y,r+8+Math.sin(now/100)*3,0,Math.PI*2);ctx.stroke();noGlow(ctx);}
      ctx.globalAlpha=1;glow(ctx,e.color,15);ctx.strokeStyle=e.color;ctx.lineWidth=2;ctx.fillStyle=e.color+'55';
      ctx.beginPath();
      if(e.shape==='diamond')drawDiamond(ctx,e.x,e.y,r);else if(e.shape==='triangle')drawTriangle(ctx,e.x,e.y,r,now);else if(e.shape==='hexagon')drawPolygon(ctx,e.x,e.y,r,6);else drawPolygon(ctx,e.x,e.y,r,4);
      ctx.fill();ctx.stroke();
      noGlow(ctx);const eyeA=Math.atan2(player.y-e.y,player.x-e.x);ctx.fillStyle=NEON.white;ctx.globalAlpha=0.7;ctx.beginPath();ctx.arc(e.x+Math.cos(eyeA)*r*0.3,e.y+Math.sin(eyeA)*r*0.3,2,0,Math.PI*2);ctx.fill();
      if(e.maxHp>1){ctx.globalAlpha=0.7;const bw=e.r*2,bh=3,bx=e.x-bw/2,by=e.y-e.r-8;ctx.fillStyle='#333';ctx.fillRect(bx,by,bw,bh);ctx.fillStyle=e.color;ctx.fillRect(bx,by,bw*(e.hp/e.maxHp),bh);}
    }noGlow(ctx);
  }
  function drawDiamond(ctx,x,y,r){ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();}
  function drawTriangle(ctx,x,y,r,now){const rot=now/500;for(let i=0;i<3;i++){const a=rot+(Math.PI*2/3)*i-Math.PI/2,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}ctx.closePath();}
  function drawPolygon(ctx,x,y,r,sides){for(let i=0;i<sides;i++){const a=(Math.PI*2/sides)*i-Math.PI/2,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}ctx.closePath();}
  // Off-screen indicators
  function drawOffScreenIndicators(ctx){
    const margin=20,arrowSize=8;
    for(const e of enemies){
      if(e.x>margin&&e.x<W-margin&&e.y>margin&&e.y<H-margin)continue;
      const cx=clamp(e.x,margin,W-margin),cy=clamp(e.y,margin,H-margin);
      const a=Math.atan2(e.y-cy,e.x-cx);
      ctx.save();ctx.translate(cx,cy);ctx.rotate(a);
      ctx.globalAlpha=0.6;ctx.fillStyle=e.color;glow(ctx,e.color,8);
      ctx.beginPath();ctx.moveTo(arrowSize,0);ctx.lineTo(-arrowSize/2,-arrowSize/2);ctx.lineTo(-arrowSize/2,arrowSize/2);ctx.closePath();ctx.fill();
      noGlow(ctx);ctx.restore();
    }
    ctx.globalAlpha=1;
  }

  // === BOSS ===
  function spawnBoss(){const bossHP=CFG.bossHP+Math.floor(wave/5)*20;boss={x:W/2,y:-50,hp:bossHP,maxHp:bossHP,r:CFG.bossR,color:NEON.bossColor,phase:0,targetY:H*0.2,entered:false};SFX.bossWarn();showWaveBanner('⚠ BOSS ⚠','DESTROY IT!');}
  function updateBoss(now){if(!boss)return;if(!boss.entered){boss.y+=1.5;if(boss.y>=boss.targetY){boss.entered=true;boss.y=boss.targetY;}return;}boss.phase+=0.02;boss.x=W/2+Math.sin(boss.phase)*W*0.3;if(now-bossLastShot>CFG.bossShootInterval){bossLastShot=now;const count=6+Math.floor(wave/5)*2;for(let i=0;i<count;i++){const a=(Math.PI*2/count)*i;fireEnemyBullet(boss.x,boss.y,a);}SFX.hit();}}
  function drawBoss(ctx,now){if(!boss)return;ctx.globalAlpha=1;const pulse=1+Math.sin(now/200)*0.08,r=boss.r*pulse;glow(ctx,boss.color,30);ctx.strokeStyle=boss.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(boss.x,boss.y,r+10+Math.sin(now/150)*5,0,Math.PI*2);ctx.stroke();ctx.fillStyle=boss.color+'44';ctx.beginPath();drawPolygon(ctx,boss.x,boss.y,r,8);ctx.fill();ctx.stroke();noGlow(ctx);ctx.fillStyle=boss.color;ctx.beginPath();ctx.arc(boss.x,boss.y,r*0.3,0,Math.PI*2);ctx.fill();ctx.fillStyle=NEON.white;ctx.beginPath();ctx.arc(boss.x,boss.y,r*0.15,0,Math.PI*2);ctx.fill();ctx.globalAlpha=0.8;const bw=r*2.5,bh=5,bx=boss.x-bw/2,by=boss.y-r-15;ctx.fillStyle='#333';ctx.fillRect(bx,by,bw,bh);ctx.fillStyle=boss.color;ctx.fillRect(bx,by,bw*(boss.hp/boss.maxHp),bh);noGlow(ctx);ctx.globalAlpha=1;}

  // === COLLISIONS ===
  function checkCollisions(now){
    for(let bi=bullets.length-1;bi>=0;bi--){const b=bullets[bi];
      for(let ei=enemies.length-1;ei>=0;ei--){const e=enemies[ei];
        if(dist(b,e)<e.r+b.r+3){bullets.splice(bi,1);e.hp--;spawnHitSparks(b.x,b.y,e.color,4);SFX.hit();
          if(e.hp<=0){killEnemy(ei,e,now);hitstopUntil=now+CFG.hitstopDuration;}break;}}
      if(boss&&bullets[bi]&&dist(bullets[bi],boss)<boss.r+bullets[bi].r+3){const b2=bullets[bi];bullets.splice(bi,1);boss.hp--;spawnHitSparks(b2.x,b2.y,boss.color,4);SFX.hit();if(boss.hp<=0){score+=200*wave;addFloatingText(boss.x,boss.y-20,`+${200*wave}`,NEON.gold);spawnExplosion(boss.x,boss.y,boss.color,30);spawnShockwave(boss.x,boss.y);addShake(15);SFX.kill();hitstopUntil=now+80;boss=null;}}
    }
    if(player.alive&&player.invincible<=0&&!dashState.active){
      for(let ei=enemies.length-1;ei>=0;ei--){const e=enemies[ei];
        if(dist(player,e)<CFG.playerR+e.r-2){
          if(activePowers.shield){delete activePowers.shield;killEnemy(ei,e,now);addShake(6);}
          else{player.hp--;player.invincible=CFG.invincibleTime;addShake(10);flashAlpha=0.4;vignetteBoost=0.5;spawnExplosion(player.x,player.y,NEON.blue,8);enemies.splice(ei,1);SFX.damage();
            if(player.hp<=0){player.alive=false;spawnExplosion(player.x,player.y,NEON.blue,30);spawnShockwave(player.x,player.y);addShake(20);SFX.gameOver();setTimeout(endGame,1200);}
          }break;}}
    }
    for(let i=powerUps.length-1;i>=0;i--){if(dist(player,powerUps[i])<CFG.playerR+CFG.powerUpR+4){collectPowerUp(powerUps[i],now);powerUps.splice(i,1);}}
    checkEnemyBulletCollisions();checkGraze();
  }
  function checkEnemyBulletCollisions(){
    if(!player.alive||player.invincible>0||dashState.active)return;
    for(let i=enemyBullets.length-1;i>=0;i--){
      if(dist(player,enemyBullets[i])<CFG.playerR+enemyBullets[i].r-2){
        enemyBullets.splice(i,1);
        if(activePowers.shield){delete activePowers.shield;addShake(4);}
        else{player.hp--;player.invincible=CFG.invincibleTime;addShake(10);flashAlpha=0.4;vignetteBoost=0.5;spawnExplosion(player.x,player.y,NEON.blue,8);SFX.damage();
          if(player.hp<=0){player.alive=false;slowMo=0.2;spawnExplosion(player.x,player.y,NEON.blue,30);spawnShockwave(player.x,player.y);addShake(20);SFX.gameOver();setTimeout(()=>{slowMo=1;endGame();},1800);}
        }break;}
    }
  }
  // GRAZE system
  function checkGraze(){
    if(!player.alive||player.invincible>0||dashState.active)return;
    for(const b of enemyBullets){
      if(b.grazed)continue;
      const d=dist(player,b);
      if(d<CFG.playerR+b.r+CFG.grazeDist&&d>CFG.playerR+b.r-1){
        b.grazed=true;grazeCount++;score+=CFG.grazeScore;ultCharge=Math.min(ultCharge+0.3,CFG.ultKillsNeeded);
        grazeFlash=0.15;SFX.graze();addFloatingText(player.x+rand(-15,15),player.y-25,'GRAZE',NEON.white);
      }
    }
  }
  function killEnemy(index,enemy,now){
    spawnExplosion(enemy.x,enemy.y,enemy.color,16);addShake(4);SFX.kill();
    // Death ring
    deathRings.push({x:enemy.x,y:enemy.y,r:enemy.r,maxR:enemy.r*6,color:enemy.color,alpha:1,speed:4});
    if(now-lastKillTime<2000){combo++;}else{combo=1;}lastKillTime=now;kills++;comboTimer=1;
    const mult=Math.min(combo,10),pts=enemy.score*mult;score+=pts;
    addFloatingText(enemy.x,enemy.y-15,`+${pts}`,NEON.white);
    if(combo>1){addFloatingText(enemy.x,enemy.y+5,`${combo}x COMBO`,NEON.yellow);SFX.comboBlip(combo);if(combo>=3)screenPulse=0.15;if(combo>=5)screenPulse=0.25;}
    // Ultimate charge
    ultCharge=Math.min(ultCharge+1,CFG.ultKillsNeeded);
    // Splitter
    if(enemy.typeKey==='splitter'){spawnMiniDrones(enemy.x,enemy.y,2);addFloatingText(enemy.x,enemy.y+20,'SPLIT!',NEON.pink);}
    enemies.splice(index,1);
    if(Math.random()<CFG.powerUpChance)dropPowerUp(enemy.x,enemy.y);
  }

  // === ULTIMATE ===
  function activateUltimate(){
    if(ultCharge<CFG.ultKillsNeeded||ultActive||!player.alive)return;
    ultActive=true;ultCharge=0;ultTimer=CFG.ultDuration;ultRing=0;slowMo=0.3;
    screenPulse=1;flashAlpha=0.8;addShake(25);SFX.ultimate();
    // Destroy all enemies
    for(let i=enemies.length-1;i>=0;i--){score+=enemies[i].score*2;spawnExplosion(enemies[i].x,enemies[i].y,enemies[i].color,6);enemies.splice(i,1);}
    // Damage boss heavily
    if(boss){const dmg=Math.ceil(boss.maxHp*0.3);boss.hp-=dmg;spawnExplosion(boss.x,boss.y,boss.color,15);if(boss.hp<=0){score+=200*wave;spawnExplosion(boss.x,boss.y,boss.color,30);spawnShockwave(boss.x,boss.y);boss=null;}}
    // Clear enemy bullets
    enemyBullets=[];
    addFloatingText(W/2,H/2,'ULTIMATE!',NEON.gold);
  }
  function updateUltimate(dt){
    if(!ultActive)return;ultTimer-=dt;ultRing+=dt*0.5;
    if(ultTimer<=0){ultActive=false;slowMo=1;ultRing=0;}
    else{slowMo=lerp(0.3,1,1-ultTimer/CFG.ultDuration);}
  }
  function drawUltimateRing(ctx,now){
    if(!ultActive)return;
    const maxR=Math.max(W,H);const r=ultRing*maxR/CFG.ultDuration*2;
    if(r>maxR*1.5)return;
    ctx.globalAlpha=Math.max(0,(1-r/maxR)*0.6);
    glow(ctx,NEON.gold,30);ctx.strokeStyle=NEON.gold;ctx.lineWidth=4*(1-r/maxR)+1;
    ctx.beginPath();ctx.arc(player?player.x:W/2,player?player.y:H/2,r,0,Math.PI*2);ctx.stroke();
    noGlow(ctx);ctx.globalAlpha=1;
  }

  // === POWER-UPS ===
  function dropPowerUp(x,y){const type=POWERUP_TYPES[Math.floor(Math.random()*POWERUP_TYPES.length)];powerUps.push({x,y,...type,born:performance.now(),lifetime:8000});}
  function collectPowerUp(pu,now){if(pu.type==='heal'){player.hp=Math.min(player.hp+1,CFG.playerMaxHP);}else{activePowers[pu.type]=now+CFG.powerUpDuration;}addFloatingText(pu.x,pu.y-20,pu.label,pu.color);spawnExplosion(pu.x,pu.y,pu.color,8);SFX.powerUp();}
  function updatePowerUps(now){for(const key of Object.keys(activePowers)){if(now>activePowers[key])delete activePowers[key];}for(let i=powerUps.length-1;i>=0;i--){if(now-powerUps[i].born>powerUps[i].lifetime)powerUps.splice(i,1);}}
  function drawPowerUps(ctx,now){
    for(const p of powerUps){const age=now-p.born,fadeOut=p.lifetime-age<2000?(p.lifetime-age)/2000:1,bob=Math.sin(now/300)*4;const cx=p.x,cy=p.y+bob;ctx.globalAlpha=fadeOut;
    const beaconH=50+Math.sin(now/500)*10;const beaconGrad=ctx.createLinearGradient(cx,cy-beaconH,cx,cy+5);beaconGrad.addColorStop(0,'rgba(255,215,0,0)');beaconGrad.addColorStop(0.3,`rgba(255,215,0,${0.15*fadeOut})`);beaconGrad.addColorStop(1,'rgba(255,215,0,0)');ctx.fillStyle=beaconGrad;ctx.fillRect(cx-6,cy-beaconH,12,beaconH+5);
    const r1=CFG.powerUpR+4,r2=CFG.powerUpR+8;ctx.strokeStyle=NEON.gold;ctx.lineWidth=1.5;glow(ctx,NEON.gold,12);ctx.beginPath();ctx.arc(cx,cy,r1,now/800,now/800+Math.PI*1.5);ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,r2,-(now/600),-(now/600)+Math.PI*1.2);ctx.stroke();
    ctx.fillStyle=NEON.gold+'33';ctx.strokeStyle=NEON.gold;ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,CFG.powerUpR,0,Math.PI*2);ctx.fill();ctx.stroke();
    noGlow(ctx);ctx.fillStyle=NEON.gold;ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.icon,cx,cy);
    ctx.font='bold 8px "Orbitron",sans-serif';ctx.fillStyle=NEON.gold;ctx.globalAlpha=fadeOut*0.8;ctx.fillText(p.label,cx,cy+CFG.powerUpR+12);
    ctx.globalAlpha=fadeOut*0.6;for(let i=0;i<3;i++){const sa=now/300+i*2.1,sr=CFG.powerUpR+rand(5,18),sx=cx+Math.cos(sa)*sr,sy=cy+Math.sin(sa)*sr;ctx.fillStyle=NEON.gold;ctx.beginPath();ctx.arc(sx,sy,1.5,0,Math.PI*2);ctx.fill();}}noGlow(ctx);ctx.globalAlpha=1;}

  // === PARTICLES ===
  function spawnExplosion(x,y,color,count){for(let i=0;i<count;i++){const a=(Math.PI*2/count)*i+rand(-0.3,0.3),s=rand(2,6);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:rand(1.5,4),color,alpha:1,life:1,decay:rand(0.015,0.035)});}}
  function spawnHitSparks(x,y,color,count){for(let i=0;i<count;i++){const a=rand(0,Math.PI*2),s=rand(1,4);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:rand(1,2.5),color,alpha:0.8,life:1,decay:rand(0.03,0.06)});}}
  function spawnShockwave(x,y){for(let i=0;i<36;i++){const a=(Math.PI*2/36)*i,s=rand(4,9);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:rand(2,5),color:NEON.blue,alpha:1,life:1,decay:rand(0.008,0.018)});}for(let i=0;i<12;i++){const a=rand(0,Math.PI*2);particles.push({x,y,vx:Math.cos(a)*rand(1,3),vy:Math.sin(a)*rand(1,3),r:rand(3,6),color:NEON.white,alpha:1,life:1,decay:rand(0.01,0.025)});}}
  function updateParticles(){if(particles.length>150)particles.splice(0,particles.length-150);for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vx*=0.96;p.vy*=0.96;p.life-=p.decay;p.alpha=p.life;if(p.life<=0)particles.splice(i,1);}}
  function drawParticles(ctx){for(const p of particles){ctx.globalAlpha=p.alpha;glow(ctx,p.color,6);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2);ctx.fill();}noGlow(ctx);}
  function updateSpawnFlashes(now){for(let i=spawnFlashes.length-1;i>=0;i--){if(now-spawnFlashes[i].time>400)spawnFlashes.splice(i,1);}}
  function drawSpawnFlashes(ctx,now){for(const sf of spawnFlashes){const age=(now-sf.time)/400;if(age>1)continue;const r=sf.r+age*40;ctx.globalAlpha=(1-age)*0.5;ctx.strokeStyle=sf.color;ctx.lineWidth=2*(1-age);glow(ctx,sf.color,10);ctx.beginPath();ctx.arc(sf.x,sf.y,r,0,Math.PI*2);ctx.stroke();}noGlow(ctx);ctx.globalAlpha=1;}
  function addFloatingText(x,y,text,color){floatingTexts.push({x,y,text,color,alpha:1,vy:-1.5,life:1,scale:1.8});}
  function updateFloatingTexts(){for(let i=floatingTexts.length-1;i>=0;i--){const f=floatingTexts[i];f.y+=f.vy;f.life-=0.018;f.alpha=f.life;if(f.scale>1)f.scale=lerp(f.scale,1,0.12);if(f.life<=0)floatingTexts.splice(i,1);}}
  function drawFloatingTexts(ctx){
    for(const f of floatingTexts){
      ctx.globalAlpha=f.alpha;ctx.save();ctx.translate(f.x,f.y);const s=f.scale||1;ctx.scale(s,s);
      // Outline
      ctx.strokeStyle='rgba(0,0,0,0.7)';ctx.lineWidth=3;ctx.font='bold 16px "Orbitron",sans-serif';ctx.textAlign='center';ctx.lineJoin='round';ctx.strokeText(f.text,0,0);
      // Fill with glow
      glow(ctx,f.color,10);ctx.fillStyle=f.color;ctx.fillText(f.text,0,0);
      noGlow(ctx);ctx.restore();
    }ctx.globalAlpha=1;
  }
  // Death rings
  function updateDeathRings(){for(let i=deathRings.length-1;i>=0;i--){const r=deathRings[i];r.r+=r.speed;r.alpha=1-r.r/r.maxR;if(r.alpha<=0)deathRings.splice(i,1);}}
  function drawDeathRings(ctx){for(const r of deathRings){ctx.globalAlpha=r.alpha*0.6;ctx.strokeStyle=r.color;ctx.lineWidth=2;glow(ctx,r.color,10);ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();}noGlow(ctx);ctx.globalAlpha=1;}
  // Combo screen tint
  function drawComboTint(ctx){
    if(combo<5)return;
    const intensity=Math.min((combo-5)/10,0.3);
    ctx.globalAlpha=intensity*(0.6+Math.sin(performance.now()/300)*0.4);
    if(combo>=10){ctx.fillStyle='rgba(255,50,0,0.15)';ctx.fillRect(0,0,W,H);}
    ctx.fillStyle='rgba(255,215,0,0.08)';ctx.fillRect(0,0,W,H);
    ctx.globalAlpha=1;
  }

  // === WAVE BANNER ===
  function showWaveBanner(text,sub){waveBanner={text,sub,time:performance.now(),duration:2000};}
  function updateWaveBanner(now){if(waveBanner&&now-waveBanner.time>waveBanner.duration)waveBanner=null;}
  function drawWaveBanner(ctx,now){if(!waveBanner)return;const age=(now-waveBanner.time)/waveBanner.duration;if(age>1)return;let scale,alpha;if(age<0.15){const t=age/0.15;scale=0.3+t*0.7;alpha=t;}else if(age>0.7){const t=(age-0.7)/0.3;scale=1;alpha=1-t;}else{scale=1;alpha=1;}ctx.save();ctx.globalAlpha=alpha;ctx.translate(W/2,H/2-20);ctx.scale(scale,scale);glow(ctx,NEON.blue,30);ctx.fillStyle=NEON.blue;ctx.font='bold 48px "Orbitron",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(waveBanner.text,0,0);if(waveBanner.sub){glow(ctx,NEON.pink,15);ctx.fillStyle=NEON.pink;ctx.font='bold 20px "Orbitron",sans-serif';ctx.fillText(waveBanner.sub,0,40);}noGlow(ctx);ctx.restore();}

  // === VISUAL EFFECTS ===
  function addShake(i){shake.intensity=Math.max(shake.intensity,i);}
  function updateShake(){shake.x=(Math.random()-0.5)*shake.intensity;shake.y=(Math.random()-0.5)*shake.intensity;shake.intensity*=CFG.shakeDecay;if(shake.intensity<0.5)shake.intensity=0;}
  function drawGrid(ctx,now){gridOffset=(gridOffset+CFG.gridScroll)%CFG.gridSpacing;ctx.globalAlpha=1;for(let x=-CFG.gridSpacing+gridOffset;x<W+CFG.gridSpacing;x+=CFG.gridSpacing){ctx.strokeStyle=Math.abs(x-W/2)<CFG.gridSpacing?NEON.gridBright:NEON.gridLine;ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=-CFG.gridSpacing+gridOffset;y<H+CFG.gridSpacing;y+=CFG.gridSpacing){ctx.strokeStyle=Math.abs(y-H/2)<CFG.gridSpacing?NEON.gridBright:NEON.gridLine;ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}}
  function drawDamageFlash(ctx){
    if(flashAlpha<=0)return;
    // Red flash
    ctx.globalAlpha=flashAlpha*0.6;ctx.fillStyle='#ff0000';ctx.fillRect(0,0,W,H);
    // Chromatic aberration (RGB channel split)
    if(flashAlpha>0.15){const shift=Math.floor(flashAlpha*6);
      ctx.globalAlpha=flashAlpha*0.3;ctx.globalCompositeOperation='screen';
      ctx.drawImage(_canvas,-shift,-shift);ctx.globalCompositeOperation='source-over';}
    flashAlpha*=0.90;if(flashAlpha<0.01)flashAlpha=0;}
  function drawScanlines(ctx){ctx.globalAlpha=0.04;ctx.fillStyle='#000';for(let y=0;y<H;y+=3)ctx.fillRect(0,y,W,1);ctx.globalAlpha=1;}
  function drawVignette(ctx){const a=0.35+vignetteBoost,gr=ctx.createRadialGradient(W/2,H/2,W*0.25,W/2,H/2,W*0.75);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,`rgba(0,0,0,${a})`);ctx.globalAlpha=1;ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);if(vignetteBoost>0){vignetteBoost*=0.95;if(vignetteBoost<0.01)vignetteBoost=0;}}
  function drawScreenPulse(ctx){if(screenPulse>0){ctx.globalAlpha=screenPulse;ctx.fillStyle=NEON.white;ctx.fillRect(0,0,W,H);screenPulse*=0.88;if(screenPulse<0.01)screenPulse=0;}}
  function drawGrazeFlash(ctx){if(grazeFlash>0){ctx.globalAlpha=grazeFlash;ctx.strokeStyle=NEON.white;ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.x,player.y,CFG.playerR+15,0,Math.PI*2);ctx.stroke();grazeFlash*=0.85;if(grazeFlash<0.005)grazeFlash=0;}ctx.globalAlpha=1;}
  function drawEdgeWarnings(ctx){
    if(edgeWarnings.top>0){ctx.globalAlpha=edgeWarnings.top*0.4;const gr=ctx.createLinearGradient(0,0,0,40);gr.addColorStop(0,'rgba(255,0,0,0.6)');gr.addColorStop(1,'rgba(255,0,0,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,W,40);}
    if(edgeWarnings.bottom>0){ctx.globalAlpha=edgeWarnings.bottom*0.4;const gr=ctx.createLinearGradient(0,H,0,H-40);gr.addColorStop(0,'rgba(255,0,0,0.6)');gr.addColorStop(1,'rgba(255,0,0,0)');ctx.fillStyle=gr;ctx.fillRect(0,H-40,W,40);}
    if(edgeWarnings.left>0){ctx.globalAlpha=edgeWarnings.left*0.4;const gr=ctx.createLinearGradient(0,0,40,0);gr.addColorStop(0,'rgba(255,0,0,0.6)');gr.addColorStop(1,'rgba(255,0,0,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,40,H);}
    if(edgeWarnings.right>0){ctx.globalAlpha=edgeWarnings.right*0.4;const gr=ctx.createLinearGradient(W,0,W-40,0);gr.addColorStop(0,'rgba(255,0,0,0.6)');gr.addColorStop(1,'rgba(255,0,0,0)');ctx.fillStyle=gr;ctx.fillRect(W-40,0,40,H);}
    ctx.globalAlpha=1;
  }

  // === HUD ===
  function drawHUDPanel(ctx,x,y,w,h){
    ctx.globalAlpha=0.15;ctx.fillStyle='#000';const r=6;
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();ctx.fill();
    ctx.globalAlpha=0.1;ctx.strokeStyle=NEON.blue;ctx.lineWidth=1;ctx.stroke();
    ctx.globalAlpha=1;
  }
  function drawHUD(ctx,now){
    ctx.globalAlpha=1;noGlow(ctx);
    // Top panel (WAVE + SCORE)
    drawHUDPanel(ctx,W/2-70,6,140,56);
    ctx.fillStyle=NEON.white;ctx.font='bold 13px "Orbitron",sans-serif';ctx.textAlign='center';ctx.fillText(`WAVE ${wave}`,W/2,24);
    displayScore=Math.floor(lerp(displayScore,score,0.15));if(Math.abs(displayScore-score)<2)displayScore=score;
    glow(ctx,NEON.yellow,6);ctx.fillStyle=NEON.yellow;ctx.font='bold 22px "Orbitron",sans-serif';ctx.fillText(displayScore.toLocaleString(),W/2,50);noGlow(ctx);
    // HP bar
    const hpW=120,hpH=8,hpX=(W-hpW)/2,hpY=H-30;ctx.fillStyle='#222';ctx.fillRect(hpX,hpY,hpW,hpH);
    const hpRatio=player.hp/CFG.playerMaxHP,hpColor=hpRatio>0.5?NEON.green:hpRatio>0.25?NEON.orange:NEON.pink;
    glow(ctx,hpColor,6);ctx.fillStyle=hpColor;ctx.fillRect(hpX,hpY,hpW*hpRatio,hpH);noGlow(ctx);
    ctx.fillStyle=NEON.white;ctx.font='10px "Orbitron",sans-serif';ctx.textAlign='center';ctx.fillText('HP',W/2,hpY-4);
    // Combo (with panel)
    if(combo>1){
      drawHUDPanel(ctx,W-72,42,68,40);
      const cx=W-16,cy=60;ctx.textAlign='right';if(comboTimer>0){ctx.strokeStyle=NEON.pink+'88';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx-15,cy-8,18,-Math.PI/2,-Math.PI/2+Math.PI*2*comboTimer);ctx.stroke();}glow(ctx,NEON.pink,8);ctx.fillStyle=NEON.pink;ctx.font='bold 16px "Orbitron",sans-serif';ctx.fillText(`${combo}x`,cx,cy);ctx.font='10px "Orbitron",sans-serif';ctx.fillText('COMBO',cx,cy+14);noGlow(ctx);}
    // Active powers
    let piX=16;ctx.textAlign='left';ctx.font='bold 10px "Orbitron",sans-serif';
    for(const [key,expiry] of Object.entries(activePowers)){const remaining=(expiry-now)/CFG.powerUpDuration;const pu=POWERUP_TYPES.find(p=>p.type===key);if(!pu)continue;ctx.globalAlpha=0.8;glow(ctx,pu.color,6);ctx.fillStyle=pu.color;ctx.fillText(`${pu.icon} ${pu.label}`,piX,60);noGlow(ctx);ctx.fillStyle=pu.color+'44';ctx.fillRect(piX,64,70,3);ctx.fillStyle=pu.color;ctx.fillRect(piX,64,70*remaining,3);piX+=90;}
    // Hits + Graze
    ctx.globalAlpha=0.6;ctx.textAlign='left';ctx.fillStyle=NEON.white;ctx.font='10px "Orbitron",sans-serif';ctx.fillText(`HITS: ${kills}`,16,H-16);
    if(grazeCount>0){ctx.fillStyle=NEON.white;ctx.globalAlpha=0.5;ctx.fillText(`GRAZE: ${grazeCount}`,16,H-4);}
    // ULTIMATE METER (bottom-right)
    const ultX=W-50,ultY=H-50,ultR=20;
    const ultRatio=ultCharge/CFG.ultKillsNeeded;
    // BG ring
    ctx.globalAlpha=0.3;ctx.strokeStyle='#333';ctx.lineWidth=4;ctx.beginPath();ctx.arc(ultX,ultY,ultR,0,Math.PI*2);ctx.stroke();
    // Charge ring
    const ultColor=ultRatio>=1?NEON.gold:NEON.blue;
    ctx.globalAlpha=0.8;glow(ctx,ultColor,ultRatio>=1?15:6);ctx.strokeStyle=ultColor;ctx.lineWidth=4;ctx.beginPath();ctx.arc(ultX,ultY,ultR,-Math.PI/2,-Math.PI/2+Math.PI*2*ultRatio);ctx.stroke();
    // Ready pulse
    if(ultRatio>=1){const p=0.7+Math.sin(now/200)*0.3;ctx.globalAlpha=p;glow(ctx,NEON.gold,20);ctx.fillStyle=NEON.gold+'44';ctx.beginPath();ctx.arc(ultX,ultY,ultR+4+Math.sin(now/300)*3,0,Math.PI*2);ctx.fill();}
    // Icon
    noGlow(ctx);ctx.globalAlpha=0.9;ctx.fillStyle=ultRatio>=1?NEON.gold:NEON.white;ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚡',ultX,ultY);
    // Label
    ctx.font='7px "Orbitron",sans-serif';ctx.globalAlpha=0.5;ctx.fillStyle=NEON.white;ctx.fillText('ULT',ultX,ultY+ultR+10);
    // Dash indicator
    if(dashState.cooldown<=0&&player.alive){ctx.globalAlpha=0.4;ctx.fillStyle=NEON.blue;ctx.font='8px "Orbitron",sans-serif';ctx.textAlign='left';ctx.fillText('DASH READY',16,H-36);}
    ctx.globalAlpha=1;ctx.textBaseline='alphabetic';
  }

  // === WAVES ===
  function updateWaves(now,dt){
    waveTimer+=dt;gameTime+=dt;
    if(combo>0&&now-lastKillTime<2000){comboTimer=1-(now-lastKillTime)/2000;}else{comboTimer=0;if(now-lastKillTime>=2000)combo=0;}
    const spawnLimit=boss?Math.min(8,CFG.maxEnemies):CFG.maxEnemies;
    if(now-lastSpawn>spawnInterval&&enemies.length<spawnLimit){spawnEnemy();lastSpawn=now;}
    if(waveTimer>CFG.waveDuration*1000){
      wave++;waveTimer=0;spawnInterval=Math.max(CFG.spawnIntervalMin,spawnInterval*0.85);
      player.hp=Math.min(player.hp+1,CFG.playerMaxHP);addFloatingText(W/2,H/2+60,'+1 HP',NEON.green);
      // Dynamic BGM layers
      if(wave>=3)SFX.addBGMLayer(1);
      if(wave>=5||wave%CFG.bossWaveInterval===0)SFX.addBGMLayer(2);
      if(wave%CFG.bossWaveInterval===0){spawnBoss();}
      else{showWaveBanner(`WAVE ${wave}`,'INCOMING!');SFX.waveStart();const burst=Math.min(wave+2,8);for(let i=0;i<burst;i++){setTimeout(()=>{if(active)spawnEnemy();},i*200);}}
    }
  }

  // === GAME OVER ===
  function endGame(){
    active=false;cancelAnimationFrame(animFrame);SFX.stopBGM();slowMo=1;
    const isNew=score>highScore;if(isNew){highScore=score;localStorage.setItem('cyber_highscore',String(highScore));}
    const ro=document.getElementById('game-result');if(ro){
      const rs=document.getElementById('result-score'),rh=document.getElementById('result-high'),rn=document.getElementById('result-new'),rk=document.getElementById('result-kills'),rw=document.getElementById('result-wave');
      if(rs)rs.textContent=score;if(rh)rh.textContent=highScore;if(rn)rn.style.display=isNew?'block':'none';if(rk)rk.textContent=kills;if(rw)rw.textContent=wave;
      ro.classList.add('visible');
    }
    if(typeof Leaderboard!=='undefined'){Leaderboard.onGameOver(score,wave,kills);}
  }

  // === MAIN LOOP ===
  function gameLoop(timestamp){
    if(!active)return;const now=performance.now();
    if(now<hitstopUntil){animFrame=requestAnimationFrame(gameLoop);return;}
    const rawDt=lastTime?timestamp-lastTime:16;lastTime=timestamp;
    const dt=rawDt*slowMo;
    detectQuality(rawDt);
    // Track player velocity for speed lines
    if(player){playerVel.x=player.x-prevPlayerPos.x;playerVel.y=player.y-prevPlayerPos.y;prevPlayerPos.x=player.x;prevPlayerPos.y=player.y;}
    updatePlayer(dt);autoShoot(now);updateBullets(now);updateEnemyBullets(now);updateEnemies(dt,now);updateBoss(now);
    checkCollisions(now);updatePowerUps(now);updateUltimate(rawDt);updateParticles();updateDeathRings();updateFloatingTexts();updateShake();updateWaves(now,dt);updateStars();
    if(quality!=='LOW')updateEmbers(now);
    updateSpawnFlashes(now);updateWaveBanner(now);
    _ctx.save();_ctx.setTransform(1,0,0,1,0,0);const dpr=window.devicePixelRatio||1;_ctx.clearRect(0,0,_canvas.width,_canvas.height);_ctx.fillStyle=NEON.darkBg;_ctx.fillRect(0,0,_canvas.width,_canvas.height);_ctx.restore();
    _ctx.save();_ctx.translate(shake.x,shake.y);
    drawNebula(_ctx,now);drawStars(_ctx,now);
    if(quality!=='LOW')drawEmbers(_ctx,now);
    drawGrid(_ctx,now);
    if(quality!=='LOW')drawSpeedLines(_ctx,now);
    drawSpawnFlashes(_ctx,now);drawPowerUps(_ctx,now);drawBullets(_ctx);drawEnemyBullets(_ctx);drawEnemies(_ctx,now);drawBoss(_ctx,now);drawPlayer(_ctx,now);drawParticles(_ctx);drawDeathRings(_ctx);drawUltimateRing(_ctx,now);drawGrazeFlash(_ctx);drawFloatingTexts(_ctx);drawOffScreenIndicators(_ctx);drawWaveBanner(_ctx,now);drawComboTint(_ctx);drawDamageFlash(_ctx);drawScreenPulse(_ctx);drawEdgeWarnings(_ctx);drawVignette(_ctx);drawScanlines(_ctx);drawHUD(_ctx,now);
    _ctx.restore();
    // === BLOOM POST-PROCESSING (adaptive) ===
    bloomFrame++;
    const doBloom=quality==='HIGH'||(quality==='MEDIUM'&&bloomFrame%2===0);
    if(bloomCanvas&&doBloom&&quality!=='LOW'){
      bloomCtx.clearRect(0,0,bloomCanvas.width,bloomCanvas.height);
      bloomCtx.drawImage(_canvas,0,0,bloomCanvas.width,bloomCanvas.height);
      _ctx.save();_ctx.setTransform(1,0,0,1,0,0);
      _ctx.globalCompositeOperation='screen';
      _ctx.globalAlpha=quality==='MEDIUM'?0.25:0.35;
      _ctx.filter=quality==='MEDIUM'?'blur(8px)':'blur(12px)';
      _ctx.drawImage(bloomCanvas,0,0,_canvas.width,_canvas.height);
      _ctx.filter='none';_ctx.globalCompositeOperation='source-over';_ctx.globalAlpha=1;
      _ctx.restore();
    }
    animFrame=requestAnimationFrame(gameLoop);
  }

  // === INPUT (with dash detection) ===
  function onPointerDown(e){if(!active)return;e.preventDefault();touching=true;const r=_canvas.getBoundingClientRect();targetX=e.clientX-r.left;targetY=e.clientY-r.top;pointerHistory=[{x:targetX,y:targetY,t:performance.now()}];
    // Check ultimate meter tap
    const ultX=W-50,ultY=H-50;if(Math.hypot(targetX-ultX,targetY-ultY)<30&&ultCharge>=CFG.ultKillsNeeded){activateUltimate();}
  }
  function onPointerMove(e){if(!active||!touching)return;e.preventDefault();const r=_canvas.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;
    pointerHistory.push({x,y,t:performance.now()});if(pointerHistory.length>5)pointerHistory.shift();
    // Detect fast swipe for dash
    if(pointerHistory.length>=3){const first=pointerHistory[0],last=pointerHistory[pointerHistory.length-1];const dt=last.t-first.t;if(dt>0&&dt<150){const dx=last.x-first.x,dy=last.y-first.y,spd=Math.hypot(dx,dy)/dt;if(spd>1.5){triggerDash(dx,dy);pointerHistory=[];}}}
    targetX=x;targetY=y;
  }
  function onPointerUp(){touching=false;pointerHistory=[];}

  // === START / STOP / REPLAY ===
  function start(canvas,ctx){
    _canvas=canvas;_ctx=ctx;const dpr=window.devicePixelRatio||1;W=canvas.width/dpr;H=canvas.height/dpr;
    active=true;score=0;displayScore=0;combo=0;kills=0;wave=1;waveTimer=0;lastShot=0;lastSpawn=0;lastKillTime=0;lastTime=0;
    spawnInterval=CFG.spawnInterval;bullets=[];enemies=[];particles=[];powerUps=[];floatingTexts=[];enemyBullets=[];
    activePowers={};shake={x:0,y:0,intensity:0};flashAlpha=0;gridOffset=0;vignetteBoost=0;screenPulse=0;spawnFlashes=[];waveBanner=null;hitstopUntil=0;boss=null;bossLastShot=0;comboTimer=0;
    dashState={active:false,cooldown:0,dir:{x:0,y:0},timer:0,trail:[]};ultCharge=0;ultActive=false;ultTimer=0;ultRing=0;grazeCount=0;grazeFlash=0;slowMo=1;pointerHistory=[];gameTime=0;
    edgeWarnings={top:0,right:0,bottom:0,left:0};playerVel={x:0,y:0};deathRings=[];
    player=createPlayer();targetX=player.x;targetY=player.y;touching=false;
    prevPlayerPos={x:player.x,y:player.y};
    initStars();SFX.startBGM();
    _canvas.addEventListener('pointerdown',onPointerDown,{passive:false});_canvas.addEventListener('pointermove',onPointerMove,{passive:false});_canvas.addEventListener('pointerup',onPointerUp);_canvas.addEventListener('pointercancel',onPointerUp);
    const ro=document.getElementById('game-result');if(ro)ro.classList.remove('visible');
    const nameArea=document.getElementById('lb-name-input-area');if(nameArea)nameArea.classList.remove('visible');
    setTimeout(()=>{showWaveBanner('WAVE 1','SURVIVE!');SFX.waveStart();},300);
    for(let i=0;i<3;i++){setTimeout(()=>{if(active)spawnEnemy();},i*500);}
    animFrame=requestAnimationFrame(gameLoop);
  }
  function stop(){
    active=false;cancelAnimationFrame(animFrame);bullets=[];enemies=[];particles=[];powerUps=[];floatingTexts=[];enemyBullets=[];spawnFlashes=[];waveBanner=null;boss=null;slowMo=1;SFX.stopBGM();
    if(_canvas){_canvas.removeEventListener('pointerdown',onPointerDown);_canvas.removeEventListener('pointermove',onPointerMove);_canvas.removeEventListener('pointerup',onPointerUp);_canvas.removeEventListener('pointercancel',onPointerUp);}
    const ro=document.getElementById('game-result');if(ro)ro.classList.remove('visible');
  }
  function replay(canvas,ctx){stop();start(canvas,ctx);}
  function checkHit(){}
  return {start,stop,end:endGame,replay,checkHit,get active(){return active;},get score(){return score;}};
})();
