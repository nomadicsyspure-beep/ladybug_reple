// 적(벌레)의 등장, 이동, 그리기.
// 원작 방식: 일정 간격마다 위쪽에서 벌레 떼가 한꺼번에 나오고,
// 각 벌레는 나오는 순간 플레이어가 있던 자리를 향해 곧장 날아간다 (도중에 방향을 바꾸지 않음).
// 그래서 마지막 순간 옆으로 빠지면 벌레들이 내가 있던 자리로 몰려가 엉킨다.
// 공정함을 위한 규칙:
//  - 항상 화면 밖에서 생겨나 안으로 들어오고, 들어오기 전 가장자리에 작은 점이 보인다
//  - 플레이어와 너무 가까운 곳에서는 생겨나지 않는다
G.Enemies = (function () {
  const C = G.CONFIG.enemy;
  const W = G.CONFIG.world.width;
  const H = G.CONFIG.world.height;

  let list = [];
  let spawnTimer = 0;

  function reset() {
    list = [];
    spawnTimer = C.firstWaveDelay;
  }

  // ---------- 등장 ----------

  function spawnPoint(edge, player) {
    const o = C.spawnOffset;
    const safe2 = C.safeSpawnDistance * C.safeSpawnDistance;
    let pt = null;
    for (let i = 0; i < 6; i++) {
      const u = G.rand(C.radius, (edge === 'top' || edge === 'bottom' ? W : H) - C.radius);
      if (edge === 'top') pt = { x: u, y: -o };
      else if (edge === 'bottom') pt = { x: u, y: H + o };
      else if (edge === 'left') pt = { x: -o, y: u };
      else pt = { x: W + o, y: u };
      if (G.dist2(pt.x, pt.y, player.x, player.y) >= safe2) return pt;
    }
    return null;
  }

  function spawnWave(score, player) {
    const wave = G.WAVES[G.waveIndexFor(score)];
    const edges = new Array(wave.batch).fill('top');
    for (const s of G.SIDE_SPAWNS) if (score > s.above) edges.push(s.edge);

    for (const edge of edges) {
      if (list.length >= C.maxCount) break;
      const pt = spawnPoint(edge, player);
      if (!pt) continue;
      const dx = player.x - pt.x;
      const dy = player.y - pt.y;
      const len = Math.hypot(dx, dy) || 1;
      list.push({
        x: pt.x,
        y: pt.y,
        vx: (dx / len) * C.speed,
        vy: (dy / len) * C.speed,
        r: C.radius,
        hitR: C.hitRadius,
        entered: false,
        phase: Math.random() * 10,
      });
    }
  }

  function updateSpawning(dt, score, player) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnWave(score, player);
      spawnTimer += G.WAVES[G.waveIndexFor(score)].enemyDelay;
    }
  }

  // ---------- 이동 ----------

  function update(dt) {
    for (const e of list) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (!e.entered && e.x > 0 && e.x < W && e.y > 0 && e.y < H) e.entered = true;
    }

    // 날아가던 방향으로 화면을 완전히 벗어난 적 제거
    list = list.filter((e) => !(
      (e.vx > 0 && e.x - e.r > W) ||
      (e.vx < 0 && e.x + e.r < 0) ||
      (e.vy > 0 && e.y - e.r > H) ||
      (e.vy < 0 && e.y + e.r < 0)
    ));
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

  // 기준 크기 11로 그린 뒤 실제 크기에 맞게 확대한다
  function drawOne(ctx, e, time) {
    const r = 11;
    const k = e.r / r;

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.atan2(e.vy, e.vx));
    ctx.scale(k, k);

    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(-2, 3, r * 1.05, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 다리 (꼬물꼬물)
    ctx.strokeStyle = '#9e2f3c';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const w = Math.sin(time * 16 + e.phase + i * 2) * 2.2;
      ctx.beginPath();
      ctx.moveTo(i * 5, -r * 0.5);
      ctx.lineTo(i * 5 + w, -r - 3);
      ctx.moveTo(i * 5, r * 0.5);
      ctx.lineTo(i * 5 - w, r + 3);
      ctx.stroke();
    }

    // 몸통 (길쭉한 딱정벌레 모양) + 등 가운데 줄
    ctx.fillStyle = '#ff6b6b';
    ctx.strokeStyle = '#9e2f3c';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(-1, 0, r * 1.05, r * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, 0);
    ctx.lineTo(r * 0.3, 0);
    ctx.stroke();

    // 머리와 눈
    ctx.fillStyle = '#9e2f3c';
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

  // 화면 밖에서 다가오는 적 위치를 가장자리에 작은 점으로 표시
  function drawWarnings(ctx) {
    ctx.fillStyle = '#ff6b6b';
    for (const e of list) {
      if (e.entered) continue;
      const ex = G.clamp(e.x, 4, W - 4);
      const ey = G.clamp(e.y, 4, H - 4);
      const d = Math.hypot(e.x - ex, e.y - ey);
      ctx.globalAlpha = G.clamp(1 - d / (C.spawnOffset + e.r), 0.2, 0.9);
      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return {
    reset, updateSpawning, update, hits, countNear, removeWhere, draw, drawWarnings,
    get count() { return list.length; },
  };
})();
