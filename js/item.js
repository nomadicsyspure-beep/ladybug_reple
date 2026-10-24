// 아이템 '반짝별': 먹으면 충격파가 퍼지며 주변 적을 없앤다.
// 연속으로 많이 없앨수록 한 마리당 점수가 커진다 (10, 20, 30 ...).
G.Items = (function () {
  const C = G.CONFIG.item;
  const S = G.CONFIG.score;
  const W = G.CONFIG.world.width;
  const H = G.CONFIG.world.height;

  let item = null;
  let blast = null;
  let checkTimer = 0;
  let sinceGone = 0;

  function reset() {
    item = null;
    blast = null;
    checkTimer = 0;
    sinceGone = C.cooldown;
  }

  // 플레이어가 조금 움직여야 닿는 거리, 적과 겹치지 않는 곳에 놓는다
  function spawn(player) {
    let best = null;
    for (let i = 0; i < 20; i++) {
      const x = G.rand(40, W - 40);
      const y = G.rand(50, H - 40);
      const d = Math.sqrt(G.dist2(x, y, player.x, player.y));
      if (d < 70 || d > 210) continue;
      best = { x, y };
      if (G.Enemies.countNear(x, y, 45) === 0) break;
    }
    if (!best) {
      const a = Math.random() * Math.PI * 2;
      best = {
        x: G.clamp(player.x + Math.cos(a) * 110, 40, W - 40),
        y: G.clamp(player.y + Math.sin(a) * 110, 50, H - 40),
      };
    }
    item = { x: best.x, y: best.y, r: C.radius, life: C.lifetime, age: 0 };
    G.Effects.ring(item.x, item.y, '#5ef2c1', 30, 0.4, 3);
  }

  // 반환값: 이번 프레임에 얻은 보너스 점수
  function update(dt, t, player, surroundStarted) {
    let bonus = 0;

    // 등장 판정: 1초마다 확률 검사. 주변에 적이 많을수록, 포위 공격 때 더 잘 나온다.
    if (!item) {
      sinceGone += dt;
      checkTimer += dt;
      const ready = t >= C.firstAfter && sinceGone >= C.cooldown;
      if (ready && surroundStarted && Math.random() < 0.6) {
        spawn(player);
      } else if (checkTimer >= 1) {
        checkTimer -= 1;
        const chance = C.baseChance + C.dangerChance * G.Enemies.countNear(player.x, player.y, 110);
        if (ready && Math.random() < chance) spawn(player);
      }
    }

    if (item) {
      item.age += dt;
      item.life -= dt;
      const r = item.r + player.r;
      if (G.dist2(item.x, item.y, player.x, player.y) < r * r) {
        pickUp(player);
      } else if (item.life <= 0) {
        item = null;
        sinceGone = 0;
      }
    }

    if (blast) bonus += updateBlast(dt, player);
    return bonus;
  }

  function pickUp(player) {
    blast = { t: 0, r: 0, kills: 0, total: 0 };
    item = null;
    sinceGone = 0;
    G.Effects.ring(player.x, player.y, '#5ef2c1', C.blastRadius, 0.5, 8);
    G.Effects.ring(player.x, player.y, '#ffffff', C.blastRadius * 0.7, 0.35, 4);
    G.Effects.burst(player.x, player.y, '#5ef2c1', 24, 260);
    G.Effects.addFlash(0.35, '94,242,193');
    G.Effects.addShake(5);
  }

  // 충격파가 퍼지는 동안 닿은 적을 차례로 없앤다
  function updateBlast(dt, player) {
    blast.t += dt;
    const k = Math.min(1, blast.t / C.blastDuration);
    blast.r = C.blastRadius * (1 - Math.pow(1 - k, 2));
    blast.x = player.x;
    blast.y = player.y;

    let bonus = 0;
    const killed = G.Enemies.removeWhere((e) => {
      const rr = blast.r + e.r;
      return G.dist2(e.x, e.y, player.x, player.y) < rr * rr;
    });
    for (const e of killed) {
      blast.kills++;
      const pts = S.killBase * blast.kills;
      bonus += pts;
      blast.total += pts;
      G.Effects.burst(e.x, e.y, e.chaser ? '#b98cff' : '#ff6b6b', 10, 180);
      G.Effects.text(e.x, e.y - 6, `+${pts}`, '#ffffff', 13);
    }
    if (killed.length) G.Effects.addShake(3);

    if (k >= 1) {
      if (blast.kills >= 2) {
        G.Effects.text(player.x, player.y - 34, `${blast.kills}마리! +${blast.total}`, '#5ef2c1', 20);
      }
      blast = null;
    }
    return bonus;
  }

  function draw(ctx, time) {
    if (blast) {
      ctx.fillStyle = 'rgba(94, 242, 193, 0.12)';
      ctx.beginPath();
      ctx.arc(blast.x, blast.y, blast.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!item) return;
    // 사라지기 직전에는 깜빡인다
    if (item.life < 2.5 && Math.floor(item.life * 8) % 2 === 0) return;

    const appear = Math.min(1, item.age / 0.25);
    const pulse = 1 + Math.sin(time * 6) * 0.08;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.scale(appear * pulse, appear * pulse);

    ctx.fillStyle = 'rgba(94, 242, 193, 0.18)';
    ctx.beginPath();
    ctx.arc(0, 0, item.r + 8 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(time * 1.5);
    ctx.fillStyle = '#5ef2c1';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? item.r : item.r * 0.45;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  return { reset, update, draw, get current() { return item; } };
})();
