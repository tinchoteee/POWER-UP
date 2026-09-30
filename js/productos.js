/* =========================================================
   CONFIGURACIÓN DE LA TIENDA
   Editá este archivo para cambiar productos, precios y contacto.
   ========================================================= */

const CONFIG = {
  // Número de WhatsApp con código de país, sin + ni espacios (ej: 5491112345678)
  whatsapp: "5491138196516",
  instagram: "https://www.instagram.com/powerup.store1/",
  moneda: "$",
};

/*
  Cada producto:
  - id:        identificador único
  - nombre:    nombre que se muestra
  - categoria: línea del producto (una de las claves de LINEAS). Se usa en los filtros.
  - detalle:   texto chico debajo del nombre (ej: "Remera + short")
  - precio:    número sin puntos
  - talles:    lista de talles disponibles
  - imagen:    ruta a la foto (ej: "img/jordan-negro.jpg"). Si lo dejás vacío
               se muestra un dibujo automático de la prenda.
  - tipo/tono: dibujo que se usa cuando no hay foto (remera | buzo | pantalon | gorra | bolso / negro | blanco)
  - drop:      true para que aparezca en la sección "El Drop" (se muestran los primeros 3)
  - etiqueta:  texto opcional sobre la foto (ej: "NUEVO", "ÚLTIMOS")
*/
const TALLES = ["S", "M", "L", "XL"];

// Líneas / marcas: el orden de acá es el orden de los filtros y categorías.
// Solo se muestran las que tienen al menos un producto.
const LINEAS = {
  jordan: "Jordan",
  trapstar: "Trapstar",
  sp5der: "Sp5der",
  corteiz: "Corteiz",
  syna: "Syna World",
  bape: "Bape",
};

const PRODUCTOS = [
  { id: "jordan-negro", nombre: "Conjunto Jordan Negro", categoria: "jordan", detalle: "Remera + short", precio: 29999, talles: TALLES, imagen: "img/jordan-negro.jpg", drop: true, etiqueta: "NUEVO", descripcion: "Conjunto de remera negra con logo Jumpman estampado en blanco y short de básquet negro con paneles laterales blancos." },
  { id: "sp5der-negro", nombre: "Conjunto Sp5der Negro", categoria: "sp5der", detalle: "Remera + short", precio: 29999, talles: TALLES, imagen: "img/sp5der-negro.jpg", drop: true, etiqueta: "NUEVO", descripcion: "Conjunto negro con estampa de telaraña y logo sp5der en blanco en la remera, y logo sp5der en el short." },
  { id: "trapstar-shooters", nombre: "Conjunto Trapstar Shooters", categoria: "trapstar", detalle: "Remera + short", precio: 29999, talles: TALLES, imagen: "img/trapstar-shooters.jpg", drop: true, etiqueta: "NUEVO", descripcion: "Conjunto negro con estampa Trapstar London Shooters en la remera y en el short." },
  { id: "jordan-blanco", nombre: "Conjunto Jordan Blanco", categoria: "jordan", detalle: "Remera + short", precio: 29999, talles: TALLES, imagen: "img/jordan-blanco.jpg", drop: false, etiqueta: "", descripcion: "Conjunto de remera blanca con logo Jumpman estampado en negro y short de básquet negro con paneles laterales blancos." },
  { id: "jordan-rojo", nombre: "Conjunto Jordan Rojo", categoria: "jordan", detalle: "Remera + short", precio: 29999, talles: TALLES, imagen: "img/jordan-rojo.jpg", drop: false, etiqueta: "", descripcion: "Conjunto de remera roja con logo Jumpman estampado en blanco y short de básquet negro con paneles laterales blancos." },
  { id: "trapstar-its-a-secret", nombre: "Conjunto Trapstar It's a Secret", categoria: "trapstar", detalle: "Remera + short", precio: 29999, talles: TALLES, imagen: "img/trapstar-its-a-secret.jpg", drop: false, etiqueta: "NUEVO", descripcion: "Conjunto negro con logo Trapstar \"It's a Secret\" en degradé azul en la remera y en el short." },
  { id: "jordan-jumpman-negro", nombre: "Conjunto Jordan Jumpman", categoria: "jordan", detalle: "Remera + short", precio: 29999, talles: TALLES, imagen: "img/jordan-jumpman-negro.jpg", drop: false, etiqueta: "NUEVO", descripcion: "Conjunto negro con logo Jumpman blanco en la remera y Jumpman grande en el costado del short." },
  { id: "corteiz-alcatraz", nombre: "Conjunto Corteiz Alcatraz", categoria: "corteiz", detalle: "Remera + short", precio: 29999, talles: TALLES, imagen: "img/corteiz-alcatraz.jpg", drop: false, etiqueta: "NUEVO", descripcion: "Conjunto negro con el logo Alcatraz de Corteiz en blanco en la remera y en el short." },
  { id: "syna-negro", nombre: "Conjunto Syna World", categoria: "syna", detalle: "Remera + short", precio: 29999, talles: TALLES, imagen: "img/syna-negro.jpg", drop: false, etiqueta: "NUEVO", descripcion: "Conjunto negro con el logo Syna estilo graffiti en blanco en la remera y en el short." },
  { id: "bape-ape-head", nombre: "Conjunto Bape Ape Head", categoria: "bape", detalle: "Remera + short", precio: 29999, talles: TALLES, imagen: "img/bape-ape-head.jpg", drop: false, etiqueta: "NUEVO", descripcion: "Conjunto negro con la cabeza de mono camuflada en blanco en la remera y en el short." },
];
