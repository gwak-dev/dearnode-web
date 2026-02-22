gsap.registerPlugin(InertiaPlugin);

function initGlowingInteractiveDotsGrid() {
  document.querySelectorAll('[data-dots-container-init]').forEach(container => {
    const colors         = { base: "#245E51", active: "#A8FF51" };
    const threshold      = 200;
    const speedThreshold = 100;
    const shockRadius    = 325;
    const shockPower     = 5;
    const maxSpeed       = 5000;

    const isMobile = window.matchMedia('(max-width: 768px)').matches ||
                     window.matchMedia('(pointer: coarse)').matches;

    let dots       = [];
    let dotCenters = [];

    function getHeroZones() {
      const zones = [];
      const pad = 30;
      document.querySelectorAll('.dn-hero h1').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 0) {
          zones.push({
            left:   r.left - pad,
            top:    r.top - pad,
            right:  r.right + pad,
            bottom: r.bottom + pad
          });
        }
      });
      return zones;
    }

    function isInHeroZone(x, y, zones) {
      for (let i = 0; i < zones.length; i++) {
        const z = zones[i];
        if (x >= z.left && x <= z.right && y >= z.top && y <= z.bottom) return true;
      }
      return false;
    }

    function buildGrid() {
      container.innerHTML = "";
      dots = [];
      dotCenters = [];

      const style = getComputedStyle(container);
      const dotPx = parseFloat(style.fontSize);
      const gapPx = dotPx * 2;
      const contW = container.clientWidth;
      const contH = container.clientHeight;
      const cols  = Math.floor((contW + gapPx) / (dotPx + gapPx));
      const rows  = Math.floor((contH + gapPx) / (dotPx + gapPx));
      const total = cols * rows;

      const heroZones = getHeroZones();

      // Pre-calculate dot positions for hero exclusion
      const totalW = cols * dotPx + (cols - 1) * gapPx;
      const totalH = rows * dotPx + (rows - 1) * gapPx;
      const offsetX = (contW - totalW) / 2;
      const offsetY = (contH - totalH) / 2;
      const containerRect = container.getBoundingClientRect();

      for (let i = 0; i < total; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;

        const dotX = containerRect.left + offsetX + col * (dotPx + gapPx) + dotPx / 2;
        const dotY = containerRect.top + offsetY + row * (dotPx + gapPx) + dotPx / 2;

        const isHero = isInHeroZone(dotX, dotY, heroZones);

        const d = document.createElement("div");
        d.classList.add("dot");

        if (isHero) {
          d.style.visibility = "hidden";
          d._isHole = true;
        } else {
          gsap.set(d, { x: 0, y: 0, backgroundColor: colors.base });
          d._inertiaApplied = false;
        }

        container.appendChild(d);
        dots.push(d);
      }

      requestAnimationFrame(() => {
        dotCenters = dots
          .filter(d => !d._isHole)
          .map(d => {
            const r = d.getBoundingClientRect();
            return {
              el: d,
              x:  r.left + window.scrollX + r.width  / 2,
              y:  r.top  + window.scrollY + r.height / 2
            };
          });
      });
    }

    window.addEventListener("resize", buildGrid);
    document.fonts.ready.then(() => { buildGrid(); });

    if (isMobile) return;

    // Smooth glow loop
    let mouseX = -9999, mouseY = -9999;
    function glowTick() {
      for (let i = 0; i < dotCenters.length; i++) {
        const { el, x, y } = dotCenters[i];
        const dist = Math.hypot(x - mouseX, y - mouseY);
        const t    = Math.max(0, 1 - dist / threshold);
        const col  = gsap.utils.interpolate(colors.base, colors.active, t);
        gsap.set(el, { backgroundColor: col });
      }
      requestAnimationFrame(glowTick);
    }
    requestAnimationFrame(glowTick);

    let lastTime = 0, lastX = 0, lastY = 0;
    window.addEventListener("mousemove", e => {
      mouseX = e.pageX;
      mouseY = e.pageY;

      const now   = performance.now();
      const dt    = now - lastTime || 16;
      let   dx    = e.pageX - lastX;
      let   dy    = e.pageY - lastY;
      let   vx    = dx / dt * 1000;
      let   vy    = dy / dt * 1000;
      let   speed = Math.hypot(vx, vy);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        vx *= scale; vy *= scale; speed = maxSpeed;
      }
      lastTime = now;
      lastX    = e.pageX;
      lastY    = e.pageY;

      if (speed > speedThreshold) {
        dotCenters.forEach(({ el, x, y }) => {
          const dist = Math.hypot(x - e.pageX, y - e.pageY);
          if (dist < threshold && !el._inertiaApplied) {
            el._inertiaApplied = true;
            const pushX = (x - e.pageX) + vx * 0.005;
            const pushY = (y - e.pageY) + vy * 0.005;
            gsap.to(el, {
              inertia: { x: pushX, y: pushY, resistance: 750 },
              onComplete() {
                gsap.to(el, {
                  x: 0,
                  y: 0,
                  duration: 1.5,
                  ease: "elastic.out(1,0.75)"
                });
                el._inertiaApplied = false;
              }
            });
          }
        });
      }
    });

    window.addEventListener("mouseleave", () => {
      mouseX = -9999;
      mouseY = -9999;
    });

    window.addEventListener("click", e => {
      dotCenters.forEach(({ el, x, y }) => {
        const dist = Math.hypot(x - e.pageX, y - e.pageY);
        if (dist < shockRadius && !el._inertiaApplied) {
          el._inertiaApplied = true;
          const falloff = Math.max(0, 1 - dist / shockRadius);
          const pushX   = (x - e.pageX) * shockPower * falloff;
          const pushY   = (y - e.pageY) * shockPower * falloff;
          gsap.to(el, {
            inertia: { x: pushX, y: pushY, resistance: 750 },
            onComplete() {
              gsap.to(el, {
                x: 0,
                y: 0,
                duration: 1.5,
                ease: "elastic.out(1,0.75)"
              });
              el._inertiaApplied = false;
            }
          });
        }
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  initGlowingInteractiveDotsGrid();
});
