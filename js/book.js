/* Sai Inn booking flow: 3 steps, room picker with photos, offers + loyalty */

(function () {
  const form = document.getElementById("booking-form");
  if (!form) return;

  const els = {
    checkin: document.getElementById("bk-checkin"),
    checkout: document.getElementById("bk-checkout"),
    guests: document.getElementById("bk-guests"),
    name: document.getElementById("bk-name"),
    phone: document.getElementById("bk-phone"),
    email: document.getElementById("bk-email"),
    requests: document.getElementById("bk-requests"),
    website: document.getElementById("bk-website"),
    nights: document.getElementById("bk-nights"),
    estimate: document.getElementById("bk-estimate"),
    summary: document.getElementById("bk-summary"),
    pickList: document.getElementById("room-pick-list")
  };

  /* preselect from ?room= if it exists */
  const params = new URLSearchParams(location.search);
  let selectedRoom = SAI.rooms.find((r) => r.name === params.get("room")) || SAI.rooms[0];

  /* offer from ?offer=CODE */
  const offerCode = (params.get("offer") || "").toUpperCase();
  const offer = offerCode ? (SAI.offers || []).find((o) => (o.code || "").toUpperCase() === offerCode) : null;

  /* guest session: loyalty */
  let guest = null;
  fetch("api/account.php?action=me", { credentials: "same-origin" })
    .then((r) => r.json().catch(() => ({})))
    .then((d) => {
      if (d.ok && d.authed) {
        guest = { name: d.user.name, stays: d.stays, discount_pct: d.tier.discount_pct, tier: d.tier.name };
        renderSummary();
        renderPicker();
      }
    })
    .catch(() => {});

  const today = new Date();
  const todayIso = today.toISOString().split("T")[0];
  els.checkin.min = todayIso;
  els.checkin.value = todayIso;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  els.checkout.min = tomorrow.toISOString().split("T")[0];
  els.checkout.value = tomorrow.toISOString().split("T")[0];

  function nights() {
    if (!els.checkin.value || !els.checkout.value) return 0;
    const a = new Date(els.checkin.value);
    const b = new Date(els.checkout.value);
    const diff = Math.round((b - a) / 86400000);
    return diff > 0 ? diff : 0;
  }

  function discountPct() {
    let pct = offer ? offer.discount_pct : 0;
    if (guest && guest.discount_pct > pct) pct = guest.discount_pct;
    return pct;
  }

  function money(v) {
    return "KSh " + Math.round(v).toLocaleString();
  }

  function renderSummary() {
    const n = nights();
    const pct = discountPct();
    const raw = selectedRoom.price * n;
    const total = raw - (raw * pct) / 100;
    els.nights.textContent = n === 1 ? "1 night" : n + " nights";
    els.estimate.textContent = n > 0
      ? "Estimated total: " + money(total)
      : "";

    const gal = (selectedRoom.gallery && selectedRoom.gallery.length ? selectedRoom.gallery : [selectedRoom.img]);
    const mainSrc = SAI_ASSET(gal[0]);
    const main = mainSrc
      ? '<a href="#" data-lightbox="' + mainSrc + '" class="bk-media-link"><img src="' + mainSrc + '" alt="' + selectedRoom.name + '">' +
        '<span class="bk-ribbon">Your room</span></a>'
      : '<div class="bk-media"><span class="no-img">' + selectedRoom.name.charAt(0) + '</span><span class="bk-ribbon">Your room</span></div>';
    const thumbs = gal.length > 1
      ? '<div class="bk-thumbs">' + gal.map((g, i) => {
          const s = SAI_ASSET(g);
          return s ? '<a href="#" data-lightbox="' + s + '">' +
            '<img src="' + s + '" alt="' + selectedRoom.name + ' photo ' + (i + 1) + '">' +
            (i === 0 ? '<span class="t-main">Main</span>' : "") + '</a>' : "";
        }).join("") + '</div>'
      : "";

    const chips = [];
    if (offer) chips.push('<span class="bk-chip gold">' + offer.discount_pct + '% off, code ' + offerCode + '</span>');
    if (guest && guest.discount_pct > 0 && (!offer || guest.discount_pct > offer.discount_pct)) {
      chips.push('<span class="bk-chip">Loyalty: ' + guest.discount_pct + '% off (' + guest.tier + ')</span>');
    }
    if (guest) chips.push('<span class="bk-chip dim">Signed in as ' + guest.name + '</span>');

    els.summary.innerHTML =
      main + thumbs +
      '<div class="bk-body">' +
        '<h3>' + selectedRoom.name + '</h3>' +
        '<div class="bk-price">' + money(selectedRoom.price) + ' / night, bed and breakfast</div>' +
        (chips.length ? '<div class="bk-chips">' + chips.join("") + '</div>' : "") +
        '<div class="sum-line"><span>Dates</span><span>' + (n > 0 ? els.checkin.value + " to " + els.checkout.value : "Pick your dates") + '</span></div>' +
        '<div class="sum-line"><span>Guests</span><span>' + els.guests.value + '</span></div>' +
        (pct > 0
          ? '<div class="sum-line save"><span>You save</span><span>' + money((raw * pct) / 100) + '</span></div>'
          : "") +
        '<div class="sum-line total"><span>Estimated total</span><span>' + (n > 0 ? money(total) : money(selectedRoom.price) + " / night") + '</span></div>' +
        '<p class="form-note">We call you to confirm and hold the room. Nothing is charged today.</p>' +
      '</div>';
  }

  function renderPicker() {
    els.pickList.innerHTML = SAI.rooms.map((r) => {
      const img = SAI_ASSET(r.img);
      const pic = img
        ? '<img src="' + img + '" alt="' + r.name + '">'
        : '<span class="rp-noimg">' + r.name.charAt(0) + '</span>';
      return '<button type="button" class="room-pick-card' + (r.id === selectedRoom.id ? " selected" : "") + '" data-id="' + r.id + '">' +
        pic +
        '<span class="rp-info"><span class="nm">' + r.name + '</span><br><span class="pr">' + money(r.price) + ' / night</span></span>' +
        '<span class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6 9 17l-5-5"/></svg></span>' +
      '</button>';
    }).join("");
    els.pickList.querySelectorAll(".room-pick-card").forEach((card) => {
      card.addEventListener("click", () => {
        selectedRoom = SAI.rooms.find((r) => r.id === card.dataset.id) || selectedRoom;
        renderPicker();
        renderSummary();
      });
    });
  }

  function updateMeta() {
    renderSummary();
  }
  els.checkin.addEventListener("change", () => { els.checkout.min = els.checkin.value; updateMeta(); });
  els.checkout.addEventListener("change", updateMeta);
  els.guests.addEventListener("change", updateMeta);
  renderPicker();
  renderSummary();

  function showPanel(n) {
    document.querySelectorAll(".bpanel").forEach((p) => {
      p.hidden = p.dataset.panel !== String(n);
    });
    document.querySelectorAll(".bstep").forEach((s) => {
      s.classList.toggle("active", Number(s.dataset.step) <= n);
      if (Number(s.dataset.step) === n) s.classList.add("current");
      else s.classList.remove("current");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.getElementById("bk-next-1").addEventListener("click", () => {
    if (!els.checkin.value || !els.checkout.value) {
      els.checkin.focus();
      return;
    }
    if (nights() <= 0) {
      els.checkout.focus();
      return;
    }
    showPanel(2);
  });
  document.getElementById("bk-back-2").addEventListener("click", () => showPanel(1));
  document.getElementById("bk-next-2").addEventListener("click", () => {
    if (!els.name.value.trim() || !els.phone.value.trim()) {
      els.name.focus();
      return;
    }
    const n = nights();
    const pct = discountPct();
    const raw = selectedRoom.price * n;
    document.getElementById("rv-dates").textContent =
      els.checkin.value + " to " + els.checkout.value + " (" + (n === 1 ? "1 night" : n + " nights") + ")";
    document.getElementById("rv-guests").textContent = els.guests.value + (els.guests.value === "1" ? " guest" : " guests");
    document.getElementById("rv-room").textContent = selectedRoom.name;
    document.getElementById("rv-name").textContent = els.name.value.trim();
    document.getElementById("rv-phone").textContent = els.phone.value.trim();
    document.getElementById("rv-total").textContent = money(raw - (raw * pct) / 100);
    const saveRow = document.getElementById("rv-save");
    if (saveRow) {
      if (pct > 0) {
        saveRow.hidden = false;
        saveRow.querySelector("span:last-child").textContent = money((raw * pct) / 100) + " off";
      } else {
        saveRow.hidden = true;
      }
    }
    showPanel(3);
  });
  document.getElementById("bk-back-3").addEventListener("click", () => showPanel(2));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("bk-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending";

    const payload = {
      name: els.name.value.trim(),
      phone: els.phone.value.trim(),
      email: els.email.value.trim(),
      checkin: els.checkin.value,
      checkout: els.checkout.value,
      guests: Number(els.guests.value),
      room_type: selectedRoom.name,
      requests: els.requests.value.trim(),
      website: els.website.value,
      offer_code: offerCode || ""
    };

    try {
      const res = await fetch("api/bookings.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok !== true) {
        throw new Error(data.error || "Something went wrong.");
      }
      form.hidden = true;
      document.querySelector(".booking-steps").hidden = true;
      document.querySelector(".bk-side").hidden = true;
      const confirmBox = document.getElementById("bk-confirm");
      confirmBox.hidden = false;
      const n = nights();
      const raw = selectedRoom.price * n;
      const disc = data.discount || 0;
      document.getElementById("bk-confirm-text").textContent =
        "We will call " + payload.phone + " to confirm your " +
        selectedRoom.name + " from " + payload.checkin + " to " + payload.checkout + "." +
        (disc > 0 ? " Your price is " + money(raw - (raw * disc) / 100) + ", with " + disc + "% off applied." : "");
      const refValue = document.getElementById("bk-ref-value");
      refValue.textContent = data.ref;
      const copyBtn = document.getElementById("bk-ref-copy");
      function copyRef() {
        const ref = refValue.textContent;
        if (!ref) return;
        const done = () => { copyBtn.textContent = "Copied"; setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(ref).then(done).catch(() => { fallback(); });
        } else {
          fallback();
        }
        function fallback() {
          const range = document.createRange();
          range.selectNodeContents(refValue);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          try { document.execCommand("copy"); done(); } catch (e) {}
          sel.removeAllRanges();
        }
      }
      copyBtn.addEventListener("click", copyRef);
      if (guest) {
        document.getElementById("bk-my-booking").hidden = false;
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const note = document.createElement("div");
      note.className = "send-note";
      note.textContent = err.message || "We could not reach the booking desk. Try again, or call 0726 071 111.";
      note.style.marginTop = "1rem";
      submitBtn.disabled = false;
      submitBtn.textContent = "Send booking request";
      const panel = form.querySelector('[data-panel="3"]');
      if (!panel.querySelector(".send-note")) panel.appendChild(note);
    }
  });
})();
