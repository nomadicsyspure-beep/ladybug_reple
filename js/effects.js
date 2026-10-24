// 시각 효과: 파편, 퍼지는 원, 떠오르는 글자, 화면 흔들림, 번쩍임.
G.Effects = (function () {
  const MAX_PARTICLES = 400;
  let particles = [];
  let rings = [];
  let texts = [];
  let shake = 0;
  let flash = 0;
  let flashColor = '255,255,255';

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * G.rand(0.3, 1);
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: G.rand(0.35, 0.7),
        maxLife: 0.7,
        size: G.rand(2, 4.5),
        color,
      });
    }
  }

  function ring(x, y, color, maxR, duration, width) {
    rings.push({ x, y, color, maxR, duration, width: width || 4, t: 0 });
  }

  function text(x, y, str, color, size) {
    texts.push({ x, y, str, color, size: size || 16, t: 0, duration: 0.8 });
  }

  function addShake(amount) {
    shake = Math.max(shake, amount);
  }

  function addFlash(amount, rgb) {
    flash = Math.max(flash, amount);
    flashColor = rgb || '255,255,255';
  }

  function update(dt) {
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 3 * dt;
      p.vy *= 1 - 3 * dt;
    }
    particles = particles.filter((p) => p.life > 0);

    for (const r of rings) r.t += dt;
    rings = rings.filter((r) => r.t < r.duration);

    for (const t of texts) {
      t.t += dt;
      t.y -= 40 * dt;
    }
    texts = texts.filter((t) => t.t < t.duration);

    shake = Math.max(0, shake - 40 * dt);
    flash = Math.max(0, flash - 2.5 * dt);
  }

  function shakeOffset() {
    if (shake <= 0) return { x: 0, y: 0 };
    return { x: G.rand(-shake, shake), y: G.rand(-shake, shake) };
  }

  function draw(ctx) {
    for (const r of rings) {
      const k = r.t / r.duration;
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = r.width * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.maxR * (1 - Math.pow(1 - k, 3)), 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life / 0.3);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of texts) {
      ctx.globalAlpha = 1 - Math.pow(t.t / t.duration, 2);
      ctx.font = `800 ${t.size}px system-ui, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  // 화면 전체 번쩍임은 흔들림과 상관없이 덮어야 하므로 따로 그린다
  function drawFlash(ctx, w, h) {
    if (flash <= 0) return;
    ctx.fillStyle = `rgba(${flashColor},${Math.min(0.6, flash)})`;
    ctx.fillRect(-20, -20, w + 40, h + 40);
  }

  function clear() {
    particles = [];
    rings = [];
    texts = [];
    shake = 0;
    flash = 0;
  }

  return { burst, ring, text, addShake, addFlash, update, shakeOffset, draw, drawFlash, clear };
})();
