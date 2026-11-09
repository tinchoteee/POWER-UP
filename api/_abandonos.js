// Rescate de carritos: cuando un cliente completa sus datos en el checkout y no termina de pagar,
// al rato le llega al local (AVISOS_EMAIL) un email con un link de WhatsApp y el mensaje ya escrito.
//   powerup:abandonos   hash teléfono → { fecha, actualizado, nombre, telefono, email, paso, envio, detalle, total, avisado }
// Lo anota /api/club (accion "abandono"), lo borra la compra (_procesar.js, transferencia.js) y lo avisa /api/salud?avisar=1.
const db = require("./_db.js");
const { lineasDelPedido } = require("./_envios.js");
const { productosActuales } = require("./_catalogo.js");

const CLAVE = "powerup:abandonos";
const ESPERA = 45 * 60 * 1000;          // se avisa si no compró en 45 minutos
const VENCE = 3 * 24 * 3600 * 1000;     // pasados 3 días ya no se avisa (y se borra)
const texto = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
const soloNumeros = t => String(t || "").replace(/\D/g, "");

async function anotar(body) {
  if (!db.hayDB()) return;
  const telefono = soloNumeros(body.telefono).slice(0, 15);
  if (telefono.length < 8) return;
  const lineas = lineasDelPedido(body.items, await productosActuales(), { exigirPrecio: false, exigirTalle: false });
  const antes = await db.comando("HGET", CLAVE, telefono).then(v => v && JSON.parse(v)).catch(() => null);
  const ahora = new Date().toISOString();
  const dato = {
    fecha: antes && !antes.avisado ? antes.fecha : ahora, actualizado: ahora,
    nombre: texto(body.nombre, 80), telefono, email: texto(body.email, 120),
    paso: Number(body.paso) || 2, envio: Number(body.envio) > 0 ? Number(body.envio) : null,
    // lineasDelPedido respeta el orden del carrito: la línea i es el ítem i
    detalle: lineas.map((l, i) => `${l.cant} x ${l.producto.nombre}${l.color ? " " + l.color.nombre : ""}${body.items[i] && body.items[i].talle ? " talle " + texto(body.items[i].talle, 6) : ""}`),
    total: lineas.reduce((a, l) => a + l.precio * l.cant, 0),
    avisado: false
  };
  if (!antes && Number(await db.comando("HLEN", CLAVE)) > 500) return;   // tope, por las dudas
  await db.comando("HSET", CLAVE, telefono, JSON.stringify(dato));
}

// La compra se concretó: no hay que rescatar nada
async function borrar(cliente) {
  const telefono = soloNumeros(cliente && cliente.telefono).slice(0, 15);
  if (!telefono || !db.hayDB()) return;
  try { await db.comando("HDEL", CLAVE, telefono); } catch (e) { console.error("No se pudo borrar el carrito abandonado", e.message); }
}

// Número para wa.me (Argentina: 549 + código de área + número, sin el 0 ni el 15)
function whatsapp(tel) {
  let d = soloNumeros(tel);
  if (d.startsWith("549")) return d.length === 13 ? d : null;
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 12) { const i = d.indexOf("15", 2); if (i >= 2 && i <= 4) d = d.slice(0, i) + d.slice(i + 2); }
  return d.length === 10 ? "549" + d : null;
}

function mensaje(a) {
  const nombre = a.nombre.split(/\s+/)[0] || "";
  const que = a.detalle.length === 1 ? a.detalle[0].replace(/^1 x /, "") : "tus productos";
  return `¡Hola ${nombre}! Te escribo de POWER UP 👋 Vi que te quedó ${que} en el carrito. ¿Te ayudo a terminar la compra? Si querés, también podés retirarlo gratis en Ramos Mejía.`;
}

// Los que dejaron el carrito hace más de 45 minutos y todavía no se avisaron (y limpia los viejos)
async function pendientes() {
  if (!db.hayDB()) return [];
  const plano = await db.comando("HGETALL", CLAVE) || [];
  const valores = Array.isArray(plano) ? plano.filter((x, i) => i % 2) : Object.values(plano);
  const ahora = Date.now(), out = [];
  for (const v of valores) {
    let a; try { a = JSON.parse(v); } catch (e) { continue; }
    const edad = ahora - new Date(a.actualizado).getTime();
    if (edad > VENCE) { await db.comando("HDEL", CLAVE, a.telefono); continue; }
    if (!a.avisado && edad > ESPERA) out.push(a);
  }
  return out;
}
async function marcarAvisados(lista) {
  for (const a of lista) await db.comando("HSET", CLAVE, a.telefono, JSON.stringify({ ...a, avisado: true }));
}

module.exports = { anotar, borrar, pendientes, marcarAvisados, whatsapp, mensaje };
