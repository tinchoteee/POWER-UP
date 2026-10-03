# POWER UP · Cómo poner la tienda en funcionamiento

La tienda ya está armada (es la misma base que Nací Reina). Para que cobre y despache sola faltan conectar las cuentas en Vercel. Son tuyas, por eso las cargás vos: **nunca pegues claves en el chat**, van solo en Vercel.

---

## Qué hace la tienda sola

1. El cliente elige conjunto, color y talle, y calcula el envío con su código postal.
2. En el checkout elige **correo a domicilio** o **correo a sucursal**.
3. Paga todo junto (productos + envío) con **tarjeta dentro de la página**, con **Mercado Pago** o por **transferencia con descuento**.
4. Cuando el pago se aprueba:
   - El pedido aparece en el **editor** (`/admin.html`, pestaña Pedidos).
   - Se **crea solo el envío en Zipnova**, que genera la etiqueta.
   - Te llega un **email** con todo el pedido.
   - Se descuentan las **unidades vendidas** del stock (si cargaste cuántas hay).
5. **Vos solo tenés que**: imprimir la etiqueta desde Zipnova, pegarla en el paquete y entregarlo al correo.

---

## Paso 1 · Publicar en Vercel

La tienda necesita Vercel para cobrar (GitHub Pages solo muestra la página, no puede cobrar).

1. En **vercel.com** → **Add New → Project** → importá el repositorio **POWER-UP**.
2. Framework Preset: **Other**. Lo demás vacío → **Deploy**.
3. Si antes activaste GitHub Pages, apagalo (Settings → Pages → Source: None) para no tener dos copias.

## Paso 2 · Base de datos (stock, pedidos y editor)

En Vercel, dentro del proyecto POWER-UP: **Storage → Create Database → Upstash (Redis) → plan Free → Connect**.
Se crean solas las variables. Podés crear una base nueva o conectar la misma de Nací Reina: los datos no se mezclan (POWER UP guarda todo con el prefijo `powerup:`).

## Paso 3 · Mercado Pago (para cobrar)

1. Entrá a **mercadopago.com.ar/developers** con la cuenta de Mercado Pago **donde querés recibir la plata de POWER UP** → **Tus integraciones → Crear aplicación** (ponele "POWER UP").
2. Tipo de pago: **pagos online** con **Checkout Pro**.
3. Primero probá con las **credenciales de prueba**; después pasás a las de **producción**.
4. **Access Token** → en Vercel como `MP_ACCESS_TOKEN`.
5. **Public Key** → en Vercel como `MP_PUBLIC_KEY` (con esta, el cliente carga la tarjeta sin salir de la tienda).

## Paso 4 · Zipnova (envíos por correo)

Podés usar la misma cuenta de Nací Reina o crear una nueva en **zipnova.com.ar**.

1. Cargá la dirección desde donde despachás POWER UP como **origen**.
2. En **Configuración → Transportes** activá los correos de **servicio completo** (Correo Argentino, OCA).
3. En **Configuración → API** copiá a Vercel:
   - API Token → `ZIPNOVA_API_TOKEN`
   - API Secret → `ZIPNOVA_API_SECRET`
   - Número de cuenta → `ZIPNOVA_ACCOUNT_ID`
   - Si usás la misma cuenta que Nací Reina, también el **id de la dirección de origen de POWER UP** → `ZIPNOVA_ORIGIN_ID` (si no, despacharía desde la dirección predeterminada).

Mientras no esté Zipnova, la tienda cobra el envío con precios fijos por zona (`zonasDeRespaldo` en `js/productos.js`).

## Paso 5 · Emails de aviso (Resend)

1. Cuenta en **resend.com** (podés usar la misma) → **API Keys → Create** → en Vercel como `RESEND_API_KEY`.
2. En Vercel `AVISOS_EMAIL` con el email donde querés recibir las ventas.
3. Más adelante, con dominio propio, `RESEND_FROM` (ej. `POWER UP <ventas@tudominio.com>`) y también le llega un email al cliente.

## Paso 6 · Contraseña del editor

En Vercel agregá `ADMIN_CLAVE` con una contraseña larga que solo sepas vos. El editor está en `tu-tienda.vercel.app/admin.html`.

## Paso 7 · Transferencia con descuento

En Vercel: `TRANSFERENCIA_ALIAS` (y/o `TRANSFERENCIA_CBU`), `TRANSFERENCIA_TITULAR` y, si querés, `TRANSFERENCIA_BANCO`. El porcentaje se cambia en `js/productos.js` → `transferencia`. Necesita la base de datos (paso 2).

El cliente confirma, ve tu alias y te manda el comprobante por WhatsApp. El pedido queda **Esperando transferencia** con las unidades reservadas. Cuando veas la plata, pasalo a **Pagado** en el editor (se crea el envío). Si no paga, **Cancelado** y las unidades vuelven al stock.

---

## Dónde se cargan las claves

Vercel → proyecto POWER-UP → **Settings → Environment Variables**. Después: **Deployments → ⋯ → Redeploy** del último.

| Variable | Para qué | Obligatoria |
|---|---|---|
| `MP_ACCESS_TOKEN` | Cobrar con Mercado Pago | Sí |
| `MP_PUBLIC_KEY` | Tarjeta dentro de la tienda | Recomendado |
| Upstash (se crean solas) | Stock, pedidos, editor | Sí |
| `ADMIN_CLAVE` | Entrar al editor | Sí |
| `ZIPNOVA_API_TOKEN`, `ZIPNOVA_API_SECRET`, `ZIPNOVA_ACCOUNT_ID` | Cotizar y crear envíos | Sí, para envíos automáticos |
| `ZIPNOVA_ORIGIN_ID` | Dirección de origen de POWER UP en Zipnova | Si compartís cuenta con Nací Reina |
| `ZIPNOVA_CREAR_ENVIOS` | `no` = crear los envíos a mano | No |
| `RESEND_API_KEY`, `AVISOS_EMAIL` | Email con cada venta | Recomendado |
| `TRANSFERENCIA_ALIAS` / `TRANSFERENCIA_CBU`, `TRANSFERENCIA_TITULAR` | Pago por transferencia | No |
| `META_PIXEL_ID` | Medir ventas de publicidades de Instagram | No |
| `RESEND_FROM` | Email de confirmación al cliente (dominio propio) | No |

En el editor, la pestaña **Estado** muestra qué está configurado y qué falta.

---

## Antes de abrir: compra de prueba

1. Con las credenciales de **prueba** de Mercado Pago, hacé una compra con envío.
2. Revisá: te llega el email, el pedido aparece en el editor y el envío en Zipnova (cancelalo ahí si era de prueba).
3. Cambiá a las credenciales de **producción**.

## Lo que se cambia en `js/productos.js` (pedíselo a Claude)

- Productos, fotos, precios, talles y colores.
- Envío gratis (`envio.gratisDesde`), descuento por monto (`descuento`) y por transferencia (`transferencia`).
- Peso y medidas del paquete (`envio.cajas`): el correo cobra según eso.
- Retiro en persona (`local.direccion`): con una dirección aparece la opción gratis en el checkout.
