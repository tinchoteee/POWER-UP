/* =========================================================
   POWER UP — EFECTOS 3D (2026-10-28)
   Solo agrega movimiento: no toca productos, carrito ni pagos (eso sigue en tienda.js).
   Si el sistema tiene "reducir movimiento", no hace nada.
   ========================================================= */
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const compu = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ---------- Carrito: al sumar una prenda salen rayitos desde donde tocaste hasta el ícono ----------
  let tocadoX = innerWidth / 2, tocadoY = innerHeight / 2;
  addEventListener("pointerdown", e => { tocadoX = e.clientX; tocadoY = e.clientY; }, { passive: true, capture: true });
  const cuenta = $("#cartCount"), boton = $("#cartOpen");
  if (cuenta && boton) {
    let antes = +cuenta.textContent || 0;
    new MutationObserver(() => {
      const n = +cuenta.textContent || 0;
      if (n > antes) cargarCarrito();
      antes = n;
    }).observe(cuenta, { childList: true, characterData: true, subtree: true });
  }
  function cargarCarrito() {
    const r = boton.getBoundingClientRect(), fx = r.left + r.width / 2, fy = r.top + r.height / 2;
    for (let i = 0; i < 9; i++) {
      const c = document.createElement("span");
      c.className = "fx-chispa"; c.textContent = i % 3 ? "✦" : "⚡";
      document.body.appendChild(c);
      const abreX = (Math.random() - 0.5) * 220, abreY = -60 - Math.random() * 160;
      c.animate([
        { transform: `translate(${tocadoX}px, ${tocadoY}px) scale(.4)`, opacity: 0 },
        { transform: `translate(${tocadoX + abreX}px, ${tocadoY + abreY}px) scale(1.3) rotate(${abreX}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${fx - 9}px, ${fy - 9}px) scale(.5) rotate(0deg)`, opacity: 0.9 }
      ], { duration: 750 + i * 40, easing: "cubic-bezier(.5, 0, .2, 1)", delay: i * 25 }).onfinish = () => c.remove();
    }
    setTimeout(() => { boton.classList.remove("is-power"); void boton.offsetWidth; boton.classList.add("is-power"); }, 760);
  }

  // ---------- Manifiesto: cada palabra en su cajita para que se pare en 3D ----------
  const manifiesto = $(".manifesto__text");
  if (manifiesto) {
    let i = 0;
    const partir = nodo => {
      [...nodo.childNodes].forEach(h => {
        if (h.nodeType === 1) return partir(h);
        if (h.nodeType !== 3 || !h.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        h.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) return frag.appendChild(document.createTextNode(" "));
          const s = document.createElement("span");
          s.className = "palabra"; s.style.setProperty("--i", i++); s.textContent = t;
          frag.appendChild(s);
        });
        h.replaceWith(frag);
      });
    };
    partir(manifiesto);
  }

  // ---------- Bloques que se inclinan hacia el mouse (ventajas, números, Instagram) ----------
  if (compu) {
    $$(".perk, .stat, .insta__inner, .club__box").forEach(el => el.classList.add("fx-tilt"));
    let actual = null;
    document.addEventListener("mousemove", e => {
      const el = e.target.closest(".fx-tilt");
      if (actual && actual !== el) { actual.style.transform = ""; actual.classList.remove("is-tilt"); actual = null; }
      if (!el) return;
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${-py * 8}deg) rotateY(${px * 10}deg)`;
      el.classList.add("is-tilt"); actual = el;
    }, { passive: true });

    // Foto grande del producto: se inclina siguiendo al mouse (el zoom de tienda.js sigue andando adentro)
    const fg = $("#fotoGrande");
    if (fg) {
      fg.addEventListener("mousemove", e => {
        const r = fg.getBoundingClientRect();
        fg.style.setProperty("--fg-ry", ((e.clientX - r.left) / r.width - 0.5) * 8 + "deg");
        fg.style.setProperty("--fg-rx", -((e.clientY - r.top) / r.height - 0.5) * 6 + "deg");
      });
      fg.addEventListener("mouseleave", () => { fg.style.removeProperty("--fg-ry"); fg.style.removeProperty("--fg-rx"); });
    }
  }

  // ---------- Footer: el POWER UP gigante mira hacia el mouse ----------
  const grande = $(".footer__big");
  if (grande && compu) {
    document.addEventListener("mousemove", e => {
      const r = grande.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      grande.style.setProperty("--fx-ry", ((e.clientX / innerWidth) - 0.5) * 18 + "deg");
      grande.style.setProperty("--fx-rx", 12 - ((e.clientY / innerHeight) - 0.5) * 14 + "deg");
    }, { passive: true });
  }

  // ---------- Marquesinas: se doblan hacia atrás según la velocidad del scroll ----------
  const cintas = $$(".marquee");
  if (cintas.length) {
    let ultimo = scrollY, inclinacion = 0;
    (function loop() {
      const v = scrollY - ultimo; ultimo = scrollY;
      inclinacion += (Math.max(-25, Math.min(25, v * 0.6)) - inclinacion) * 0.1;
      if (Math.abs(inclinacion) > 0.05 || inclinacion !== 0) cintas.forEach(c => c.style.setProperty("--cinta-x", inclinacion.toFixed(2) + "deg"));
      requestAnimationFrame(loop);
    })();
  }
})();
