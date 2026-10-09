// Catálogo de POWER UP Store.
// Lo usan la página (para mostrar los productos) y el servidor (para cobrar el precio correcto).
// precio: 0 = "Consultar precio" (no se puede pagar online hasta que tenga precio).
// Un color puede tener su propio precio (precio dentro del color); si no, usa el del modelo.
// foto: archivo dentro de la carpeta img/. Cada color tiene su propia foto.
// oculto: true = desactivado (no aparece ni se puede comprar).
(function (catalogo) {
  if (typeof module !== "undefined" && module.exports) module.exports = catalogo;
  else window.CATALOGO = catalogo;
})({
  // WhatsApp: 549 + código de área sin 0 + número sin 15
  whatsapp: "5491138196516",
  instagram: "https://www.instagram.com/powerup.store1/",
  metaPixel: "",   // Píxel de Meta (opcional; en Vercel META_PIXEL_ID lo reemplaza)

  // Retiro gratis: con dirección aparece la opción en el checkout (nombre = cómo se muestra). Vacío = solo envíos por correo.
  // Es el local de calzados del mismo dueño (pedido del dueño 2026-10-03: mostrar la dirección exacta).
  local: { nombre: "Retiro en nuestra sucursal", direccion: "Av. de Mayo 1614, Ramos Mejía", cp: "1704" },

  // Descuento por monto: cuando los productos suman "desde" o más, se descuenta "porcentaje" a cada producto.
  // (No se aplica al envío.) desde: 0 = sin descuento.
  descuento: { desde: 149000, porcentaje: 10 },   // 5 conjuntos
  // Descuento extra por pagar con transferencia bancaria (sobre los productos, después del de monto). 0 = sin transferencia.
  // Los datos de la cuenta (alias, CBU, titular) se cargan en Vercel: TRANSFERENCIA_ALIAS, TRANSFERENCIA_CBU, TRANSFERENCIA_TITULAR.
  transferencia: { porcentaje: 5 },

  envio: {
    // Envío gratis cuando los productos suman este monto o más. 0 = sin envío gratis.
    gratisDesde: 119000,   // 4 conjuntos
    // Transportista preferido: si ese correo cotiza, se muestran solo sus opciones. Vacío = todos los activos en Zipnova.
    transportista: "",
    // Paquete de cada producto (peso en gramos, medidas en cm). El correo cobra según peso y tamaño.
    // Un producto puede usar otro paquete con  caja: "nombre".
    cajas: {
      "conjunto": { peso: 500, alto: 8, ancho: 25, largo: 30 },
      "buzo":     { peso: 1100, alto: 12, ancho: 30, largo: 35 }   // buzo + pantalón (a confirmar con el dueño)
    },
    // Solo se usa mientras Zipnova no esté configurado: costo fijo por zona.
    zonasDeRespaldo: { "CABA": 5000, "Buenos Aires": 6500, "resto": 9500 }
  },

  // Líneas / marcas: el orden de acá es el orden de los filtros y categorías.
  // Solo se muestran las que tienen al menos un producto.
  lineas: {
    jordan: "Jordan",
    trapstar: "Trapstar",
    sp5der: "Sp5der",
    corteiz: "Corteiz",
    syna: "Syna World",
    bape: "Bape",
    guess: "Guess"
  },

  // detalle: texto chico debajo del nombre · drop: true = aparece en "El Drop" (los primeros 3) · etiqueta: cartelito sobre la foto
  productos: [
    { id: 1, cat: "jordan", caja: "conjunto", nombre: "Conjunto Jordan", detalle: "Remera + short", drop: true, etiqueta: "NUEVO",
      desc: "Remera con logo Jumpman estampado y short de básquet negro con paneles laterales blancos.",
      precio: 29999, talles: ["S", "M", "L", "XL"],
      colores: [
        { id: "negro", nombre: "Negro", hex: "#111111", foto: "img/jordan-negro.jpg" },
        { id: "blanco", nombre: "Blanco", hex: "#F4F4F4", foto: "img/jordan-blanco.jpg" },
        { id: "rojo", nombre: "Rojo", hex: "#C8102E", foto: "img/jordan-rojo.jpg" }
      ] },
    { id: 2, cat: "sp5der", caja: "conjunto", nombre: "Conjunto Sp5der", detalle: "Remera + short", drop: true, etiqueta: "NUEVO",
      desc: "Conjunto negro con estampa de telaraña y logo sp5der en blanco en la remera, y logo sp5der en el short.",
      precio: 29999, talles: ["S", "M", "L", "XL"],
      colores: [{ id: "negro", nombre: "Negro", hex: "#111111", foto: "img/sp5der-negro.jpg" }] },
    { id: 3, cat: "trapstar", caja: "conjunto", nombre: "Conjunto Trapstar Shooters", detalle: "Remera + short", drop: true, etiqueta: "NUEVO",
      desc: "Conjunto negro con estampa Trapstar London Shooters en la remera y en el short.",
      precio: 29999, talles: ["S", "M", "L", "XL"],
      colores: [{ id: "negro", nombre: "Negro", hex: "#111111", foto: "img/trapstar-shooters.jpg" }] },
    { id: 4, cat: "trapstar", caja: "conjunto", nombre: "Conjunto Trapstar It's a Secret", detalle: "Remera + short", etiqueta: "NUEVO",
      desc: "Conjunto negro con logo Trapstar \"It's a Secret\" en degradé azul en la remera y en el short.",
      precio: 29999, talles: ["S", "M", "L", "XL"],
      colores: [{ id: "negro", nombre: "Negro", hex: "#111111", foto: "img/trapstar-its-a-secret.jpg" }] },
    { id: 5, cat: "jordan", caja: "conjunto", nombre: "Conjunto Jordan Jumpman", detalle: "Remera + short", etiqueta: "NUEVO",
      desc: "Conjunto negro con logo Jumpman blanco en la remera y Jumpman grande en el costado del short.",
      precio: 29999, talles: ["S", "M", "L", "XL"],
      colores: [{ id: "negro", nombre: "Negro", hex: "#111111", foto: "img/jordan-jumpman-negro.jpg" }] },
    { id: 6, cat: "corteiz", caja: "conjunto", nombre: "Conjunto Corteiz Alcatraz", detalle: "Remera + short", etiqueta: "NUEVO",
      desc: "Conjunto negro con el logo Alcatraz de Corteiz en blanco en la remera y en el short.",
      precio: 29999, talles: ["S", "M", "L", "XL"],
      colores: [{ id: "negro", nombre: "Negro", hex: "#111111", foto: "img/corteiz-alcatraz.jpg" }] },
    { id: 7, cat: "syna", caja: "conjunto", nombre: "Conjunto Syna World", detalle: "Remera + short", etiqueta: "NUEVO",
      desc: "Conjunto negro con el logo Syna estilo graffiti en blanco en la remera y en el short.",
      precio: 29999, talles: ["S", "M", "L", "XL"],
      colores: [{ id: "negro", nombre: "Negro", hex: "#111111", foto: "img/syna-negro.jpg" }] },
    { id: 8, cat: "bape", caja: "conjunto", nombre: "Conjunto Bape Ape Head", detalle: "Remera + short", etiqueta: "NUEVO",
      desc: "Conjunto negro con la cabeza de mono camuflada en blanco en la remera y en el short.",
      precio: 29999, talles: ["S", "M", "L", "XL"],
      colores: [{ id: "negro", nombre: "Negro", hex: "#111111", foto: "img/bape-ape-head.jpg" }] },
    { id: 9, cat: "guess", caja: "conjunto", nombre: "Conjunto Guess Los Angeles", detalle: "Remera + short", etiqueta: "NUEVO",
      desc: "Conjunto negro con el triángulo Guess en rojo y blanco en la remera, y estampa Guess Los Angeles al costado del short.",
      precio: 29999, talles: ["S", "M", "L", "XL"],
      colores: [{ id: "negro", nombre: "Negro", hex: "#111111", foto: "img/guess-negro.jpg" }] },
    { id: 10, cat: "corteiz", caja: "buzo", nombre: "Conjunto Corteiz Alcatraz Buzo", detalle: "Buzo + pantalón", etiqueta: "NUEVO",
      desc: "Buzo con capucha y pantalón de frisa negros, con el logo Alcatraz de Corteiz en blanco en el pecho y en el pantalón.",
      precio: 44500, talles: ["M", "L", "XL"],
      colores: [{ id: "negro", nombre: "Negro", hex: "#111111", foto: "img/corteiz-alcatraz-buzo.jpg" }] },
    { id: 11, cat: "jordan", caja: "buzo", nombre: "Conjunto Jordan Buzo Gris", detalle: "Buzo + pantalón", etiqueta: "NUEVO",
      desc: "Buzo con capucha y pantalón de frisa gris melange, con el logo Jumpman blanco en el pecho y en la pierna.",
      precio: 44500, talles: ["M", "L", "XL"],
      colores: [{ id: "gris", nombre: "Gris", hex: "#C8C8C8", foto: "img/jordan-buzo-gris.jpg" }] },
    { id: 12, cat: "corteiz", caja: "conjunto", nombre: "Pantalón Corteiz Alcatraz", detalle: "Pantalón", etiqueta: "NUEVO",
      desc: "Pantalón de frisa negro con puño elastizado y el logo Alcatraz de Corteiz en blanco en la pierna. Es el pantalón del conjunto Corteiz Alcatraz Buzo, vendido por separado.",
      precio: 24500, talles: ["M", "L", "XL"],
      colores: [{ id: "negro", nombre: "Negro", hex: "#111111", foto: "img/pantalon-corteiz-alcatraz.jpg" }] },
    { id: 13, cat: "jordan", caja: "conjunto", nombre: "Pantalón Jordan Gris", detalle: "Pantalón", etiqueta: "NUEVO",
      desc: "Pantalón de frisa gris melange con el logo Jumpman blanco en la pierna. Es el pantalón del conjunto Jordan Buzo Gris, vendido por separado.",
      precio: 24500, talles: ["M", "L", "XL"],
      colores: [{ id: "gris", nombre: "Gris", hex: "#C8C8C8", foto: "img/pantalon-jordan-gris.jpg" }] }
  ]
});
