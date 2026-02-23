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

    // Fixed hero slot: 4 rows × 11 cols, starting from col 1
    const heroSlotCols = 11;
    const heroSlotRows = 4;
    const heroSlotStartCol = 1; // col 0 stays visible

    function alignToGrid(dotPx, gapPx, cols, offsetX, containerRect) {
      const hero = document.querySelector('.dn-hero');
      const logo = document.querySelector('.dn-logo');
      const section = container.closest('.cloneable');
      const sectionLeft = section ? section.getBoundingClientRect().left : 0;
      const firstDotLeft = containerRect.left + offsetX - sectionLeft;
      const lastDotRight = containerRect.left + offsetX + (cols - 1) * (dotPx + gapPx) + dotPx;

      // Align hero left to second dot column (first dot column stays visible)
      const secondDotLeft = containerRect.left + offsetX + (dotPx + gapPx);
      if (hero) {
        hero.style.left = secondDotLeft + 'px';
        hero.style.paddingLeft = '0';
      }
      const footerContainer = document.querySelector('.footer .container');
      if (footerContainer) {
        footerContainer.style.paddingLeft = (containerRect.left + offsetX) + 'px';
      }
      if (logo) {
        const headerContainer = logo.closest('.container');
        if (headerContainer) {
          const hcRight = headerContainer.getBoundingClientRect().right;
          const rightPad = hcRight - lastDotRight;
          headerContainer.style.paddingRight = Math.max(0, rightPad) + 'px';
        }
      }
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

      const totalW = cols * dotPx + (cols - 1) * gapPx;
      const totalH = rows * dotPx + (rows - 1) * gapPx;
      const offsetX = (contW - totalW) / 2;
      const offsetY = (contH - totalH) / 2;
      const containerRect = container.getBoundingClientRect();

      // Calculate hero slot row: center vertically, nudge down slightly
      const midRow = Math.floor(rows / 2);
      const heroStartRow = midRow - Math.floor(heroSlotRows / 2) + 1;

      // Align hero, logo, footer to grid
      alignToGrid(dotPx, gapPx, cols, offsetX, containerRect);

      // Position hero to fill the slot
      const hero = document.querySelector('.dn-hero');
      if (hero) {
        const step = dotPx + gapPx;
        const slotLeft = containerRect.left + offsetX + heroSlotStartCol * step;
        const slotTop  = containerRect.top  + offsetY + heroStartRow * step;
        const slotW    = heroSlotCols * step - gapPx;
        const slotH    = heroSlotRows * step - gapPx;

        hero.style.left = slotLeft + 'px';
        hero.style.top  = slotTop + 'px';
        hero.style.width = slotW + 'px';
        hero.style.height = slotH + 'px';
        hero.style.transform = 'none';
        hero.style.paddingLeft = '0';
        hero.style.justifyContent = 'center';
      }

      // Build dots, hiding the ones in the hero slot
      for (let i = 0; i < total; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;

        const isHeroSlot = (
          row >= heroStartRow && row < heroStartRow + heroSlotRows &&
          col >= heroSlotStartCol && col < heroSlotStartCol + heroSlotCols
        );

        const d = document.createElement("div");
        d.classList.add("dot");

        if (isHeroSlot) {
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
