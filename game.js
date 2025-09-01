
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let DPR = window.devicePixelRatio || 1;

  function fitCanvas() {
    const w = canvas.clientWidth;
    const h = Math.min(720, Math.max(520, w*1.25));
    canvas.style.height = h + 'px';
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
  }
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  const bg = '#F9F5FF';
  const line = 'rgba(0,0,0,0.1)';
  const bullColor = '#F5BC52';
  const playerColor = '#3A234B';
  const love = '#E65578';

  const state = {
    running: false,
    over: false,
    score: 0,
    lives: 3,
    combo: 0,
    t: 0
  };

  const field = {
    w: () => canvas.width,
    h: () => canvas.height,
    cx: () => canvas.width/2,
    cy: () => canvas.height/2
  };

  const player = {
    x: 0, y: 0, r: 28,
    hugging: false
  };

  const bull = {
    x: 0, y: 0, r: 42,
    vx: 0, vy: 0,
    mode: 'calm', // calm -> charge -> tired -> calm
    modeTimer: 0
  };

  function reset() {
    state.running = false;
    state.over = false;
    state.score = 0;
    state.lives = 3;
    state.combo = 0;
    player.x = field.cx();
    player.y = field.h()*0.75;
    bull.x = field.cx();
    bull.y = field.h()*0.35;
    bull.vx = 0; bull.vy = 0;
    bull.mode = 'calm';
    bull.modeTimer = 2.0;
    state.t = 0;
  }
  reset();

  function setMode(m) {
    bull.mode = m;
    if (m === 'calm') bull.modeTimer = 2.5 + Math.random()*1.5;
    if (m === 'charge') {
      const dx = (player.x - bull.x);
      const dy = (player.y - bull.y);
      const len = Math.hypot(dx, dy) || 1;
      const sp = 280 * DPR;
      bull.vx = (dx/len)*sp;
      bull.vy = (dy/len)*sp;
      bull.modeTimer = 0.65 + Math.random()*0.4;
    }
    if (m === 'tired') {
      bull.vx = 0; bull.vy = 0;
      bull.modeTimer = 1.4 + Math.random()*0.8;
    }
  }

  const pointer = {x: 0, y: 0, down:false};
  function setPointerFromEvent(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (clientX - rect.left) * DPR;
    pointer.y = (clientY - rect.top) * DPR;
  }
  canvas.addEventListener('mousemove', e => setPointerFromEvent(e.clientX, e.clientY));
  canvas.addEventListener('touchmove', e => { setPointerFromEvent(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, {passive:false});
  canvas.addEventListener('mousedown', ()=> pointer.down = true);
  canvas.addEventListener('mouseup', ()=> pointer.down = false);
  canvas.addEventListener('touchstart', e=> { pointer.down = true; if (e.touches[0]) setPointerFromEvent(e.touches[0].clientX, e.touches[0].clientY); }, {passive:true});
  canvas.addEventListener('touchend', ()=> pointer.down = false, {passive:true});

  window.addEventListener('keydown', (e)=>{ if(e.code === 'Space') player.hugging = true; });
  window.addEventListener('keyup', (e)=>{ if(e.code === 'Space') player.hugging = false; });

  document.getElementById('hugBtn').addEventListener('pointerdown', ()=> player.hugging = true);
  document.getElementById('hugBtn').addEventListener('pointerup', ()=> player.hugging = false);
  document.getElementById('hugBtn').addEventListener('pointerleave', ()=> player.hugging = false);

  document.getElementById('playBtn').addEventListener('click', ()=>{
    if (state.over) reset();
    state.running = true;
  });

  const audio = document.getElementById('bgAudio');
  document.getElementById('musicBtn').addEventListener('click', ()=>{
    if (audio.paused) { audio.play(); document.getElementById('musicBtn').textContent='Pause Music'; }
    else { audio.pause(); document.getElementById('musicBtn').textContent='Play Music'; }
  });

  function step(dt) {
    if (!state.running || state.over) return;
    const speed = 360 * DPR;
    const dx = pointer.x - player.x;
    const dy = pointer.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d > 1) {
      const ux = dx/d, uy = dy/d;
      player.x += ux * speed * dt;
      player.y += uy * speed * dt;
    }

    bull.modeTimer -= dt;
    if (bull.mode === 'calm' && bull.modeTimer <= 0) setMode('charge');
    else if (bull.mode === 'charge' && bull.modeTimer <= 0) setMode('tired');
    else if (bull.mode === 'tired' && bull.modeTimer <= 0) setMode('calm');

    bull.x += bull.vx * dt;
    bull.y += bull.vy * dt;
    if (bull.x < bull.r || bull.x > canvas.width-bull.r) bull.vx *= -1;
    if (bull.y < bull.r || bull.y > canvas.height-bull.r) bull.vy *= -1;

    const dist = Math.hypot(player.x-bull.x, player.y-bull.y);
    const hugRange = bull.r + player.r - 6*DPR;

    if (player.hugging) {
      if (dist <= hugRange) {
        if (bull.mode === 'calm' || bull.mode === 'tired') {
          state.combo = Math.min(10, state.combo+1);
          state.score += 10 + 2*state.combo;
          const ang = Math.atan2(bull.y-player.y, bull.x-player.x);
          bull.vx += Math.cos(ang)*60*DPR;
          bull.vy += Math.sin(ang)*60*DPR;
        } else if (bull.mode === 'charge') {
          state.combo = 0;
          if (state.lives > 0) state.lives -= 1;
          if (state.lives <= 0) state.over = true;
          const ang = Math.atan2(player.y-bull.y, player.x-bull.x);
          player.x += Math.cos(ang)*40*DPR;
          player.y += Math.sin(ang)*40*DPR;
        }
      }
    }

    document.getElementById('score').textContent = 'Score: ' + state.score;
    document.getElementById('lives').textContent = '♥'.repeat(state.lives);
  }

  function draw() {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#F9F5FF';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2*DPR;
    ctx.strokeRect(16*DPR, 16*DPR, canvas.width-32*DPR, canvas.height-32*DPR);

    let aura = '#43A04722';
    if (bull.mode === 'charge') aura = '#D32F2F22';
    if (bull.mode === 'tired') aura = '#1976D222';
    ctx.beginPath(); ctx.arc(bull.x, bull.y, bull.r+24*DPR, 0, Math.PI*2); ctx.fillStyle = aura; ctx.fill();

    ctx.beginPath(); ctx.arc(bull.x, bull.y, bull.r, 0, Math.PI*2); ctx.fillStyle = '#F5BC52'; ctx.fill();

    ctx.beginPath(); ctx.arc(bull.x - bull.r*0.6, bull.y - bull.r*0.6, bull.r*0.55, Math.PI*0.1, Math.PI*0.9);
    ctx.strokeStyle = '#F5BC52'; ctx.lineWidth = 8*DPR; ctx.stroke();
    ctx.beginPath(); ctx.arc(bull.x + bull.r*0.6, bull.y - bull.r*0.6, bull.r*0.55, Math.PI*0.1, Math.PI*0.9, true);
    ctx.stroke();

    ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI*2); ctx.fillStyle = '#3A234B'; ctx.fill();

    if (player.hugging) {
      ctx.beginPath(); ctx.arc(player.x, player.y, player.r+10*DPR, 0, Math.PI*2);
      ctx.strokeStyle = '#E65578'; ctx.lineWidth = 4*DPR; ctx.stroke();
    }

    if (!state.running) {
      centerText("Tap Start to Play", canvas.height*0.45, 28);
      centerTextSmall("Move to the bull • Hug on calm/tired • Avoid charging", canvas.height*0.55);
    }
    if (state.over) {
      centerText("The One Where You Rest", canvas.height*0.45, 28);
      centerTextSmall("Final Score: "+state.score+" — Press Start to try again", canvas.height*0.55);
    }
  }

  function centerText(txt, y, size) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#222';
    ctx.font = (size*DPR)+'px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(txt, canvas.width/2, y);
  }
  function centerTextSmall(txt, y) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#444';
    ctx.font = (18*DPR)+'px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(txt, canvas.width/2, y);
  }

  let last=0;
  function loop(ts){
    if(!last) last = ts;
    const dt = Math.min(0.05, (ts - last)/1000);
    last = ts;
    step(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
