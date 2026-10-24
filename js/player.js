// 플레이어 캐릭터 '꼬물이': 이동과 그리기.
G.Player = (function () {
  const C = G.CONFIG.player;
  const W = G.CONFIG.world.width;
  const H = G.CONFIG.world.height;

  function create() {
    return {
      x: W / 2,
      y: H * C.startY,
      vx: 0,
      vy: 0,
      r: C.radius,
      hitR: C.hitRadius,
      faceX: 0,
      faceY: -1,
      moveAmount: 0, // 움직이는 정도 (몸이 살짝 찌그러지는 연출용)
      blink: 0,
    };
  }

  function update(p, dt) {
    const prevX = p.x;
    const prevY = p.y;

    // 키보드: 목표 속도로 아주 빠르게 다가간다 → 즉시 출발, 즉시 정지
    const dir = G.Input.keyboardDir();
    const k = 1 - Math.exp(-C.response * dt);
    p.vx += (dir.x * C.speed - p.vx) * k;
    p.vy += (dir.y * C.speed - p.vy) * k;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // 터치/마우스 드래그: 손가락이 움직인 만큼 그대로 이동
    const drag = G.Input.takeDrag();
    const s = C.touchSensitivity / G.View.scale;
    p.x += drag.dx * s;
    p.y += drag.dy * s;

    // 화면 밖으로 못 나가게
    const nx = G.clamp(p.x, p.r, W - p.r);
    const ny = G.clamp(p.y, p.r, H - p.r);
    if (nx !== p.x) p.vx = 0;
    if (ny !== p.y) p.vy = 0;
    p.x = nx;
    p.y = ny;

    // 바라보는 방향과 움직임 정도 갱신
    const mx = p.x - prevX;
    const my = p.y - prevY;
    const moved = Math.hypot(mx, my);
    if (moved > 0.2) {
      p.faceX += (mx / moved - p.faceX) * Math.min(1, dt * 18);
      p.faceY += (my / moved - p.faceY) * Math.min(1, dt * 18);
    }
    p.moveAmount += (Math.min(1, moved / (C.speed * dt + 0.001)) - p.moveAmount) * Math.min(1, dt * 12);

    updateBlink(p, dt);
  }

  function updateBlink(p, dt) {
    p.blink -= dt;
    if (p.blink < -G.rand(2, 4)) p.blink = 0.12;
  }

  // 기준 크기 13으로 그린 뒤 실제 크기에 맞게 확대한다
  function draw(ctx, p, time) {
    const r = 13;
    const fl = Math.hypot(p.faceX, p.faceY) || 1;
    const fx = p.faceX / fl;
    const fy = p.faceY / fl;
    const bob = Math.sin(time * 6) * 0.6 * (1 - p.moveAmount);
    const stretch = 1 + p.moveAmount * 0.08;

    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.scale(p.r / r, p.r / r);

    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.85, r * 0.85, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 더듬이
    ctx.strokeStyle = '#c99a00';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const sway = Math.sin(time * 8 + side) * 1.5;
      ctx.beginPath();
      ctx.moveTo(side * 4, -r * 0.8);
      ctx.quadraticCurveTo(side * 7, -r * 1.35, side * 9 + sway, -r * 1.45);
      ctx.stroke();
      ctx.fillStyle = '#ff9db5';
      ctx.beginPath();
      ctx.arc(side * 9 + sway, -r * 1.45, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 몸 (움직일 때 진행 방향으로 살짝 늘어남)
    ctx.save();
    ctx.rotate(Math.atan2(fy, fx));
    ctx.scale(stretch, 1 / stretch);
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = '#c99a00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 볼터치
    ctx.fillStyle = 'rgba(255, 120, 140, 0.55)';
    ctx.beginPath();
    ctx.ellipse(-7 + fx * 2, 4 + fy * 2, 3, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(7 + fx * 2, 4 + fy * 2, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 눈: 움직이는 방향을 바라본다
    const eyeOff = 3;
    for (const side of [-1, 1]) {
      const ex = side * 4.5 + fx * eyeOff;
      const ey = -2 + fy * eyeOff;
      if (p.blink > 0) {
        ctx.strokeStyle = '#2b2200';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(ex - 2.5, ey);
        ctx.lineTo(ex + 2.5, ey);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#2b2200';
        ctx.beginPath();
        ctx.arc(ex, ey, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex - 0.9, ey - 1, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  return { create, update, updateBlink, draw };
})();
