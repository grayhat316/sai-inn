/* Sai Inn checkout page: form + summary + order straight to the dashboard */

(function () {
  const wrap = document.getElementById("checkout-wrap");
  if (!wrap) return;

  function renderEmpty() {
    wrap.innerHTML =
      '<div class="empty-state"><div class="big">Nothing to check out</div>' +
      '<p>Your order is empty. Add some dishes first.</p>' +
      '<a class="btn btn-gold" href="dining.html">Browse the menu</a></div>';
  }

  function lineItems() {
    return SAICART.items().map((i) => {
      const dish = SAI.menu.find((m) => m.id === i.id);
      if (!dish) return null;
      return { id: i.id, name: dish.name, qty: Number(i.qty), unit: dish.price === null ? 0 : dish.price };
    }).filter(Boolean);
  }

  function render() {
    const items = SAICART.items();
    if (!items.length) { renderEmpty(); return; }

    const lines = lineItems();
    const total = SAICART.total();

    const times = ["3:30 pm", "4:00 pm", "4:30 pm", "5:00 pm", "5:30 pm", "6:00 pm", "6:30 pm", "7:00 pm", "7:30 pm", "8:00 pm", "8:30 pm", "9:00 pm"];

    wrap.innerHTML =
      '<div class="form-grid">' +
        '<form id="checkout-form" novalidate>' +
          '<div class="field required"><label for="co-name">Your name</label><input id="co-name" name="name" type="text" required autocomplete="name"></div>' +
          '<div class="field required"><label for="co-phone">Phone number</label><input id="co-phone" name="phone" type="tel" required autocomplete="tel" placeholder="07XX XXX XXX">' +
            '<div class="hint">We call this number to confirm your order.</div></div>' +
          '<div class="field"><label for="co-email">Email (optional)</label><input id="co-email" name="email" type="email" autocomplete="email"></div>' +
          '<div class="field required"><label>Pickup or delivery</label>' +
            '<div class="radio-row">' +
              '<label class="radio-pill"><input type="radio" name="service" value="Pickup" checked> Pickup</label>' +
              '<label class="radio-pill"><input type="radio" name="service" value="Delivery"> Delivery</label>' +
            '</div>' +
          '</div>' +
          '<div class="field required"><label for="co-time">Time</label>' +
            '<select id="co-time" name="time" required>' + times.map((t) => '<option>' + t + '</option>').join("") + '</select>' +
          '</div>' +
          '<div class="field"><label for="co-notes">Notes (optional)</label><textarea id="co-notes" name="notes" rows="3" placeholder="Allergies, room number, landmark near you"></textarea></div>' +
          '<input type="text" name="website" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">' +
          '<div class="send-note" id="send-note" hidden></div>' +
          '<button class="btn btn-gold" type="submit">Send order</button>' +
        '</form>' +
        '<aside class="panel">' +
          '<h3>Your order</h3>' +
          lines.map((l) =>
            '<div class="sum-line"><span>' + l.qty + 'x ' + esc(l.name) + '</span><span>KSh ' + (l.unit * l.qty).toLocaleString() + '</span></div>'
          ).join("") +
          '<div class="sum-line total"><span>Total</span><span>KSh ' + total.toLocaleString() + '</span></div>' +
          '<p class="form-note">You pay when you receive the order. We will call to confirm everything first.</p>' +
        '</aside>' +
      '</div>';

    const form = document.getElementById("checkout-form");
    const sendNote = document.getElementById("send-note");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      const f = {
        name: document.getElementById("co-name").value.trim(),
        phone: document.getElementById("co-phone").value.trim(),
        email: document.getElementById("co-email").value.trim(),
        service: form.querySelector('input[name="service"]:checked').value,
        time: document.getElementById("co-time").value,
        notes: document.getElementById("co-notes").value.trim(),
        website: form.querySelector('input[name="website"]').value
      };
      if (!f.name || !f.phone) return;
      btn.disabled = true;
      btn.textContent = "Sending";
      sendNote.hidden = true;
      fetch("api/orders.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: f.name, phone: f.phone, email: f.email, service: f.service, time: f.time, notes: f.notes, website: f.website, items: lines })
      })
        .then((r) => r.json().catch(() => ({})))
        .then((d) => {
          if (!d || !d.ok) throw new Error((d && d.error) || "Could not send your order.");
          SAICART.clear();
          wrap.innerHTML =
            '<div class="empty-state"><div class="big">Order sent</div>' +
            '<p>Your order reached our kitchen. We will call ' + f.phone + ' to confirm the time and the total.</p>' +
            '<a class="btn btn-gold" href="dining.html">Order something else</a></div>';
        })
        .catch((err) => {
          sendNote.hidden = false;
          sendNote.textContent = (err && err.message) || "We could not send your order. Try again, or call 0726 071 111.";
          btn.disabled = false;
          btn.textContent = "Send order";
        });
    });
  }

  render();
})();
