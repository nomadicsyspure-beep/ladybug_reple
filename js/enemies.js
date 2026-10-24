// 적(벌레)의 등장, 이동, 그리기.
// 공정함을 위한 규칙:
//  - 적은 항상 화면 밖에서 생겨나 안으로 들어온다 (갑자기 눈앞에 나타나지 않음)
//  - 플레이어 바로 옆 가장자리에서는 생겨나지 않는다
//  - 들어오기 전에 화면 가장자리에 작은 표시가 보인다
//  - 포위 공격은 1초 전에 예고하고, 반드시 빠져나갈 틈을 남긴다
G.Enemies = (function () {
  const C = G.CONFIG.enemy;
  const P = G.CONFIG.phases;
  const W = G.CONFIG.world.width;
  const H = G.CONFIG.world.height;

  let list = [];
  let warnings = []; // 포위 공격 예고 표시
  let spawnTimer = 0;
  let nextSurround = 0;

  function reset() {
    list = [];
    warnings = [];
    spawnTimer = P.grace;
    nextSurround = P.surround + G.rand(0, 3);
  }

  // ---------- 등장 ----------

  function pickEdge(t) {
    const r = Math.random();
    if (t < P.sides) return 'top';
    if (t < P.allSides) return r < 0.6 ? 'top' : r < 0.8 ? 'left' : 'right';
    return r < 0.34 ? 'top' : r < 0.56 ? 'left' : r < 0.78 ? 'right' : 'bottom';
  }

  // 가장자리 위의 진입 지점과, 그보다 바깥쪽의 실제 생성 지점
  function edgePoint(edge) {
    const o = C.spawnOffset;
    switch (edge) {
      case 'top': { const x = G.rand(15, W - 15); return { ex: x, ey: 0, x, y: -o }; }
      case 'bottom': { const x = G.rand(15, W - 15); return { ex: x, ey: H, x, y: H + o }; }
      case 'left': { const y = G.rand(15, H - 15); return { ex: 0, ey: y, x: -o, y }; }
      default: { const y = G.rand(15, H - 15); return { ex: W, ey: y, x: W + o, y }; }
    }
  }

  function spawnNormal(t, player, diff) {
    if (list.length >= C.maxCount) return;

    // 플레이어와 너무 가까운 가장자리는 피해서 자리를 고른다
    let pt = null;
    let edge = 'top';
    for (let i = 0; i < 6; i++) {
      edge = pickEdge(t);
      const cand = edgePoint(edge);
      if (G.dist2(cand.ex, cand.ey, player.x, player.y) >= C.safeSpawnDistance * C.safeSpawnDistance) {
        pt = cand;
        break;
      }
    }
    if (!pt) return;

    // 목표 지점: 초반엔 대부분 아래로 흘러가고, 갈수록 플레이어를 노린다
    let tx;
    let ty;
    const aimChance = t < P.sides ? 0.35 : 0.65;
    if (Math.random() < aimChance) {
      tx = player.x + G.rand(-55, 55);
      ty = player.y + G.rand(-55, 55);
    } else if (edge === 'top') {
      tx = pt.x + G.rand(-100, 100);
      ty = H;
    } else {
      tx = G.rand(W * 0.2, W * 0.8);
      ty = G.rand(H * 0.2, H * 0.8);
    }

    const chaser = Math.random() < diff.chaserChance;
    const speed = diff.speed * G.rand(0.85, 1.15) * (chaser ? 0.85 : 1);
    add(pt.x, pt.y, tx, ty, speed, chaser ? diff.chaserTurnRate : 0);
  }

  function add(x, y, tx, ty, speed, turnRate) {
    const dx = tx - x;
    const dy = ty - y;
    const len = Math.hypot(dx, dy) || 1;
    list.push({
      x, y,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      speed,
      r: C.radius,
      hitR: C.hitRadius,
      chaser: turnRate > 0,
      turnRate,
      homing: turnRate > 0 ? C.chaserHomingTime : 0,
      entered: false,
      age: 0,
      phase: Math.random() * 10,
    });
  }

  // 포위 공격: 플레이어를 중심으로 원형으로 둘러싸고 동시에 몰려온다. 2칸은 비워 둔다.
  function startSurround(t, player) {
    const count = Math.min(11, 7 + Math.floor((t - P.surround) / 30));
    const base = Math.random() * Math.PI * 2;
    const gap = Math.floor(Math.random() * count);
    const speed = G.difficultyAt(t).speed * 0.8;

    for (let i = 0; i < count; i++) {
      if (i === gap || i === (gap + 1) % count) continue;
      const a = base + (i / count) * Math.PI * 2;
      const cx = Math.cos(a);
      const cy = Math.sin(a);
      // 플레이어에서 이 방향으로 화면 가장자리까지의 거리
      const tx = cx > 0 ? (W - player.x) / cx : cx < 0 ? -player.x / cx : Infinity;
      const ty = cy > 0 ? (H - player.y) / cy : cy < 0 ? -player.y / cy : Infinity;
      const tEdge = Math.min(tx, ty);
      if (tEdge < 90) continue; // 너무 가까운 곳에선 생성하지 않음

      warnings.push({
        ex: player.x + cx * tEdge,
        ey: player.y + cy * tEdge,
        sx: player.x + cx * (tEdge + C.spawnOffset),
        sy: player.y + cy * (tEdge + C.spawnOffset),
        targetX: player.x,
        targetY: player.y,
        speed,
        timer: P.surroundWarning,
      });
    }
  }

  // 반환값: 이번 프레임에 포위 공격이 시작됐는지 (아이템 등장 확률을 높이는 데 사용)
  function updateSpawning(dt, t, player) {
    const diff = G.difficultyAt(t);
    let surroundStarted = false;

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer += diff.spawnInterval * G.rand(0.8, 1.2);
      spawnNormal(t, player, diff);
      if (Math.random() < diff.doubleChance) spawnNormal(t, player, diff);
    }

    if (t >= nextSurround) {
      startSurround(t, player);
      nextSurround = t + G.rand(P.surroundGap[0], P.surroundGap[1]);
      surroundStarted = true;
    }

    for (const w of warnings) {
      w.timer -= dt;
      if (w.timer <= 0 && list.length < C.maxCount) add(w.sx, w.sy, w.targetX, w.targetY, w.speed, 0);
    }
    warnings = warnings.filter((w) => w.timer > 0);

    return surroundStarted;
  }

  // ---------- 이동 ----------

  function update(dt, player) {
    for (const e of list) {
      e.age += dt;

      // 추적 벌레: 정해진 시간 동안만 천천히 방향을 플레이어 쪽으로 튼다
      if (e.homing > 0 && player) {
        e.homing -= dt;
        const want = Math.atan2(player.y - e.y, player.x - e.x);
        const cur = Math.atan2(e.vy, e.vx);
        let diffA = want - cur;
        while (diffA > Math.PI) diffA -= Math.PI * 2;
        while (diffA < -Math.PI) diffA += Math.PI * 2;
        const turn = G.clamp(diffA, -e.turnRate * dt, e.turnRate * dt);
        e.vx = Math.cos(cur + turn) * e.speed;
        e.vy = Math.sin(cur + turn) * e.speed;
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (!e.entered && e.x > 0 && e.x < W && e.y > 0 && e.y < H) e.entered = true;
    }

    // 화면을 완전히 벗어난 적 제거
    const m = C.spawnOffset + 20;
    list = list.filter((e) => {
      const outside = e.x < -m || e.x > W + m || e.y < -m || e.y > H + m;
      return !(outside && (e.entered || e.age > 3));
    });
  }

  function hits(player) {
    for (const e of list) {
      const r = e.hitR + player.hitR;
      if (G.dist2(e.x, e.y, player.x, player.y) < r * r) return e;
    }
    return null;
  }

  function countNear(x, y, radius) {
    let n = 0;
    for (const e of list) if (G.dist2(e.x, e.y, x, y) < radius * radius) n++;
    return n;
  }

  // 조건에 맞는 적을 지우고 지운 적 목록을 돌려준다
  function removeWhere(fn) {
    const removed = [];
    list = list.filter((e) => {
      if (fn(e)) {
        removed.push(e);
        return false;
      }
      return true;
    });
    return removed;
  }

  // ---------- 그리기 ----------

  function draw(ctx, time) {
    for (const e of list) drawOne(ctx, e, time);
  }

  function drawOne(ctx, e, time) {
    const body = e.chaser ? '#b98cff' : '#ff6b6b';
    const dark = e.chaser ? '#5a2f9e' : '#9e2f3c';
    const r = e.r;

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.atan2(e.vy, e.vx));

    // 다리 (꼬물꼬물)
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const w = Math.sin(time * 22 + e.phase + i * 2) * 2.5;
      ctx.beginPath();
      ctx.moveTo(i * 5, -r * 0.5);
      ctx.lineTo(i * 5 + w, -r - 3);
      ctx.moveTo(i * 5, r * 0.5);
      ctx.lineTo(i * 5 - w, r + 3);
      ctx.stroke();
    }

    // 추적 벌레는 은은한 테두리 빛
    if (e.chaser) {
      ctx.fillStyle = 'rgba(185, 140, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 몸통 (길쭉한 딱정벌레 모양) + 등 가운데 줄
    ctx.fillStyle = body;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-1, 0, r * 1.05, r * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, 0);
    ctx.lineTo(r * 0.3, 0);
    ctx.stroke();

    // 머리와 화난 눈
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(r * 0.75, 0, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.9, -3, 2, 0, Math.PI * 2);
    ctx.arc(r * 0.9, 3, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 화면 밖에서 다가오는 적 위치를 가장자리에 표시 + 포위 공격 예고
  function drawWarnings(ctx, time) {
    for (const e of list) {
      if (e.entered) continue;
      const ex = G.clamp(e.x, 4, W - 4);
      const ey = G.clamp(e.y, 4, H - 4);
      const d = Math.hypot(e.x - ex, e.y - ey);
      ctx.globalAlpha = G.clamp(1 - d / (C.spawnOffset + 10), 0.15, 0.9);
      ctx.fillStyle = e.chaser ? '#b98cff' : '#ff6b6b';
      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const w of warnings) {
      const pulse = 0.55 + 0.45 * Math.sin(time * 18);
      const x = G.clamp(w.ex, 12, W - 12);
      const y = G.clamp(w.ey, 12, H - 12);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ffb020';
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a1a00';
      ctx.font = '900 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', x, y + 1);
    }
    ctx.globalAlpha = 1;
  }

  return {
    reset, updateSpawning, update, hits, countNear, removeWhere, draw, drawWarnings,
    get count() { return list.length; },
    get all() { return list; },
  };
})();
