// 키보드와 터치(드래그) 입력 처리.
// 터치는 '손가락이 움직인 만큼 캐릭터가 움직이는' 방식이라 손가락이 캐릭터를 가리지 않는다.
G.Input = (function () {
  const DIRS = {
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0],
  };
  const keys = new Set();
  let pointerId = null;
  let lastX = 0;
  let lastY = 0;
  let dragDx = 0;
  let dragDy = 0;
  let onConfirm = null;

  function init(target, confirmHandler) {
    onConfirm = confirmHandler;

    window.addEventListener('keydown', (e) => {
      if (DIRS[e.code]) {
        keys.add(e.code);
        e.preventDefault();
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!e.repeat && onConfirm) onConfirm();
      }
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => {
      keys.clear();
      pointerId = null;
    });

    target.addEventListener('pointerdown', (e) => {
      if (pointerId !== null || e.target.closest('button')) return;
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
    });
    target.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pointerId) return;
      dragDx += e.clientX - lastX;
      dragDy += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
    });
    const release = (e) => {
      if (e.pointerId === pointerId) pointerId = null;
    };
    target.addEventListener('pointerup', release);
    target.addEventListener('pointercancel', release);
    target.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // 키보드 방향 (대각선도 같은 속도가 되도록 길이 1로 맞춤)
  function keyboardDir() {
    let x = 0;
    let y = 0;
    keys.forEach((code) => {
      x += DIRS[code][0];
      y += DIRS[code][1];
    });
    x = Math.sign(x);
    y = Math.sign(y);
    const len = Math.hypot(x, y);
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  }

  // 지난 프레임 이후 손가락이 움직인 거리 (화면 픽셀 단위). 읽으면 0으로 초기화.
  function takeDrag() {
    const d = { dx: dragDx, dy: dragDy };
    dragDx = 0;
    dragDy = 0;
    return d;
  }

  function resetDrag() {
    dragDx = 0;
    dragDy = 0;
  }

  return { init, keyboardDir, takeDrag, resetDrag };
})();
