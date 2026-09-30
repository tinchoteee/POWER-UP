/* =========================================================
   POWER UP — lógica de la tienda
   ========================================================= */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const formatPrice = (n) => CONFIG.moneda + n.toLocaleString("es-AR");
const whatsappLink = (text = "") =>
  `https://wa.me/${CONFIG.whatsapp}${text ? "?text=" + encodeURIComponent(text) : ""}`;

/* ---------- Arte SVG de las prendas (se usa si no hay foto) ---------- */
const SHAPES = {
  remera: `<path d="M60 30 L85 22 Q100 38 115 22 L140 30 L176 62 L155 84 L140 73 L140 178 L60 178 L60 73 L45 84 L24 62 Z"/>
           <text x="100" y="92" text-anchor="middle" class="logo-txt">POWER UP</text>`,
  buzo: `<path d="M70 42 Q70 12 100 12 Q130 12 130 42 L150 50 L178 152 L158 158 L140 92 L140 182 L60 182 L60 92 L42 158 L22 152 L50 50 Z"/>
         <path d="M76 134 H124 L132 164 H68 Z" fill="none"/>
         <text x="100" y="100" text-anchor="middle" class="logo-txt">POWER UP</text>`,
  pantalon: `<path d="M62 18 H138 L152 186 H112 L100 72 L88 186 H48 Z"/>
             <path d="M62 30 H138" fill="none"/>`,
  gorra: `<path d="M42 122 Q42 58 100 58 Q158 58 158 122 Z"/>
          <path d="M100 122 H184 Q184 140 158 140 H42 Q42 130 42 122 Z"/>
          <text x="100" y="104" text-anchor="middle" class="logo-txt">PU</text>`,
  bolso: `<path d="M76 72 Q76 28 100 28 Q124 28 124 72" fill="none"/>
          <path d="M52 72 H148 L154 182 H46 Z"/>
          <text x="100" y="134" text-anchor="middle" class="logo-txt">POWER UP</text>`,
};

function productArt(p) {
  if (p.imagen) return `<img src="${p.imagen}" alt="${p.nombre}" loading="lazy" />`;
  const dark = p.tono !== "blanco";
  const fill = dark ? "#000" : "#fff";
  const stroke = dark ? "#fff" : "#000";
  return `
    <div class="art art--${dark ? "negro" : "blanco"}" role="img" aria-label="${p.nombre}">
      <div class="art__bg">POWER<br>UP</div>
      <svg viewBox="0 0 200 200" fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round">
        <style>.logo-txt{font:400 15px Anton,Impact,sans-serif;fill:${stroke};stroke:none;letter-spacing:1px}</style>
        ${SHAPES[p.tipo] || SHAPES.remera}
      </svg>
    </div>`;
}

function cardHTML(p) {
  return `
    <article class="card" data-id="${p.id}" data-cat="${p.categoria}">
      <div class="card__media">
        ${p.etiqueta ? `<span class="card__tag">${p.etiqueta}</span>` : ""}
        ${productArt(p)}
        <span class="card__quick">+ VER Y AGREGAR</span>
      </div>
      <div class="card__info">
        <div>
          <h3 class="card__name">${p.nombre}</h3>
          <p class="card__cat">${p.detalle || p.categoria}</p>
        </div>
        <span class="card__price">${formatPrice(p.precio)}</span>
      </div>
    </article>`;
}

/* ---------- Render ---------- */
$("#dropGrid").innerHTML = PRODUCTOS.filter((p) => p.drop).slice(0, 3).map(cardHTML).join("");
$("#productGrid").innerHTML = PRODUCTOS.map(cardHTML).join("");

/* ---------- Filtros ---------- */
function applyFilter(cat) {
  $$(".filter").forEach((b) => b.classList.toggle("is-active", b.dataset.filter === cat));
  $$("#productGrid .card").forEach((c) => {
    c.classList.toggle("is-hidden", cat !== "todos" && c.dataset.cat !== cat);
  });
}
$("#filters").addEventListener("click", (e) => {
  const btn = e.target.closest(".filter");
  if (btn) applyFilter(btn.dataset.filter);
});
$$("a[data-cat]").forEach((c) => c.addEventListener("click", () => applyFilter(c.dataset.cat)));

/* ---------- Modal de producto ---------- */
const modal = $("#modal");
let current = null;
let selectedSize = null;

function openModal(id) {
  current = PRODUCTOS.find((p) => p.id === id);
  if (!current) return;
  selectedSize = current.talles.length === 1 ? current.talles[0] : null;
  $("#modalMedia").innerHTML = productArt(current);
  $("#modalCat").textContent = current.categoria;
  $("#modalName").textContent = current.nombre;
  $("#modalPrice").textContent = formatPrice(current.precio);
  $("#modalDesc").textContent = current.descripcion || "";
  $("#modalSizes").innerHTML = current.talles
    .map((t) => `<button class="size ${t === selectedSize ? "is-active" : ""}" data-size="${t}">${t}</button>`)
    .join("");
  updateAsk();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function updateAsk() {
  const talle = selectedSize && current.talles.length > 1 ? ` en talle ${selectedSize}` : "";
  $("#modalAsk").href = whatsappLink(`¡Hola POWER UP! Quiero consultar por ${current.nombre}${talle} (${formatPrice(current.precio)}). ¿Tienen stock?`);
}
function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (card) openModal(card.dataset.id);
});
$("#modalClose").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
$("#modalSizes").addEventListener("click", (e) => {
  const btn = e.target.closest(".size");
  if (!btn) return;
  selectedSize = btn.dataset.size;
  $$(".size").forEach((s) => s.classList.toggle("is-active", s === btn));
  updateAsk();
});
$("#modalAdd").addEventListener("click", () => {
  if (!selectedSize) {
    const sizes = $("#modalSizes");
    sizes.classList.remove("shake");
    void sizes.offsetWidth;
    sizes.classList.add("shake");
    toast("Elegí un talle");
    return;
  }
  addToCart(current.id, selectedSize);
  closeModal();
  toast(`${current.nombre} (${selectedSize}) agregado`);
});

/* ---------- Carrito ---------- */
const CART_KEY = "powerup_cart";
let cart = [];
try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { cart = []; }
cart = cart.filter((i) => PRODUCTOS.some((p) => p.id === i.id));

const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} };

function addToCart(id, size) {
  const item = cart.find((i) => i.id === id && i.size === size);
  if (item) item.qty++;
  else cart.push({ id, size, qty: 1 });
  saveCart();
  renderCart();
  const count = $("#cartCount");
  count.classList.remove("bump");
  void count.offsetWidth;
  count.classList.add("bump");
}

function renderCart() {
  const total = cart.reduce((s, i) => s + PRODUCTOS.find((p) => p.id === i.id).precio * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  $("#cartCount").textContent = count;
  $("#cartTotal").textContent = formatPrice(total);
  $("#checkout").disabled = cart.length === 0;
  $("#checkout").style.opacity = cart.length ? 1 : 0.4;

  if (!cart.length) {
    $("#cartItems").innerHTML = `<div class="cart__empty"><strong>VACÍO</strong>Todavía no sumaste nada.</div>`;
    return;
  }
  $("#cartItems").innerHTML = cart
    .map((i, idx) => {
      const p = PRODUCTOS.find((x) => x.id === i.id);
      return `
        <div class="cart-item">
          <div class="cart-item__img">${productArt(p)}</div>
          <div>
            <p class="cart-item__name">${p.nombre}</p>
            <p class="cart-item__meta">Talle ${i.size}</p>
            <div class="qty">
              <button data-act="minus" data-idx="${idx}" aria-label="Restar">−</button>
              <span>${i.qty}</span>
              <button data-act="plus" data-idx="${idx}" aria-label="Sumar">+</button>
            </div>
          </div>
          <div class="cart-item__right">
            <span class="cart-item__price">${formatPrice(p.precio * i.qty)}</span>
            <button class="cart-item__remove" data-act="remove" data-idx="${idx}">Quitar</button>
          </div>
        </div>`;
    })
    .join("");
}

$("#cartItems").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const idx = +btn.dataset.idx;
  if (btn.dataset.act === "plus") cart[idx].qty++;
  if (btn.dataset.act === "minus") cart[idx].qty--;
  if (btn.dataset.act === "remove" || cart[idx].qty < 1) cart.splice(idx, 1);
  saveCart();
  renderCart();
});

const openCart = () => { $("#cart").classList.add("is-open"); $("#overlay").classList.add("is-open"); };
const closeCart = () => { $("#cart").classList.remove("is-open"); $("#overlay").classList.remove("is-open"); };
$("#cartOpen").addEventListener("click", openCart);
$("#cartClose").addEventListener("click", closeCart);
$("#overlay").addEventListener("click", closeCart);

$("#checkout").addEventListener("click", () => {
  if (!cart.length) return;
  let total = 0;
  const lines = cart.map((i) => {
    const p = PRODUCTOS.find((x) => x.id === i.id);
    total += p.precio * i.qty;
    return `• ${i.qty}x ${p.nombre} — Talle ${i.size} — ${formatPrice(p.precio * i.qty)}`;
  });
  const msg = `¡Hola POWER UP! ⚡ Quiero hacer este pedido:\n\n${lines.join("\n")}\n\nTOTAL: ${formatPrice(total)}\n\n¿Cómo seguimos con el pago y el envío?`;
  window.open(whatsappLink(msg), "_blank");
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeModal(); closeCart(); }
});

/* ---------- Menú mobile ---------- */
const burger = $("#burger");
burger.addEventListener("click", () => {
  const open = burger.classList.toggle("is-open");
  $("#nav").classList.toggle("is-open", open);
  $("#header").classList.toggle("menu-open", open);
  document.body.style.overflow = open ? "hidden" : "";
});
$$("#nav a").forEach((a) =>
  a.addEventListener("click", () => {
    burger.classList.remove("is-open");
    $("#nav").classList.remove("is-open");
    $("#header").classList.remove("menu-open");
    document.body.style.overflow = "";
  })
);

/* ---------- Toast ---------- */
let toastTimer;
function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-show"), 2200);
}

/* ---------- Animaciones al scrollear ---------- */
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("is-in");
      const counter = en.target.querySelector("[data-count]");
      if (counter) countUp(counter);
      io.unobserve(en.target);
    });
  },
  { threshold: 0.15 }
);
$$(".reveal").forEach((el) => io.observe(el));

function countUp(el) {
  const end = +el.dataset.count;
  const start = performance.now();
  const dur = 1400;
  const step = (now) => {
    const t = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(end * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- Cursor ---------- */
const cursor = $(".cursor");
if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
  let x = 0, y = 0, cx = 0, cy = 0;
  document.addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; });
  (function loop() {
    cx += (x - cx) * 0.2;
    cy += (y - cy) * 0.2;
    cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  })();
  document.addEventListener("mouseover", (e) => {
    cursor.classList.toggle("is-hover", !!e.target.closest("a, button, .card, summary"));
  });
}

/* ---------- Varios ---------- */
$$("[data-wa]").forEach((a) => (a.href = whatsappLink(a.dataset.wa)));
$("#year").textContent = new Date().getFullYear();
renderCart();
