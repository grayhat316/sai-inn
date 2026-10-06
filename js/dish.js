/* Sai Inn dish detail page */

(function () {
  const root = document.getElementById("dish-root");
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const dish = SAI.menu.find((m) => m.id === id);

  if (!dish) {
    root.innerHTML =
      '<div class="empty-state"><div class="big">We could not find that dish</div>' +
      '<p>It may have been taken off the menu.</p>' +
      '<a class="btn btn-gold" href="dining.html">Back to the menu</a></div>';
    return;
  }

  const imgs = (dish.images && dish.images.length) ? dish.images : (dish.img ? [dish.img] : []);
  const media = imgs[0]
    ? '<img src="' + SAI_ASSET(imgs[0]) + '" alt="' + dish.name + '">'
    : '<span class="no-img">' + dish.name.charAt(0) + '</span>';

  const gallery = imgs.length > 1
    ? '<div class="dish-gallery">' + imgs.slice(1).map((s) =>
        '<a href="#" data-lightbox="' + SAI_ASSET(s) + '"><img src="' + SAI_ASSET(s) + '" alt="' + dish.name + ' photo" loading="lazy"></a>'
      ).join("") + '</div>'
    : "";

  const desc = dish.desc
    ? dish.desc
    : "Prepared fresh in our kitchen from our own farm produce, under our Healthy Living Policy.";

  const priceHtml = dish.price === null
    ? '<div class="price-big">Ask for price</div>'
    : '<div class="price-big">KSh ' + dish.price.toLocaleString() + ' <small>per plate</small></div>';

  const related = SAI.menu.filter((m) => m.cat === dish.cat && m.id !== dish.id).slice(0, 4);

  root.innerHTML =
    '<div class="dish-layout">' +
      '<div class="dish-media">' + media + '</div>' +
      '<div class="dish-info">' +
        '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="dining.html">Menu</a> / <span>' + dish.cat + '</span></nav>' +
        '<h1>' + dish.name + '</h1>' +
        '<div class="meta-line">' + dish.cat + ' / Sai Inn Restaurant</div>' +
        priceHtml +
        '<p class="desc">' + desc + '</p>' +
        (window.SAI_orderedAgo ? '<div class="order-ago dish-ago">' + window.SAI_orderedAgo(dish.id, dish.cat) + '</div>' : "") +
        '<div class="add-row">' +
          '<span class="qty-box">' +
            '<button type="button" id="qty-minus" aria-label="Reduce quantity">&minus;</button>' +
            '<span class="qty-num" id="qty-num">1</span>' +
            '<button type="button" id="qty-plus" aria-label="Increase quantity">+</button>' +
          '</span>' +
          '<button class="btn btn-gold" id="add-btn">Add to order</button>' +
        '</div>' +
        (imgs.length > 1 ? '<p class="dish-gallery-note">More photos of this dish</p>' : "") +
      '</div>' +
    '</div>' +
    gallery +
    (related.length ?
      '<section class="section-tight"><div class="container">' +
        '<div class="sec-head"><span class="eyebrow">More from this category</span><h2>You may also like</h2></div>' +
        '<div class="dish-grid">' + related.map((m) =>
          '<article class="dish-card">' +
            '<div class="media">' + (m.img ? '<img src="' + SAI_ASSET(m.img) + '" alt="' + m.name + '" loading="lazy">' : '<span class="no-img">' + m.name.charAt(0) + '</span>') + '</div>' +
            '<div class="body"><h3>' + m.name + '</h3>' +
            '<div class="row"><span class="price">' + (m.price === null ? "Ask for price" : "KSh " + m.price.toLocaleString()) + '</span>' +
            '<a class="view-btn" href="dish.html?id=' + encodeURIComponent(m.id) + '">View</a></div></div>' +
          '</article>'
        ).join("") + '</div>' +
      '</div></section>' : "");

  const qtyNum = document.getElementById("qty-num");
  let qty = 1;
  document.getElementById("qty-minus").addEventListener("click", () => {
    if (qty > 1) { qty--; qtyNum.textContent = qty; }
  });
  document.getElementById("qty-plus").addEventListener("click", () => {
    if (qty < 20) { qty++; qtyNum.textContent = qty; }
  });
  document.getElementById("add-btn").addEventListener("click", () => {
    SAICART.add(dish.id, qty);
    SAICART.showToast("Added to order", "View order");
  });
})();
