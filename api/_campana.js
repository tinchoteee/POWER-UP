// Emails automáticos a los suscriptores (POWER UP Club) para incentivar la compra.
// Vercel lo corre una vez por día (vercel.json → crons → /api/club?campana=1). En cada vuelta, a cada suscriptor
// le toca como mucho un email, y entre un email y el siguiente pasan por lo menos "separacion" días.
// La secuencia está en productos.js → campana. Estado por suscriptor: campo "camp" { n, ultimo } en powerup:suscriptores.
const crypto = require("crypto");
const CATALOGO = require("../js/productos.js");
const db = require("./_db.js");
const cup = require("./_cupones.js");
const { esc, pesos } = require("./_procesar.js");

const SITIO = "https://powerupstore.website";
const DIA = 864e5;
const cfg = () => CATALOGO.campana || {};

// Paso número n de la secuencia: los de productos.js y después, para siempre, uno cada "repetir.cada" días
function paso(n) {
  const c = cfg(), lista = c.pasos || [];
  if (n < lista.length) return lista[n];
  const r = c.repetir; if (!r || !(r.cada > 0) || !(r.tipos || []).length) return null;
  const k = n - lista.length, base = lista.length ? lista[lista.length - 1].dia : 0;
  return { ...r, dia: base + r.cada * (k + 1), tipo: r.tipos[k % r.tipos.length] };
}

// Productos para mostrar: los más nuevos primero, rotando en cada email para no repetir siempre los mismos
function vidriera(n, cuantos = 4) {
  const lista = CATALOGO.productos.filter(p => !p.oculto && p.precio > 0).sort((a, b) => b.id - a.id);
  const desde = (n * cuantos) % lista.length;
  return [...lista, ...lista].slice(desde, desde + cuantos);
}
const fotoDe = p => ((p.colores || []).find(c => c.foto) || {}).foto || p.foto || "";
function grilla(productos) {
  const celda = p => `<td width="50%" valign="top" style="padding:6px">
    <a href="${SITIO}/#p/${p.id}" style="text-decoration:none;color:#000">
      <img src="${SITIO}/${esc(fotoDe(p))}" width="250" alt="${esc(p.nombre)}" style="display:block;width:100%;max-width:250px;height:auto;background:#f2f2f2">
      <div style="font-weight:700;font-size:13px;text-transform:uppercase;margin:8px 0 2px">${esc(p.nombre)}</div>
      <div style="font-family:Impact,'Arial Black',sans-serif;font-size:18px">${pesos(p.precio)}</div></a></td>`;
  let filas = "";
  for (let i = 0; i < productos.length; i += 2) filas += `<tr>${celda(productos[i])}${productos[i + 1] ? celda(productos[i + 1]) : "<td></td>"}</tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px">${filas}</table>`;
}
const cajaCodigo = (codigo, linea) => `<div style="border:3px dashed #000;padding:16px;text-align:center;margin:16px 0">
  <div style="font-family:'Courier New',monospace;font-size:26px;font-weight:700;letter-spacing:3px">${esc(codigo)}</div>
  ${linea ? `<div style="font-size:13px;margin-top:6px">${linea}</div>` : ""}</div>`;
const beneficios = () => {
  const t = []; const e = CATALOGO.envio || {}, d = CATALOGO.descuento || {}, tr = CATALOGO.transferencia || {};
  if (e.gratisDesde > 0) t.push(`envío gratis desde ${pesos(e.gratisDesde)}`);
  if (d.desde > 0) t.push(`${d.porcentaje}% OFF desde ${pesos(d.desde)}`);
  if (tr.porcentaje > 0) t.push(`${tr.porcentaje}% OFF pagando con transferencia`);
  return t.length ? `<p style="margin:14px 0 0;font-size:14px">Además: ${t.join(" · ")}.</p>` : "";
};

// Crea un código personal con vencimiento (para el email de descuento)
async function codigoPersonal(email, porcentaje, horas) {
  const hasta = new Date(Date.now() + horas * 36e5).toISOString();
  for (let i = 0; i < 5; i++) {
    const c = "PU" + porcentaje + "-" + Array.from(crypto.randomBytes(5), b => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
    if (await db.guardarSiNoExiste("powerup:cupon:" + c, { email, porcentaje, fecha: new Date().toISOString(), hasta, usado: null, tipo: "campana" })) return { codigo: c, hasta };
  }
  throw new Error("No se pudo crear el código");
}
const fechaCorta = iso => new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });

const ASUNTOS_VIDRIERA = ["Lo nuevo de POWER UP 🔥", "Esto se está yendo rápido ⚡", "Armá tu outfit de la semana", "Llegaron cosas nuevas a POWER UP", "Tu próximo conjunto está acá"];

// Arma el email de un paso. → { asunto, html, extra } o null si no corresponde mandarlo (ej. ya usó su código)
async function armar(s, p, n, { prueba = false, codigoUsado = false } = {}) {
  const baja = prueba ? null : cup.linkBaja(s);
  const pctBienv = cup.porcentaje();
  if (p.tipo === "recordatorio") {
    if (codigoUsado || !s.codigo) return null;
    return { asunto: `Tu ${pctBienv}% OFF te está esperando 👀`, html: cup.plantilla({
      titulo: "¿Te olvidaste<br>de tu regalo?",
      cuerpo: `<p style="margin:0">Todavía tenés tu código de <b>${pctBienv}% OFF</b> sin usar. Ponelo al finalizar la compra:</p>
        ${cajaCodigo(s.codigo)}${grilla(vidriera(n, 2))}${beneficios()}`,
      boton: "Usar mi descuento", link: SITIO + "/#tienda", baja }) };
  }
  if (p.tipo === "vidriera") {
    const conCodigo = !codigoUsado && s.codigo;
    return { asunto: ASUNTOS_VIDRIERA[n % ASUNTOS_VIDRIERA.length], html: cup.plantilla({
      titulo: "Lo más nuevo<br>de la tienda",
      cuerpo: `<p style="margin:0 0 6px">Conjuntos, remeras y shorts en blanco y negro, con envío a todo el país.</p>
        ${grilla(vidriera(n, 4))}
        ${conCodigo ? `<p style="margin:14px 0 0">Acordate: con tu código <b>${esc(s.codigo)}</b> tenés <b>${pctBienv}% OFF</b>.</p>` : ""}${beneficios()}`,
      boton: "Ver toda la tienda", link: SITIO + "/#tienda", baja }) };
  }
  if (p.tipo === "codigo") {
    const pct = Number(p.porcentaje) || 10, horas = Number(p.horas) || 72;
    const { codigo, hasta } = prueba ? { codigo: "PU" + pct + "-EJEMPLO", hasta: new Date(Date.now() + horas * 36e5).toISOString() } : await codigoPersonal(s.email, pct, horas);
    return { asunto: `Solo para vos: ${pct}% OFF por ${horas} horas ⏳`, extra: { codigo }, html: cup.plantilla({
      titulo: `${pct}% OFF<br>solo por ${horas} horas`,
      cuerpo: `<p style="margin:0">Te armamos un código personal para que te lleves lo que te gusta:</p>
        ${cajaCodigo(codigo, `Vence el ${esc(fechaCorta(hasta))}`)}
        ${grilla(vidriera(n + 1, 2))}
        <p style="margin:14px 0 0;font-size:14px">Es de un solo uso y se suma a los descuentos por monto y por transferencia (un código por compra).</p>`,
      boton: "Comprar con mi descuento", link: SITIO + "/#tienda", baja }) };
  }
  return null;
}

// Vuelta diaria. → { enviados, saltados, pendientes, error }
async function correr({ maximo } = {}) {
  const c = cfg();
  if (!c.activa) return { enviados: 0, motivo: "campaña apagada (productos.js → campana.activa)" };
  if (!db.hayDB()) return { enviados: 0, motivo: "sin base de datos" };
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) return { enviados: 0, motivo: "falta RESEND_FROM (dominio verificado en Resend)" };
  const tope = maximo || Number(c.maximoPorDia) || 80;
  const sep = Number(c.separacion) || 3;
  const ahora = Date.now();
  // Quien compró en los últimos días no recibe nada ese día (no hace falta insistirle)
  const pedidos = await db.listarPedidos();
  const compro = new Set(pedidos.filter(p => ahora - new Date(p.fecha) < sep * DIA && p.cliente && p.cliente.email)
    .map(p => String(p.cliente.email).toLowerCase()));
  const subs = await cup.listarSuscriptores();
  const mensajes = [], cambios = [];
  let saltados = 0, pendientes = 0;
  for (const s of subs.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))) {
    const st = s.camp || { n: 0, ultimo: null };
    if (st.ultimo && ahora - new Date(st.ultimo) < sep * DIA) continue;
    if (compro.has(s.email)) { saltados++; continue; }
    const dias = (ahora - new Date(s.fecha)) / DIA;
    let n = st.n, armado = null;
    const usado = s.codigo ? Boolean((await db.leer("powerup:cupon:" + s.codigo) || {}).usado) : true;
    // Avanza saltando los pasos que no corresponden (ej. recordar un código que ya usó)
    for (let i = 0; i < 6; i++) {
      const p = paso(n); if (!p || dias < p.dia) break;
      if (mensajes.length >= tope) { pendientes++; break; }
      armado = await armar(s, p, n, { codigoUsado: usado });
      n++;
      if (armado) break;
    }
    if (n !== st.n) cambios.push({ s, camp: { n, ultimo: armado ? new Date().toISOString() : st.ultimo } });
    if (armado) mensajes.push({ s, ...armado });
  }
  // Envío en tandas de 100 (límite de Resend por pedido)
  let enviados = 0, error = null;
  const ok = new Set();
  for (let i = 0; i < mensajes.length; i += 100) {
    const tanda = mensajes.slice(i, i + 100);
    const r = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(tanda.map(m => ({ from: process.env.RESEND_FROM, to: [m.s.email], subject: m.asunto, html: m.html,
        ...(process.env.AVISOS_EMAIL ? { reply_to: process.env.AVISOS_EMAIL } : {}),
        headers: { "List-Unsubscribe": `<${cup.linkBaja(m.s)}>` } }))),
      signal: AbortSignal.timeout(25000)
    }).catch(e => ({ ok: false, status: 0, json: async () => ({ message: e.message }) }));
    if (!r.ok) { const d = await r.json().catch(() => ({})); error = d.message || `Resend respondió ${r.status}`; break; }
    tanda.forEach(m => ok.add(m.s.email)); enviados += tanda.length;
  }
  // Guarda el avance (si un email no salió, ese suscriptor vuelve a intentarlo mañana)
  for (const { s, camp } of cambios) {
    if (mensajes.some(m => m.s.email === s.email) && !ok.has(s.email)) continue;
    const actual = await db.comando("HGET", "powerup:suscriptores", s.email);
    if (!actual) continue;   // se dio de baja mientras tanto
    try { await db.comando("HSET", "powerup:suscriptores", s.email, JSON.stringify({ ...JSON.parse(actual), camp })); } catch (e) {}
  }
  console.log("Campaña de emails", { enviados, saltados, pendientes, error });
  return { enviados, saltados, pendientes, error };
}

// Un ejemplo de cada tipo de email a AVISOS_EMAIL (botón del editor)
async function prueba() {
  const s = { email: process.env.AVISOS_EMAIL, codigo: "POWER-EJEMPLO", token: "prueba" };
  const tipos = [{ tipo: "recordatorio" }, { tipo: "vidriera" }, { tipo: "codigo", ...(((cfg().pasos || []).find(p => p.tipo === "codigo")) || {}) }];
  let enviados = 0, error = null;
  for (let i = 0; i < tipos.length; i++) {
    const m = await armar(s, tipos[i], i, { prueba: true });
    const r = await cup.enviar({ para: s.email, asunto: "[Prueba] " + m.asunto, html: m.html });
    if (r.ok) enviados++; else error = r.error;
  }
  return { enviados, error };
}

module.exports = { correr, prueba, paso };
