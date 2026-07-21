(() => {
  'use strict';

  window.__caggely = window.__caggely || {};

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Touch devices are treated as low-power: continuously recomputing an SVG
  // filter chain (displacement + blur + color-matrix) at 60fps is one of the
  // most expensive things a browser can render, and most phones/tablets
  // can't hardware-accelerate it — hardwareConcurrency alone badly
  // undercounts this, since nearly all modern phones report 4-8 cores.
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const lowPower = isCoarsePointer || !!(navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

  const turbOffset = document.getElementById('turbOffset');
  const dispMap = document.getElementById('dispMap');
  const wordmark = document.getElementById('wordmark');

  // Static fallback: bake in one gentle, non-animated distortion and stop.
  const applyStatic = () => {
    turbOffset.setAttribute('dx', '3');
    turbOffset.setAttribute('dy', '-2');
    dispMap.setAttribute('scale', '7');
  };

  if (reduceMotion || lowPower) {
    applyStatic();
    window.__caggely.shock = () => {};
    return;
  }

  // Pointer influence, smoothly eased toward the current target each frame —
  // this is what lets the surface "ripple toward the cursor" without snapping.
  let targetX = 0, targetY = 0;   // normalized, roughly -1..1 relative to wordmark center
  let influence = 0, targetInfluence = 0;
  let curX = 0, curY = 0;

  // Cached instead of re-measured on every pointer event — the wordmark's
  // position barely changes (a few px of parallax drift at most), so a
  // fresh layout read per mousemove isn't worth the cost. Refreshed on
  // resize and once after the entrance animation settles.
  let wordRect = wordmark.getBoundingClientRect();
  const refreshWordRect = () => { wordRect = wordmark.getBoundingClientRect(); };
  window.addEventListener('resize', refreshWordRect, { passive: true });
  setTimeout(refreshWordRect, 1600);

  const updatePointer = (clientX, clientY) => {
    const cx = wordRect.left + wordRect.width / 2;
    const cy = wordRect.top + wordRect.height / 2;
    const halfW = Math.max(wordRect.width / 2, 1);
    const halfH = Math.max(wordRect.height / 2, 1);
    targetX = Math.max(-1.8, Math.min(1.8, (clientX - cx) / halfW));
    targetY = Math.max(-1.8, Math.min(1.8, (clientY - cy) / halfH));
    targetInfluence = 1;
  };

  window.addEventListener('pointermove', e => updatePointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerdown', e => updatePointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerleave', () => { targetInfluence = 0; });
  window.addEventListener('blur', () => { targetInfluence = 0; });

  let paused = document.hidden;
  document.addEventListener('visibilitychange', () => { paused = document.hidden; });

  // A brief, decaying kick — used by the clapperboard to make the wordmark
  // flinch once on impact, then settle straight back into its resting ripple.
  let shock = 0;
  window.__caggely.shock = (amount = 12) => { shock = amount; };

  // Slow, long-period sine layers — long, incommensurate periods read as a
  // gentle, continuous swell rather than a jittery wobble. Kept subtle so the
  // wordmark stays legible and close to the source mark at all times.
  const tick = (t) => {
    if (!paused) {
      const driftX = Math.sin(t * 0.00011) * 3.4 + Math.sin(t * 0.00034) * 1.6;
      const driftY = Math.cos(t * 0.00009) * 2.8 + Math.sin(t * 0.00026) * 1.4;

      influence += (targetInfluence - influence) * 0.045;
      curX += (targetX - curX) * 0.035;
      curY += (targetY - curY) * 0.035;
      shock *= 0.9;

      const dx = driftX + curX * 6 * influence;
      const dy = driftY + curY * 5 * influence;
      const scale = 8 + Math.sin(t * 0.00028) * 1.4 + influence * 3.5 + shock;

      turbOffset.setAttribute('dx', dx.toFixed(2));
      turbOffset.setAttribute('dy', dy.toFixed(2));
      dispMap.setAttribute('scale', Math.max(0, scale).toFixed(2));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

})();
