/* Sai Inn order cart: storage, badges, toast */

(function () {
  const KEY = "sai_cart";

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((i) => i && i.id && Number(i.qty) > 0);
    } catch (e) {
      return [];
    }
  }

  /* drop items whose dish no longer exists in the menu, so stale
     entries from older sessions can never ghost the badge or cart */
  function valid(list) {
    if (!SAI || !SAI.menu || !SAI.menu.length) return list;
    const known = {};
    SAI.menu.forEach((m) => { known[m.id] = true; });
    const good = list.filter((i) => known[i.id]);
    if (good.length !== list.length) write(good);
    return good;
  }

  function write(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
  }

  function items() { return valid(read()); }

  function count() {
    return items().reduce((n, i) => n + Number(i.qty), 0);
  }

  function total() {
    return items().reduce((sum, i) => {
      const dish = SAI.menu.find((m) => m.id === i.id);
      if (!dish || dish.price === null) return sum;
      return sum + dish.price * Number(i.qty);
    }, 0);
  }

  function add(id, qty) {
    const list = items();
    const found = list.find((i) => i.id === id);
    if (found) found.qty = Number(found.qty) + Number(qty);
    else list.push({ id: id, qty: Number(qty) });
    write(list);
    refresh();
  }

  function setQty(id, qty) {
    const list = items();
    const found = list.find((i) => i.id === id);
    if (!found) return;
    if (Number(qty) <= 0) list.splice(list.indexOf(found), 1);
    else found.qty = Number(qty);
    write(list);
    refresh();
  }

  function remove(id) {
    write(items().filter((i) => i.id !== id));
    refresh();
  }

  function clear() {
    write([]);
    refresh();
  }

  function refresh() {
    const n = count();
    document.querySelectorAll(".cart-fab .badge").forEach((b) => {
      b.textContent = n;
    });
    document.querySelectorAll(".cart-fab").forEach((f) => {
      f.classList.toggle("show", n > 0);
      f.setAttribute("aria-hidden", n === 0 ? "true" : "false");
    });
    document.querySelectorAll("#header-cart-badge").forEach((b) => {
      b.textContent = n;
      b.hidden = n === 0;
    });
  }

  let toastTimer = null;
  function showToast(message, linkText, href) {
    const toast = document.querySelector(".toast");
    if (!toast) return;
    toast.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = message;
    toast.appendChild(span);
    if (linkText) {
      const a = document.createElement("a");
      a.textContent = linkText;
      a.href = href || "order.html";
      toast.appendChild(a);
    }
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 5000);
  }

  window.SAICART = {
    items: items,
    count: count,
    total: total,
    add: add,
    setQty: setQty,
    remove: remove,
    clear: clear,
    refresh: refresh,
    showToast: showToast
  };

  refresh();
})();
