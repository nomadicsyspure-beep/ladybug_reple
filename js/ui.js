// 화면 위의 글자와 버튼(HTML 부분) 관리: 상단 정보, 시작 화면, 게임 오버 화면.
G.UI = (function () {
  const $ = (id) => document.getElementById(id);
  let el = {};
  let lastHud = '';

  function init(onStart) {
    el = {
      time: $('hud-time'),
      score: $('hud-score'),
      best: $('hud-best'),
      start: $('screen-start'),
      over: $('screen-over'),
      overScore: $('over-score'),
      overNew: $('over-new'),
      overDetail: $('over-detail'),
      overBest: $('over-best'),
    };
    $('btn-start').addEventListener('click', (e) => {
      e.currentTarget.blur();
      onStart();
    });
    $('btn-retry').addEventListener('click', (e) => {
      e.currentTarget.blur();
      onStart();
    });
  }

  function updateHud(time, score, best) {
    const key = `${time.toFixed(1)}|${score}|${best}`;
    if (key === lastHud) return;
    lastHud = key;
    el.time.textContent = time.toFixed(1);
    el.score.textContent = score;
    el.best.textContent = best;
  }

  function hideAll() {
    el.start.classList.add('hidden');
    el.over.classList.add('hidden');
  }

  function showOver(result) {
    el.overScore.textContent = result.score;
    el.overNew.classList.toggle('hidden', !result.newBest);
    el.overDetail.textContent = `생존 ${result.time.toFixed(1)}초 · 보너스 ${result.bonus}`;
    el.overBest.textContent = `최고 기록 ${result.best}`;
    el.over.classList.remove('hidden');
  }

  return { init, updateHud, hideAll, showOver };
})();
