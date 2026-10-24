// 캔버스 크기 맞추기와 배경 그리기.
// 게임은 항상 360×600 좌표로 계산하고, 화면 크기에 맞게 확대/축소해서 보여준다.
G.View = (function () {
  const W = G.CONFIG.world.width;
  const H = G.CONFIG.world.height;
  const view = { canvas: null, ctx: null, scale: 1, offsetX: 0, offsetY: 0, dpr: 1 };

  function init(canvas) {
    view.canvas = canvas;
    view.ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
  }

  function resize() {
    const rect = view.canvas.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 3);
    view.canvas.width = Math.round(rect.width * view.dpr);
    view.canvas.height = Math.round(rect.height * view.dpr);
    view.scale = Math.min(rect.width / W, rect.height / H);
    view.offsetX = (rect.width - W * view.scale) / 2;
    view.offsetY = (rect.height - H * view.scale) / 2;
  }

  // 한 프레임 그리기 시작: 화면을 지우고 게임 좌표계로 전환
  function begin(shakeX, shakeY) {
    const { ctx, dpr, scale } = view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0f1a22';
    ctx.fillRect(0, 0, view.canvas.width, view.canvas.height);
    ctx.setTransform(
      dpr * scale, 0, 0, dpr * scale,
      dpr * (view.offsetX + shakeX * scale),
      dpr * (view.offsetY + shakeY * scale)
    );
    drawArena(ctx);
    // 게임 영역 밖(화면 밖에서 대기 중인 적 등)은 그리지 않는다
    ctx.save();
    ctx.clip();
    return ctx;
  }

  function end() {
    view.ctx.restore();
  }

  function drawArena(ctx) {
    ctx.fillStyle = '#16232d';
    roundRect(ctx, 0, 0, W, H, 14);
    ctx.fill();

    // 은은한 점 무늬: 움직임을 느끼게 해 주되 눈이 피곤하지 않게
    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
    for (let y = 20; y < H; y += 30) {
      for (let x = 15 + ((y / 30) % 2) * 15; x < W; x += 30) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
  }

  // 플레이어 주변에 적이 많을수록 화면 가장자리가 붉어진다 (긴장감 연출)
  function drawDanger(ctx, amount) {
    if (amount < 0.01) return;
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.62);
    g.addColorStop(0, 'rgba(255, 60, 80, 0)');
    g.addColorStop(1, `rgba(255, 60, 80, ${0.28 * amount})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  return { init, resize, begin, end, drawDanger, get scale() { return view.scale; } };
})();
