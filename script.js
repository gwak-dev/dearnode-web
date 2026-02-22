gsap.registerPlugin(InertiaPlugin);

// Color palette backgrounds (1, 3, 4, 6 + current green)
const PALETTES = [
  "#08342a", // green (current)
  "#1A1C2E", // 1 - dark navy
  "#8B7E74", // 3 - mocha
  "#121212", // 4 - black
  "#D32F2F", // 6 - red
];

function hexToHSL(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function deriveColors(bgHex) {
  const [h, s, l] = hexToHSL(bgHex);
  // Base dot: same hue, slightly brighter
  const base = s < 5
    ? hslToHex(h, 0, Math.min(l + 15, 40))
    : hslToHex(h, Math.min(s * 0.8, 40), Math.min(l + 15, 40));
  // Active dot: complementary hue for contrast
  const compH = (h + 180) % 360;
  const active = s < 5
    ? hslToHex(compH, 50, 75)
    : hslToHex(compH, Math.min(s + 30, 90), 70);
  return { base, active };
}

function applyPalette() {
  const bg = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  document.body.style.backgroundColor = bg;
  return { bg, colors: deriveColors(bg) };
}

function initGlowingInteractiveDotsGrid() {
  const { bg, colors } = applyPalette();

  document.querySelectorAll('[data-dots-container-init]').forEach(container => {
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
      const pad = 12;
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
