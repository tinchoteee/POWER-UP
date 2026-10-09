# Tienda POWER UP Store

Tienda online de ropa (conjuntos remera + short) del mismo dueño que Nací Reina (repo `tinchoteee/todo20`). Instagram @powerup.store1. WhatsApp 11 3819-6516 (`5491138196516`). El dueño no es técnico: hablale en español rioplatense, simple y paso a paso. Estética: blanco y negro, tipografías Anton + Space Grotesk, efectos (cintas que pasan, cursor, aparecer al scrollear).

## Cómo está armada (misma base que Nací Reina, 2026-10-03)
- Sitio estático + funciones serverless para **Vercel** (`api/`, CommonJS, Node 20+, sin dependencias). Sin Vercel (ej. GitHub Pages) la página se ve pero no cobra.
- `js/productos.js`: catálogo y configuración (WhatsApp, envío gratis, descuentos, transferencia, paquetes, líneas/marcas). Lo usan la página y el servidor. Productos con `id` numérico, `cat` = línea (clave de `lineas`), `talles` en texto ("S","M","L","XL"), `colores` con foto propia; `drop`, `etiqueta`, `detalle` son solo visuales.
- `js/ajustes.js`: aplica los cambios del editor (precios, agotados, unidades por talle). Talles siempre como texto.
- `index.html` + `css/styles.css` + `js/tienda.js`: tienda (inicio, página de producto `#p/ID`, carrito con barra de beneficios, checkout en 3 pasos `#checkout`, transferencia, botón de arrepentimiento, vuelta de Mercado Pago `?pago=`).
- `admin.html` + `js/admin.js`: editor con contraseña (`ADMIN_CLAVE`): stock (unidades por talle), precios, pedidos, estado de la configuración.
- Cobros: Mercado Pago (Card Payment Brick → `api/pagar-tarjeta.js` con `MP_PUBLIC_KEY`; Checkout Pro → `api/crear-pago.js`). Pedido armado y recalculado en `api/_pedido.js`; pago aprobado procesado una sola vez en `api/_procesar.js`.
- Envíos: Zipnova (`api/_envios.js`). Sin Zipnova, precios fijos por zona. Retiro gratis si `local.direccion` tiene algo: hoy "Retiro en nuestra sucursal", Av. de Mayo 1614, Ramos Mejía (CP 1704), que es el local de calzados de Nací Reina (POWER UP no tiene local propio). El dueño pidió mostrar la dirección exacta acá (en Nací Reina se muestra 1600).
- Base de datos: Upstash Redis, todas las claves con prefijo `powerup:` (puede compartir base con Nací Reina). Emails: Resend.
- Guía para el dueño: `CONFIGURACION.md`.

## Estado (2026-10-03)
- 9 productos, todos $29.999, talles S–XL (confirmados por el dueño). Conjunto Jordan unifica negro, blanco y rojo (id 1).
- 2026-10-09: conjuntos buzo + pantalón (ids 10 Corteiz Alcatraz negro, 11 Jordan gris), $44.500, talles M–XL, paquete "buzo" (1100 g, 35×30×12 cm, estimado por Claude: a confirmar). Fotos propias del dueño sobre un acolchado azul: se recortó la prenda por color y se puso sobre el gris #f2f2f2 del catálogo.
- 2026-10-09: pantalones sueltos de esos conjuntos (ids 12 Corteiz negro, 13 Jordan gris), $24.500, talles M–XL (supuestos por Claude, como los conjuntos), paquete "conjunto". Buzo Corteiz suelto (id 14), $24.500, M–XL; su foto tenía luz azulada: se pasó a gris y se suavizó el contorno.
- 2026-10-09: Conjunto Jordan Letras (id 15, remera + short negro), $29.999, S–XL; foto girada 180°.
- Beneficios confirmados por el dueño (2026-10-03): envío gratis desde $119.000 (4 conjuntos), 10% OFF desde $149.000 (5), 5% OFF con transferencia. Paquete 500 g, 30×25×8 cm (confirmado).
- Proyecto de Vercel creado y configurado por el dueño. Pendiente: compra de prueba real con envío por correo y cargar unidades por talle en el editor.
- Los productos son de marcas ajenas (Jordan, Trapstar, Sp5der, Corteiz, Syna, Bape, Guess): se le avisó al dueño del riesgo de usar esos nombres si no son originales.
- Mercado Pago: cuenta propia de POWER UP, distinta de la de Nací Reina (pedido del dueño 2026-10-03). Las credenciales van solo en el proyecto de Vercel de POWER UP.
- Cuentas propias de POWER UP (2026-10-03): Mercado Pago, Resend y Zipnova nuevas, separadas de Nací Reina. Zipnova con la misma configuración que Nací Reina (Correo Argentino y OCA de servicio completo) y el mismo origen (el local de Ramos Mejía), pero **despacho en sucursal**: el dueño lleva los paquetes a la sucursal de Correo Argentino u OCA de Ramos Mejía (no retiro a domicilio). Es configuración de la cuenta de Zipnova; el código usa el `logistic_type` que devuelve la cotización. Sin `ZIPNOVA_ORIGIN_ID`. Upstash: Vercel no ofrecía otro plan gratis; se sugirió conectar la base de Nací Reina (prefijo `powerup:`).
- Configurado por el dueño en Vercel: MP_ACCESS_TOKEN, MP_PUBLIC_KEY, ADMIN_CLAVE, RESEND_API_KEY + AVISOS_EMAIL (email de prueba OK), variables de transferencia. Zipnova en curso.
- El editor tiene "Mandar email de prueba" en la pestaña Estado (explica por qué falla).
- Dominio propio: https://powerupstore.website (comprado en Vercel, 2026-10-03; powerupstore.com no estaba disponible). `canonical`, `og:*`, JSON-LD, `sitemap.xml` y `robots.txt` lo usan; imagen para compartir `img/compartir.jpg` (1200×630). Si cambia el dominio, actualizarlos.
- Nunca pedir ni pegar claves, alias ni CBU en el chat: se cargan en Vercel.
- Vercel Hobby: máximo 100 deploys por día. `vercel.json` desactiva deploys de ramas `claude/*`.
