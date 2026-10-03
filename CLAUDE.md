# Tienda POWER UP Store

Tienda online de ropa (conjuntos remera + short) del mismo dueño que Nací Reina (repo `tinchoteee/todo20`). Instagram @powerup.store1. WhatsApp 11 3819-6516 (`5491138196516`). El dueño no es técnico: hablale en español rioplatense, simple y paso a paso. Estética: blanco y negro, tipografías Anton + Space Grotesk, efectos (cintas que pasan, cursor, aparecer al scrollear).

## Cómo está armada (misma base que Nací Reina, 2026-10-03)
- Sitio estático + funciones serverless para **Vercel** (`api/`, CommonJS, Node 20+, sin dependencias). Sin Vercel (ej. GitHub Pages) la página se ve pero no cobra.
- `js/productos.js`: catálogo y configuración (WhatsApp, envío gratis, descuentos, transferencia, paquetes, líneas/marcas). Lo usan la página y el servidor. Productos con `id` numérico, `cat` = línea (clave de `lineas`), `talles` en texto ("S","M","L","XL"), `colores` con foto propia; `drop`, `etiqueta`, `detalle` son solo visuales.
- `js/ajustes.js`: aplica los cambios del editor (precios, agotados, unidades por talle). Talles siempre como texto.
- `index.html` + `css/styles.css` + `js/tienda.js`: tienda (inicio, página de producto `#p/ID`, carrito con barra de beneficios, checkout en 3 pasos `#checkout`, transferencia, botón de arrepentimiento, vuelta de Mercado Pago `?pago=`).
- `admin.html` + `js/admin.js`: editor con contraseña (`ADMIN_CLAVE`): stock (unidades por talle), precios, pedidos, estado de la configuración.
- Cobros: Mercado Pago (Card Payment Brick → `api/pagar-tarjeta.js` con `MP_PUBLIC_KEY`; Checkout Pro → `api/crear-pago.js`). Pedido armado y recalculado en `api/_pedido.js`; pago aprobado procesado una sola vez en `api/_procesar.js`.
- Envíos: Zipnova (`api/_envios.js`). Sin Zipnova, precios fijos por zona. "Retiro en persona" solo si `local.direccion` tiene algo (hoy vacío: no hay local).
- Base de datos: Upstash Redis, todas las claves con prefijo `powerup:` (puede compartir base con Nací Reina). Emails: Resend.
- Guía para el dueño: `CONFIGURACION.md`.

## Estado (2026-10-03)
- 9 productos, todos $29.999, talles S–XL (a confirmar con el dueño). Conjunto Jordan unifica negro, blanco y rojo (id 1).
- Beneficios elegidos por Claude (a confirmar): envío gratis desde $119.000 (4 conjuntos), 10% OFF desde $149.000 (5), 5% OFF con transferencia. Paquete 500 g, 30×25×8 cm.
- Falta que el dueño cree el proyecto en Vercel y cargue las variables (ver CONFIGURACION.md).
- Los productos son de marcas ajenas (Jordan, Trapstar, Sp5der, Corteiz, Syna, Bape, Guess): se le avisó al dueño del riesgo de usar esos nombres si no son originales.
- Nunca pedir ni pegar claves, alias ni CBU en el chat: se cargan en Vercel.
- Vercel Hobby: máximo 100 deploys por día. `vercel.json` desactiva deploys de ramas `claude/*`.
