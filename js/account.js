/* Sai Inn account page: sign in, create account, booking history, loyalty */

(function () {
  /* ---------- account page ---------- */
  /* password show/hide on every password field */
  document.querySelectorAll(".pw-eye").forEach((btn) => {
    btn.addEventListener("click", () => {
      const wrap = btn.closest(".pw-wrap");
      if (!wrap) return;
      const inp = wrap.querySelector("input");
      if (!inp) return;
      const show = inp.type === "password";
      inp.type = show ? "text" : "password";
      btn.classList.toggle("on", show);
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });

  const root = document.getElementById("account-root");
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const next = params.get("next") || "";
  const offerCode = params.get("offer") || "";

  const authBox = document.getElementById("acc-auth");
  const dashBox = document.getElementById("acc-dash");
  const headTitle = document.getElementById("acc-title");
  const headSub = document.getElementById("acc-sub");

  const STATUS_LABELS = {
    "new": "Received. We will call you to confirm.",
    "confirmed": "Confirmed. Your room is held.",
    "cancelled": "Cancelled.",
    "completed": "Completed."
  };

  function showAuth(mode) {
    authBox.hidden = false;
    dashBox.hidden = true;
    document.getElementById("acc-login").hidden = mode !== "login";
    document.getElementById("acc-register").hidden = mode !== "register";
    document.querySelectorAll("#acc-tabs .pill-tab").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === mode);
    });
  }

  function showDash(d) {
    authBox.hidden = true;
    dashBox.hidden = false;
    headTitle.textContent = "Karibu, " + d.user.name;
    headSub.textContent = "Your bookings, in one place.";

    const tier = d.tier;
    const rows = (d.bookings || []).map((b) => {
      const total = b.discount > 0
        ? '<span class="disc-tag">' + b.discount + '% off</span>'
        : "";
      return '<tr>' +
        '<td><span class="ref-cell">' + b.ref + '</span> <button type="button" class="ref-copy btn btn-sm btn-line" data-ref="' + b.ref + '">Copy</button></td>' +
        '<td>' + b.room_type + '</td>' +
        '<td>' + b.checkin + ' to ' + b.checkout + '</td>' +
        '<td><span class="status-pill st-' + b.status + '">' + b.status + '</span></td>' +
        '<td>' + total + '</td>' +
        '</tr>';
    }).join("");

    const offers = (SAI.offers || []).map((o) =>
      '<div class="offer-row">' +
        '<div class="offer-row-head"><strong>' + o.title + '</strong>' +
        '<span class="offer-pct-sm">' + o.discount_pct + '% off</span></div>' +
        '<p>' + o.text + '</p>' +
        '<a class="btn btn-sm btn-gold" href="book?offer=' + encodeURIComponent(o.code || "") + '">Apply offer</a>' +
      '</div>'
    ).join("");

    dashBox.innerHTML =
      '<div class="pill-tabs acc-tabs">' +
        '<button class="pill-tab active" data-atab="stays">My stays</button>' +
        '<button class="pill-tab" data-atab="offers">Offers</button>' +
      '</div>' +
      '<div id="atab-stays">' +
        '<div class="acc-grid">' +
          '<div class="acc-card">' +
            '<span class="eyebrow">Loyalty</span>' +
            '<div class="tier-badge tier-' + tier.name.toLowerCase() + '">' + tier.name + '</div>' +
            '<p>' + d.stays + ' stay' + (d.stays === 1 ? "" : "s") + ' with us so far.</p>' +
            (tier.discount_pct > 0
              ? '<p class="form-note">You get ' + tier.discount_pct + '% off every booking you make while signed in.</p>'
              : '<p class="form-note">Reach 3 stays for 5% off, and 5 stays for 10% off, on every future booking.</p>') +
            '<div class="acc-actions">' +
              '<a class="btn btn-gold" href="book.html">Book your next stay</a>' +
              '<button class="btn btn-line" id="acc-signout">Sign out</button>' +
            '</div>' +
          '</div>' +
          '<div class="acc-card">' +
            '<span class="eyebrow">Your details</span>' +
            '<div class="sum-line"><span>Name</span><span>' + d.user.name + '</span></div>' +
            '<div class="sum-line"><span>Email</span><span>' + d.user.email + '</span></div>' +
            (d.user.phone ? '<div class="sum-line"><span>Phone</span><span>' + d.user.phone + '</span></div>' : "") +
          '</div>' +
        '</div>' +
        '<div class="acc-card">' +
          '<span class="eyebrow">Booking history</span>' +
          (rows
            ? '<table class="acc-table"><thead><tr><th>Reference</th><th>Room</th><th>Dates</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>'
            : '<p class="form-note">No bookings yet. Your reservations will appear here, and they add up to loyalty discounts.</p>') +
        '</div>' +
      '</div>' +
      '<div id="atab-offers" hidden>' +
        '<div class="acc-card">' +
          '<span class="eyebrow">Current offers</span>' +
          (offers || '<p class="form-note">No offers right now. Check back soon.</p>') +
        '</div>' +
      '</div>';

    document.getElementById("acc-signout").addEventListener("click", () => {
      try { localStorage.removeItem("sai_account_remember"); } catch (e) {}
      fetch("api/account.php?action=logout", { method: "POST", credentials: "same-origin" })
        .finally(() => { showAuth("login"); headTitle.textContent = "Your bookings, in one place"; headSub.textContent = "Sign in to see your history and loyalty discount."; });
    });
    document.querySelectorAll(".ref-copy").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ref = btn.dataset.ref;
        const done = () => { btn.textContent = "Copied"; setTimeout(() => { btn.textContent = "Copy"; }, 2000); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(ref).then(done).catch(() => {});
        } else {
          try {
            const ta = document.createElement("textarea");
            ta.value = ref;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
            done();
          } catch (e) {}
        }
      });
    });
    document.querySelectorAll(".acc-tabs .pill-tab").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll(".acc-tabs .pill-tab").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        document.getElementById("atab-stays").hidden = b.dataset.atab !== "stays";
        document.getElementById("atab-offers").hidden = b.dataset.atab !== "offers";
      });
    });
    if (window.SAIReveal) window.SAIReveal(dashBox);
  }

  function redirectAfterAuth() {
    if (next) {
      location.href = next + (offerCode ? "?offer=" + encodeURIComponent(offerCode) : "");
    }
  }

  /* auth tabs */
  document.querySelectorAll("#acc-tabs .pill-tab").forEach((b) => {
    b.addEventListener("click", () => showAuth(b.dataset.mode));
  });

  /* remember me on the public sign in */
  (function () {
    try {
      const saved = localStorage.getItem("sai_account_remember");
      if (saved) {
        const rem = JSON.parse(saved);
        const emailEl = document.getElementById("lg-email");
        const passEl = document.getElementById("lg-pass");
        const cb = document.getElementById("lg-remember");
        if (rem && rem.e && emailEl) {
          emailEl.value = rem.e;
          if (passEl) passEl.value = rem.p || "";
          if (cb) cb.checked = true;
        }
      }
    } catch (e) {}
  })();

  /* sign in */
  document.getElementById("acc-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("lg-err");
    err.hidden = true;
    try {
      const res = await fetch("api/account.php?action=login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: document.getElementById("lg-email").value.trim(),
          password: document.getElementById("lg-pass").value
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Sign in failed.");
      try {
        const cb = document.getElementById("lg-remember");
        if (cb && cb.checked) {
          localStorage.setItem("sai_account_remember", JSON.stringify({
            e: document.getElementById("lg-email").value.trim(),
            p: document.getElementById("lg-pass").value
          }));
        } else {
          localStorage.removeItem("sai_account_remember");
        }
      } catch (e2) {}
      redirectAfterAuth();
      loadMe();
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });

  /* create account */
  document.getElementById("acc-register").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("rg-err");
    err.hidden = true;
    try {
      const res = await fetch("api/account.php?action=register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: document.getElementById("rg-name").value.trim(),
          email: document.getElementById("rg-email").value.trim(),
          phone: document.getElementById("rg-phone").value.trim(),
          password: document.getElementById("rg-pass").value,
          reset_q: document.getElementById("rg-q").value,
          reset_a: document.getElementById("rg-a").value,
          website: document.querySelector("#acc-register input[name=website]").value
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not create the account.");
      redirectAfterAuth();
      loadMe();
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });

  /* forgot password flow: email -> question -> new password */
  const forgotLink = document.getElementById("forgot-link");
  const resetPanel = document.getElementById("acc-reset");
  const resetForm = document.getElementById("acc-reset-form");
  let resetStage = 0; // 0 = ask email, 1 = question + answer + new password
  if (forgotLink && resetPanel && resetForm) {
    forgotLink.addEventListener("click", () => {
      resetStage = 0;
      document.getElementById("acc-login").hidden = true;
      resetPanel.hidden = false;
      document.getElementById("rs-q-wrap").hidden = true;
      document.getElementById("rs-p-wrap").hidden = true;
      document.getElementById("rs-submit").textContent = "Find my account";
      document.getElementById("rs-err").hidden = true;
    });
    document.getElementById("rs-cancel").addEventListener("click", () => {
      resetPanel.hidden = true;
      document.getElementById("acc-login").hidden = false;
    });
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = document.getElementById("rs-err");
      err.hidden = true;
      try {
        if (resetStage === 0) {
          const res = await fetch("api/account.php?action=forgot", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: document.getElementById("rs-email").value.trim() })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");
          if (!data.question) {
            throw new Error("We could not find that account. Check the email, or call 0726 071 111.");
          }
          resetStage = 1;
          document.getElementById("rs-q-label").textContent = data.question;
          document.getElementById("rs-q-wrap").hidden = false;
          document.getElementById("rs-p-wrap").hidden = false;
          document.getElementById("rs-submit").textContent = "Reset password";
        } else {
          const res = await fetch("api/account.php?action=reset", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: document.getElementById("rs-email").value.trim(),
              answer: document.getElementById("rs-answer").value,
              password: document.getElementById("rs-pass").value
            })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) throw new Error(data.error || "Could not reset the password.");
          resetPanel.hidden = true;
          document.getElementById("acc-login").hidden = false;
          document.getElementById("lg-email").value = document.getElementById("rs-email").value.trim();
          document.getElementById("lg-err").textContent = "Password updated. Sign in with your new password.";
          document.getElementById("lg-err").hidden = false;
        }
      } catch (ex) {
        err.textContent = ex.message;
        err.hidden = false;
      }
    });
  }

  /* load account state */
  function loadMe() {
    fetch("api/account.php?action=me", { credentials: "same-origin" })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        if (d.ok && d.authed) {
          showDash(d);
          redirectAfterAuth();
        } else {
          showAuth("login");
        }
      })
      .catch(() => showAuth("login"));
  }
  loadMe();

  /* ---------- booking tracker (no account needed) ---------- */
  const trackForm = document.getElementById("track-form");
  const result = document.getElementById("track-result");
  if (trackForm) {
    const trRef = document.getElementById("tr-ref");
    const trPhone = document.getElementById("tr-phone");
    /* sign-in / create-account nudge above the tracker */
    document.getElementById("track-login-link").addEventListener("click", (e) => {
      e.preventDefault();
      showAuth("login");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.getElementById("track-register-link").addEventListener("click", (e) => {
      e.preventDefault();
      showAuth("register");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    /* prefill the phone from the account when signed in */
    fetch("api/account.php?action=me", { credentials: "same-origin" })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        if (d.ok && d.authed && d.user && d.user.phone && !trPhone.value) {
          trPhone.value = d.user.phone;
        }
      })
      .catch(() => {});
    trackForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const ref = trRef.value.trim();
      const phone = trPhone.value.trim();
      if (!ref) {
        result.hidden = false;
        result.innerHTML =
          '<div class="empty-state"><div class="big">Missing reference</div>' +
          '<p>Please enter the booking reference we gave you in order to continue.</p></div>';
        trRef.focus();
        return;
      }
      if (!phone) {
        result.hidden = false;
        result.innerHTML =
          '<div class="empty-state"><div class="big">Missing phone number</div>' +
          '<p>Please enter the phone number you used to make your booking in order to continue.</p></div>';
        trPhone.focus();
        return;
      }
      result.hidden = false;
      result.innerHTML = '<div class="empty-state"><div class="big">Checking</div><p>One moment.</p></div>';
      try {
        const res = await fetch("api/bookings.php?ref=" + encodeURIComponent(ref) + "&phone=" + encodeURIComponent(phone));
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");
        if (!data.found) {
          result.innerHTML =
            '<div class="empty-state"><div class="big">Not found</div>' +
            '<p>No booking matches that reference and phone number. Check the details we sent you, or call 0726 071 111.</p></div>';
          return;
        }
        const b = data.booking;
        const status = STATUS_LABELS[b.status] || b.status;
        result.innerHTML =
          '<div class="review-card">' +
            '<h3>Booking ' + b.ref + '</h3>' +
            '<div class="sum-line"><span>Status</span><span>' + status + '</span></div>' +
            '<div class="sum-line"><span>Name</span><span>' + b.name + '</span></div>' +
            '<div class="sum-line"><span>Dates</span><span>' + b.checkin + ' to ' + b.checkout + '</span></div>' +
            '<div class="sum-line"><span>Nights</span><span>' + b.nights + '</span></div>' +
            '<div class="sum-line"><span>Guests</span><span>' + b.guests + '</span></div>' +
            (b.room_type ? '<div class="sum-line"><span>Room</span><span>' + b.room_type + '</span></div>' : "") +
            '<p class="form-note">Questions? Call 0726 071 111 and quote your reference.</p>' +
          '</div>';
      } catch (err) {
        result.innerHTML =
          '<div class="empty-state"><div class="big">Could not check</div>' +
          '<p>' + (err.message || "Something went wrong.") + ' Call 0726 071 111 and we will check for you.</p></div>';
      }
    });
  }
})();
