// Oficina POWER UP: tablero de los empleados con IA (oficina.html). Se entra con un link que trae una clave.
//   GET  ?k=<clave de lectura o escritura>                         → { empleados, informes, actividad }
//   POST { k: <clave de escritura>, empleado, ficha?, estado?, tarea?, informe?, actividad? }
//        ficha: { nombre, rol, area, horario, inicial, orden }   (datos fijos del empleado, se guardan una vez)
//        actividad: { texto, tipo: "info" | "alerta" }
// Las claves no están en el código: solo su huella (sha256). Las tiene el dueño (link) y las tareas programadas de su compu.
const crypto = require("crypto");
const db = require("./_db.js");

const HUELLA_LECTURA = "2cbf34e905f9b28dff3756c5d608961c655f31b87381b45818cabddf98c61526";
const HUELLA_ESCRITURA = "5d77d3b4df0025248d791477de455518b223ec161c74dd5282d8088eaa23be43";
const OFICINA = "powerup:oficina", ACTIVIDAD = "powerup:oficina:actividad";

const huella = k => crypto.createHash("sha256").update(String(k || "")).digest("hex");
const igual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const puedeLeer = k => igual(huella(k), HUELLA_LECTURA) || igual(huella(k), HUELLA_ESCRITURA);
const puedeEscribir = k => igual(huella(k), HUELLA_ESCRITURA);

const texto = (v, max) => String(v == null ? "" : v).slice(0, max);
const lista = (v, max, largo) => (Array.isArray(v) ? v : []).slice(0, max).map(x => texto(x, largo)).filter(Boolean);
function limpiarInforme(i) {
  if (!i || typeof i !== "object") return null;
  return {
    titulo: texto(i.titulo, 160),
    cuando: texto(i.cuando || new Date().toISOString(), 40),
    cifras: (Array.isArray(i.cifras) ? i.cifras : []).slice(0, 8).map(c => ({
      label: texto(c.label, 60), valor: texto(c.valor, 40), nota: texto(c.nota, 80), alerta: Boolean(c.alerta)
    })),
    puntos: lista(i.puntos, 10, 600),
    acciones: lista(i.acciones, 6, 400),
    enlaces: (Array.isArray(i.enlaces) ? i.enlaces : []).slice(0, 6)
      .map(e => ({ texto: texto(e.texto, 80), url: texto(e.url, 400) })).filter(e => /^https:\/\//.test(e.url))
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  try {
    if (!db.hayDB()) return res.status(503).json({ error: "Falta la base de datos (Upstash) en Vercel." });
    if (req.method === "GET") {
      if (!puedeLeer(req.query.k)) return res.status(401).json({ error: "Link inválido." });
      const oficina = await db.leer(OFICINA, { empleados: {}, informes: {} });
      const crudo = await db.comando("LRANGE", ACTIVIDAD, 0, 79) || [];
      const actividad = crudo.map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean);
      return res.status(200).json({ ...oficina, actividad });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." });

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    // Desde la página (con el link de lectura) solo se puede marcar un problema como resuelto
    if (body.accion === "resuelto") {
      if (!puedeLeer(body.k)) return res.status(401).json({ error: "Link inválido." });
      const ofi = await db.leer(OFICINA, { empleados: {}, informes: {} });
      const e = ofi.empleados[texto(body.empleado, 40)];
      if (!e) return res.status(404).json({ error: "Ese empleado no existe." });
      if (e.estado !== "error") return res.status(200).json({ ok: true });
      e.estado = "esperando";
      e.tarea = "Problema resuelto por Martín. Vuelve a trabajar en su próximo horario.";
      await db.guardar(OFICINA, ofi);
      await db.comando("LPUSH", ACTIVIDAD, JSON.stringify({ empleado: texto(body.empleado, 40), cuando: new Date().toISOString(), texto: "quedó destrabado: Martín resolvió el problema.", tipo: "info" }));
      await db.comando("LTRIM", ACTIVIDAD, 0, 199);
      return res.status(200).json({ ok: true });
    }
    if (!puedeEscribir(body.k)) return res.status(401).json({ error: "Clave inválida." });
    const id = texto(body.empleado, 40).toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!id) return res.status(400).json({ error: "Falta el empleado." });

    const oficina = await db.leer(OFICINA, { empleados: {}, informes: {} });
    const emp = oficina.empleados[id] || {};
    if (body.ficha) {
      const f = body.ficha;
      Object.assign(emp, { nombre: texto(f.nombre, 60), rol: texto(f.rol, 120), area: texto(f.area, 40),
        horario: texto(f.horario, 60), inicial: texto(f.inicial, 2), orden: Number(f.orden) || 0 });
    }
    if (body.estado) emp.estado = ["listo", "trabajando", "esperando", "error"].includes(body.estado) ? body.estado : "esperando";
    if (body.tarea != null) emp.tarea = texto(body.tarea, 300);
    if (body.estado === "listo" || body.estado === "error") emp.ultimaVez = new Date().toISOString();
    if (body.borrar) delete oficina.empleados[id]; else oficina.empleados[id] = emp;
    const inf = limpiarInforme(body.informe);
    if (inf) oficina.informes[id] = inf;
    if (body.borrar) delete oficina.informes[id];
    await db.guardar(OFICINA, oficina);

    if (body.actividad && body.actividad.texto) {
      await db.comando("LPUSH", ACTIVIDAD, JSON.stringify({ empleado: id, cuando: new Date().toISOString(),
        texto: texto(body.actividad.texto, 300), tipo: body.actividad.tipo === "alerta" ? "alerta" : "info" }));
      await db.comando("LTRIM", ACTIVIDAD, 0, 199);
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("oficina", e);
    return res.status(500).json({ error: "No se pudo guardar. Probá de nuevo en un rato." });
  }
};
