// 시작점: 각 부분을 준비하고 게임 루프(매 프레임 반복)를 돌린다.
(function () {
  G.View.init(document.getElementById('game'));
  G.Input.init(document.getElementById('app'), G.Game.start);
  G.UI.init(G.Game.start);
  G.Game.init();

  let last = performance.now();
  function frame(now) {
    // 탭을 다녀오는 등 프레임이 크게 밀려도 한 번에 너무 많이 진행되지 않게 제한
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    G.Game.update(dt);
    G.Game.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
