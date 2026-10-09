"use strict";
// Editor de POWER UP: stock (talles, colores y modelos agotados), precios y pedidos.

const $ = s => document.querySelector(s);
const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pesos = n => "$" + Math.round(n).toLocaleString("es-AR");
const PRODUCTOS = CATALOGO.productos.filter(p => !p.oculto);
const fotoDe = p => p.foto || ((p.colores || []).find(c => c.foto) || {}).foto || "";

let permiso = sessionStorage.getItem("pu-permiso") || "";
let guardado = { productos: {} };   // lo que está en la base de datos
let ajustes = { productos: {} };    // lo que se está editando
let pedidos = [];
let suscriptores = [];
let cfgServidor = {};
let paresGuardado = {};             // unidades por talle en la base de datos ("id|color|talle" → número)
let pares = {};                     // lo que se está editando (sin clave = no se lleva la cuenta)

async function api(metodo, datos) {
  let r;
  try {
    r = await fetch("/api/admin", {
      method: metodo,
      headers: { "Content-Type": "application/json", ...(permiso ? { Authorization: "Bearer " + permiso } : {}) },
      ...(datos ? { body: JSON.stringify(datos) } : {})
    });
  } catch (e) { throw new Error("Sin conexión. Revisá internet y probá de nuevo."); }
  if (r.status === 404) throw new Error("El editor funciona cuando la página está publicada en Vercel.");
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && permiso) { salir(); throw new Error(d.error || "Tu sesión venció."); }
  if (!r.ok) throw new Error(d.error || "Algo salió mal.");
  return d;
}

// ---------- Login ----------
$("#formLogin").addEventListener("submit", async e => {
  e.preventDefault();
  $("#errorLogin").textContent = "";
  try {
    const d = await api("POST", { accion: "entrar", clave: $("#clave").value });
    permiso = d.permiso; sessionStorage.setItem("pu-permiso", permiso);
    $("#clave").value = "";
    await cargar();
  } catch (err) { $("#errorLogin").textContent = err.message; }
});
function salir() {
  permiso = ""; sessionStorage.removeItem("pu-permiso");
  $("#pantallaEditor").hidden = true; $("#pantallaLogin").hidden = false;
}
$("#salir").addEventListener("click", () => { if (!hayCambios() || confirm("Tenés cambios sin guardar. ¿Salir igual?")) salir(); });

async function cargar() {
  const d = await api("GET");
  guardado = d.ajustes && d.ajustes.productos ? d.ajustes : { productos: {} };
  ajustes = structuredClone(guardado);
  paresGuardado = (d.ajustes && d.ajustes.pares) || {};
  pares = { ...paresGuardado };
  pedidos = d.pedidos || [];
  suscriptores = d.suscriptores || [];
  cfgServidor = d.config || {};
  $("#pantallaLogin").hidden = true; $("#pantallaEditor").hidden = false;
  pintarStock(); pintarPedidos(); pintarSuscriptores(); pintarEstado(d.config || {});
  if (!d.config.baseDeDatos) mostrarTab("estado");
}

// ---------- Pestañas ----------
function mostrarTab(t) {
  document.querySelectorAll(".tab").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === t));
  ["stock", "pedidos", "suscriptores", "estado"].forEach(x => { $("#tab-" + x).hidden = x !== t; });
  $("#barraGuardar").hidden = t !== "stock" || !hayCambios();
}
document.querySelector(".tabs").addEventListener("click", e => { const b = e.target.closest(".tab"); if (b) mostrarTab(b.dataset.tab); });

// ---------- Stock y precios ----------
const aj = id => (ajustes.productos[id] = ajustes.productos[id] || {});
const ajColor = (id, cid) => { const a = aj(id); a.colores = a.colores || {}; return (a.colores[cid] = a.colores[cid] || {}); };
const clavePar = (id, cid, t) => `${id}|${cid}|${t}`;
// Talles cuyo número de unidades cambió (null = se borró el número y deja de llevar la cuenta)
function paresCambiados(id) {
  const out = {};
  for (const k of new Set([...Object.keys(pares), ...Object.keys(paresGuardado)])) {
    if (id != null && !k.startsWith(id + "|")) continue;
    const a = pares[k] ?? null, b = paresGuardado[k] ?? null;
    if (a !== b) out[k] = a;
  }
  return out;
}
const hayCambios = () => JSON.stringify(limpio(ajustes)) !== JSON.stringify(limpio(guardado)) || Object.keys(paresCambiados()).length > 0;
const cambiado = id => JSON.stringify(limpio({ productos: { [id]: ajustes.productos[id] } })) !== JSON.stringify(limpio({ productos: { [id]: guardado.productos[id] } }))
  || Object.keys(paresCambiados(id)).length > 0;

// Saca lo vacío para poder comparar
function limpio(a) {
  const out = {};
  for (const [id, p] of Object.entries((a && a.productos) || {})) {
    if (!p) continue;
    const talles = ((PRODUCTOS.find(x => String(x.id) === String(id)) || {}).talles || []).map(String);
    const r = {};
    if (p.precio > 0) r.precio = Math.round(p.precio);
    if (p.agotado) r.agotado = true;
    const cols = {};
    for (const [cid, c] of Object.entries(p.colores || {})) {
      const rc = {};
      if (c.precio > 0) rc.precio = Math.round(c.precio);
      if (c.agotado) rc.agotado = true;
      if (c.sinTalle && c.sinTalle.length) rc.sinTalle = [...new Set(c.sinTalle.map(String))].sort((x, y) => talles.indexOf(x) - talles.indexOf(y));
      if (Object.keys(rc).length) cols[cid] = rc;
    }
    if (Object.keys(cols).length) r.colores = cols;
    if (Object.keys(r).length) out[id] = r;
  }
  return { productos: out };
}

function ficha(p) {
  const a = ajustes.productos[p.id] || {};
  const precio = a.precio > 0 ? a.precio : p.precio;
  return `<article class="ficha${a.agotado ? " off" : ""}${cambiado(p.id) ? " cambiada" : ""}" data-id="${p.id}">
    <div class="ficha-h"><img src="${esc(fotoDe(p))}" alt=""><div><b>${esc(p.nombre)}</b><small>${esc((CATALOGO.lineas || {})[p.cat] || p.cat)}</small></div></div>
    <label class="fila-precio"><span style="font-weight:600">Precio $</span>
      <input class="in" inputmode="numeric" data-precio value="${precio > 0 ? precio : ""}" placeholder="Consultar" aria-label="Precio de ${esc(p.nombre)}"></label>
    <label class="interruptor">Modelo agotado <input type="checkbox" class="sw" data-agotado${a.agotado ? " checked" : ""}></label>
    ${(p.colores || []).map(c => { const ac = (a.colores || {})[c.id] || {}; const sin = (ac.sinTalle || []).map(String);
      const precioColor = ac.precio > 0 ? ac.precio : c.precio > 0 ? c.precio : ""; return `
      <div class="color-box${ac.agotado ? " off" : ""}" data-cid="${esc(c.id)}">
        <label class="interruptor"><span class="color-nom"><i style="--sw:${esc(c.hex)}"></i>${esc(c.nombre)}</span>
          <span style="display:flex;align-items:center;gap:8px;font-weight:500;font-size:14px">Color agotado <input type="checkbox" class="sw" data-color-agotado${ac.agotado ? " checked" : ""}></span></label>
        <label class="fila-precio" style="font-size:14px"><span>Precio de este color $</span>
          <input class="in" inputmode="numeric" data-precio-color value="${precioColor}" placeholder="igual al modelo" aria-label="Precio de ${esc(p.nombre)} en ${esc(c.nombre)}" style="padding:8px 10px"></label>
        <div class="chips">${p.talles.map(String).map(t => { const n = pares[clavePar(p.id, c.id, t)]; const hay = !sin.includes(t) && !(n != null && n <= 0);
          return `<div class="talle-box"><button class="chip" data-talle="${esc(t)}" aria-pressed="${hay}" aria-label="Talle ${t} ${hay ? "disponible" : "agotado"}">${t}</button>
            <input class="pares" inputmode="numeric" data-pares="${esc(t)}" value="${n != null ? n : ""}" placeholder="–" aria-label="Unidades del talle ${t} en ${esc(c.nombre)}"></div>`; }).join("")}</div>
      </div>`; }).join("")}
  </article>`;
}
function pintarStock() {
  const q = $("#buscar").value.trim().toLowerCase();
  $("#listaProd").innerHTML = PRODUCTOS.filter(p => !q || p.nombre.toLowerCase().includes(q) || p.cat.includes(q)).map(ficha).join("")
    || `<p class="ayuda">No hay productos con “${esc(q)}”.</p>`;
  actualizarBarra();
}
function repintarFicha(id) {
  const vieja = document.querySelector(`.ficha[data-id="${id}"]`);
  const t = document.createElement("div"); t.innerHTML = ficha(PRODUCTOS.find(p => p.id === id));
  vieja.replaceWith(t.firstElementChild);
  actualizarBarra();
}
function actualizarBarra() {
  const n = PRODUCTOS.filter(p => cambiado(p.id)).length;
  $("#barraGuardar").hidden = !n || $("#tab-stock").hidden;
  $("#txtCambios").textContent = n === 1 ? "1 producto con cambios" : `${n} productos con cambios`;
}
$("#buscar").addEventListener("input", pintarStock);

$("#listaProd").addEventListener("click", e => {
  const chip = e.target.closest(".chip"); if (!chip) return;
  const id = +chip.closest(".ficha").dataset.id, cid = chip.closest(".color-box").dataset.cid, t = chip.dataset.talle;
  // Si ese talle lleva la cuenta de unidades, manda el número: se cambia en el cuadradito
  if (pares[clavePar(id, cid, t)] != null) { chip.nextElementSibling.focus(); chip.nextElementSibling.select(); return; }
  const c = ajColor(id, cid);
  const sin = new Set((c.sinTalle || []).map(String));
  sin.has(t) ? sin.delete(t) : sin.add(t);
  c.sinTalle = [...sin];
  repintarFicha(id);
});
// Unidades por talle: se actualiza mientras escribe, sin redibujar (para poder pasar de un cuadradito al otro)
$("#listaProd").addEventListener("input", e => {
  const inp = e.target.closest("[data-pares]"); if (!inp) return;
  const f = inp.closest(".ficha"), id = +f.dataset.id, cid = inp.closest(".color-box").dataset.cid, t = inp.dataset.pares;
  const v = inp.value.replace(/\D/g, "").slice(0, 4);
  if (inp.value !== v) inp.value = v;
  const k = clavePar(id, cid, t);
  if (v === "") delete pares[k]; else pares[k] = parseInt(v, 10);
  const sin = ((((ajustes.productos[id] || {}).colores || {})[cid] || {}).sinTalle || []).map(String);
  const hay = !sin.includes(t) && !(pares[k] != null && pares[k] <= 0);
  const chip = inp.previousElementSibling;
  chip.setAttribute("aria-pressed", hay); chip.setAttribute("aria-label", `Talle ${t} ${hay ? "disponible" : "agotado"}`);
  f.classList.toggle("cambiada", cambiado(id));
  actualizarBarra();
});
$("#listaProd").addEventListener("change", e => {
  if (e.target.matches("[data-pares]")) return;
  const f = e.target.closest(".ficha"); if (!f) return;
  const id = +f.dataset.id;
  if (e.target.matches("[data-agotado]")) aj(id).agotado = e.target.checked;
  else if (e.target.matches("[data-color-agotado]")) ajColor(id, e.target.closest(".color-box").dataset.cid).agotado = e.target.checked;
  else if (e.target.matches("[data-precio]")) {
    const v = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
    const base = PRODUCTOS.find(p => p.id === id).precio;
    aj(id).precio = v > 0 && v !== base ? v : undefined;
  } else if (e.target.matches("[data-precio-color]")) {
    const cid = e.target.closest(".color-box").dataset.cid;
    const v = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
    const base = (PRODUCTOS.find(p => p.id === id).colores.find(c => c.id === cid) || {}).precio;
    ajColor(id, cid).precio = v > 0 && v !== base ? v : undefined;
  } else return;
  repintarFicha(id);
});

$("#descartar").addEventListener("click", () => { ajustes = structuredClone(guardado); pares = { ...paresGuardado }; pintarStock(); });
$("#guardar").addEventListener("click", async () => {
  const b = $("#guardar"); b.disabled = true; b.textContent = "Guardando…";
  try {
    const d = await api("POST", { accion: "guardar", ajustes: limpio(ajustes), pares: paresCambiados() });
    guardado = d.ajustes; ajustes = structuredClone(guardado);
    paresGuardado = d.pares || {}; pares = { ...paresGuardado };
    pintarStock();
    avisar("✓ Guardado. La tienda ya muestra los cambios.");
  } catch (err) { alert(err.message); }
  b.disabled = false; b.textContent = "Guardar";
});
window.addEventListener("beforeunload", e => { if (hayCambios()) { e.preventDefault(); e.returnValue = ""; } });

function avisar(texto) {
  const d = document.createElement("div");
  d.textContent = texto;
  d.setAttribute("role", "status");
  d.style.cssText = "position:fixed;left:50%;top:76px;transform:translateX(-50%);background:var(--ok);color:#fff;padding:10px 16px;border-radius:99px;font-weight:700;z-index:50;box-shadow:0 6px 18px rgba(0,0,0,.2)";
  document.body.appendChild(d); setTimeout(() => d.remove(), 2600);
}

// ---------- Pedidos ----------
const ESTADOS = { "esperando-transferencia": "Esperando transferencia", "pagado": "Pagado · preparar", "envio-creado": "Envío creado", "despachado": "Despachado", "listo-para-retirar": "Listo para retirar", "entregado": "Entregado", "cancelado": "Cancelado" };
const telWa = t => { let d = String(t || "").replace(/\D/g, ""); if (d.startsWith("549")) return d; if (d.startsWith("54")) d = d.slice(2); if (d.startsWith("0")) d = d.slice(1); d = d.replace(/^(\d{2,4})15/, "$1"); return "549" + d; };

// Resumen de envíos por mes: cuánto se les cobró a los clientes y cuánto cobra Zipnova (para cargar saldo de una vez)
function pintarResumenEnvios() {
  const cuentan = pedidos.filter(p => p.entrega && p.entrega.tipo && p.entrega.tipo !== "local" && !["cancelado", "esperando-transferencia"].includes(p.estado));
  const hoy = new Date();
  const meses = [0, 1].map(atras => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - atras, 1);
    const lista = cuentan.filter(p => { const f = new Date(p.fecha); return f.getFullYear() === d.getFullYear() && f.getMonth() === d.getMonth(); });
    const cobrado = lista.reduce((a, p) => a + (Number(p.entrega.precio) || 0), 0);
    const costo = lista.reduce((a, p) => a + (Number(p.entrega.costo ?? p.entrega.precio) || 0), 0);
    const gratis = lista.filter(p => !(Number(p.entrega.precio) > 0)).length;
    return { nombre: d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }), n: lista.length, cobrado, costo, gratis };
  });
  $("#resumenEnvios").innerHTML = `<div class="resumen-envios"><h3>🚚 Plata de envíos (para cargar en Zipnova)</h3>
    <div class="meses">${meses.map((m, i) => `<div class="mes"><span>${i ? "Mes pasado" : "Este mes"} · ${esc(m.nombre.charAt(0).toUpperCase() + m.nombre.slice(1))}</span>
      ${m.n ? `<span>Cobraste a clientes: <b class="grande">${pesos(m.cobrado)}</b></span>
      <span>Costo aproximado en Zipnova: <b>${pesos(m.costo)}</b> (${m.n} ${m.n === 1 ? "envío" : "envíos"}${m.gratis ? `, ${m.gratis} con envío gratis que pagás vos` : ""})</span>` : `<span>Sin envíos por correo.</span>`}</div>`).join("")}</div>
    <p class="ayuda">Lo cobrado por envío entra a Mercado Pago junto con la venta. Cargá en Zipnova el costo aproximado de una vez. Los pedidos cancelados o esperando transferencia no cuentan.</p></div>`;
}

function pintarPedidos() {
  pintarResumenEnvios();
  if (!pedidos.length) { $("#listaPedidos").innerHTML = `<p class="ayuda">Todavía no hay ventas online. Cuando alguien pague, el pedido aparece acá (y te llega por email).</p>`; return; }
  $("#listaPedidos").innerHTML = pedidos.map(p => {
    const e = p.entrega || {}, c = p.cliente || {};
    const entrega = e.tipo === "local" ? "Retira en persona" : e.tipo === "sucursal" ? `${esc(e.opcion)} · ${esc(e.sucursal)}` : `${esc(e.opcion)} · ${esc(e.calle)} ${esc(e.numero)}${e.piso ? " " + esc(e.piso) : ""}, ${esc(e.localidad)}, ${esc(e.provincia)} (CP ${esc(e.cp)})`;
    const msj = p.estado === "esperando-transferencia"
      ? `¡Hola ${String(c.nombre || "").split(" ")[0]}! Te escribimos de POWER UP por tu pedido ${p.numero}: ¿pudiste hacer la transferencia de ${pesos(p.total)}? Cuando puedas, mandanos el comprobante. ¡Gracias!`
      : e.tipo === "local"
      ? `¡Hola ${String(c.nombre || "").split(" ")[0]}! Tu pedido ${p.numero} de POWER UP ya está listo para retirar${(CATALOGO.local || {}).direccion ? " en " + CATALOGO.local.direccion : ""}.`
      : `¡Hola ${String(c.nombre || "").split(" ")[0]}! Tu pedido ${p.numero} de POWER UP ya fue despachado${e.opcion ? " por " + String(e.opcion).split(" · ")[0] : ""}.${p.envio && p.envio.seguimiento ? " Seguimiento: " + p.envio.seguimiento : ""}`;
    return `<article class="pedido">
      <div class="pedido-h"><b>${esc(p.numero)} · ${pesos(p.total)}</b><span class="estado-pill ${esc(p.estado)}">${esc(ESTADOS[p.estado] || p.estado)}</span></div>
      <small style="color:var(--tinta-2)">${new Date(p.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })} · ${esc(c.nombre)} · ${esc(c.telefono)}${c.dni ? " · DNI " + esc(c.dni) : ""}</small>
      <ul>${(p.detalle || []).map(d => `<li>${esc(d)}</li>`).join("")}</ul>
      ${p.metodo === "transferencia" ? `<div>💸 <b>Pago por transferencia</b>${p.estado === "esperando-transferencia" ? " · cuando veas la plata en tu cuenta, pasalo a <b>Pagado</b> (se crea el envío). Si no paga, pasalo a <b>Cancelado</b> y las unidades vuelven al stock." : ""}</div>` : ""}
      <div><b>Entrega:</b> ${entrega}</div>
      ${p.envio ? `<div>✅ Envío creado en Zipnova${p.envio.seguimiento ? ` · seguimiento <b>${esc(p.envio.seguimiento)}</b>` : ""}. Imprimí la etiqueta desde el panel de Zipnova.</div>` : ""}
      ${p.envioError ? `<div class="aviso-error">⚠️ ${esc(p.envioError)}</div>` : ""}
      <div class="acc">
        <select class="in" data-estado="${esc(p.numero)}" aria-label="Estado del pedido">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}"${k === p.estado ? " selected" : ""}>${v}</option>`).join("")}</select>
        <a class="btn btn-wa" href="https://wa.me/${telWa(c.telefono)}?text=${encodeURIComponent(msj)}" target="_blank" rel="noopener">Avisar al cliente</a>
      </div>
    </article>`;
  }).join("");
}
$("#listaPedidos").addEventListener("change", async e => {
  const s = e.target.closest("[data-estado]"); if (!s) return;
  try {
    const d = await api("POST", { accion: "estado", numero: s.dataset.estado, estado: s.value });
    const i = pedidos.findIndex(x => x.numero === s.dataset.estado);
    if (i >= 0) pedidos[i] = d.pedido || { ...pedidos[i], estado: s.value };
    pintarPedidos(); avisar("✓ Estado actualizado" + (d.aviso ? ". " + d.aviso : ""));
    // Cancelar o reactivar un pedido mueve unidades: se actualizan en la pestaña de stock (si no hay cambios sin guardar)
    if (!hayCambios()) { const n = await api("GET"); paresGuardado = (n.ajustes && n.ajustes.pares) || {}; pares = { ...paresGuardado }; pintarStock(); }
  } catch (err) { alert(err.message); }
});

// ---------- Estado de la configuración ----------
function pintarEstado(cfg) {
  const items = [
    [cfg.mercadoPago, "Mercado Pago", "Cobros online con tarjeta, débito y dinero en cuenta.", "Falta MP_ACCESS_TOKEN en Vercel: sin esto no se puede cobrar."],
    [cfg.tarjetaEnPagina, "Pago con tarjeta en la página", "El cliente carga su tarjeta sin salir de la tienda (formulario seguro de Mercado Pago).", "Falta MP_PUBLIC_KEY en Vercel: por ahora el cliente paga en la página de Mercado Pago."],
    [cfg.baseDeDatos, "Base de datos (Upstash)", "Guarda el stock, los precios y los pedidos.", "Falta conectar Upstash en Vercel: sin esto no se guardan los cambios de este editor ni los pedidos."],
    [cfg.zipnova, "Zipnova · envíos por correo", "Cotiza el envío según el código postal.", "Falta configurar Zipnova: mientras tanto el envío se cobra con los precios fijos por zona."],
    [cfg.zipnova && cfg.baseDeDatos && cfg.envioAutomatico, "Envío automático", "Cada venta pagada crea sola el envío en Zipnova.", "Desactivado: los envíos se crean a mano desde el panel de Zipnova."],
    [cfg.transferencia, `Pago por transferencia (${(CATALOGO.transferencia || {}).porcentaje || 0}% OFF)`, "El cliente ve tu alias al confirmar el pedido; lo pasás a Pagado cuando llega la plata.", "Falta cargar TRANSFERENCIA_ALIAS (o TRANSFERENCIA_CBU) y TRANSFERENCIA_TITULAR en Vercel: por ahora no aparece la opción."],
    [cfg.emails, "Avisos por email", "Te llega un email con cada venta.", "Falta RESEND_API_KEY y AVISOS_EMAIL: no vas a recibir emails de las ventas."],
    [cfg.emailsClientes, "Emails a clientes (código de regalo y novedades)", "El código de descuento le llega al mail del cliente, y podés mandar novedades a los suscriptores.", "Falta verificar tu dominio powerupstore.website en Resend y cargar RESEND_FROM en Vercel. Mientras tanto, el código de regalo se le muestra al cliente en la pantalla y no se pueden mandar novedades."]
  ];
  $("#listaEstado").innerHTML = items.map(([ok, tit, si, no]) => `<div class="check"><span class="ic">${ok ? "✅" : "⚠️"}</span><div><b>${tit}</b><p>${ok ? si : no}</p></div></div>`).join("")
    + `<div class="check"><span class="ic">✉️</span><div><b>Probar los avisos por email</b><p>Te manda un email de prueba. Si no llega, acá te dice por qué.</p>
        <button class="btn btn-borde" id="probarEmail" style="width:auto;margin-top:10px">Mandar email de prueba</button>
        <p id="resEmail" style="margin-top:8px"></p></div></div>`
    + `<p class="ayuda">Los pasos para configurar cada cosa están en el archivo CONFIGURACION.md.</p>`;
}
$("#listaEstado").addEventListener("click", async e => {
  const b = e.target.closest("#probarEmail"); if (!b) return;
  b.disabled = true; b.textContent = "Mandando…"; $("#resEmail").textContent = "";
  try {
    const d = await api("POST", { accion: "probar-email" });
    $("#resEmail").style.color = d.ok ? "var(--ok)" : "var(--error)";
    $("#resEmail").textContent = d.ok ? `✓ Enviado a ${d.para}. Si en unos minutos no lo ves, fijate en Spam y marcalo como "No es spam".` : "⚠️ " + d.error;
  } catch (err) { $("#resEmail").style.color = "var(--error)"; $("#resEmail").textContent = "⚠️ " + err.message; }
  b.disabled = false; b.textContent = "Mandar email de prueba";
});

// ---------- Suscriptores (cartel de bienvenida) ----------
function pintarSuscriptores() {
  const pct = (CATALOGO.bienvenida || {}).porcentaje || 0;
  const semana = suscriptores.filter(x => Date.now() - new Date(x.fecha) < 7 * 864e5).length;
  $("#resumenSusc").innerHTML = `<h3>💌 ${suscriptores.length} ${suscriptores.length === 1 ? "suscriptor" : "suscriptores"}${semana ? ` · ${semana} esta semana` : ""}</h3>
    <p class="ayuda">Son los clientes que dejaron su email en el cartel de bienvenida. A cada uno le llega un código único de <b>${pct}% OFF</b> para usar una sola vez.</p>
    ${cfgServidor.emailsClientes ? "" : `<p class="aviso-error">⚠️ Todavía no podés mandarles emails: falta verificar tu dominio en Resend (mirá la pestaña Estado). Mientras tanto el código se les muestra en la pantalla.</p>`}
    ${suscriptores.length ? `<button class="btn btn-borde" id="bajarCsv" style="width:auto">Descargar lista (Excel / CSV)</button>` : ""}`;
  $("#listaSusc").innerHTML = suscriptores.length
    ? `<div style="display:grid;gap:4px;font-size:14px">${suscriptores.map(x => `<div style="display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid var(--borde);padding:6px 0"><span>${esc(x.email)}</span><small style="color:var(--tinta-2)">${new Date(x.fecha).toLocaleDateString("es-AR")}</small></div>`).join("")}</div>`
    : `<p class="ayuda">Todavía nadie se suscribió. El cartel aparece a los pocos segundos de entrar a la tienda.</p>`;
}
$("#resumenSusc").addEventListener("click", e => {
  if (!e.target.closest("#bajarCsv")) return;
  const csv = "email,fecha\n" + suscriptores.map(x => `${x.email},${new Date(x.fecha).toLocaleDateString("es-AR")}`).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = "suscriptores-powerup.csv"; a.click();
});
async function mandarNovedad(prueba) {
  const datos = { accion: "novedad", prueba, asunto: $("#novAsunto").value, mensaje: $("#novMensaje").value, boton: $("#novBoton").value, link: $("#novLink").value };
  if (!datos.asunto.trim() || !datos.mensaje.trim()) { $("#novRes").textContent = "⚠️ Escribí el asunto y el mensaje."; return; }
  if (!prueba && !confirm(`¿Mandar este email a ${suscriptores.length} ${suscriptores.length === 1 ? "persona" : "personas"}?`)) return;
  const b = prueba ? $("#novPrueba") : $("#novEnviar"); b.disabled = true; $("#novRes").textContent = "Mandando…";
  try {
    const d = await api("POST", datos);
    $("#novRes").textContent = d.ok ? (prueba ? "✓ Te mandamos la prueba a tu email de avisos." : `✓ Enviado a ${d.enviados} ${d.enviados === 1 ? "persona" : "personas"}.`)
      : `⚠️ Se mandaron ${d.enviados} de ${d.total}. Resend dijo: ${d.error}`;
  } catch (err) { $("#novRes").textContent = "⚠️ " + err.message; }
  b.disabled = false;
}
$("#novPrueba").addEventListener("click", () => mandarNovedad(true));
$("#formNovedad").addEventListener("submit", e => { e.preventDefault(); mandarNovedad(false); });

// Si ya había entrado en esta pestaña, entra directo
if (permiso) cargar().catch(() => salir());
