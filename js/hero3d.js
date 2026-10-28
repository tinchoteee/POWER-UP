// Portada en 3D: un rayo de cromo en el centro (el ⚡ de la marca) con un anillo de productos que gira alrededor,
// chispas que suben en espiral, descargas eléctricas del rayo a las prendas y reflejo en el piso (Three.js, en js/vendor).
// Se arrastra con el mouse o el dedo; tocando una foto se abre ese producto y tocando el rayo hay una "descarga".
// Al scrollear la cámara sube y el anillo acelera. Si el navegador no tiene WebGL, queda la portada de siempre.
// Lo carga tienda.js cuando la página ya terminó de cargar.
import * as THREE from "./vendor/three.module.min.js";

const hero = document.querySelector(".hero");
const movil = matchMedia("(max-width: 700px)").matches;
const tactil = !matchMedia("(hover: hover) and (pointer: fine)").matches;
// Equipos flojos (pocos núcleos o poca memoria): menos partículas y menos resolución desde el arranque
const flojo = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;

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

// Punto de luz redondo (para chispas y el halo del rayo)
function texturaPunto(dura) {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(dura, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Reflejos del cromo: una "sala" negra con tiras de luz blanca
function entornoCromo(renderer) {
  const sala = new THREE.Scene();
  sala.background = new THREE.Color(0x030303);
  const luz = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(7), side: THREE.DoubleSide });
  const tiras = [[0, 6, 0, 10, 0.6, Math.PI / 2, 0], [-6, 1, -2, 0.5, 8, 0, Math.PI / 2], [6, 2, 3, 0.5, 6, 0, -Math.PI / 2], [0, -1, -7, 9, 0.35, 0, 0], [3, 4, 6, 4, 0.3, 0, Math.PI]];
  for (const [x, y, z, w, h, rx, ry] of tiras) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), luz);
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.lookAt(0, 0, 0);
    sala.add(m);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(sala, 0.035).texture;
  pmrem.dispose();
  return tex;
}

function geometriaRayo() {
  const f = new THREE.Shape();
  const p = [[0.12, 1.25], [-0.6, -0.06], [-0.04, -0.06], [-0.26, -1.25], [0.6, 0.16], [0.04, 0.16], [0.4, 1.25]];
  f.moveTo(...p[0]); p.slice(1).forEach(q => f.lineTo(...q)); f.closePath();
  const g = new THREE.ExtrudeGeometry(f, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 5, curveSegments: 4 });
  g.center();
  return g;
}

function iniciar() {
  const productos = productosParaAnillo();
  if (!hero || productos.length < 4) return false;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !flojo, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return false; }   // sin WebGL: queda la portada normal
  // Resolución: arranca según el equipo y baja sola si los cuadros vienen lentos (ver cuadro())
  let resolucion = Math.min(devicePixelRatio || 1, flojo ? 1 : movil ? 1.5 : 1.75);
  renderer.setPixelRatio(resolucion);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const lienzo = renderer.domElement;
  lienzo.className = "hero__3d";
  lienzo.setAttribute("aria-hidden", "true");
  hero.prepend(lienzo);

  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog(0x000000, 9, 21);
  const camara = new THREE.PerspectiveCamera(movil ? 46 : 34, 1, 0.1, 60);
  const punto = texturaPunto(0.25), halo = texturaPunto(0.02);

  // ---- Rayo de cromo en el centro ----
  const nucleo = new THREE.Group();
  escena.add(nucleo);
  const rayo3d = new THREE.Mesh(geometriaRayo(), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.22, emissive: 0x161616, envMap: entornoCromo(renderer), envMapIntensity: 2.4 }));
  rayo3d.scale.setScalar(movil ? 1.15 : 1.4);
  nucleo.add(rayo3d);
  const resplandor = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0xffffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  resplandor.scale.setScalar(5.5);
  resplandor.position.z = -0.6;
  nucleo.add(resplandor);
  const luz1 = new THREE.PointLight(0xffffff, 18, 12), luz2 = new THREE.PointLight(0xffffff, 10, 12);
  escena.add(luz1, luz2, new THREE.AmbientLight(0xffffff, 0.15));

  // ---- Anillo de fotos (y su reflejo en el piso) ----
  const anillo = new THREE.Group(), reflejo = new THREE.Group();
  anillo.rotation.x = 0.1;
  escena.add(anillo, reflejo);
  const N = productos.length, ancho = 1.6, alto = 2.0;
  const radio = Math.max(3.6, (N * (ancho + 0.45)) / (2 * Math.PI));
  const altura = -1.1, piso = altura - alto / 2 - 0.5;   // el anillo abajo, como un escenario alrededor del rayo
  reflejo.scale.y = -1; reflejo.position.y = piso * 2; reflejo.rotation.x = -0.1;
  const cargador = new THREE.TextureLoader();
  const geo = new THREE.PlaneGeometry(ancho, alto);
  const bordeGeo = new THREE.EdgesGeometry(geo);
  const paneles = [];
  productos.forEach((p, i) => {
    const a = (i / N) * Math.PI * 2;
    const ubicar = g => { g.position.set(Math.sin(a) * radio, 0, Math.cos(a) * radio); g.rotation.y = a; return g; };
    const mat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false });
    const matRef = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
    cargador.load(p.foto, tex => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; mat.map = tex; matRef.map = tex; mat.color.set(0xffffff); mat.needsUpdate = matRef.needsUpdate = true; });
    const foto = new THREE.Mesh(geo, mat);
    foto.userData = p;
    const borde = new THREE.LineSegments(bordeGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
    borde.scale.setScalar(1.035);
    const grupo = ubicar(new THREE.Group());
    grupo.add(foto, borde);
    anillo.add(grupo);
    const grupoRef = ubicar(new THREE.Group());
    grupoRef.add(new THREE.Mesh(geo, matRef));
    reflejo.add(grupoRef);
    paneles.push({ grupo, grupoRef, foto, mat, matRef, escala: 1, brillo: 0 });
  });

  // ---- Piso: grilla + velo que se funde con el reflejo ----
  const grilla = new THREE.GridHelper(44, 44, 0xffffff, 0xffffff);
  grilla.material.transparent = true; grilla.material.opacity = 0.1;
  grilla.position.y = piso;
  escena.add(grilla);
  const velo = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
  velo.rotation.x = -Math.PI / 2; velo.position.y = piso + 0.01;
  escena.add(velo);

  // ---- Polvo de fondo ----
  const cantPolvo = flojo ? 140 : movil ? 220 : 480;
  const pos = new Float32Array(cantPolvo * 3);
  for (let i = 0; i < cantPolvo; i++) { pos[i * 3] = (Math.random() - 0.5) * 28; pos[i * 3 + 1] = (Math.random() - 0.3) * 11; pos[i * 3 + 2] = (Math.random() - 0.5) * 24; }
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const polvo = new THREE.Points(pgeo, new THREE.PointsMaterial({ map: punto, color: 0xffffff, size: movil ? 0.09 : 0.07, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  escena.add(polvo);

  // ---- Chispas que suben en espiral alrededor del rayo ----
  const cantChispas = flojo ? 90 : movil ? 140 : 300;
  const chispas = Array.from({ length: cantChispas }, () => ({ a: Math.random() * Math.PI * 2, r: 0.6 + Math.random() * (radio - 1), y: piso + Math.random() * 6, v: 0.25 + Math.random() * 0.7 }));
  const cpos = new Float32Array(cantChispas * 3);
  const cgeo = new THREE.BufferGeometry(); cgeo.setAttribute("position", new THREE.BufferAttribute(cpos, 3));
  const chispasMat = new THREE.PointsMaterial({ map: punto, color: 0xffffff, size: movil ? 0.11 : 0.09, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
  escena.add(new THREE.Points(cgeo, chispasMat));

  // ---- Descargas eléctricas: del rayo a una prenda ----
  // Líneas armadas una sola vez y reusadas (crear y tirar geometrías cada segundo traba en celulares)
  const PUNTOS = 16, descargas = [];
  for (let i = 0; i < N * 2 + 6; i++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PUNTOS * 3), 3));
    const linea = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    linea.visible = false; linea.frustumCulled = false;
    escena.add(linea);
    descargas.push({ linea, vida: 0, total: 1, brillo: 1 });
  }
  const tmp = new THREE.Vector3(), desde = new THREE.Vector3(), destino = new THREE.Vector3();
  function descarga(fuerza = 1) {
    desde.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 2, 0);
    nucleo.localToWorld(desde);
    for (let k = 0; k < 2; k++) {
      const d = descargas.find(x => x.vida <= 0);
      if (!d) return;
      const arr = d.linea.geometry.attributes.position;
      for (let i = 0; i < PUNTOS; i++) {
        const t = i / (PUNTOS - 1), s = Math.sin(Math.PI * t) * 0.45 * fuerza;
        tmp.lerpVectors(desde, destino, t);
        arr.setXYZ(i, tmp.x + (Math.random() - 0.5) * s, tmp.y + (Math.random() - 0.5) * s, tmp.z + (Math.random() - 0.5) * s);
      }
      arr.needsUpdate = true;
      d.total = d.vida = 0.22 + k * 0.06; d.brillo = k ? 0.45 : 1;
      d.linea.visible = true;
    }
  }
  function descargaAPanel(p, fuerza) { p.foto.getWorldPosition(destino); descarga(fuerza); p.brillo = 1; }

  // ---- Tamaño (solo cuando cambia de verdad el tamaño de la portada, no en cada scroll del celular) ----
  let caja = lienzo.getBoundingClientRect(), anchoPrev = 0, altoPrev = 0, altoHero = hero.offsetHeight || 1;
  function medir() {
    const w = hero.clientWidth, h = hero.clientHeight;
    altoHero = hero.offsetHeight || 1;
    caja = lienzo.getBoundingClientRect();
    if (!w || !h || (w === anchoPrev && h === altoPrev)) return;
    anchoPrev = w; altoPrev = h;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    // Más lejos en pantallas angostas para que entre el anillo
    camara.userData.z = radio + (movil ? 6.6 : Math.max(7, 10.4 - camara.aspect * 1.3));
    camara.updateProjectionMatrix();
  }
  medir();
  if ("ResizeObserver" in window) new ResizeObserver(() => medir()).observe(hero); else addEventListener("resize", medir);

  // ---- Interacción: arrastrar, mouse, tocar una foto o el rayo ----
  let giro = 0, vel = 0.0025, arrastrando = false, ultimoX = 0, movio = 0, carga = 0, scroll = 0, mouseMovido = true;
  const mouse = new THREE.Vector2(9, 9), objetivo = { x: 0, y: 0 };
  const raycaster = new THREE.Raycaster();
  let encima = null, cursor = "";
  // La caja del lienzo se guarda y se actualiza al scrollear: medirla en cada movimiento del mouse fuerza al navegador a recalcular todo
  const aPunto = e => ({ x: ((e.clientX - caja.left) / caja.width) * 2 - 1, y: -((e.clientY - caja.top) / caja.height) * 2 + 1 });
  const queHay = () => {
    raycaster.setFromCamera(mouse, camara);
    const hit = raycaster.intersectObjects(objetivosToque, false)[0];
    return hit && (hit.object === rayo3d || hit.object.material.opacity > 0.5) ? hit.object : null;
  };
  function sobrecarga() {
    carga = 1;
    paneles.forEach((p, i) => setTimeout(() => descargaAPanel(p, 1.4), i * 35));
    hero.classList.remove("hero--descarga"); void hero.offsetWidth; hero.classList.add("hero--descarga");
  }
  hero.addEventListener("pointerdown", e => {
    if (e.target.closest("a, button")) return;
    caja = lienzo.getBoundingClientRect();
    arrastrando = true; ultimoX = e.clientX; movio = 0;
    const p = aPunto(e); mouse.set(p.x, p.y); mouseMovido = true;
  });
  addEventListener("pointerup", e => {
    if (!arrastrando) return;
    arrastrando = false;
    if (movio >= 6 || e.target.closest("a, button")) return;
    const p = aPunto(e); mouse.set(p.x, p.y);
    const tocado = queHay();   // se mira en el momento del toque (en el celular no hay "mouse encima")
    if (!tocado) return;
    if (tocado === rayo3d) sobrecarga();
    else location.hash = "p/" + tocado.userData.id;
  });
  // En el celular, si el dedo termina scrolleando la página el navegador cancela el toque: sin esto el anillo quedaba frenado
  addEventListener("pointercancel", () => { arrastrando = false; });
  addEventListener("pointermove", e => {
    if (!visible) return;
    const p = aPunto(e); mouse.set(p.x, p.y); mouseMovido = true;
    objetivo.x = p.x; objetivo.y = p.y;
    if (arrastrando) { const dx = e.clientX - ultimoX; ultimoX = e.clientX; movio += Math.abs(dx); vel = dx * 0.0009; giro += dx * 0.004; }
  }, { passive: true });
  addEventListener("scroll", () => {
    scroll = Math.min(1, Math.max(0, scrollY / altoHero));
    if (visible) caja = lienzo.getBoundingClientRect();
  }, { passive: true });

  // Si la placa de video se reinicia (pasa en celulares), se frena sin romper nada y sigue cuando vuelve
  let sinContexto = false;
  lienzo.addEventListener("webglcontextlost", e => { e.preventDefault(); sinContexto = true; });
  lienzo.addEventListener("webglcontextrestored", () => { sinContexto = false; });

  // ---- Animación (solo cuando la portada se ve) ----
  let visible = true, reloj = new THREE.Clock(), entrada = 0, proxDescarga = 1.2, cuadros = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) caja = lienzo.getBoundingClientRect(); }).observe(hero);
  const inicio = document.getElementById("vista-inicio");
  const objetivosToque = [rayo3d, ...paneles.map(p => p.foto)];
  hero.classList.add("hero--3d");
  const ayuda = document.createElement("p");
  ayuda.className = "hero__ayuda3d"; ayuda.setAttribute("aria-hidden", "true");
  ayuda.textContent = movil ? "TOCÁ EL RAYO ⚡" : "ARRASTRÁ PARA GIRAR · TOCÁ EL RAYO O UNA PRENDA";
  hero.appendChild(ayuda);
  // Control de fluidez: si los cuadros tardan mucho, baja la resolución (y como último paso apaga el reflejo y el polvo)
  let muestras = 0, sumaMs = 0, nivel = 0;
  function cuidarFluidez(ms) {
    if (nivel >= 3 || entrada < 1) return;   // la entrada carga texturas: no cuenta
    muestras++; sumaMs += Math.min(ms, 100);   // un tirón suelto (fotos que se decodifican) no cuenta de más
    if (muestras < 90) return;
    const prom = sumaMs / muestras; muestras = sumaMs = 0;
    if (prom < 24) return;                   // anda a más de ~40 cuadros por segundo: no se toca nada
    nivel++;
    if (resolucion > 1) { resolucion = Math.max(1, resolucion - 0.5); renderer.setPixelRatio(resolucion); anchoPrev = 0; medir(); }
    else if (nivel >= 2) { reflejo.visible = false; polvo.visible = false; nivel = 3; }
  }

  function cuadro() {
    requestAnimationFrame(cuadro);
    if (!visible || sinContexto || document.hidden || (inicio && inicio.hidden)) { reloj.getDelta(); return; }
    const crudo = reloj.getDelta(), dt = Math.min(crudo, 0.05), t = performance.now() / 1000;
    cuidarFluidez(crudo * 1000);
    entrada = Math.min(1, entrada + dt * 0.6);
    const suave = 1 - Math.pow(1 - entrada, 3);
    carga = Math.max(0, carga - dt * 0.6);

    // Anillo: gira solo, más rápido con la descarga y al scrollear
    if (!arrastrando) vel += (0.0025 + scroll * 0.01 + carga * 0.02 - vel) * 0.03;
    giro += vel * (dt * 60);
    anillo.rotation.y = reflejo.rotation.y = giro;
    anillo.position.y = altura + Math.sin(t / 1.6) * 0.08;
    anillo.scale.setScalar(0.55 + 0.45 * suave);
    reflejo.scale.set(anillo.scale.x, -anillo.scale.y, anillo.scale.z);
    reflejo.position.y = piso * 2 - anillo.position.y;

    // Rayo: entra girando, flota y sigue un poco al mouse
    nucleo.position.y = Math.sin(t * 1.3) * 0.12 + 0.75;
    rayo3d.rotation.y += dt * (0.6 + carga * 9);
    nucleo.rotation.x += (-objetivo.y * 0.25 - nucleo.rotation.x) * 0.06;
    nucleo.rotation.z += (objetivo.x * -0.18 - nucleo.rotation.z) * 0.06;
    nucleo.scale.setScalar((0.2 + 0.8 * suave) * (1 + carga * 0.25 + Math.sin(t * 3) * 0.015));
    resplandor.material.opacity = 0.14 + carga * 0.7 + Math.sin(t * 2.2) * 0.04;
    luz1.position.set(Math.cos(t * 0.9) * 3.5, 2, Math.sin(t * 0.9) * 3.5);
    luz2.position.set(Math.cos(t * 0.7 + 3) * 3, -1, Math.sin(t * 0.7 + 3) * 3);
    luz1.intensity = 18 + carga * 60;

    // Chispas
    const subir = 1 + carga * 4 + scroll * 1.5;
    chispas.forEach((c, i) => {
      c.y += c.v * dt * subir; c.a += dt * (0.25 + c.v * 0.3) * subir;
      if (c.y > 5) { c.y = piso; c.r = 0.6 + Math.random() * (radio - 1); }
      cpos[i * 3] = Math.cos(c.a) * c.r; cpos[i * 3 + 1] = c.y; cpos[i * 3 + 2] = Math.sin(c.a) * c.r;
    });
    cgeo.attributes.position.needsUpdate = true;
    polvo.rotation.y += dt * 0.02;

    // Descargas al azar (más seguido en la sobrecarga)
    proxDescarga -= dt;
    if (proxDescarga <= 0 && entrada > 0.6) {
      descargaAPanel(paneles[(Math.random() * N) | 0], 1);
      proxDescarga = 0.9 + Math.random() * 1.8;
    }
    for (const d of descargas) {
      if (d.vida <= 0) continue;
      d.vida -= dt;
      d.linea.material.opacity = Math.max(0, d.vida / d.total) * d.brillo * (Math.random() * 0.4 + 0.6);
      if (d.vida <= 0) d.linea.visible = false;
    }

    // Cámara: sigue al mouse y sube/se acerca al scrollear
    camara.position.x += (objetivo.x * 0.9 - camara.position.x) * 0.05;
    camara.position.y += (1.5 + objetivo.y * 0.5 + scroll * 2.4 - camara.position.y) * 0.06;
    camara.position.z += (camara.userData.z - scroll * 2 - camara.position.z) * 0.06;
    camara.lookAt(0, movil ? 0.2 : 0, 0);   // el rayo al centro, las prendas girando abajo

    // Lo que está bajo el mouse: la foto se agranda; el rayo se puede tocar
    // (con mouse; en el celular se mira solo al tocar). Cada 2 cuadros alcanza y ahorra trabajo.
    if (!tactil && (mouseMovido || (cuadros & 1))) {
      mouseMovido = false;
      encima = queHay();
      const c = encima ? "pointer" : arrastrando ? "grabbing" : "grab";
      if (c !== cursor) lienzo.style.cursor = cursor = c;
    }
    cuadros++;
    for (const p of paneles) {
      const meta = p.foto === encima ? 1.12 : 1;
      p.escala += (meta - p.escala) * 0.15;
      p.grupo.scale.setScalar(p.escala); p.grupoRef.scale.setScalar(p.escala);
      p.brillo = Math.max(0, p.brillo - dt * 2.5);
      if (p.mat.map) {
        p.mat.opacity = Math.min(1, p.mat.opacity + dt * 1.5);
        p.matRef.opacity = p.mat.opacity * 0.16;
        p.mat.color.setScalar(1 + p.brillo * 0.8);   // la prenda "se enciende" cuando le llega una descarga
      }
    }
    renderer.render(escena, camara);
  }
  cuadro();
  return true;
}

// fx.js ya dejó la portada lista para el 3D (así no salta de tamaño al cargar); si no se pudo armar, vuelve a la de siempre
let armada = false;
try { armada = iniciar(); } catch (e) { console.warn("Portada 3D no disponible", e); }
if (!armada && hero) { hero.classList.remove("hero--3d"); hero.querySelector(".hero__3d")?.remove(); }
