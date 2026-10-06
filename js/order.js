/* Sai Inn order page: cart table */

(function () {
  const wrap = document.getElementById("order-table-wrap");
  const proceed = document.getElementById("proceed-btn");
  if (!wrap) return;

  function row(i) {
    const dish = SAI.menu.find((m) => m.id === i.id);
    if (!dish) return "";
    const unit = dish.price === null ? 0 : dish.price;
    const thumb = dish.img
      ? '<img src="' + SAI_ASSET(dish.img) + '" alt="' + dish.name + '">'
      : '<span class="thumb">' + dish.name.charAt(0) + '</span>';
    return (
      '<tr>' +
        '<td class="item-cell">' + thumb +
          '<div><div class="nm">' + dish.name + '</div>' +
          '<div class="pr">' + (dish.price === null ? "Ask for price" : "KSh " + unit.toLocaleString() + ' each') + '</div></div>' +
        '</td>' +
        '<td class="hide-m"><span class="qty-box">' +
          '<button type="button" data-act="minus" data-id="' + i.id + '">&minus;</button>' +
          '<span class="qty-num">' + i.qty + '</span>' +
          '<button type="button" data-act="plus" data-id="' + i.id + '">+</button>' +
        '</span></td>' +
        '<td><strong>KSh ' + (unit * i.qty).toLocaleString() + '</strong></td>' +
        '<td><button class="remove-btn" data-act="remove" data-id="' + i.id + '">Remove</button></td>' +
      '</tr>'
    );
  }

  function render() {
    const items = SAICART.items();
    if (!items.length) {
      wrap.innerHTML =
        '<div class="empty-state"><div class="big">Your order is empty</div>' +
        '<p>Pick something from the menu first. The kitchen is ready.</p>' +
        '<a class="btn btn-gold" href="dining.html">Browse the menu</a></div>';
      if (proceed) {
        proceed.setAttribute("aria-disabled", "true");
        proceed.classList.add("dim");
        proceed.style.opacity = "0.5";
        proceed.style.pointerEvents = "none";
        proceed.disabled = true;
      }
      return;
    }
    const total = SAICART.total();
    wrap.innerHTML =
      '<table class="order-table">' +
        '<thead><tr><th>Item</th><th class="hide-m">Quantity</th><th>Subtotal</th><th></th></tr></thead>' +
        '<tbody>' + items.map(row).join("") +
        '<tr class="order-total-row"><td colspan="2">Total</td><td colspan="2">KSh ' + total.toLocaleString() + '</td></tr>' +
        '</tbody>' +
      '</table>';
    if (proceed) {
      proceed.setAttribute("aria-disabled", "false");
      proceed.classList.remove("dim");
      proceed.style.opacity = "";
      proceed.style.pointerEvents = "";
      proceed.disabled = false;
    }
    wrap.querySelectorAll("[data-act]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.dataset.id;
        const act = b.dataset.act;
        if (act === "remove") SAICART.remove(id);
        else if (act === "plus") SAICART.setQty(id, (items.find((x) => x.id === id) || { qty: 0 }).qty + 1);
        else SAICART.setQty(id, (items.find((x) => x.id === id) || { qty: 0 }).qty - 1);
        render();
      });
    });
  }

  render();
})();
