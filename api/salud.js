// Control de salud de la tienda: prueba con las claves reales lo que hace falta para vender
// (catálogo, base de datos, Zipnova, Mercado Pago, emails). Lo llaman el cron de Vercel (vercel.json)
// y el Revisor web de la oficina cada hora.
//   GET /api/salud           → { ok, chequeos: [{ nombre, ok, detalle }] }
//   GET /api/salud?avisar=1  → además, si algo falla, manda un email a AVISOS_EMAIL (uno cada 6 horas por problema)
// No devuelve claves ni datos de clientes.
const { cotizarZipnova } = require("./_envios.js");
const { productosActuales } = require("./_catalogo.js");
const { mandarEmail, esc } = require("./_procesar.js");
const db = require("./_db.js");

async function chequear(nombre, fn) {
  try { const detalle = await fn(); return { nombre, ok: true, detalle: detalle || "OK" }; }
  catch (e) { return { nombre, ok: false, detalle: String(e.motivo || e.message || e).slice(0, 300) }; }
}

module.exports = async function handler(req, res) {
  let productos = [];
  const chequeos = await Promise.all([
    chequear("Catálogo", async () => {
      productos = await productosActuales();
      const conStock = productos.filter(p => !p.agotado).length;
      if (!conStock) throw new Error("No hay ningún producto a la venta");
      return `${conStock} productos a la venta`;
    }),
    chequear("Base de datos (stock y pedidos)", async () => {
      if (!db.hayDB()) throw new Error("No está conectada");
      await db.comando("PING");
    }),
    chequear("Mercado Pago", async () => {
      if (!process.env.MP_ACCESS_TOKEN) throw new Error("Falta la clave MP_ACCESS_TOKEN en Vercel");
      const r = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(`Mercado Pago rechazó la clave (${r.status})`);
    }),
    chequear("Emails de pedidos", async () => {
      if (!process.env.RESEND_API_KEY || !process.env.AVISOS_EMAIL) throw new Error("Falta RESEND_API_KEY o AVISOS_EMAIL en Vercel");
    })
  ]);

  // Envío: cotiza de verdad en Zipnova un producto a Ramos Mejía (sin el respaldo por zona, para ver si Zipnova anda)
  chequeos.push(await chequear("Envíos (Zipnova)", async () => {
    if (!(process.env.ZIPNOVA_API_TOKEN && process.env.ZIPNOVA_API_SECRET && process.env.ZIPNOVA_ACCOUNT_ID)) throw new Error("Zipnova no está configurado: se cobran los precios fijos por zona");
    const producto = productos.find(p => !p.agotado) || productos[0];
    if (!producto) throw new Error("No hay productos para cotizar");
    const opciones = await cotizarZipnova({ cp: "1704", provincia: "Buenos Aires", localidad: "Ramos Mejía", lineas: [{ producto, cant: 1 }], valor: 10000 });
    if (!opciones.length) throw new Error("Zipnova no devolvió ningún correo para Ramos Mejía");
    return `${opciones.length} opciones, desde $${Math.min(...opciones.map(o => o.precio))}`;
  }));

  const fallas = chequeos.filter(c => !c.ok);
  let emailMandado = false;
  if (fallas.length && req.query && req.query.avisar && process.env.AVISOS_EMAIL && process.env.RESEND_API_KEY) {
    const clave = "powerup:salud:aviso:" + fallas.map(f => f.nombre).sort().join("|");
    // Sin base de datos no hay forma de no repetir el aviso: se manda igual
    const nuevo = db.hayDB() ? (await db.comando("SET", clave, "1", "NX", "EX", 21600).catch(() => "OK")) === "OK" : true;
    if (nuevo) {
      await mandarEmail({
        para: process.env.AVISOS_EMAIL,
        asunto: `⚠️ La tienda tiene un problema: ${fallas.map(f => f.nombre).join(", ")}`,
        html: `<p>El control automático de powerupstore.website encontró esto:</p><ul>${fallas.map(f => `<li><b>${esc(f.nombre)}</b>: ${esc(f.detalle)}</li>`).join("")}</ul>` +
          `<p>Mientras tanto la tienda sigue vendiendo lo que puede (por ejemplo, si falla Zipnova cobra los precios fijos por zona). Pasale este email a Claude para que lo arregle.</p>`,
        clave: clave + ":" + Math.floor(Date.now() / 21600000)
      });
      emailMandado = true;
    }
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: !fallas.length, cuando: new Date().toISOString(), chequeos, emailMandado });
};
