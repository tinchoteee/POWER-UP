// POWER UP Club: cartel de bienvenida, códigos de descuento y baja de las novedades (una sola función, para no
// pasarse del límite de funciones del plan gratis de Vercel).
//   POST { accion: "suscribir", email, origen } → guarda el email y le manda su código único. { codigo?, enviado, nuevo, usado }
//        Si Resend no puede escribirle al cliente (falta RESEND_FROM con el dominio verificado), el código se muestra en pantalla.
//   POST { accion: "cupon", codigo }            → revisa un código antes de pagar (el servidor lo vuelve a revisar al cobrar)
//   GET  ?baja=1&e=email&t=token                → link "Darte de baja" de los emails
//   GET  ?campana=1                             → emails automáticos del día (lo llama el cron de Vercel, ver vercel.json)
const db = require("./_db.js");
const cup = require("./_cupones.js");
const { leerBody } = require("./_pedido.js");

async function suscribir(req, res, body) {
  if (!cup.porcentaje() || !db.hayDB()) return res.status(503).json({ error: "Esto no está disponible en este momento." });
  const email = cup.normalEmail(body.email);
  if (!cup.emailValido(email)) return res.status(400).json({ error: "Ingresá un email válido." });

  // Máximo 5 por hora desde la misma conexión (para que no llenen la lista ni manden emails a cualquiera)
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "sin-ip";
  const n = await db.comando("INCR", "powerup:susc-ip:" + ip);
  if (n === 1) await db.comando("EXPIRE", "powerup:susc-ip:" + ip, 3600);
  if (n > 5) return res.status(429).json({ error: "Probaste varias veces seguidas. Esperá un rato y volvé a intentar." });

  try {
    const { suscriptor: s, nuevo } = await cup.suscribir(email, body.origen);
    const cupon = await db.leer("powerup:cupon:" + s.codigo);
    const usado = Boolean(cupon && cupon.usado);
    let enviado = false;
    if (!usado) {
      const m = cup.emailBienvenida(s);
      enviado = (await cup.enviar({ para: s.email, asunto: m.asunto, html: m.html, baja: cup.linkBaja(s), clave: nuevo ? `bienvenida-${s.codigo}` : undefined })).ok;
    }
    if (nuevo) console.log("Nuevo suscriptor", enviado ? "(email enviado)" : "(código en pantalla)");
    return res.status(200).json({ nuevo, usado, enviado, porcentaje: cup.porcentaje(), ...(enviado || usado ? {} : { codigo: s.codigo }) });
  } catch (e) {
    console.error("Error al suscribir", e.message);
    return res.status(500).json({ error: "No pudimos anotarte. Probá de nuevo en un momento." });
  }
}

async function revisarCupon(req, res, body) {
  try {
    const c = await cup.validarCupon(body.codigo);
    if (!c) return res.status(400).json({ error: "Escribí el código." });
    return res.status(200).json(c);
  } catch (e) {
    if (!e.cupon) console.error("Error al revisar el código", e.message);
    return res.status(400).json({ error: e.cupon ? e.message : "No pudimos revisar el código. Probá de nuevo." });
  }
}

async function darDeBaja(req, res, q) {
  let ok = false;
  try { ok = await cup.darDeBaja(q.e, q.t); } catch (e) { console.error("Error al dar de baja", e.message); }
  // Los clientes de email pueden pedir la baja con POST (List-Unsubscribe): alcanza con responder 200
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>POWER UP</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#fff;font-family:Arial,sans-serif;text-align:center;padding:24px">
<div><p style="font-family:Impact,'Arial Black',sans-serif;font-size:44px;margin:0 0 12px">POWER UP</p>
<p style="font-size:18px;max-width:420px">${ok ? "Listo: no te vamos a mandar más novedades." : "Este link ya no es válido o ya te diste de baja antes."}</p>
<a href="/" style="color:#fff">Volver a la tienda</a></div></body></html>`);
}

// Solo el cron de Vercel (con CRON_SECRET, si está cargado). Además corre una sola vez por día.
async function campanaDiaria(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const secreto = process.env.CRON_SECRET;
  const autorizado = secreto ? req.headers.authorization === `Bearer ${secreto}` : /vercel-cron/i.test(String(req.headers["user-agent"] || ""));
  if (!autorizado) return res.status(401).json({ error: "No autorizado" });
  if (!db.hayDB()) return res.status(200).json({ enviados: 0, motivo: "sin base de datos" });
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  if (!(await db.guardarSiNoExiste("powerup:campana:" + hoy, { fecha: new Date().toISOString() }))) return res.status(200).json({ enviados: 0, motivo: "ya corrió hoy" });
  try {
    const r = await require("./_campana.js").correr();
    await db.guardar("powerup:campana:ultima", { fecha: new Date().toISOString(), ...r });
    return res.status(200).json(r);
  } catch (e) {
    console.error("Error en la campaña de emails", e);
    await db.comando("DEL", "powerup:campana:" + hoy).catch(() => {});   // que pueda reintentarse
    return res.status(500).json({ error: "Falló la campaña" });
  }
}

module.exports = async function handler(req, res) {
  const q = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
  // Los programas de email pueden pedir la baja con POST (List-Unsubscribe)
  if (q.baja) return darDeBaja(req, res, q);
  if (q.campana) return campanaDiaria(req, res);
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  let body; try { body = leerBody(req); } catch (e) { body = {}; }
  if (body.accion === "suscribir") return suscribir(req, res, body);
  if (body.accion === "cupon") return revisarCupon(req, res, body);
  return res.status(400).json({ error: "Acción desconocida." });
};
