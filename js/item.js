// 아이템 '별씨앗'과 '별꽃 폭탄'.
// 별씨앗은 위에서 나타나 벽에 튕기며 떠다니고, 벽에 5번 부딪히면 사라진다. (쫓아가서 먹어야 한다)
// 먹으면 그 자리에 커다란 별꽃이 3초 동안 피어 닿는 벌레를 모두 없앤다.
// 벌레는 '나오는 순간 내가 있던 자리'로 날아오므로, 별꽃 옆에 서 있으면 다음 벌레 떼를 꽃으로 유인할 수 있다.
G.Items = (function () {
  const C = G.CONFIG.item;
  const B = G.CONFIG.bomb;
  const W = G.CONFIG.world.width;
  const H = G.CONFIG.world.height;

  let items = [];
  let bombs = [];
  let spawnTimer = 0;

  function reset() {
    items = [];
    bombs = [];
    spawnTimer = C.firstDelay;
  }

  function spawn() {
    if (items.length >= C.maxCount) return;
    const a = G.rand(-Math.PI / 4, Math.PI / 4); // 아래쪽으로 ±45도
    items.push({
      x: G.rand(C.radius, W - C.radius),
      y: C.radius,
      vx: Math.sin(a) * C.speed,
      vy: Math.cos(a) * C.speed,
      bounces: 0,
      age: 0,
    });
  }

  function moveItem(it, dt) {
    it.age += dt;
    it.x += it.vx * dt;
    it.y += it.vy * dt;
    const r = C.radius;
    if (it.x < r) { it.x = r; it.vx = Math.abs(it.vx); it.bounces++; }
    if (it.x > W - r) { it.x = W - r; it.vx = -Math.abs(it.vx); it.bounces++; }
    if (it.y < r) { it.y = r; it.vy = Math.abs(it.vy); it.bounces++; }
    if (it.y > H - r) { it.y = H - r; it.vy = -Math.abs(it.vy); it.bounces++; }
  }

  // 반환값: 이번 프레임에 별꽃으로 없앤 벌레 점수
  function update(dt, score, player) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawn();
      spawnTimer += G.WAVES[G.waveIndexFor(score)].itemDelay;
    }

    const pr = C.pickupRadius + player.hitR;
    items = items.filter((it) => {
      moveItem(it, dt);
      if (G.dist2(it.x, it.y, player.x, player.y) < pr * pr) {
        plantBomb(it.x, it.y);
        return false;
      }
      if (it.bounces >= C.maxBounces) {
        G.Effects.burst(it.x, it.y, '#5ef2c1', 8, 80);
        return false;
      }
      return true;
    });

    let bonus = 0;
    const killScore = G.WAVES[G.waveIndexFor(score)].kill;
    for (const b of bombs) {
      b.t += dt;
      const r = bombRadius(b);
      if (r <= 0) continue;
      const killed = G.Enemies.removeWhere((e) => {
        const rr = r + e.r;
        return G.dist2(e.x, e.y, b.x, b.y) < rr * rr;
      });
      for (const e of killed) {
        b.kills++;
        bonus += killScore;
        G.Effects.burst(e.x, e.y, '#ff6b6b', 10, 170);
        G.Effects.text(e.x, e.y - 6, `+${killScore}`, '#ffffff', 13);
      }
      if (killed.length) G.Effects.addShake(Math.min(6, 1.5 + killed.length));
    }
    bombs = bombs.filter((b) => {
      if (b.t < B.duration) return true;
      if (b.kills >= 3) G.Effects.text(b.x, b.y, `${b.kills}마리!`, '#5ef2c1', 20);
      return false;
    });
    return bonus;
  }

  function plantBomb(x, y) {
    bombs.push({ x, y, t: 0, kills: 0, spin: Math.random() * Math.PI });
    G.Effects.ring(x, y, '#5ef2c1', B.radius, 0.45, 6);
    G.Effects.burst(x, y, '#5ef2c1', 18, 220);
    G.Effects.addFlash(0.2, '94,242,193');
    G.Effects.addShake(3);
  }

  // 피어날 때 커지고, 끝날 때 작아진다
  function bombRadius(b) {
    const k = Math.min(1, b.t / B.growTime, (B.duration - b.t) / B.growTime);
    return B.radius * Math.max(0, k);
  }

  function draw(ctx, time) {
    for (const b of bombs) drawBomb(ctx, b, time);
    for (const it of items) drawItem(ctx, it, time);
  }

  function drawBomb(ctx, b, time) {
    const r = bombRadius(b);
    if (r <= 0) return;
    ctx.save();
    ctx.translate(b.x, b.y);

    ctx.fillStyle = 'rgba(94, 242, 193, 0.13)';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // 남은 시간 표시: 테두리가 줄어든다
    ctx.strokeStyle = 'rgba(94, 242, 193, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - b.t / B.duration));
    ctx.stroke();

    // 회전하는 꽃잎
    ctx.rotate(b.spin + b.t * 2.6);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = i % 2 ? 'rgba(94, 242, 193, 0.55)' : 'rgba(200, 255, 236, 0.55)';
      ctx.beginPath();
      ctx.ellipse(r * 0.55, 0, r * 0.42, r * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawItem(ctx, it, time) {
    // 사라지기 직전(마지막 튕김 전)에는 깜빡인다
    if (it.bounces >= C.maxBounces - 1 && Math.floor(time * 8) % 2 === 0) return;

    const appear = Math.min(1, it.age / 0.25);
    const pulse = 1 + Math.sin(time * 6) * 0.08;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.scale(appear * pulse, appear * pulse);

    ctx.fillStyle = 'rgba(94, 242, 193, 0.2)';
    ctx.beginPath();
    ctx.arc(0, 0, C.radius + 6 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(time * 1.5);
    ctx.fillStyle = '#5ef2c1';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? C.radius : C.radius * 0.45;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  return {
    reset, update, draw,
    get items() { return items; },
    get bombs() { return bombs; },
  };
})();
