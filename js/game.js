// 게임 진행 담당: 상태 전환(시작 → 플레이 → 죽음 → 게임 오버)과 매 프레임 갱신/그리기.
G.Game = (function () {
  const W = G.CONFIG.world.width;
  const H = G.CONFIG.world.height;
  const S = G.CONFIG.score;

  const DEATH_SLOWMO = 0.25; // 죽는 순간 느려지는 정도
  const DEATH_DELAY = 0.75; // 죽고 나서 게임 오버 화면이 뜨기까지 (실제 시간)
  const RETRY_LOCK = 0.3; // 게임 오버 화면이 뜬 직후 실수로 바로 넘어가지 않게

  const state = {
    mode: 'title', // 'title' | 'playing' | 'dying' | 'over'
    time: 0,
    bonus: 0,
    score: 0,
    best: 0,
    newBest: false,
    timer: 0,
    danger: 0,
    clock: 0, // 애니메이션용 시계
    player: null,
  };

  function init() {
    state.best = G.Storage.loadBest();
    state.player = G.Player.create();
    G.Enemies.reset();
    G.Items.reset();
    G.UI.updateHud(0, 0, state.best);
  }

  function start() {
    if (state.mode === 'playing' || state.mode === 'dying') return;
    if (state.mode === 'over' && state.timer > 0) return;

    state.mode = 'playing';
    state.time = 0;
    state.bonus = 0;
    state.score = 0;
    state.newBest = false;
    state.danger = 0;
    state.player = G.Player.create();
    G.Enemies.reset();
    G.Items.reset();
    G.Effects.clear();
    G.Input.resetDrag();
    G.UI.hideAll();
  }

  function die(enemy) {
    const p = state.player;
    state.mode = 'dying';
    state.timer = DEATH_DELAY;

    G.Effects.burst(p.x, p.y, '#ffd23f', 30, 260);
    G.Effects.burst(enemy.x, enemy.y, '#ff6b6b', 12, 160);
    G.Effects.ring(p.x, p.y, '#ffffff', 70, 0.45, 6);
    G.Effects.addShake(10);
    G.Effects.addFlash(0.5, '255,90,110');

    if (state.score > state.best) {
      state.best = state.score;
      state.newBest = true;
      G.Storage.saveBest(state.best);
    }
  }

  function update(dt) {
    state.clock += dt;

    switch (state.mode) {
      case 'title':
        G.Player.updateBlink(state.player, dt);
        break;

      case 'playing': {
        state.time += dt;
        const p = state.player;
        G.Player.update(p, dt);
        const surroundStarted = G.Enemies.updateSpawning(dt, state.time, p);
        G.Enemies.update(dt, p);
        state.bonus += G.Items.update(dt, state.time, p, surroundStarted);
        state.score = Math.floor(state.time * S.perSecond) + state.bonus;

        const target = Math.min(1, G.Enemies.countNear(p.x, p.y, 95) / 5);
        state.danger += (target - state.danger) * Math.min(1, dt * 6);

        const hit = G.Enemies.hits(p);
        if (hit) die(hit);
        G.Effects.update(dt);
        break;
      }

      case 'dying':
        G.Enemies.update(dt * DEATH_SLOWMO, null);
        G.Effects.update(dt * 0.6);
        state.danger = Math.max(0, state.danger - dt * 2);
        state.timer -= dt;
        if (state.timer <= 0) {
          state.mode = 'over';
          state.timer = RETRY_LOCK;
          G.UI.showOver({
            score: state.score,
            time: state.time,
            bonus: state.bonus,
            best: state.best,
            newBest: state.newBest,
          });
        }
        break;

      case 'over':
        state.timer -= dt;
        G.Enemies.update(dt * 0.5, null);
        G.Effects.update(dt);
        break;
    }

    G.UI.updateHud(state.time, state.score, state.best);
  }

  function render() {
    const shake = G.Effects.shakeOffset();
    const ctx = G.View.begin(shake.x, shake.y);
    const t = state.clock;

    G.Items.draw(ctx, t);
    G.Enemies.draw(ctx, t);
    if (state.mode === 'title' || state.mode === 'playing') G.Player.draw(ctx, state.player, t);
    G.Effects.draw(ctx);
    G.Enemies.drawWarnings(ctx, t);
    G.View.drawDanger(ctx, state.danger);
    G.Effects.drawFlash(ctx, W, H);
    G.View.end();
  }

  return { init, start, update, render, get state() { return state; } };
})();
