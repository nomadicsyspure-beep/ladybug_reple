// 게임 밸런스 숫자를 한곳에 모은 파일.
// 난이도나 조작감을 바꾸고 싶으면 대부분 여기 숫자만 고치면 된다.
window.G = window.G || {};

G.CONFIG = {
  // 게임 속 좌표계 크기. 가로는 항상 360, 세로는 처음 켤 때 화면 비율에 맞춘다 (아래 계산).
  world: { width: 360, height: 600 },

  player: {
    radius: 13, // 그려지는 크기
    hitRadius: 8, // 실제 충돌 판정. 보이는 것보다 작게 해서 억울한 죽음을 막는다.
    speed: 235, // 키보드 이동 속도 (초당 거리)
    response: 32, // 키보드 반응 속도. 클수록 즉시 출발/정지 (미끄러짐 없음)
    touchSensitivity: 1.3, // 드래그한 거리 대비 이동 거리
    startY: 0.7, // 시작 위치 (화면 높이 비율)
  },

  enemy: {
    radius: 11,
    hitRadius: 8,
    spawnOffset: 36, // 화면 밖 얼마나 떨어진 곳에서 생겨날지
    safeSpawnDistance: 120, // 플레이어와 이보다 가까운 화면 가장자리에서는 생겨나지 않는다
    maxCount: 70,
    chaserHomingTime: 2.6, // 추적 벌레가 방향을 트는 시간 (이후엔 직진)
  },

  // 시간에 따라 난이도가 바뀌는 시점 (초)
  phases: {
    grace: 1.0, // 시작 후 적이 나오지 않는 시간
    sides: 15, // 좌우에서도 등장
    allSides: 35, // 아래쪽까지 모든 방향에서 등장
    chasers: 30, // 플레이어를 따라오는 보라색 벌레 등장
    surround: 22, // 사방에서 동시에 몰려오는 '포위 공격' 시작
    surroundGap: [13, 19], // 포위 공격 사이 간격 (최소, 최대)
    surroundWarning: 1.0, // 포위 공격 예고 시간
  },

  item: {
    radius: 12,
    firstAfter: 6, // 이 시간 이후부터 등장
    cooldown: 5, // 아이템이 사라진 뒤 다음 아이템까지 최소 대기 시간
    baseChance: 0.12, // 1초마다 등장할 확률
    dangerChance: 0.05, // 주변 적 한 마리당 추가 확률
    lifetime: 8, // 화면에 남아있는 시간
    blastRadius: 140, // 제거 범위
    blastDuration: 0.35, // 충격파가 퍼지는 시간
  },

  score: {
    perSecond: 10, // 1초 생존당 점수
    killBase: 10, // 아이템으로 제거한 적 점수. k번째 적은 killBase × k 점 (연속 제거일수록 큼)
  },
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

// 경과 시간 t(초)에 따른 난이도 값
G.difficultyAt = function (t) {
  return {
    spawnInterval: 0.22 + 0.68 * Math.exp(-t / 32), // 적 생성 간격 (점점 짧아짐)
    speed: 95 + 105 * (1 - Math.exp(-t / 55)) + Math.max(0, t - 120) * 0.25, // 적 속도 (점점 빨라짐)
    chaserChance: t < G.CONFIG.phases.chasers ? 0 : Math.min(0.35, 0.12 + (t - G.CONFIG.phases.chasers) / 150),
    chaserTurnRate: 0.8 + Math.min(0.9, Math.max(0, t - G.CONFIG.phases.chasers) / 100),
    doubleChance: t < 40 ? 0 : Math.min(0.45, (t - 40) / 140), // 한 번에 2마리 나올 확률
  };
};

// 공용 수학 도구
G.rand = (min, max) => min + Math.random() * (max - min);
G.clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
G.dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
