# POWER UP — Store

Tienda online de ropa de [@powerup.store1](https://www.instagram.com/powerup.store1/). Blanco y negro, sin grises.

Es un sitio estático (HTML + CSS + JS), no necesita instalar nada: abrí `index.html` en el navegador.

## Qué editar

Todo lo de la tienda está en **`js/productos.js`**:

- **`CONFIG.whatsapp`**: tu número con código de país, sin `+` ni espacios (ej: `5491112345678`). Los pedidos del carrito llegan ahí.
- **`PRODUCTOS`**: nombre, precio, talles, categoría, descripción y etiqueta de cada prenda.
- **Fotos**: subí las fotos a la carpeta `img/` y poné la ruta en `imagen` (ej: `"img/hoodie-negro.jpg"`). Se muestran en blanco y negro automáticamente. Si no hay foto, se muestra un dibujo de la prenda.
- **`drop: true`**: el producto aparece en la sección "El Drop" (se muestran los primeros 3).

## Publicar gratis

- **GitHub Pages**: Settings → Pages → Branch `main` / root.
- **Netlify**: arrastrá la carpeta del proyecto a app.netlify.com/drop.
