// Control de salud de la tienda: prueba con las claves reales lo que hace falta para vender
// (catálogo, base de datos, Zipnova, Mercado Pago, emails). Lo llaman el cron de Vercel (vercel.json)
// y el Revisor web de la oficina cada hora.
//   GET /api/salud           → { ok, chequeos: [{ nombre, ok, detalle }] }
//   GET /api/salud?avisar=1  → además, si algo falla, manda un email a AVISOS_EMAIL (uno cada 6 horas por problema)
//   GET /api/salud?avisar=1&prueba=1 → manda un aviso de prueba
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

  // Pagos de las últimas 24 h: si hay varios rechazos o errores y ninguna venta, algo anda mal con los cobros
  chequeos.push(await chequear("Pagos de clientes (24 h)", async () => {
    const desde = Date.now() - 24 * 3600 * 1000;
    const porPedido = new Map();
    for (const i of await db.listarIntentos()) {
      if (new Date(i.fecha).getTime() < desde) continue;
      const clave = i.pedido || i.fecha;
      if (!porPedido.has(clave) || i.estado === "approved") porPedido.set(clave, i);   // un resultado por pedido
    }
    const lista = [...porPedido.values()];
    const aprobados = lista.filter(i => i.estado === "approved").length;
    const fallidos = lista.filter(i => i.estado === "rejected" || i.estado === "error");
    const resumen = `${aprobados} aprobados, ${fallidos.length} rechazados o con error`;
    if (fallidos.length >= 3 && !aprobados) {
      const motivos = [...new Set(fallidos.map(i => i.detalle).filter(Boolean))].slice(0, 3).join(", ");
      throw new Error(`${resumen} y ninguna venta. Motivos de Mercado Pago: ${motivos || "sin detalle"}`);
    }
    return lista.length ? resumen : "Sin intentos de pago";
  }));

  // ?prueba=1 simula una falla para comprobar que el email de aviso llega
  if (req.query && req.query.prueba) chequeos.push({ nombre: "Prueba del aviso", ok: false, detalle: "Esto es una prueba: si te llegó este email, los avisos funcionan. No hay que hacer nada." });
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

  // Rescate de carritos: los que dejaron sus datos y no pagaron hace más de 45 minutos, con su WhatsApp listo
  let carritos = 0;
  if (req.query && req.query.avisar && process.env.AVISOS_EMAIL && process.env.RESEND_API_KEY) {
    try {
      const ab = require("./_abandonos.js");
      const lista = await ab.pendientes();
      if (lista.length) {
        const fila = a => {
          const wa = ab.whatsapp(a.telefono);
          const link = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(ab.mensaje(a))}` : null;
          return `<tr><td style="padding:12px 0;border-bottom:1px solid #ddd"><b>${esc(a.nombre)}</b> · ${esc(a.telefono)} · ${esc(a.email)}<br>
            ${a.detalle.map(esc).join("<br>")}<br><small>Productos $${a.total.toLocaleString("es-AR")}${a.envio ? ` + envío $${a.envio.toLocaleString("es-AR")}` : ""} · llegó al paso ${a.paso === 3 ? "de pago" : "de envío"}</small><br>
            ${link ? `<a href="${link}" style="display:inline-block;margin-top:8px;background:#25D366;color:#fff;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:6px">Escribirle por WhatsApp</a>` : "<small>(revisá el número: no parece de Argentina)</small>"}</td></tr>`;
        };
        await mandarEmail({
          para: process.env.AVISOS_EMAIL,
          asunto: `🛒 ${lista.length === 1 ? "1 persona dejó" : lista.length + " personas dejaron"} el carrito sin pagar`,
          html: `<p>Estas personas completaron sus datos en el checkout y no terminaron la compra. Tocá el botón y se abre WhatsApp con el mensaje ya escrito (revisalo antes de mandarlo).</p><table width="100%">${lista.map(fila).join("")}</table>`,
          clave: "abandonos:" + lista.map(a => a.telefono + a.actualizado).join("|").slice(0, 200)
        });
        await ab.marcarAvisados(lista);
        carritos = lista.length;
      }
    } catch (e) { console.error("No se pudo avisar los carritos abandonados", e.message); }
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: !fallas.length, cuando: new Date().toISOString(), chequeos, emailMandado, carritos });
};
