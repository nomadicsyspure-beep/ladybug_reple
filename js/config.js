// 게임 밸런스 숫자를 한곳에 모은 파일.
// 난이도나 조작감을 바꾸고 싶으면 대부분 여기 숫자만 고치면 된다.
// 크기·속도는 원작(가로 480 기준)의 비율을 가로 360에 맞춰 옮긴 값이다.
window.G = window.G || {};

G.CONFIG = {
  // 게임 속 좌표계 크기. 가로는 항상 360, 세로는 처음 켤 때 화면 비율에 맞춘다 (아래 계산).
  world: { width: 360, height: 600 },

  player: {
    radius: 20, // 그려지는 크기
    hitRadius: 12, // 실제 충돌 판정. 보이는 것보다 작게 해서 억울한 죽음을 막는다.
    speed: 230, // 키보드 이동 속도 (초당 거리)
    response: 32, // 키보드 반응 속도. 클수록 즉시 출발/정지 (미끄러짐 없음)
    touchSensitivity: 1.3, // 드래그한 거리 대비 이동 거리
    startY: 0.75, // 시작 위치 (화면 높이 비율)
  },

  enemy: {
    radius: 21,
    hitRadius: 14,
    speed: 52, // 느리지만 끝까지 일정한 속도. 대신 떼로 몰려온다.
    spawnOffset: 26, // 화면 밖 얼마나 떨어진 곳에서 생겨날지
    safeSpawnDistance: 110, // 플레이어와 이보다 가까운 곳에서는 생겨나지 않는다
    maxCount: 150,
    firstWaveDelay: 1.2, // 시작 후 첫 벌레 떼까지
  },

  item: {
    radius: 16, // 그려지는 크기
    pickupRadius: 22, // 먹었다고 판정하는 크기
    speed: 68, // 화면을 떠다니는 속도
    maxBounces: 5, // 벽에 이만큼 부딪히면 사라진다
    maxCount: 3, // 동시에 떠 있을 수 있는 최대 개수
    firstDelay: 3, // 시작 후 첫 아이템까지
  },

  bomb: {
    radius: 118, // 꽃 폭탄 크기 (화면 폭의 약 1/3)
    duration: 3, // 머무는 시간 (초)
    growTime: 0.33, // 커지고 작아지는 데 걸리는 시간
  },
};

// 점수 단계표. 점수가 completeScore 이하인 동안 그 단계의 규칙을 쓴다.
//   batch: 위에서 한 번에 나오는 벌레 수 / enemyDelay: 벌레 떼 간격(초)
//   itemDelay: 아이템 간격(초) / kill: 한 마리 처치 점수 / time: 1초 생존 점수
G.WAVES = [
  { completeScore: 100, batch: 5, enemyDelay: 3.0, itemDelay: 4.0, kill: 10, time: 1 },
  { completeScore: 500, batch: 6, enemyDelay: 2.9, itemDelay: 3.9, kill: 20, time: 2 },
  { completeScore: 1500, batch: 7, enemyDelay: 2.5, itemDelay: 3.8, kill: 30, time: 3 },
  { completeScore: 3000, batch: 8, enemyDelay: 1.5, itemDelay: 3.7, kill: 40, time: 4 },
  { completeScore: 5500, batch: 9, enemyDelay: 1.0, itemDelay: 3.6, kill: 50, time: 5 },
  { completeScore: 10000, batch: 10, enemyDelay: 1.0, itemDelay: 3.5, kill: 60, time: 6 },
  { completeScore: 15000, batch: 11, enemyDelay: 1.0, itemDelay: 3.4, kill: 70, time: 7 },
  { completeScore: 30000, batch: 12, enemyDelay: 1.0, itemDelay: 3.3, kill: 80, time: 8 },
  { completeScore: 50000, batch: 13, enemyDelay: 1.0, itemDelay: 3.2, kill: 90, time: 9 },
  { completeScore: 100000, batch: 14, enemyDelay: 1.0, itemDelay: 3.1, kill: 100, time: 10 },
  { completeScore: Infinity, batch: 14, enemyDelay: 1.0, itemDelay: 3.0, kill: 100, time: 10 },
];

// 아주 후반에만 옆/아래에서도 한 마리씩 추가로 나온다
G.SIDE_SPAWNS = [
  { above: 100000, edge: 'left' },
  { above: 300000, edge: 'right' },
  { above: 700000, edge: 'bottom' },
];

G.waveIndexFor = function (score) {
  const i = G.WAVES.findIndex((w) => score <= w.completeScore);
  return i < 0 ? G.WAVES.length - 1 : i;
};

// 세로 길이를 화면 비율에 맞춰 빈 공간을 줄인다. 너무 길거나 짧으면 난이도가 달라지므로 범위를 제한.
(function fitWorldToScreen() {
  const HUD_HEIGHT = 70;
  const w = Math.min(window.innerWidth, window.innerHeight * 0.62);
  const h = window.innerHeight - HUD_HEIGHT;
  if (w > 0 && h > 0) {
    G.CONFIG.world.height = Math.round(Math.min(720, Math.max(540, (G.CONFIG.world.width * h) / w)));
  }
})();

// 공용 수학 도구
G.rand = (min, max) => min + Math.random() * (max - min);
G.clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
G.dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
