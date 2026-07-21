(() => {
  'use strict';

  const preloader = document.getElementById('preloader');
  const beam = document.getElementById('preloaderBeam');
  const word = document.getElementById('preloaderWord');
  const clap = document.getElementById('preloaderClap');
  const flash = document.getElementById('preloaderFlash');

  if (!preloader || !beam || !word || !clap || !flash) {
    document.body.classList.add('loaded');
    return;
  }

  // Failsafe: if anything throws partway through this sequence, the site
  // must not get stuck behind a black screen forever with no way out.
  const reveal = () => {
    if (document.getElementById('preloader')) preloader.remove();
    document.body.classList.add('loaded');
  };
  const failsafe = setTimeout(reveal, 6000);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SEARCH_MS = 2200;  // the beam hunting the dark for the mark
  const LOCK_MS = 480;     // swinging in and converging once found
  const HOLD_MS = 260;     // a beat, fully lit, before the slate claps

  // The rig is mounted fixed at top-center — only the aim (the far end of
  // the beam) moves, exactly like a real theatrical spotlight swiveling.
  const originX = () => window.innerWidth * 0.5;
  const originY = () => -window.innerHeight * 0.08;

  const ARC_STEPS = 16;

  // One continuous polygon: a narrow throat at the rig, straight sides
  // fanning out, swept around a rounded cap at the landing point — so the
  // "cone" and the "pool" are the same shape, not two blended pieces.
  const setBeam = (lx, ly, r) => {
    const ox = originX(), oy = originY();
    const dx = lx - ox, dy = ly - oy;
    const len = Math.max(Math.hypot(dx, dy), 1);
    const px = -dy / len, py = dx / len; // unit vector perpendicular to the beam axis
    const nearHalf = 5; // narrow throat at the fixture

    const pts = [];
    pts.push(`${ox + px * nearHalf}px ${oy + py * nearHalf}px`);

    const angleP = Math.atan2(py, px);
    for (let i = 0; i <= ARC_STEPS; i++) {
      const a = angleP - (Math.PI * i / ARC_STEPS);
      pts.push(`${lx + Math.cos(a) * r}px ${ly + Math.sin(a) * r}px`);
    }
    pts.push(`${ox - px * nearHalf}px ${oy - py * nearHalf}px`);

    beam.style.clipPath = `polygon(${pts.join(', ')})`;

    // Gradient centered on the landing point — brightest there, fading
    // back along the cone toward the throat, all as one fill.
    beam.style.background = `radial-gradient(circle ${r * 2.2}px at ${lx}px ${ly}px,
      rgba(255,255,255,.95) 0%,
      rgba(255,255,255,.5) 18%,
      rgba(255,255,255,.16) 40%,
      rgba(255,255,255,.05) 70%,
      rgba(255,255,255,0) 100%)`;

    const mask = `radial-gradient(circle ${r}px at ${lx}px ${ly}px, #000 0%, #000 38%, rgba(0,0,0,.65) 62%, transparent 100%)`;
    word.style.maskImage = mask;
    word.style.webkitMaskImage = mask;
  };

  // The clapperboard snaps shut, and on impact the whole scene cuts to the
  // real page — a single bright flash hides the swap.
  const runClapAndCut = () => {
    const r = word.getBoundingClientRect();
    clap.style.left = (r.left + r.width / 2) + 'px';
    clap.style.top = (r.top + r.height / 2) + 'px';
    clap.classList.add('show');

    setTimeout(() => clap.classList.add('clapping'), 170);
    setTimeout(() => flash.classList.add('hit'), 170 + 190);
    setTimeout(() => {
      clearTimeout(failsafe);
      reveal();
    }, 170 + 190 + 70);
  };

  if (reduceMotion) {
    const r = word.getBoundingClientRect();
    setBeam(r.left + r.width / 2, r.top + r.height / 2, 420);
    setTimeout(runClapAndCut, 200);
    return;
  }

  preloader.classList.add('beam-on');

  const randomPoint = () => ({
    x: window.innerWidth * (0.15 + Math.random() * 0.7),
    y: window.innerHeight * (0.25 + Math.random() * 0.55)
  });
  const wordCenter = () => {
    const r = word.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  let target = randomPoint();
  const cur = { x: target.x, y: target.y };
  let radius = 90;
  let nextWaypointAt = 0;
  let startTime = null;
  let locking = false;
  let cutStarted = false;

  const tick = (t) => {
    if (startTime === null) startTime = t;
    const elapsed = t - startTime;

    if (!locking && elapsed >= SEARCH_MS) {
      locking = true;
      target = wordCenter();
    } else if (!locking && t >= nextWaypointAt) {
      target = randomPoint();
      nextWaypointAt = t + 420 + Math.random() * 240;
    }

    const posEase = locking ? 0.06 : 0.055;
    cur.x += (target.x - cur.x) * posEase;
    cur.y += (target.y - cur.y) * posEase;

    const targetRadius = locking ? 250 : 85 + Math.sin(t * 0.006) * 10;
    radius += (targetRadius - radius) * (locking ? 0.05 : 0.1);

    setBeam(cur.x, cur.y, radius);

    if (locking && elapsed >= SEARCH_MS + LOCK_MS + HOLD_MS && !cutStarted) {
      cutStarted = true;
      runClapAndCut();
      return;
    }
    if (!cutStarted) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

})();
