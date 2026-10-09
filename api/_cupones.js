// Suscriptores (cartel de bienvenida) y códigos de descuento de un solo uso.
//   powerup:suscriptores        hash email → { fecha, codigo, token }   (token = para darse de baja)
//   powerup:cupon:CODIGO        { email, porcentaje, fecha, usado: null | número de pedido }
// El porcentaje sale de productos.js → bienvenida.
const crypto = require("crypto");
const CATALOGO = require("../js/productos.js");
const db = require("./_db.js");
const { esc } = require("./_procesar.js");

const SUSC = "powerup:suscriptores";
const porcentaje = () => Number((CATALOGO.bienvenida || {}).porcentaje) || 0;
const normalCodigo = c => String(c || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
const normalEmail = e => String(e || "").trim().toLowerCase().slice(0, 120);
const emailValido = e => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(e);
// Sin letras que se confunden (0/O, 1/I)
const nuevoCodigo = () => "POWER-" + Array.from(crypto.randomBytes(6), b => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");

async function leerSuscriptor(email) {
  const v = await db.comando("HGET", SUSC, email);
  try { return v ? JSON.parse(v) : null; } catch (e) { return null; }
}

// Suscribe un email y le crea su código (si ya estaba, devuelve el mismo). → { suscriptor, nuevo }
async function suscribir(email, origen) {
  const antes = await leerSuscriptor(email);
  if (antes) return { suscriptor: antes, nuevo: false };
  let codigo;
  for (let i = 0; i < 5 && !codigo; i++) {
    const c = nuevoCodigo();
    if (await db.guardarSiNoExiste("powerup:cupon:" + c, { email, porcentaje: porcentaje(), fecha: new Date().toISOString(), usado: null })) codigo = c;
  }
  if (!codigo) throw new Error("No pudimos generar tu código. Probá de nuevo.");
  const suscriptor = { email, fecha: new Date().toISOString(), codigo, token: crypto.randomBytes(12).toString("hex"), origen: String(origen || "").slice(0, 20) };
  // HSETNX: si dos pedidos llegan juntos con el mismo email, queda uno solo
  if (!(await db.comando("HSETNX", SUSC, email, JSON.stringify(suscriptor)))) return { suscriptor: await leerSuscriptor(email), nuevo: false };
  return { suscriptor, nuevo: true };
}

async function listarSuscriptores() {
  if (!db.hayDB()) return [];
  const plano = await db.comando("HGETALL", SUSC) || [];
  const out = [];
  const valores = Array.isArray(plano) ? plano.filter((x, i) => i % 2) : Object.values(plano);
  for (const v of valores) { try { out.push(JSON.parse(v)); } catch (e) {} }
  return out.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

async function darDeBaja(email, token) {
  const s = await leerSuscriptor(normalEmail(email));
  if (!s || !token || s.token !== String(token)) return false;
  await db.comando("HDEL", SUSC, s.email);
  return true;
}

// ¿El código sirve? → { codigo, porcentaje }. Si no, tira un error con el motivo para el cliente.
async function validarCupon(codigo) {
  const c = normalCodigo(codigo);
  if (!c) return null;
  const err = msj => Object.assign(new Error(msj), { cupon: true });
  if (!db.hayDB()) throw err("Los códigos de descuento no están disponibles en este momento.");
  const d = await db.leer("powerup:cupon:" + c);
  if (!d) throw err("Ese código no existe. Revisá que esté bien escrito.");
  if (d.usado) throw err("Ese código ya se usó en otra compra.");
  return { codigo: c, porcentaje: Number(d.porcentaje) || porcentaje() };
}
// Marca el código como usado por ese pedido (o lo libera si el pedido se cancela)
async function usarCupon(codigo, pedido) {
  const c = normalCodigo(codigo); if (!c || !db.hayDB()) return;
  const d = await db.leer("powerup:cupon:" + c); if (!d) return;
  await db.guardar("powerup:cupon:" + c, { ...d, usado: pedido });
}
async function liberarCupon(codigo, pedido) {
  const c = normalCodigo(codigo); if (!c || !db.hayDB()) return;
  const d = await db.leer("powerup:cupon:" + c);
  if (d && d.usado === pedido) await db.guardar("powerup:cupon:" + c, { ...d, usado: null });
}

// ---------- Emails ----------
const SITIO = "https://powerupstore.website";
const linkBaja = (s, base) => `${base || SITIO}/api/club?baja=1&e=${encodeURIComponent(s.email)}&t=${s.token}`;

// Plantilla en blanco y negro para los emails a clientes
function plantilla({ titulo, cuerpo, boton, link, baja }) {
  return `<!doctype html><html><body style="margin:0;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;color:#000">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;padding:24px 0"><tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff">
    <tr><td style="background:#000;color:#fff;padding:22px 28px;font-family:Impact,'Arial Black',sans-serif;font-size:30px;letter-spacing:1px">POWER UP</td></tr>
    <tr><td style="padding:30px 28px 8px"><h1 style="margin:0 0 14px;font-family:Impact,'Arial Black',sans-serif;font-weight:400;font-size:34px;line-height:1.05;text-transform:uppercase">${titulo}</h1>
      <div style="font-size:16px;line-height:1.55">${cuerpo}</div></td></tr>
    ${boton ? `<tr><td style="padding:18px 28px 30px"><a href="${esc(link || SITIO)}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-size:14px;padding:15px 26px">${esc(boton)}</a></td></tr>` : ""}
    <tr><td style="padding:18px 28px;border-top:1px solid #e5e5e5;font-size:12px;color:#777;line-height:1.5">
      POWER UP Store · <a href="https://www.instagram.com/powerup.store1/" style="color:#777">@powerup.store1</a> · <a href="${SITIO}" style="color:#777">powerupstore.website</a>
      ${baja ? `<br>¿No querés recibir más novedades? <a href="${esc(baja)}" style="color:#777">Darte de baja</a>.` : ""}</td></tr>
  </table></td></tr></table></body></html>`;
}

function emailBienvenida(s) {
  const pct = porcentaje();
  return {
    asunto: `Tu regalo: ${pct}% OFF en POWER UP 🎁`,
    html: plantilla({
      titulo: `Bienvenido al club.<br>Tu ${pct}% OFF ya está acá.`,
      cuerpo: `<p style="margin:0 0 16px">Gracias por sumarte a POWER UP. Este es tu código de regalo para tu primera compra:</p>
        <div style="border:3px dashed #000;padding:18px;text-align:center;font-family:'Courier New',monospace;font-size:28px;font-weight:700;letter-spacing:3px">${esc(s.codigo)}</div>
        <p style="margin:16px 0 0">Ponelo al finalizar la compra, en <b>“¿Tenés un código de descuento?”</b>, y tenés <b>${pct}% OFF</b> en los productos. Se puede usar una sola vez y no es acumulable con otros descuentos.</p>
        <p style="margin:12px 0 0">Además, vas a ser el primero en enterarte de los drops nuevos.</p>`,
      boton: "Ir a la tienda", link: SITIO, baja: linkBaja(s)
    })
  };
}

// Manda un email (sin reintentos). Devuelve { ok, error }
async function enviar({ para, asunto, html, baja, clave }) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) return { ok: false, error: "sin-remitente" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", ...(clave ? { "Idempotency-Key": clave } : {}) },
      body: JSON.stringify({ from: process.env.RESEND_FROM, to: [para], subject: asunto, html,
        ...(process.env.AVISOS_EMAIL ? { reply_to: process.env.AVISOS_EMAIL } : {}),
        ...(baja ? { headers: { "List-Unsubscribe": `<${baja}>` } } : {}) }),
      signal: AbortSignal.timeout(10000)
    });
    if (r.ok) return { ok: true };
    const d = await r.json().catch(() => ({}));
    console.error("No se pudo mandar el email", para, r.status, d.message);
    return { ok: false, error: d.message || String(r.status) };
  } catch (e) { return { ok: false, error: e.message }; }
}

// Novedad para todos los suscriptores, de a 100 por pedido a Resend (su límite por envío)
async function mandarNovedad({ asunto, mensaje, boton, link }, suscriptores) {
  const cuerpo = esc(mensaje).split(/\n{2,}/).map(p => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`).join("");
  let enviados = 0, error = null;
  for (let i = 0; i < suscriptores.length; i += 100) {
    const tanda = suscriptores.slice(i, i + 100).map(s => ({
      from: process.env.RESEND_FROM, to: [s.email], subject: asunto,
      ...(process.env.AVISOS_EMAIL ? { reply_to: process.env.AVISOS_EMAIL } : {}),
      headers: { "List-Unsubscribe": `<${linkBaja(s)}>` },
      html: plantilla({ titulo: esc(asunto), cuerpo, boton: boton || "Ver en la tienda", link: link || SITIO, baja: linkBaja(s) })
    }));
    const r = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(tanda), signal: AbortSignal.timeout(20000)
    }).catch(e => ({ ok: false, status: 0, json: async () => ({ message: e.message }) }));
    if (!r.ok) { const d = await r.json().catch(() => ({})); error = d.message || `Resend respondió ${r.status}`; break; }
    enviados += tanda.length;
  }
  return { enviados, error };
}

module.exports = { porcentaje, normalEmail, emailValido, normalCodigo, suscribir, listarSuscriptores, darDeBaja,
  validarCupon, usarCupon, liberarCupon, emailBienvenida, enviar, mandarNovedad, plantilla, linkBaja };
