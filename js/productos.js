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
  - categoria: remeras | buzos | pantalones | accesorios
  - precio:    número sin puntos
  - talles:    lista de talles disponibles
  - imagen:    ruta a la foto (ej: "img/remera-logo.jpg"). Si lo dejás vacío
               se muestra un diseño gráfico automático.
  - tipo:      dibujo que se usa cuando no hay foto: remera | buzo | pantalon | gorra | bolso
  - tono:      "negro" o "blanco" (color de la prenda en el dibujo)
  - drop:      true para que aparezca en la sección "El Drop"
  - etiqueta:  texto opcional sobre la foto (ej: "NUEVO", "ÚLTIMOS")
*/
const PRODUCTOS = [
  { id: "r1", nombre: "Remera Oversize Logo", categoria: "remeras", precio: 24990, talles: ["S", "M", "L", "XL"], imagen: "", tipo: "remera", tono: "negro", drop: true, etiqueta: "NUEVO", descripcion: "Remera oversize de algodón peinado 24/1 con logo POWER UP estampado en serigrafía." },
  { id: "r2", nombre: "Remera Boxy Blank", categoria: "remeras", precio: 21990, talles: ["S", "M", "L", "XL"], imagen: "", tipo: "remera", tono: "blanco", drop: false, etiqueta: "", descripcion: "Corte boxy, cuello reforzado, algodón pesado. La base de todo outfit." },
  { id: "r3", nombre: "Remera Level Up", categoria: "remeras", precio: 25990, talles: ["M", "L", "XL"], imagen: "", tipo: "remera", tono: "negro", drop: false, etiqueta: "ÚLTIMOS", descripcion: "Estampa frente y espalda. Calce oversize." },
  { id: "b1", nombre: "Hoodie Power Heavy", categoria: "buzos", precio: 49990, talles: ["S", "M", "L", "XL"], imagen: "", tipo: "buzo", tono: "negro", drop: true, etiqueta: "DROP", descripcion: "Buzo canguro de frisa pesada, capucha doble y bordado en el pecho." },
  { id: "b2", nombre: "Hoodie Snow", categoria: "buzos", precio: 49990, talles: ["S", "M", "L"], imagen: "", tipo: "buzo", tono: "blanco", drop: true, etiqueta: "NUEVO", descripcion: "Mismo calce que el Power Heavy, en blanco hueso." },
  { id: "p1", nombre: "Cargo Tactical", categoria: "pantalones", precio: 44990, talles: ["38", "40", "42", "44"], imagen: "", tipo: "pantalon", tono: "negro", drop: false, etiqueta: "", descripcion: "Pantalón cargo de gabardina con bolsillos laterales y puño regulable." },
  { id: "p2", nombre: "Jogger Frisa", categoria: "pantalones", precio: 36990, talles: ["S", "M", "L", "XL"], imagen: "", tipo: "pantalon", tono: "blanco", drop: false, etiqueta: "", descripcion: "Jogger de frisa con puño y cordón. Comodidad total." },
  { id: "a1", nombre: "Gorra Power Cap", categoria: "accesorios", precio: 17990, talles: ["Único"], imagen: "", tipo: "gorra", tono: "negro", drop: false, etiqueta: "", descripcion: "Gorra de gabardina con logo bordado y regulador metálico." },
  { id: "a2", nombre: "Tote Bag PU", categoria: "accesorios", precio: 14990, talles: ["Único"], imagen: "", tipo: "bolso", tono: "blanco", drop: false, etiqueta: "", descripcion: "Bolsa de lienzo pesado con estampa POWER UP." },
];
