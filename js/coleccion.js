// Portada "colección" (2026-11-26, inspirada en la estética de souche.com.ar que eligió el dueño):
// un conjunto del drop por vez, flotando sobre un disco con texto en arco, sello que gira, flechas y barra negra para comprar.
// Solo transform/opacity y scroll nativo con snap: fluida también en celulares flojos.
(function () {
  const sec = document.getElementById("inicio"), pista = document.getElementById("colPista");
  if (!sec || !pista) return;
  const SLIDES = [
    { id: 41, dis: "rayos", color: "negro", nombre: "PU RAYOS", fondo: "#dedcd5" },
    { id: 41, dis: "rayos", color: "blanco", nombre: "PU RAYOS", fondo: "#a9a8a2" },
    { id: 44, dis: "monograma", color: "negro", nombre: "PU MONOGRAMA", fondo: "#e6e4dc" },
    { id: 44, dis: "monograma", color: "blanco", nombre: "PU MONOGRAMA", fondo: "#b5b3ac" },
    { id: 47, dis: "clothing", color: "negro", nombre: "CLOTHING CO.", fondo: "#d8d6cf" },
    { id: 47, dis: "clothing", color: "blanco", nombre: "CLOTHING CO.", fondo: "#9f9e98" },
  ].filter(s => !window.CATALOGO || (CATALOGO.productos || []).some(p => p.id === s.id && !p.oculto));
  if (!SLIDES.length) return;
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dos = n => String(n).padStart(2, "0");
  document.getElementById("colTot").textContent = dos(SLIDES.length);

  pista.innerHTML = SLIDES.map((s, i) => `<a class="col__slide" href="#p/${s.id}" aria-label="Conjunto ${s.nombre} ${s.color}">
      <span class="col__sombra" aria-hidden="true"></span>
      <img src="img/col/${s.dis}-${s.color}.webp" width="680" height="1100" alt="Conjunto ${s.nombre} ${s.color}" decoding="async"${i ? ' loading="lazy"' : ' fetchpriority="high"'}>
    </a>`).join("");
  const rayas = document.getElementById("colRayas");
  rayas.innerHTML = SLIDES.map((s, i) => `<button aria-label="Ver ${i + 1}" data-i="${i}"></button>`).join("");

  // Sello: estrella de 22 puntas
  const est = sec.querySelector(".col__estrella");
  if (est) { const p = []; for (let k = 0; k < 44; k++) { const r = k % 2 ? 84 : 98, a = Math.PI * k / 22; p.push((100 + r * Math.cos(a)).toFixed(1) + "," + (100 + r * Math.sin(a)).toFixed(1)); } est.setAttribute("points", p.join(" ")); }

  const num = document.getElementById("colNum"), barra = document.getElementById("colBarra"),
        nombre = document.getElementById("colNombre"), mini = document.getElementById("colMini");
  let actual = -1;
  function marcar(i) {
    if (i === actual) return; actual = i; const s = SLIDES[i];
    num.textContent = dos(i + 1);
    sec.style.setProperty("--c1", s.fondo);
    sec.classList.toggle("col--blanco", s.color === "blanco");
    [...rayas.children].forEach((b, k) => b.classList.toggle("on", k === i));
    [...pista.children].forEach((a, k) => a.classList.toggle("on", k === i));
    barra.href = `#p/${s.id}`; nombre.textContent = s.nombre;
    mini.src = `img/col/${s.dis}-${s.color}-560.webp`;
  }
  const ancho = () => pista.clientWidth || 1;
  const ir = i => { i = (i + SLIDES.length) % SLIDES.length; pista.scrollTo({ left: i * ancho(), behavior: quieto ? "auto" : "smooth" }); };
  let pend = false;
  pista.addEventListener("scroll", () => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; marcar(Math.min(SLIDES.length - 1, Math.max(0, Math.round(pista.scrollLeft / ancho())))); }); }, { passive: true });
  let tocado = 0; const toque = () => { tocado = Date.now(); };
  ["pointerdown", "wheel", "touchstart"].forEach(ev => pista.addEventListener(ev, toque, { passive: true }));
  document.getElementById("colAnt").addEventListener("click", () => { toque(); ir(actual - 1); });
  document.getElementById("colSig").addEventListener("click", () => { toque(); ir(actual + 1); });
  rayas.addEventListener("click", e => { const b = e.target.closest("button"); if (b) { toque(); ir(+b.dataset.i); } });
  pista.addEventListener("keydown", e => { if (e.key === "ArrowRight") { toque(); ir(actual + 1); } if (e.key === "ArrowLeft") { toque(); ir(actual - 1); } });
  marcar(0);
  // Pasa sola cada 5 s mientras se ve y nadie la tocó
  let visible = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(sec);
  if ("IntersectionObserver" in window) new IntersectionObserver(es => { document.documentElement.classList.toggle("en-portada", es[0].isIntersecting && !document.getElementById("vista-inicio").hidden); }, { threshold: .1 }).observe(barra);
  if (!quieto) setInterval(() => { if (visible && !document.hidden && Date.now() - tocado > 8000 && !document.getElementById("vista-inicio").hidden) ir(actual + 1); }, 5000);
})();
