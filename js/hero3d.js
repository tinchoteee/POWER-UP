// Portada en 3D: un anillo de productos que gira, con partículas y piso de grilla (Three.js, en js/vendor).
// Se arrastra con el mouse o el dedo; tocando una foto se abre ese producto. Si el navegador no tiene WebGL,
// queda la portada de siempre (foto de fondo). Lo carga tienda.js cuando la página ya terminó de cargar.
import * as THREE from "./vendor/three.module.min.js";

const hero = document.querySelector(".hero");
const movil = matchMedia("(max-width: 700px)").matches;

function productosParaAnillo() {
  const lista = (window.CATALOGO && CATALOGO.productos || []).filter(p => !p.oculto && (p.colores || []).some(c => c.foto));
  // Más nuevos primero, sin repetir foto
  const vistos = new Set(), out = [];
  for (const p of [...lista].sort((a, b) => b.id - a.id)) {
    const foto = p.colores.find(c => c.foto).foto;
    if (vistos.has(foto)) continue;
    vistos.add(foto); out.push({ id: p.id, nombre: p.nombre, foto: foto.replace(/^img\//, "img/mini/") });
  }
  return out.slice(0, movil ? 10 : 14);
}

function iniciar() {
  const productos = productosParaAnillo();
  if (!hero || productos.length < 4) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return; }   // sin WebGL: queda la portada normal
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, movil ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const lienzo = renderer.domElement;
  lienzo.className = "hero__3d";
  lienzo.setAttribute("aria-hidden", "true");
  hero.prepend(lienzo);

  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog(0x000000, 9, 19);
  const camara = new THREE.PerspectiveCamera(movil ? 44 : 34, 1, 0.1, 60);

  // ---- Anillo de fotos ----
  const anillo = new THREE.Group();
  anillo.rotation.x = 0.1;
  escena.add(anillo);
  const N = productos.length, ancho = 1.6, alto = 2.0;
  const radio = (N * (ancho + 0.45)) / (2 * Math.PI);
  const cargador = new THREE.TextureLoader();
  const geo = new THREE.PlaneGeometry(ancho, alto);
  const bordeGeo = new THREE.EdgesGeometry(geo);
  const paneles = [];
  productos.forEach((p, i) => {
    const a = (i / N) * Math.PI * 2;
    const grupo = new THREE.Group();
    grupo.position.set(Math.sin(a) * radio, 0, Math.cos(a) * radio);
    grupo.rotation.y = a;
    const mat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0 });
    cargador.load(p.foto, tex => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true; });
    const foto = new THREE.Mesh(geo, mat);
    foto.userData = p;
    const borde = new THREE.LineSegments(bordeGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
    borde.scale.setScalar(1.035);
    grupo.add(foto, borde);
    anillo.add(grupo);
    paneles.push({ grupo, foto, mat, escala: 1 });
  });

  // ---- Piso de grilla y partículas ----
  const grilla = new THREE.GridHelper(40, 40, 0xffffff, 0xffffff);
  grilla.material.transparent = true; grilla.material.opacity = 0.09;
  grilla.position.y = -alto / 2 - 0.6;
  escena.add(grilla);
  const cant = movil ? 260 : 520;
  const pos = new Float32Array(cant * 3);
  for (let i = 0; i < cant; i++) { pos[i * 3] = (Math.random() - 0.5) * 26; pos[i * 3 + 1] = (Math.random() - 0.3) * 10; pos[i * 3 + 2] = (Math.random() - 0.5) * 22; }
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const puntos = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: 0xffffff, size: movil ? 0.045 : 0.035, transparent: true, opacity: 0.7 }));
  escena.add(puntos);

  // ---- Tamaño ----
  function medir() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    // Más lejos en pantallas angostas para que entre el anillo
    camara.position.z = radio + (movil ? 5.4 : Math.max(5.6, 8.8 - camara.aspect * 1.3));
    camara.updateProjectionMatrix();
  }
  medir(); addEventListener("resize", medir);

  // ---- Interacción: arrastrar, mouse, tocar una foto ----
  let giro = 0, vel = 0.0025, arrastrando = false, ultimoX = 0, movio = 0;
  const mouse = new THREE.Vector2(0, 0), objetivo = { x: 0, y: 0 };
  const rayo = new THREE.Raycaster();
  let encima = null;
  const aPunto = e => { const r = lienzo.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }; };
  hero.addEventListener("pointerdown", e => {
    if (e.target.closest("a, button")) return;
    arrastrando = true; ultimoX = e.clientX; movio = 0;
  });
  addEventListener("pointerup", e => {
    if (!arrastrando) return;
    arrastrando = false;
    if (movio < 6 && encima && !e.target.closest("a, button")) location.hash = "p/" + encima.userData.id;
  });
  addEventListener("pointermove", e => {
    const p = aPunto(e); mouse.set(p.x, p.y);
    objetivo.x = p.x; objetivo.y = p.y;
    if (arrastrando) { const dx = e.clientX - ultimoX; ultimoX = e.clientX; movio += Math.abs(dx); vel = dx * 0.0009; giro += dx * 0.004; }
  }, { passive: true });

  // ---- Animación (solo cuando la portada se ve) ----
  let visible = true, reloj = new THREE.Clock(), entrada = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);
  hero.classList.add("hero--3d");
  const ayuda = document.createElement("p");
  ayuda.className = "hero__ayuda3d"; ayuda.setAttribute("aria-hidden", "true");
  ayuda.textContent = "ARRASTRÁ PARA GIRAR · TOCÁ UNA PRENDA PARA VERLA";
  hero.appendChild(ayuda);
  function cuadro() {
    requestAnimationFrame(cuadro);
    if (!visible || document.hidden || document.getElementById("vista-inicio").hidden) return;
    const dt = Math.min(reloj.getDelta(), 0.05);
    entrada = Math.min(1, entrada + dt * 0.7);
    const suave = 1 - Math.pow(1 - entrada, 3);
    if (!arrastrando) vel += (0.0025 - vel) * 0.02;
    giro += vel * (dt * 60);
    anillo.rotation.y = giro;
    anillo.position.y = Math.sin(performance.now() / 1600) * 0.08;
    anillo.scale.setScalar(0.6 + 0.4 * suave);
    puntos.rotation.y += dt * 0.02;
    camara.position.x += (objetivo.x * 0.9 - camara.position.x) * 0.05;
    camara.position.y += (0.7 + objetivo.y * 0.5 - camara.position.y) * 0.05;
    camara.lookAt(0, movil ? -0.75 : -0.95, 0);   // el anillo queda arriba y el título abajo
    // Foto bajo el mouse: se agranda
    rayo.setFromCamera(mouse, camara);
    const hit = rayo.intersectObjects(paneles.map(p => p.foto))[0];
    encima = hit && hit.object.material.opacity > 0.5 ? hit.object : null;
    lienzo.style.cursor = encima ? "pointer" : arrastrando ? "grabbing" : "grab";
    for (const p of paneles) {
      const meta = p.foto === encima ? 1.1 : 1;
      p.escala += (meta - p.escala) * 0.15;
      p.grupo.scale.setScalar(p.escala);
      if (p.mat.map) p.mat.opacity = Math.min(1, p.mat.opacity + dt * 1.5);
    }
    renderer.render(escena, camara);
  }
  cuadro();
}

try { iniciar(); } catch (e) { console.warn("Portada 3D no disponible", e); }
