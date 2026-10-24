// 최고 기록을 브라우저(localStorage)에 저장/불러오기.
// 개인정보 보호 모드 등에서 저장이 막혀도 게임은 계속 돌아가도록 오류를 무시한다.
G.Storage = (function () {
  const KEY = 'kkomuli.bestScore';
  let memoryBest = 0;

  function loadBest() {
    try {
      const v = parseInt(localStorage.getItem(KEY), 10);
      if (Number.isFinite(v)) memoryBest = Math.max(memoryBest, v);
    } catch (e) {
      // 저장소를 쓸 수 없으면 메모리 값만 사용
    }
    return memoryBest;
  }

  function saveBest(score) {
    memoryBest = Math.max(memoryBest, score);
    try {
      localStorage.setItem(KEY, String(memoryBest));
    } catch (e) {
      // 무시
    }
  }

  return { loadBest, saveBest };
})();
