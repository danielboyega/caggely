(() => {
  'use strict';

  window.__caggely = window.__caggely || {};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Shared by every ambient loop below so they all go quiet together while
  // the tab is backgrounded, instead of only the liquid effect doing so.
  let tabHidden = document.hidden;
  document.addEventListener('visibilitychange', () => { tabHidden = document.hidden; });

  /* ---------------------------------------------------------
     Ambient cursor glow — soft light that trails the pointer
  --------------------------------------------------------- */
  const glow = document.getElementById('ambientGlow');
  if (glow) {
    let gx = window.innerWidth / 2, gy = window.innerHeight / 2;
    let tx = gx, ty = gy;
    window.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });

    const animateGlow = () => {
      if (!tabHidden) {
        gx += (tx - gx) * 0.06;
        gy += (ty - gy) * 0.06;
        glow.style.transform = `translate3d(${gx}px, ${gy}px, 0) translate(-50%,-50%)`;
      }
      requestAnimationFrame(animateGlow);
    };
    if (!reduceMotion) requestAnimationFrame(animateGlow);
  }

  /* ---------------------------------------------------------
     Whole-page parallax — the composition drifts gently
     opposite the cursor, like it's resting on a soft surface
  --------------------------------------------------------- */
  const content = document.getElementById('stageContent');
  if (content && !reduceMotion) {
    let px = 0, py = 0, cx = 0, cy = 0;
    window.addEventListener('pointermove', e => {
      px = (e.clientX / window.innerWidth - 0.5) * 2;
      py = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    const animateParallax = () => {
      if (!tabHidden) {
        cx += (px - cx) * 0.04;
        cy += (py - cy) * 0.04;
        content.style.transform = `translate3d(${cx * -8}px, ${cy * -6}px, 0)`;
      }
      requestAnimationFrame(animateParallax);
    };
    requestAnimationFrame(animateParallax);
  }

  /* ---------------------------------------------------------
     Click / tap ripples — disturb the whole surface, not
     just the logo, reinforcing the liquid motif site-wide
  --------------------------------------------------------- */
  const canvas = document.getElementById('rippleCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let ripples = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // The canvas sits idle (no rAF scheduled at all) whenever there's
    // nothing to draw, instead of clearing an empty canvas 60x/second
    // forever — spawning a ripple wakes the loop back up.
    let rafPending = false;

    const spawnRipple = (x, y, opts = {}) => {
      ripples.push({
        x, y,
        start: performance.now(),
        life: opts.life || 1600,
        maxR: opts.maxR || 190
      });
      if (ripples.length > 6) ripples.shift();
      if (!rafPending && !reduceMotion) {
        rafPending = true;
        requestAnimationFrame(drawFrame);
      }
    };
    window.addEventListener('pointerdown', e => spawnRipple(e.clientX, e.clientY), { passive: true });
    window.__caggely.ripple = spawnRipple;

    const drawFrame = (now) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ripples = ripples.filter(r => now - r.start < r.life);
      for (const r of ripples) {
        const p = (now - r.start) / r.life;
        const eased = 1 - Math.pow(1 - p, 2);
        const radius = eased * r.maxR;
        const alpha = (1 - p) * 0.16;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(11,11,9,${alpha})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        if (radius > 14) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, radius * 0.62, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(11,11,9,${alpha * 0.6})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      if (ripples.length > 0) {
        requestAnimationFrame(drawFrame);
      } else {
        rafPending = false;
      }
    };
  }

  /* ---------------------------------------------------------
     Badge copy rotation — same understated stamp, three takes
  --------------------------------------------------------- */
  const badgeText = document.querySelector('.badge-text');
  if (badgeText) {
    const lines = ['In production.', 'Shooting soon.', 'Currently in production.'];
    let idx = 0;
    setInterval(() => {
      idx = (idx + 1) % lines.length;
      badgeText.classList.add('swap');
      setTimeout(() => {
        badgeText.textContent = lines[idx];
        badgeText.classList.remove('swap');
      }, 350);
    }, 4200);
  }

  /* ---------------------------------------------------------
     Light-leak — an occasional, soft diagonal streak, like a
     stray flash of light hitting the lens. Rare enough to
     register as a texture, not a repeating pattern.
  --------------------------------------------------------- */
  const leak = document.getElementById('lightLeak');
  if (leak && !reduceMotion) {
    const scheduleLeak = () => {
      const delay = 16000 + Math.random() * 22000;
      setTimeout(() => {
        if (!document.hidden) {
          leak.classList.remove('run');
          void leak.offsetWidth; // restart the CSS animation
          leak.classList.add('run');
        }
        scheduleLeak();
      }, delay);
    };
    scheduleLeak();
  }

  /* ---------------------------------------------------------
     Tab title — a small nudge to come back
  --------------------------------------------------------- */
  const baseTitle = document.title;
  const awayTitles = ['Still in production…', 'Don’t cut away yet…'];
  document.addEventListener('visibilitychange', () => {
    document.title = document.hidden
      ? awayTitles[Math.floor(Math.random() * awayTitles.length)]
      : baseTitle;
  });

})();
