/* Sai Inn admin app: auth, routing, CRUD for every section */

(function () {
  "use strict";

  var csrf = sessionStorage.getItem("sai_csrf") || "";
  var currentView = null;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function toast(msg, kind) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.className = "toast show " + (kind || "");
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  /* modal */
  function openModal(title, bodyHTML, onSubmit) {
    var backdrop = document.getElementById("modal-backdrop");
    var modal = document.getElementById("modal");
    modal.innerHTML = "<h2>" + esc(title) + "</h2>" + bodyHTML +
      '<div class="ops"><button type="button" class="btn btn-line" id="modal-cancel">Cancel</button>' +
      '<button type="button" class="btn btn-gold" id="modal-save">Save</button></div>';
    backdrop.hidden = false;
    document.getElementById("modal-cancel").addEventListener("click", closeModal);
    document.getElementById("modal-save").addEventListener("click", function (e) {
      if (onSubmit) onSubmit(e, closeModal);
    });
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) closeModal(); });
  }
  function closeModal() {
    document.getElementById("modal-backdrop").hidden = true;
    document.getElementById("modal").innerHTML = "";
  }

  function confirmDialog(message, onYes) {
    openModal("Are you sure?", '<p style="color:#545454;">' + esc(message) + '</p>', function (e, close) {
      close();
      onYes();
    });
  }

  /* api */
  async function api(path, query, body, formData) {
    var qs = new URLSearchParams(query || {}).toString();
    var url = "../api/admin/" + path + (qs ? "?" + qs : "");
    var opts = { method: "GET", credentials: "same-origin", headers: {} };
    if (formData) {
      opts.method = "POST";
      opts.body = formData;
    } else if (body) {
      opts.method = "POST";
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    if (csrf) opts.headers["X-CSRF-Token"] = csrf;
    var res;
    try {
      res = await fetch(url, opts);
    } catch (e) {
      throw new Error("Could not reach the server.");
    }
    var data = null;
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401) {
      sessionStorage.removeItem("sai_csrf");
      location.href = "login.html";
      throw new Error("Session expired.");
    }
    if (!res.ok || !data || data.ok !== true) {
      throw new Error((data && data.error) || "Something went wrong.");
    }
    return data;
  }

  /* login page */
  var loginForm = document.getElementById("login-form");
  if (loginForm) {
    /* show / hide password on the sign-in field */
    var eyeBtn = document.getElementById("lg-eye");
    var passInput = document.getElementById("lg-pass");
    if (eyeBtn && passInput) {
      eyeBtn.addEventListener("click", function () {
        var show = passInput.type === "password";
        passInput.type = show ? "text" : "password";
        eyeBtn.classList.toggle("on", show);
        eyeBtn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      });
    }

    /* first-time setup */
    /* no admin password: the login page creates the first administrator */
    var setupForm = document.getElementById("setup-form");
    var setupEye = document.getElementById("su-eye");
    var setupPass = document.getElementById("su-pass");
    if (setupEye && setupPass) {
      setupEye.addEventListener("click", function () {
        var show = setupPass.type === "password";
        setupPass.type = show ? "text" : "password";
        setupEye.classList.toggle("on", show);
        setupEye.setAttribute("aria-label", show ? "Hide password" : "Show password");
      });
    }

    if (setupForm) {
      fetch("../api/admin/auth.php?action=needs_setup", { credentials: "same-origin" })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.needs_setup) return;
          setupForm.hidden = false;
          loginForm.hidden = true;
          var t = document.getElementById("login-title");
          var s = document.getElementById("login-sub");
          if (t) t.textContent = "Set up your dashboard";
          if (s) s.textContent = "One minute now, and the dashboard is yours.";
          var tokenRow = document.getElementById("su-token-row");
          if (tokenRow && !window.__saiTokenNeeded) tokenRow.hidden = true;
        })
        .catch(function () {});

      setupForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var err = document.getElementById("setup-err");
        var btn = setupForm.querySelector("button[type=submit]");
        var user = document.getElementById("su-user").value.trim() || "admin";
        var pw = setupPass.value;
        var pw2 = document.getElementById("su-pass2").value;
        var showErr = function (msg) {
          err.textContent = msg;
          err.hidden = false;
          btn.disabled = false;
          btn.textContent = "Create the administrator";
        };
        err.hidden = true;
        if (pw.length < 10) { showErr("Use at least 10 characters for the password."); return; }
        if (pw !== pw2) { showErr("The two passwords do not match."); return; }
        btn.disabled = true;
        btn.textContent = "Creating";
        var tokenEl = document.getElementById("su-token");
        fetch("../api/admin/auth.php?action=first_admin", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user, password: pw, token: tokenEl ? tokenEl.value : "" })
        })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
          .then(function (res) {
            if (!res.ok || !res.d.ok) throw new Error((res.d && res.d.error) || "Could not create the administrator.");
            try {
              localStorage.setItem("sai_admin_remember", JSON.stringify({ u: res.d.username || user, p: pw }));
            } catch (e) {}
            location.href = "index.html";
          })
          .catch(function (e2) { showErr(e2.message); });
      });
    }

    /* remember me: prefill username + password saved on this device */
    try {
      var saved = localStorage.getItem("sai_admin_remember");
      if (saved) {
        var rem = JSON.parse(saved);
        if (rem && rem.u) {
          document.getElementById("lg-user").value = rem.u;
          document.getElementById("lg-pass").value = rem.p || "";
          var cb = document.getElementById("lg-remember");
          if (cb) cb.checked = true;
        }
      }
    } catch (e) {}
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var err = document.getElementById("login-err");
      err.hidden = true;
      var btn = loginForm.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.textContent = "Signing in";
      try {
        var res = await fetch("../api/admin/auth.php?action=login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: document.getElementById("lg-user").value.trim(),
            password: document.getElementById("lg-pass").value
          })
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok || !data.ok) throw new Error(data.error || "Sign in failed.");
        try {
          var remCb = document.getElementById("lg-remember");
          if (remCb && remCb.checked) {
            localStorage.setItem("sai_admin_remember", JSON.stringify({
              u: document.getElementById("lg-user").value.trim(),
              p: document.getElementById("lg-pass").value
            }));
          } else {
            localStorage.removeItem("sai_admin_remember");
          }
        } catch (e2) {}
        sessionStorage.setItem("sai_csrf", data.csrf);
        location.href = "index.html";
      } catch (ex) {
        err.textContent = ex.message;
        err.hidden = false;
        btn.disabled = false;
        btn.textContent = "Sign in";
      }
    });
    return;
  }

  /* app shell */
  var view = document.getElementById("view");
  if (!view) return;

  function render(fn) {
    view.innerHTML = '<div class="loading">Loading</div>';
    return fn().then(function (html) {
      view.innerHTML = html;
      view.querySelectorAll("table").forEach(function (t) {
        if (t.parentElement.classList.contains("table-wrap")) return;
        var w = document.createElement("div");
        w.className = "table-wrap";
        t.parentNode.insertBefore(w, t);
        w.appendChild(t);
      });
      responsiveTables(view);
      refreshBadges();
    }).catch(function (e) {
      view.innerHTML = '<div class="card"><p style="color:#b3261e;">' + esc(e.message) + '</p></div>';
      throw e;
    });
  }

  /* label every cell with its column name so tables become cards on phones */
  function responsiveTables(scope) {
    scope.querySelectorAll("table.table").forEach(function (t) {
      var heads = [];
      t.querySelectorAll("thead th").forEach(function (th) {
        heads.push(th.textContent.trim());
      });
      if (!heads.length) return;
      t.querySelectorAll("tbody tr").forEach(function (tr) {
        tr.querySelectorAll("td").forEach(function (td, i) {
          var label = heads[i] || heads[heads.length - 1] || "";
          if (label) td.setAttribute("data-label", label);
        });
      });
    });
  }

  /* unread badges on the side nav */
  function refreshBadges() {
    api("bookings.php", { action: "stats" })
      .then(function (d) {
        var s = d.stats;
        var inboxCount = (s.unread_messages || 0) + (s.unread_inquiries || 0);
        var bookingsCount = s.new_bookings || 0;
        var ordersCount = s.new_orders || 0;
        [["inbox", inboxCount], ["bookings", bookingsCount], ["orders", ordersCount]].forEach(function (pair) {
          var btn = document.querySelector('.side-nav button[data-view="' + pair[0] + '"]');
          if (!btn) return;
          var old = btn.querySelector(".nav-badge");
          if (old) old.remove();
          if (pair[1] > 0) {
            var b = document.createElement("span");
            b.className = "nav-badge";
            b.textContent = pair[1] > 99 ? "99+" : pair[1];
            btn.appendChild(b);
          }
        });
      })
      .catch(function () {});
  }

  /* drag to reorder a list of .item-row elements */
  function dragList(container, endpoint, selector) {
    selector = selector || ".item-row";
    var dragged = null;
    container.addEventListener("dragstart", function (e) {
      var row = e.target.closest(selector);
      if (!row) return;
      dragged = row;
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", ""); } catch (err) {}
    });
    container.addEventListener("dragend", function () {
      if (dragged) dragged.classList.remove("dragging");
      dragged = null;
    });
    container.addEventListener("dragover", function (e) {
      if (!dragged) return;
      e.preventDefault();
      var row = e.target.closest(selector);
      if (!row || row === dragged) return;
      var rect = row.getBoundingClientRect();
      var after = (e.clientY - rect.top) > rect.height / 2;
      container.insertBefore(dragged, after ? row.nextSibling : row);
    });
    container.addEventListener("drop", function (e) {
      e.preventDefault();
      if (!dragged) return;
      var ids = Array.from(container.querySelectorAll(selector + "[data-id]")).map(function (r) {
        return Number(r.dataset.id);
      });
      api(endpoint, { action: "order" }, { ids: ids })
        .then(function () { toast("Order saved", "ok"); })
        .catch(function (err) { toast(err.message, "err"); });
    });
  }

  function setActiveView(name) {
    currentView = name;
    document.querySelectorAll(".side-nav button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.view === name);
    });
  }

  /* upload helper */
  function uploadZone(onUpload, accept) {
    var dz = document.createElement("div");
    dz.className = "dropzone";
    dz.textContent = "Click or drop an image here (JPG, PNG, WEBP, up to 6 MB)";
    var input = document.createElement("input");
    input.type = "file";
    input.accept = accept || "image/jpeg,image/png,image/webp";
    input.hidden = true;
    dz.appendChild(input);
    dz.addEventListener("click", function () { input.click(); });
    dz.addEventListener("dragover", function (e) { e.preventDefault(); dz.classList.add("over"); });
    dz.addEventListener("dragleave", function () { dz.classList.remove("over"); });
    dz.addEventListener("drop", function (e) {
      e.preventDefault();
      dz.classList.remove("over");
      if (e.dataTransfer.files.length) uploadOne(e.dataTransfer.files[0]);
    });
    input.addEventListener("change", function () {
      if (input.files.length) uploadOne(input.files[0]);
      input.value = "";
    });
    function uploadOne(file) {
      dz.textContent = "Uploading";
      var fd = new FormData();
      fd.append("file", file);
      api("upload.php", {}, null, fd)
        .then(function (data) { onUpload(data.url); })
        .catch(function (e) { toast(e.message, "err"); dz.textContent = "Click or drop an image here (JPG, PNG, WEBP, up to 6 MB)"; });
    }
    return dz;
  }

  /* dashboard */
  function go(view, arg) {
    if (view === "bookings") {
      bookingFilter = arg || "";
      viewBookings();
    } else if (view === "orders") {
      orderFilter = arg || "";
      viewOrders();
    } else if (view === "inbox") {
      inboxTab = arg === "inquiries" ? "inquiries" : "messages";
      viewInbox();
    } else if (view === "rooms") {
      viewRooms();
    } else if (view === "menu") {
      viewMenu();
    } else if (view === "gallery") {
      viewGallery();
    } else if (view === "moments") {
      viewMoments();
    } else if (view === "offers") {
      viewOffers();
    } else if (view === "announcements") {
      viewAnnouncements();
    } else if (view === "journal") {
      viewJournal();
    } else if (view === "accounts") {
      viewAccounts();
    }
    setActiveView(view === "inbox" ? "inbox" : view);
  }

  function viewDashboard() {
    render(async function () {
      var d = await api("bookings.php", { action: "stats" });
      var s = d.stats;
      var cards = [
        ["New bookings", s.new_bookings, "bookings", "new"],
        ["New orders", s.new_orders || 0, "orders", "new"],
        ["Bookings total", s.total_bookings, "bookings", ""],
        ["Messages", s.messages, "inbox", "messages"],
        ["Event inquiries", s.inquiries, "inbox", "inquiries"],
        ["Rooms", s.rooms, "rooms", ""],
        ["Menu items", s.menu_items, "menu", ""],
        ["Gallery photos", s.gallery_items, "gallery", ""],
        ["Guests", s.guests, "accounts", ""],
        ["Moments waiting", s.moments_pending, "moments", ""]
      ];
      return '<div class="page-head"><h1>Dashboard</h1></div>' +
        '<div class="stats-grid">' + cards.map(function (c) {
          return '<button type="button" class="stat-card" data-goto="' + c[2] + '" data-arg="' + c[3] + '">' +
            '<span class="n">' + c[1] + '</span><span class="l">' + c[0] + '</span></button>';
        }).join("") + '</div>' +
        '<div class="card"><h2>Latest bookings</h2>' +
        '<table class="table"><thead><tr><th>Ref</th><th>Name</th><th>Room</th><th>Dates</th><th>Status</th></tr></thead><tbody>' +
        d.recent.map(function (b) {
          return '<tr><td>' + esc(b.ref) + '</td><td>' + esc(b.name) + '</td><td>' + esc(b.room_type || "") + '</td>' +
            '<td>' + esc(b.checkin) + ' to ' + esc(b.checkout) + '</td><td><span class="badge badge-' + esc(b.status) + '">' + esc(b.status) + '</span></td></tr>';
        }).join("") + '</tbody></table></div>' +
        '<div class="card"><h2>Where this dashboard is running</h2>' +
        '<div id="site-info"><p class="f-hint">Checking</p></div></div>';
    }).then(function () {
      document.querySelectorAll("[data-goto]").forEach(function (b) {
        b.addEventListener("click", function () { go(b.dataset.goto, b.dataset.arg); });
      });
      fetch("../api/whereami.php", { credentials: "same-origin" })
        .then(function (r) { return r.json(); })
        .then(function (w) {
          var box = document.getElementById("site-info");
          if (!box || !w || !w.ok) return;
          var rows = [
            ["Runs on", w.runs_on],
            ["Disk", w.disk],
            ["Build", w.build.stamp + (w.build.commit && w.build.commit !== "unknown" ? " · " + w.build.commit : "")],
            ["Server", w.server.software + ", PHP " + w.server.php + (w.server.https === "yes" ? ", HTTPS" : "")],
            ["Content", "rooms " + w.content.rooms + ", dishes " + w.content.menu_items + ", photos " + w.content.gallery_items +
              ", offers " + w.content.offers + ", notices " + w.content.announcements],
            ["Guest records", "bookings " + w.guest_records.bookings + ", orders " + w.guest_records.food_orders +
              ", messages " + w.guest_records.messages + ", moments " + w.guest_records.moments],
            ["Database", Math.round(w.database.size / 1024) + " KB, written " + w.database.created]
          ];
          box.innerHTML = rows.map(function (r) {
            return '<div class="m-detail-row"><span>' + esc(r[0]) + '</span><span>' + esc(String(r[1])) + '</span></div>';
          }).join("") +
          '<p class="f-hint">The same details are at <code>' + esc(w.url_you_used) + '/api/whereami.php</code> on any copy of the site.</p>';
        })
        .catch(function () {});
    });
  }

  /* bookings */
  var bookingFilter = "";
  var bookingCache = [];
  function bookingDetail(idx) {
    var b = bookingCache[idx];
    if (!b) return;
    var body =
      '<div class="m-detail-row"><span>Reference</span><span>' + esc(b.ref) + '</span></div>' +
      '<div class="m-detail-row"><span>Name</span><span>' + esc(b.name) + '</span></div>' +
      '<div class="m-detail-row"><span>Phone</span><span>' + esc(b.phone) + '</span></div>' +
      (b.email ? '<div class="m-detail-row"><span>Email</span><span>' + esc(b.email) + '</span></div>' : "") +
      '<div class="m-detail-row"><span>Room</span><span>' + esc(b.room_type || "") + '</span></div>' +
      '<div class="m-detail-row"><span>Dates</span><span>' + esc(b.checkin) + ' to ' + esc(b.checkout) + ' (' + b.nights + ' night' + (b.nights === 1 ? "" : "s") + ')</span></div>' +
      '<div class="m-detail-row"><span>Guests</span><span>' + b.guests + '</span></div>' +
      (b.discount > 0 ? '<div class="m-detail-row"><span>Discount</span><span>' + b.discount + '% off' + (b.offer_code ? ' (' + esc(b.offer_code) + ')' : "") + '</span></div>' : "") +
      (b.requests ? '<div class="m-detail-msg">' + esc(b.requests) + '</div>' : "") +
      '<label class="f-label">Status</label>' +
      '<select class="f-select" id="bk-detail-status">' +
        ["new", "confirmed", "cancelled", "completed"].map(function (st) {
          return '<option value="' + st + '"' + (b.status === st ? " selected" : "") + '>' + st + '</option>';
        }).join("") + '</select>';
    openModal("Booking " + b.ref, body, function (e, close) {
      api("bookings.php", { action: "status" }, { id: Number(b.id), status: document.getElementById("bk-detail-status").value })
        .then(function () { close(); toast("Status updated", "ok"); viewBookings(); })
        .catch(function (err) { toast(err.message, "err"); });
    });
    document.getElementById("modal-save").textContent = "Save status";
    var del = document.createElement("button");
    del.type = "button";
    del.className = "btn btn-danger btn-sm";
    del.textContent = "Delete booking";
    del.addEventListener("click", function () {
      confirmDialog("Delete this booking? It cannot be undone.", function () {
        api("bookings.php", { action: "delete" }, { id: Number(b.id) })
          .then(function () { closeModal(); toast("Booking deleted", "ok"); viewBookings(); })
          .catch(function (err) { toast(err.message, "err"); });
      });
    });
    var ops = document.querySelector("#modal .ops");
    ops.insertBefore(del, ops.firstChild);
  }

  function viewBookings() {
    render(async function () {
      var d = await api("bookings.php", { action: "list", status: bookingFilter });
      bookingCache = d.bookings;
      var pills = ["", "new", "confirmed", "cancelled", "completed"];
      return '<div class="page-head"><h1>Bookings</h1>' +
        '<div class="actions"><a class="btn btn-line" href="../api/admin/bookings.php?action=export">Export CSV</a></div></div>' +
        '<div class="card"><div class="actions" style="margin-bottom:1rem;">' +
        pills.map(function (p) {
          return '<button class="btn btn-sm ' + (bookingFilter === p ? "btn-dark" : "btn-line") + '" data-filter="' + p + '">' + (p || "All") + '</button>';
        }).join("") + '</div>' +
        '<table class="table"><thead><tr><th>Ref</th><th>Name</th><th>Phone</th><th>Room</th><th>Dates</th><th>Status</th><th></th></tr></thead><tbody>' +
        d.bookings.map(function (b, i) {
          return '<tr data-id="' + b.id + '"><td>' + esc(b.ref) + '</td><td>' + esc(b.name) + '</td><td>' + esc(b.phone) + '</td>' +
            '<td>' + esc(b.room_type || "") + '</td><td>' + esc(b.checkin) + ' to ' + esc(b.checkout) + '</td>' +
            '<td><span class="badge badge-' + esc(b.status) + '">' + esc(b.status) + '</span></td>' +
            '<td><button class="btn btn-sm btn-line view-booking" data-idx="' + i + '">View</button></td></tr>';
        }).join("") + '</tbody></table>' +
        (d.bookings.length ? "" : '<p style="color:#545454;padding:1rem 0;">No bookings here yet.</p>') + '</div>';
    }).then(function () {
      document.querySelectorAll("[data-filter]").forEach(function (b) {
        b.addEventListener("click", function () { bookingFilter = b.dataset.filter; viewBookings(); });
      });
      document.querySelectorAll(".view-booking").forEach(function (b) {
        b.addEventListener("click", function () { bookingDetail(Number(b.dataset.idx)); });
      });
    });
  }

  /* rooms */
  function viewRooms() {
    render(async function () {
      var d = await api("rooms.php", { action: "list" });
      return '<div class="page-head"><h1>Rooms</h1>' +
        '<div class="actions"><button class="btn btn-gold" id="add-room">Add room</button></div></div>' +
        '<div class="card" id="rooms-list"><p class="drag-hint">Drag the handle on a room to reorder how guests see them.</p>' +
        d.rooms.map(function (r) {
          var g = (r.gallery || []).map(function (g) { return '<img src="../' + esc(g) + '" alt="">'; }).join("");
          return '<div class="item-row" draggable="true" data-id="' + r.id + '">' +
            '<span class="drag-handle" title="Drag to reorder">&#9776;</span>' +
            (r.image ? '<img src="../' + esc(r.image) + '" alt="">' : '<div class="no-img">R</div>') +
            '<div class="info"><div class="nm">' + esc(r.name) + '</div>' +
            '<div class="sub">KSh ' + r.price.toLocaleString() + ' / night</div>' +
            '<div class="thumbs">' + g + '</div></div>' +
            '<div class="ops">' +
            '<button class="btn btn-sm btn-line edit-room" data-id="' + r.id + '">Edit</button>' +
            '<button class="btn btn-sm btn-danger del-room" data-id="' + r.id + '">Delete</button>' +
            '</div></div>';
        }).join("") + '</div>';
    }).then(function () {
      document.getElementById("add-room").addEventListener("click", function () { roomModal(null); });
      dragList(document.getElementById("rooms-list"), "rooms.php");
      document.querySelectorAll(".edit-room").forEach(function (b) {
        b.addEventListener("click", function () { roomModal(Number(b.dataset.id)); });
      });
      document.querySelectorAll(".del-room").forEach(function (b) {
        b.addEventListener("click", function () {
          confirmDialog("Delete this room? Guests will no longer see it.", function () {
            api("rooms.php", { action: "delete" }, { id: Number(b.dataset.id) })
              .then(function () { toast("Room deleted", "ok"); viewRooms(); })
              .catch(function (e) { toast(e.message, "err"); });
          });
        });
      });
    });
  }

  function roomModal(id) {
    var editing = id ? true : false;
    api("rooms.php", { action: "list" }).then(function (d) {
      var r = d.rooms.find(function (x) { return Number(x.id) === id; }) || {};
      var gallery = (r.gallery || []).slice();
      var image = r.image || "";
      var body =
        '<label class="f-label">Room name</label><input class="f-input" id="rm-name" value="' + esc(r.name || "") + '">' +
        '<label class="f-label">Price per night (KSh)</label><input class="f-input" id="rm-price" type="number" min="0" value="' + (r.price || 0) + '">' +
        '<label class="f-label">Description</label><textarea class="f-textarea" id="rm-desc">' + esc(r.description || "") + '</textarea>' +
        '<label class="f-label">Amenities (one per line)</label><textarea class="f-textarea" id="rm-amenities">' + esc((r.amenities || []).join("\n")) + '</textarea>' +
        '<label class="f-label">Main photo</label><div id="rm-image-zone"></div>' +
        '<div id="rm-image-prev" class="thumbs">' + (image ? '<img src="../' + esc(image) + '" alt="">' : "") + '</div>' +
        '<label class="f-label">More photos (click a thumbnail to remove it)</label><div id="rm-gallery-zone"></div>' +
        '<div id="rm-gallery-prev" class="thumbs">' + gallery.map(function (g) { return '<img src="../' + esc(g) + '" data-g="' + esc(g) + '" alt="">'; }).join("") + '</div>';
      openModal(editing ? "Edit room" : "Add room", body, function (e, close) {
        var name = document.getElementById("rm-name").value.trim();
        var price = Number(document.getElementById("rm-price").value);
        var payload = {
          id: id || 0,
          name: name,
          price: price,
          description: document.getElementById("rm-desc").value.trim(),
          amenities: document.getElementById("rm-amenities").value.split("\n").map(function (a) { return a.trim(); }).filter(Boolean),
          image: image,
          gallery: gallery,
          sort: 0
        };
        if (!name || price <= 0) { toast("Name and a positive price are required.", "err"); return; }
        api("rooms.php", { action: "save" }, payload)
          .then(function () { close(); toast("Room saved", "ok"); viewRooms(); })
          .catch(function (err) { toast(err.message, "err"); });
      });
      var zone = document.getElementById("rm-image-zone");
      zone.appendChild(uploadZone(function (url) {
        image = url;
        document.getElementById("rm-image-prev").innerHTML = '<img src="../' + esc(url) + '" alt="">';
        toast("Photo uploaded", "ok");
      }));
      var gzone = document.getElementById("rm-gallery-zone");
      gzone.appendChild(uploadZone(function (url) {
        gallery.push(url);
        document.getElementById("rm-gallery-prev").innerHTML = gallery.map(function (g) {
          return '<img src="../' + esc(g) + '" data-g="' + esc(g) + '" alt="">';
        }).join("");
        toast("Photo added", "ok");
      }));
      document.getElementById("rm-gallery-prev").addEventListener("click", function (e) {
        var img = e.target.closest("img[data-g]");
        if (!img) return;
        gallery = gallery.filter(function (g) { return g !== img.dataset.g; });
        img.remove();
      });
    }).catch(function (e) { toast(e.message, "err"); });
  }

  /* menu */
  function viewMenu() {
    render(async function () {
      var d = await api("menu.php", { action: "list" });
      var byCat = {};
      d.items.forEach(function (m) {
        (byCat[m.category] = byCat[m.category] || []).push(m);
      });
      return '<div class="page-head"><h1>Menu</h1>' +
        '<div class="actions"><button class="btn btn-gold" id="add-dish">Add dish</button></div></div>' +
        Object.keys(byCat).map(function (cat) {
          return '<div class="card"><h2>' + esc(cat) + '</h2>' +
            '<p class="drag-hint">Drag the handle on a dish to reorder this category.</p>' +
            '<div class="drag-group" data-cat="' + esc(cat) + '">' +
            byCat[cat].map(function (m) {
              return '<div class="item-row" draggable="true" data-id="' + m.id + '">' +
                '<span class="drag-handle" title="Drag to reorder">&#9776;</span>' +
                (m.image ? '<img src="../' + esc(m.image) + '" alt="">' : '<div class="no-img">' + esc(m.name.charAt(0)) + '</div>') +
                '<div class="info"><div class="nm">' + esc(m.name) + '</div>' +
                '<div class="sub">' + (m.price === null ? "Ask for price" : "KSh " + Number(m.price).toLocaleString()) + '</div></div>' +
                '<div class="ops">' +
                '<button class="btn btn-sm btn-line edit-dish" data-id="' + m.id + '">Edit</button>' +
                '<button class="btn btn-sm btn-danger del-dish" data-id="' + m.id + '">Delete</button>' +
                '</div></div>';
            }).join("") + '</div></div>';
        }).join("");
    }).then(function () {
      document.getElementById("add-dish").addEventListener("click", function () { dishModal(null); });
      document.querySelectorAll(".drag-group").forEach(function (g) {
        dragList(g, "menu.php");
      });
      document.querySelectorAll(".edit-dish").forEach(function (b) {
        b.addEventListener("click", function () { dishModal(Number(b.dataset.id)); });
      });
      document.querySelectorAll(".del-dish").forEach(function (b) {
        b.addEventListener("click", function () {
          confirmDialog("Remove this dish from the menu?", function () {
            api("menu.php", { action: "delete" }, { id: Number(b.dataset.id) })
              .then(function () { toast("Dish removed", "ok"); viewMenu(); })
              .catch(function (e) { toast(e.message, "err"); });
          });
        });
      });
    });
  }

  function dishModal(id) {
    api("menu.php", { action: "list" }).then(function (d) {
      var m = d.items.find(function (x) { return Number(x.id) === id; }) || {};
      var image = m.image || "";
      var images = (m.images && m.images.length) ? m.images.slice() : (image ? [image] : []);
      var cats = Array.from(new Set(d.items.map(function (x) { return x.category; })));
      var body =
        '<label class="f-label">Category</label>' +
        '<select class="f-select" id="ds-cat">' +
          cats.map(function (c) {
            return '<option value="' + esc(c) + '"' + (m.category === c ? " selected" : "") + '>' + esc(c) + '</option>';
          }).join("") +
          '<option value="__new__">+ New category</option>' +
        '</select>' +
        '<div id="ds-newcat-wrap" hidden><label class="f-label">New category name</label><input class="f-input" id="ds-newcat" placeholder="e.g. Cocktails"></div>' +
        '<label class="f-label">Dish name</label><input class="f-input" id="ds-name" value="' + esc(m.name || "") + '">' +
        '<label class="f-label">Price (KSh, leave empty to show "ask for price")</label><input class="f-input" id="ds-price" type="number" min="0" step="0.01" value="' + (m.price === null ? "" : m.price) + '">' +
        '<label class="f-label">Description (what it is, how it is prepared, what is inside)</label>' +
        '<textarea class="f-textarea" id="ds-desc" rows="3" placeholder="e.g. Fresh mandazi fried until golden, soft inside, served warm with a pot of Kenyan chai.">' + esc(m.description || "") + '</textarea>' +
        '<label class="f-label">Photos (add up to 5; click a thumbnail to remove it)</label><div id="ds-image-zone"></div>' +
        '<div id="ds-image-prev" class="thumbs">' + images.map(function (g) {
          return '<img src="../' + esc(g) + '" data-g="' + esc(g) + '" alt="">';
        }).join("") + '</div>';
      openModal(id ? "Edit dish" : "Add dish", body, function (e, close) {
        var name = document.getElementById("ds-name").value.trim();
        var catSelect = document.getElementById("ds-cat");
        var cat = catSelect.value;
        if (cat === "__new__") {
          cat = document.getElementById("ds-newcat").value.trim();
        }
        var priceRaw = document.getElementById("ds-price").value.trim();
        if (!name || !cat) { toast("Category and name are required.", "err"); return; }
        api("menu.php", { action: "save" }, {
          id: id || 0, category: cat, name: name,
          price: priceRaw === "" ? null : Number(priceRaw),
          description: document.getElementById("ds-desc").value.trim(),
          image: images[0] || "",
          images: images
        }).then(function () { close(); toast("Dish saved", "ok"); viewMenu(); })
          .catch(function (err) { toast(err.message, "err"); });
      });
      document.getElementById("ds-cat").addEventListener("change", function () {
        document.getElementById("ds-newcat-wrap").hidden = this.value !== "__new__";
      });
      document.getElementById("ds-image-zone").appendChild(uploadZone(function (url) {
        if (images.length >= 5) { toast("Up to 5 photos per dish.", "err"); return; }
        images.push(url);
        document.getElementById("ds-image-prev").innerHTML = images.map(function (g) {
          return '<img src="../' + esc(g) + '" data-g="' + esc(g) + '" alt="">';
        }).join("");
        toast("Photo added", "ok");
      }));
      document.getElementById("ds-image-prev").addEventListener("click", function (e) {
        var img = e.target.closest("img[data-g]");
        if (!img) return;
        images = images.filter(function (g) { return g !== img.dataset.g; });
        img.remove();
      });
    }).catch(function (e) { toast(e.message, "err"); });
  }

  /* gallery */
  function galModal(id) {
    api("gallery.php", { action: "list" }).then(function (d) {
      var g = d.items.find(function (x) { return Number(x.id) === id; }) || {};
      var body =
        '<div class="thumbs" style="margin-bottom:0.8rem;">' + (g.src ? '<img src="../' + esc(g.src) + '" alt="" style="width:100%;height:auto;border-radius:10px;">' : "") + '</div>' +
        '<label class="f-label">Caption (shows when guests hover over this photo)</label>' +
        '<input class="f-input" id="gl-cap" value="' + esc(g.caption || "") + '" placeholder="e.g. The solarium terrace at sunset">' +
        '<label class="f-label">Category</label>' +
        '<select class="f-select" id="gl-cat">' +
          ["Rooms", "Around the Inn"].map(function (c) {
            return '<option' + (g.category === c ? " selected" : "") + '>' + c + '</option>';
          }).join("") + '</select>';
      openModal("Edit photo", body, function (e, close) {
        api("gallery.php", { action: "save" }, {
          id: Number(id), src: g.src,
          category: document.getElementById("gl-cat").value,
          caption: document.getElementById("gl-cap").value.trim(),
          sort: 0
        }).then(function () { close(); toast("Photo updated", "ok"); viewGallery(); })
          .catch(function (err) { toast(err.message, "err"); });
      });
    }).catch(function (e) { toast(e.message, "err"); });
  }

  function viewGallery() {
    render(async function () {
      var d = await api("gallery.php", { action: "list" });
      return '<div class="page-head"><h1>Gallery</h1>' +
        '<div class="actions"><button class="btn btn-gold" id="up-many">Upload photos</button></div></div>' +
        '<div class="card" id="up-zone-card" hidden></div>' +
        '<div class="card"><h2>Photos (' + d.items.length + ')</h2>' +
        '<p class="drag-hint">Drag the handle on a photo to reorder the gallery.</p>' +
        '<div class="stats-grid" id="gallery-list" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr));">' +
        d.items.map(function (g) {
          return '<div class="gal-card" draggable="true" data-id="' + g.id + '" style="border:1px solid var(--line);border-radius:10px;overflow:hidden;position:relative;">' +
            '<span class="drag-handle gal-drag" title="Drag to reorder">&#9776;</span>' +
            '<img src="../' + esc(g.src) + '" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;">' +
            '<div style="padding:0.5rem;">' +
            '<div class="gal-cap-line">' + (g.caption ? esc(g.caption) : '<i>No caption</i>') + '</div>' +
            '<select class="f-select gal-cat" data-id="' + g.id + '" data-src="' + esc(g.src) + '" data-caption="' + esc(g.caption || "") + '" style="margin-top:0.35rem;">' +
            ["Rooms", "Around the Inn"].map(function (c) {
              return '<option' + (g.category === c ? " selected" : "") + '>' + c + '</option>';
            }).join("") + '</select>' +
            '<button class="btn btn-sm btn-line edit-gal" data-id="' + g.id + '" style="width:100%;margin-top:0.35rem;">Edit details</button>' +
            '<button class="btn btn-sm btn-danger del-gal" data-id="' + g.id + '" style="width:100%;margin-top:0.35rem;">Delete</button>' +
            '</div></div>';
        }).join("") + '</div></div>';
    }).then(function () {
      dragList(document.getElementById("gallery-list"), "gallery.php", ".gal-card");
      document.getElementById("up-many").addEventListener("click", function () {
        var card = document.getElementById("up-zone-card");
        card.hidden = false;
        card.innerHTML = '<h2>Add photos</h2>';
        card.appendChild(uploadZone(function (url) {
          api("gallery.php", { action: "save" }, { src: url, category: "Around the Inn", caption: "", sort: 0 })
            .then(function () { toast("Photo added", "ok"); viewGallery(); })
            .catch(function (e) { toast(e.message, "err"); });
        }, "image/jpeg,image/png,image/webp"));
      });
      document.querySelectorAll(".gal-cat").forEach(function (s) {
        s.addEventListener("change", function () {
          api("gallery.php", { action: "save" }, { id: Number(s.dataset.id), src: s.dataset.src, category: s.value, caption: s.dataset.caption, sort: 0 })
            .then(function () { toast("Category updated", "ok"); })
            .catch(function (e) { toast(e.message, "err"); });
        });
      });
      document.querySelectorAll(".edit-gal").forEach(function (b) {
        b.addEventListener("click", function () { galModal(Number(b.dataset.id)); });
      });
      document.querySelectorAll(".del-gal").forEach(function (b) {
        b.addEventListener("click", function () {
          confirmDialog("Remove this photo from the gallery?", function () {
            api("gallery.php", { action: "delete" }, { id: Number(b.dataset.id) })
              .then(function () { toast("Photo removed", "ok"); viewGallery(); })
              .catch(function (e) { toast(e.message, "err"); });
          });
        });
      });
    });
  }

  /* events */
  function viewEvents() {
    render(async function () {
      var d = await api("events.php", { action: "list" });
      return '<div class="page-head"><h1>Events</h1>' +
        '<div class="actions"><button class="btn btn-gold" id="add-event">Add event</button></div></div>' +
        '<div class="card" id="events-list"><p class="drag-hint">Drag the handle to reorder the event cards.</p>' +
        d.items.map(function (e) {
          return '<div class="item-row" draggable="true" data-id="' + e.id + '">' +
            '<span class="drag-handle" title="Drag to reorder">&#9776;</span>' +
            (e.image ? '<img src="../' + esc(e.image) + '" alt="">' : '<div class="no-img">E</div>') +
            '<div class="info"><div class="nm">' + esc(e.name) + '</div>' +
            '<div class="sub">' + esc(e.description) + '</div></div>' +
            '<div class="ops">' +
            '<button class="btn btn-sm btn-line edit-event" data-id="' + e.id + '">Edit</button>' +
            '<button class="btn btn-sm btn-danger del-event" data-id="' + e.id + '">Delete</button>' +
            '</div></div>';
        }).join("") + '</div>';
    }).then(function () {
      dragList(document.getElementById("events-list"), "events.php");
      document.getElementById("add-event").addEventListener("click", function () { eventModal(null); });
      document.querySelectorAll(".edit-event").forEach(function (b) {
        b.addEventListener("click", function () { eventModal(Number(b.dataset.id)); });
      });
      document.querySelectorAll(".del-event").forEach(function (b) {
        b.addEventListener("click", function () {
          confirmDialog("Remove this event type?", function () {
            api("events.php", { action: "delete" }, { id: Number(b.dataset.id) })
              .then(function () { toast("Event removed", "ok"); viewEvents(); })
              .catch(function (e) { toast(e.message, "err"); });
          });
        });
      });
    });
  }

  function eventModal(id) {
    api("events.php", { action: "list" }).then(function (d) {
      var e = d.items.find(function (x) { return Number(x.id) === id; }) || {};
      var image = e.image || "";
      var icons = [["ring", "Rings"], ["cake", "Cake"], ["people", "People"], ["cloche", "Dish"], ["gift", "Gift"], ["briefcase", "Briefcase"]];
      var body =
        '<label class="f-label">Event name</label><input class="f-input" id="ev-name" value="' + esc(e.name || "") + '">' +
        '<label class="f-label">Description</label><textarea class="f-textarea" id="ev-desc">' + esc(e.description || "") + '</textarea>' +
        '<label class="f-label">Icon</label><select class="f-select" id="ev-icon">' +
        icons.map(function (ic) { return '<option value="' + ic[0] + '"' + (e.icon === ic[0] ? " selected" : "") + '>' + ic[1] + '</option>'; }).join("") + '</select>' +
        '<label class="f-label">Photo</label><div id="ev-image-zone"></div>' +
        '<div id="ev-image-prev" class="thumbs">' + (image ? '<img src="../' + esc(image) + '" alt="">' : "") + '</div>';
      openModal(id ? "Edit event" : "Add event", body, function (ev, close) {
        var name = document.getElementById("ev-name").value.trim();
        if (!name) { toast("Event name is required.", "err"); return; }
        api("events.php", { action: "save" }, {
          id: id || 0, name: name,
          description: document.getElementById("ev-desc").value.trim(),
          icon: document.getElementById("ev-icon").value,
          image: image, sort: 0
        }).then(function () { close(); toast("Event saved", "ok"); viewEvents(); })
          .catch(function (err) { toast(err.message, "err"); });
      });
      document.getElementById("ev-image-zone").appendChild(uploadZone(function (url) {
        image = url;
        document.getElementById("ev-image-prev").innerHTML = '<img src="../' + esc(url) + '" alt="">';
        toast("Photo uploaded", "ok");
      }));
    }).catch(function (e) { toast(e.message, "err"); });
  }

  /* testimonials */
  function viewTestimonials() {
    render(async function () {
      var d = await api("testimonials.php", { action: "list" });
      return '<div class="page-head"><h1>Testimonials</h1>' +
        '<div class="actions"><button class="btn btn-gold" id="add-testi">Add testimonial</button></div></div>' +
        '<div class="card" id="testi-list"><p class="drag-hint">Drag the handle to reorder how guests see these.</p>' +
        d.items.map(function (t) {
          return '<div class="item-row" draggable="true" data-id="' + t.id + '">' +
            '<span class="drag-handle" title="Drag to reorder">&#9776;</span>' +
            (t.avatar ? '<img src="../' + esc(t.avatar) + '" alt="">' : '<div class="no-img">' + esc(t.name.charAt(0)) + '</div>') +
            '<div class="info"><div class="nm">' + esc(t.name) + ' <span style="color:#eea923;">' + "\u2605".repeat(t.stars) + '</span></div>' +
            '<div class="sub">' + esc(t.text) + '</div></div>' +
            '<div class="ops">' +
            '<button class="btn btn-sm btn-line edit-testi" data-id="' + t.id + '">Edit</button>' +
            '<button class="btn btn-sm btn-danger del-testi" data-id="' + t.id + '">Delete</button>' +
            '</div></div>';
        }).join("") + '</div>';
    }).then(function () {
      dragList(document.getElementById("testi-list"), "testimonials.php");
      document.getElementById("add-testi").addEventListener("click", function () { testiModal(null); });
      document.querySelectorAll(".edit-testi").forEach(function (b) {
        b.addEventListener("click", function () { testiModal(Number(b.dataset.id)); });
      });
      document.querySelectorAll(".del-testi").forEach(function (b) {
        b.addEventListener("click", function () {
          confirmDialog("Remove this testimonial?", function () {
            api("testimonials.php", { action: "delete" }, { id: Number(b.dataset.id) })
              .then(function () { toast("Removed", "ok"); viewTestimonials(); })
              .catch(function (e) { toast(e.message, "err"); });
          });
        });
      });
    });
  }

  function testiModal(id) {
    api("testimonials.php", { action: "list" }).then(function (d) {
      var t = d.items.find(function (x) { return Number(x.id) === id; }) || {};
      var avatar = t.avatar || "";
      var body =
        '<label class="f-label">Quote</label><textarea class="f-textarea" id="ts-text">' + esc(t.text || "") + '</textarea>' +
        '<label class="f-label">Name</label><input class="f-input" id="ts-name" value="' + esc(t.name || "") + '">' +
        '<label class="f-label">Role</label><input class="f-input" id="ts-role" value="' + esc(t.role || "") + '">' +
        '<label class="f-label">Stars</label><select class="f-select" id="ts-stars">' +
        [5, 4, 3, 2, 1].map(function (s) { return '<option value="' + s + '"' + ((t.stars || 5) === s ? " selected" : "") + '>' + s + '</option>'; }).join("") + '</select>' +
        '<label class="f-label">Photo</label><div id="ts-image-zone"></div>' +
        '<div id="ts-image-prev" class="thumbs">' + (avatar ? '<img src="../' + esc(avatar) + '" alt="">' : "") + '</div>';
      openModal(id ? "Edit testimonial" : "Add testimonial", body, function (e, close) {
        var text = document.getElementById("ts-text").value.trim();
        var name = document.getElementById("ts-name").value.trim();
        if (!text || !name) { toast("Quote and name are required.", "err"); return; }
        api("testimonials.php", { action: "save" }, {
          id: id || 0, text: text, name: name,
          role: document.getElementById("ts-role").value.trim(),
          stars: Number(document.getElementById("ts-stars").value),
          avatar: avatar, sort: 0
        }).then(function () { close(); toast("Saved", "ok"); viewTestimonials(); })
          .catch(function (err) { toast(err.message, "err"); });
      });
      document.getElementById("ts-image-zone").appendChild(uploadZone(function (url) {
        avatar = url;
        document.getElementById("ts-image-prev").innerHTML = '<img src="../' + esc(url) + '" alt="">';
        toast("Photo uploaded", "ok");
      }));
    }).catch(function (e) { toast(e.message, "err"); });
  }

  /* food orders */
  var orderFilter = "";
  var orderCache = [];
  function viewOrders() {
    render(async function () {
      var d = await api("orders.php", { action: "list" });
      orderCache = d.orders;
      var pills = ["", "new", "confirmed", "completed", "cancelled"];
      return '<div class="page-head"><h1>Food orders</h1></div>' +
        '<div class="card"><div class="actions" style="margin-bottom:1rem;">' +
        pills.map(function (p) {
          return '<button class="btn btn-sm ' + (orderFilter === p ? "btn-dark" : "btn-line") + '" data-ofilter="' + p + '">' + (p || "All") + '</button>';
        }).join("") + '</div>' +
        '<table class="table"><thead><tr><th>Name</th><th>Phone</th><th>Service</th><th>Time</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>' +
        d.orders.filter(function (o) { return !orderFilter || o.status === orderFilter; }).map(function (o) {
          return '<tr data-id="' + o.id + '"><td>' + esc(o.name) + '</td><td>' + esc(o.phone) + '</td><td>' + esc(o.service) + '</td>' +
            '<td>' + esc(o.time || "") + '</td><td>KSh ' + Number(o.total).toLocaleString() + '</td>' +
            '<td><span class="badge badge-' + esc(o.status) + '">' + esc(o.status) + '</span></td>' +
            '<td><button class="btn btn-sm btn-line view-order" data-id="' + o.id + '">View</button></td></tr>';
        }).join("") + '</tbody></table>' +
        (d.orders.length ? "" : '<p style="color:#545454;padding:1rem 0;">No food orders yet.</p>') + '</div>';
    }).then(function () {
      document.querySelectorAll("[data-ofilter]").forEach(function (b) {
        b.addEventListener("click", function () { orderFilter = b.dataset.ofilter; viewOrders(); });
      });
      document.querySelectorAll(".view-order").forEach(function (b) {
        b.addEventListener("click", function () { orderDetail(Number(b.dataset.id)); });
      });
    });
  }

  function orderDetail(id) {
    var o = orderCache.find(function (x) { return Number(x.id) === id; });
    if (!o) return;
    var lines = (o.items || []).map(function (i) {
      return '<div class="m-detail-row"><span>' + i.qty + 'x ' + esc(i.name) + '</span><span>KSh ' + (Number(i.unit) * i.qty).toLocaleString() + '</span></div>';
    }).join("");
    var body =
      '<div class="m-detail-row"><span>Name</span><span>' + esc(o.name) + '</span></div>' +
      '<div class="m-detail-row"><span>Phone</span><span>' + esc(o.phone) + '</span></div>' +
      (o.email ? '<div class="m-detail-row"><span>Email</span><span>' + esc(o.email) + '</span></div>' : "") +
      '<div class="m-detail-row"><span>Service</span><span>' + esc(o.service) + '</span></div>' +
      (o.time ? '<div class="m-detail-row"><span>Time</span><span>' + esc(o.time) + '</span></div>' : "") +
      (o.notes ? '<div class="m-detail-row"><span>Notes</span><span>' + esc(o.notes) + '</span></div>' : "") +
      '<div class="m-detail-msg">' + (lines || '<i>No items listed.</i>') +
      '<div class="m-detail-row" style="margin-top:0.6rem;"><span>Total</span><span>KSh ' + Number(o.total).toLocaleString() + '</span></div></div>' +
      '<div class="actions" style="margin-top:0.9rem;">' +
      ["new", "confirmed", "completed", "cancelled"].map(function (s) {
        return '<button class="btn btn-sm ' + (o.status === s ? "btn-dark" : "btn-line") + '" data-ostatus="' + s + '">' +
          (s === "new" ? "Mark new" : s === "confirmed" ? "Confirm" : s === "completed" ? "Completed" : "Cancel") + '</button>';
      }).join("") + '</div>';
    openModal("Food order", body, function (e, close) {
      api("orders.php", { action: "delete" }, { id: Number(o.id) })
        .then(function () { close(); toast("Order removed", "ok"); viewOrders(); })
        .catch(function (err) { toast(err.message, "err"); });
    });
    document.getElementById("modal-save").textContent = "Delete";
    document.getElementById("modal-save").className = "btn btn-danger";
    document.querySelectorAll("[data-ostatus]").forEach(function (b) {
      b.addEventListener("click", function () {
        api("orders.php", { action: "status" }, { id: Number(o.id), status: b.dataset.ostatus })
          .then(function () { toast("Order updated", "ok"); closeModal(); viewOrders(); })
          .catch(function (err) { toast(err.message, "err"); });
      });
    });
  }

  /* inbox */
  var inboxTab = "messages";
  var inboxCache = [];
  function inboxDetail(idx) {
    var m = inboxCache[idx];
    if (!m) return;
    var rows;
    if (inboxTab === "messages") {
      rows = '<div class="m-detail-row"><span>Name</span><span>' + esc(m.name) + '</span></div>' +
        '<div class="m-detail-row"><span>Email</span><span>' + esc(m.email) + '</span></div>' +
        '<div class="m-detail-row"><span>Subject</span><span>' + esc(m.subject) + '</span></div>' +
        '<div class="m-detail-row"><span>Received</span><span>' + esc(m.created_at) + '</span></div>' +
        '<div class="m-detail-msg">' + esc(m.body) + '</div>';
    } else {
      rows = '<div class="m-detail-row"><span>Name</span><span>' + esc(m.name) + '</span></div>' +
        '<div class="m-detail-row"><span>Email</span><span>' + esc(m.email) + '</span></div>' +
        '<div class="m-detail-row"><span>Event</span><span>' + esc(m.category) + '</span></div>' +
        '<div class="m-detail-row"><span>Attendees</span><span>' + esc(m.attendees) + '</span></div>' +
        '<div class="m-detail-row"><span>Date</span><span>' + esc(m.event_date) + '</span></div>' +
        '<div class="m-detail-row"><span>Received</span><span>' + esc(m.created_at) + '</span></div>' +
        '<div class="m-detail-msg">' + esc(m.body) + '</div>';
    }
    openModal(inboxTab === "messages" ? "Message" : "Event inquiry", rows, function (e, close) {
      api("inbox.php", { action: "delete" }, { id: Number(m.id), table: inboxTab === "messages" ? "messages" : "inquiries" })
        .then(function () { close(); toast("Deleted", "ok"); viewInbox(); })
        .catch(function (err) { toast(err.message, "err"); });
    });
    document.getElementById("modal-save").textContent = "Delete";
    document.getElementById("modal-save").className = "btn btn-danger";
    if (Number(m.read) !== 1) {
      api("inbox.php", { action: "mark" }, { id: Number(m.id), table: inboxTab === "messages" ? "messages" : "inquiries" })
        .then(function () { m.read = 1; refreshBadges(); })
        .catch(function () {});
    }
  }

  function viewInbox() {
    render(async function () {
      var d = await api("inbox.php", { action: inboxTab });
      var items = d.items;
      inboxCache = items;
      var label = inboxTab === "messages" ? "Messages" : "Event inquiries";
      return '<div class="page-head"><h1>Inbox</h1></div>' +
        '<div class="actions" style="margin-bottom:1rem;">' +
        '<button class="btn btn-sm ' + (inboxTab === "messages" ? "btn-dark" : "btn-line") + '" id="tab-msg">Messages</button>' +
        '<button class="btn btn-sm ' + (inboxTab === "inquiries" ? "btn-dark" : "btn-line") + '" id="tab-inq">Event inquiries</button>' +
        '</div>' +
        '<div class="card"><h2>' + label + ' (' + items.length + ')</h2>' +
        (inboxTab === "messages"
          ? '<table class="table"><thead><tr><th>Name</th><th>Email</th><th>Subject</th><th>When</th><th></th></tr></thead><tbody>' +
            items.map(function (m, i) {
              return '<tr class="click-row' + (Number(m.read) === 1 ? "" : " unread") + '" data-idx="' + i + '"><td>' + esc(m.name) + '</td><td>' + esc(m.email) + '</td><td>' + esc(m.subject) + '</td><td>' + esc(m.created_at) + '</td>' +
                '<td><button class="btn btn-sm btn-line view-inbox" data-idx="' + i + '">Read</button></td></tr>';
            }).join("") + '</tbody></table>'
          : '<table class="table"><thead><tr><th>Name</th><th>Email</th><th>Event</th><th>Attendees</th><th>Date</th><th></th></tr></thead><tbody>' +
            items.map(function (q, i) {
              return '<tr class="click-row' + (Number(q.read) === 1 ? "" : " unread") + '" data-idx="' + i + '"><td>' + esc(q.name) + '</td><td>' + esc(q.email) + '</td><td>' + esc(q.category) + '</td><td>' + esc(q.attendees) + '</td><td>' + esc(q.event_date) + '</td>' +
                '<td><button class="btn btn-sm btn-line view-inbox" data-idx="' + i + '">Read</button></td></tr>';
            }).join("") + '</tbody></table>') +
        (items.length ? "" : '<p style="color:#545454;padding:1rem 0;">Nothing here yet.</p>') + '</div>';
    }).then(function () {
      document.getElementById("tab-msg").addEventListener("click", function () { inboxTab = "messages"; viewInbox(); });
      document.getElementById("tab-inq").addEventListener("click", function () { inboxTab = "inquiries"; viewInbox(); });
      document.querySelectorAll(".view-inbox, .click-row").forEach(function (b) {
        b.addEventListener("click", function () { inboxDetail(Number(b.dataset.idx)); });
      });
    });
  }

  /* content */
  var CONTENT_FIELDS = [
    ["hero_eyebrow", "Hero eyebrow (small line above the title)"],
    ["hero_title_1", "Hero title, first line"],
    ["hero_title_2", "Hero title, second line"],
    ["hero_sub", "Hero intro text"],
    ["welcome_title", "Welcome section title"],
    ["welcome_1", "Welcome paragraph 1"],
    ["welcome_2", "Welcome paragraph 2"],
    ["welcome_3", "Welcome paragraph 3"],
    ["mission", "Mission statement"],
    ["vision", "Vision statement"],
    ["phone", "Phone (full format)"],
    ["phone_short", "Phone (short, for buttons)"],
    ["email", "Email address"],
    ["address", "Physical address"],
    ["hours", "Reception hours"],
    ["restaurant_hours", "Restaurant hours"],
    ["tagline", "Tagline (footer)"]
  ];
  function viewContent() {
    render(async function () {
      var d = await api("content.php", { action: "list" });
      var c = d.content || {};
      return '<div class="page-head"><h1>Content</h1>' +
        '<div class="actions"><button class="btn btn-gold" id="save-content">Save all</button></div></div>' +
        '<div class="card"><h2>Keep your content safe</h2>' +
        '<p class="f-hint">Offers, notices, rooms and the rest live in the database of this website. On hosting with a temporary disk (the free Render plan), a redeploy starts from the snapshot that was committed with the code, so anything added here since then is lost. Before a redeploy, download the snapshot and commit it - or make the changes on your own machine and push.</p>' +
        '<p><a class="btn btn-line" href="../api/admin/export.php" download>Download content snapshot</a></p></div>' +
        '<div class="card">' +
        CONTENT_FIELDS.map(function (f) {
          var isLong = f[0].indexOf("_1") > 0 || f[0].indexOf("_2") > 0 || f[0].indexOf("_3") > 0 ||
            f[0] === "mission" || f[0] === "vision";
          return '<label class="f-label">' + esc(f[1]) + '</label>' +
            (isLong ? '<textarea class="f-textarea" data-key="' + f[0] + '">' + esc(c[f[0]] || "") + '</textarea>'
                    : '<input class="f-input" data-key="' + f[0] + '" value="' + esc(c[f[0]] || "") + '">');
        }).join("") + '</div>';
    }).then(function () {
      document.getElementById("save-content").addEventListener("click", function () {
        var values = {};
        document.querySelectorAll("[data-key]").forEach(function (el) {
          values[el.dataset.key] = el.value;
        });
        api("content.php", { action: "save" }, { values: values })
          .then(function (d) { toast("Saved " + d.saved + " fields", "ok"); })
          .catch(function (e) { toast(e.message, "err"); });
      });
    });
  }

  /* settings */
  function viewSettings() {
    render(async function () {
      return '<div class="page-head"><h1>Settings</h1></div>' +
        '<div class="card"><h2>Change password</h2>' +
        '<label class="f-label">Current password</label><input class="f-input" id="pw-current" type="password" autocomplete="current-password">' +
        '<label class="f-label">New password (10+ characters)</label><input class="f-input" id="pw-next" type="password" autocomplete="new-password">' +
        '<div style="margin-top:1rem;"><button class="btn btn-dark" id="pw-save">Change password</button></div></div>' +
        '<div class="card"><h2>Content</h2>' +
        '<p style="color:#545454;margin-bottom:1rem;">Restore all rooms, menu, gallery, events and testimonials to the original defaults. Your bookings and messages are kept.</p>' +
        '<button class="btn btn-danger" id="seed-btn">Restore default content</button></div>' +
        '<div class="card"><h2>Payments and email</h2>' +
        '<p class="f-hint">M-Pesa payments and email notifications are on the way. There is nothing to set up yet; we will let you know right here as soon as they are ready.</p></div>';
    }).then(function () {
      document.getElementById("pw-save").addEventListener("click", function () {
        api("auth.php", { action: "password" }, {
          current: document.getElementById("pw-current").value,
          next: document.getElementById("pw-next").value
        }).then(function () {
          toast("Password changed", "ok");
          document.getElementById("pw-current").value = "";
          document.getElementById("pw-next").value = "";
        }).catch(function (e) { toast(e.message, "err"); });
      });
      document.getElementById("seed-btn").addEventListener("click", function () {
        confirmDialog("Replace all rooms, menu, gallery, events and testimonials with the defaults?", function () {
          api("seed.php", {})
            .then(function () { toast("Default content restored", "ok"); })
            .catch(function (e) { toast(e.message, "err"); });
        });
      });
    });
  }

  /* moments */
  function viewMoments() {
    render(async function () {
      var d = await api("moments.php", { action: "list" });
      var pending = d.moments.filter(function (m) { return m.status === "pending"; });
      var approved = d.moments.filter(function (m) { return m.status === "approved"; });
      function card(m, drag) {
        return '<div class="item-row"' + (drag ? ' draggable="true" data-id="' + m.id + '"' : "") + '>' +
          (drag ? '<span class="drag-handle" title="Drag to reorder">&#9776;</span>' : "") +
          '<img src="../' + esc(m.image) + '" alt="" style="width:80px;height:60px;border-radius:9px;object-fit:cover;">' +
          '<div class="info"><div class="nm">' + esc(m.name || "Guest") + '</div>' +
          '<div class="sub">' + esc(m.note) + '<br>' + esc(m.created_at) + '</div></div>' +
          '<div class="ops">' +
          (m.status === "pending"
            ? '<button class="btn btn-sm btn-gold approve-moment" data-id="' + m.id + '">Approve</button>'
            : "") +
          '<button class="btn btn-sm btn-danger del-moment" data-id="' + m.id + '">Delete</button>' +
          '</div></div>';
      }
      return '<div class="page-head"><h1>Moments</h1>' +
        '<div class="actions"><span class="f-hint">Guest photos wait here for your approval before they appear on the public site.</span></div></div>' +
        '<div class="card"><h2>Waiting for approval (' + pending.length + ')</h2>' +
        (pending.length ? pending.map(card).join("") : '<p class="f-hint">Nothing waiting. Guest uploads will land here.</p>') + '</div>' +
        '<div class="card"><h2>Live on the site (' + approved.length + ')</h2>' +
        '<p class="drag-hint">Drag the handle to reorder the wall.</p>' +
        '<div id="moments-live">' +
        (approved.length ? approved.map(function (m) { return card(m, true); }).join("") : '<p class="f-hint">No approved moments yet.</p>') + '</div></div>';
    }).then(function () {
      dragList(document.getElementById("moments-live"), "moments.php");
      document.querySelectorAll(".approve-moment").forEach(function (b) {
        b.addEventListener("click", function () {
          api("moments.php", { action: "approve" }, { id: Number(b.dataset.id) })
            .then(function () { toast("Approved. It is live now.", "ok"); viewMoments(); })
            .catch(function (e) { toast(e.message, "err"); });
        });
      });
      document.querySelectorAll(".del-moment").forEach(function (b) {
        b.addEventListener("click", function () {
          confirmDialog("Remove this moment? The photo is deleted too.", function () {
            api("moments.php", { action: "delete" }, { id: Number(b.dataset.id) })
              .then(function () { toast("Removed", "ok"); viewMoments(); })
              .catch(function (e) { toast(e.message, "err"); });
          });
        });
      });
    });
  }

  /* offers */
  function offerModal(id) {
    api("offers.php", { action: "list" }).then(function (d) {
      var o = d.offers.find(function (x) { return Number(x.id) === id; }) || {};
      var image = o.image || "";
      var body =
        '<label class="f-label">Title</label><input class="f-input" id="of-title" value="' + esc(o.title || "") + '" placeholder="e.g. 15% off for new visitors">' +
        '<label class="f-label">Badge (small label above the title)</label><input class="f-input" id="of-badge" value="' + esc(o.badge || "") + '" placeholder="e.g. Limited offer">' +
        '<label class="f-label">Details</label><textarea class="f-textarea" id="of-text" placeholder="What the guest gets, and any conditions.">' + esc(o.text || "") + '</textarea>' +
        '<div class="form-grid">' +
        '<div><label class="f-label">Discount (%)</label><input class="f-input" id="of-pct" type="number" min="0" max="100" value="' + (o.discount_pct || 0) + '"></div>' +
        '<div><label class="f-label">Offer code (guests apply this)</label><input class="f-input" id="of-code" value="' + esc(o.code || "") + '" placeholder="e.g. NEW15"></div>' +
        '</div>' +
        '<label class="f-label">Flyer image (optional, shows on the offer card)</label><div id="of-image-zone"></div>' +
        '<div id="of-image-prev" class="thumbs">' + (image ? '<img src="../' + esc(image) + '" alt="">' : "") + '</div>' +
        '<label class="f-label"><input type="checkbox" id="of-active"' + (Number(o.active) !== 0 ? " checked" : "") + '> Show this offer on the home page</label>';
      openModal(id ? "Edit offer" : "Add offer", body, function (e, close) {
        var title = document.getElementById("of-title").value.trim();
        if (!title) { toast("Give the offer a title.", "err"); return; }
        api("offers.php", { action: "save" }, {
          id: id || 0,
          title: title,
          badge: document.getElementById("of-badge").value.trim(),
          text: document.getElementById("of-text").value.trim(),
          code: document.getElementById("of-code").value.trim().toUpperCase(),
          discount_pct: Number(document.getElementById("of-pct").value) || 0,
          active: document.getElementById("of-active").checked ? 1 : 0,
          image: image,
          sort: 0
        }).then(function () { close(); toast("Offer saved", "ok"); viewOffers(); })
          .catch(function (err) { toast(err.message, "err"); });
      });
      document.getElementById("of-image-zone").appendChild(uploadZone(function (url) {
        image = url;
        document.getElementById("of-image-prev").innerHTML = '<img src="../' + esc(url) + '" alt="">';
        toast("Flyer uploaded", "ok");
      }));
    }).catch(function (e) { toast(e.message, "err"); });
  }

  function viewOffers() {
    render(async function () {
      var d = await api("offers.php", { action: "list" });
      return '<div class="page-head"><h1>Offers</h1>' +
        '<div class="actions"><button class="btn btn-gold" id="add-offer">Add offer</button></div></div>' +
        '<div class="card"><h2>Deals on the home page (' + d.offers.length + ')</h2>' +
        '<p class="drag-hint">Drag the handle to reorder how the deals appear.</p>' +
        '<div id="offers-list">' +
        d.offers.map(function (o) {
          return '<div class="item-row" draggable="true" data-id="' + o.id + '">' +
            '<span class="drag-handle" title="Drag to reorder">&#9776;</span>' +
            (o.image
              ? '<img src="../' + esc(o.image) + '" alt="" style="width:80px;height:60px;border-radius:9px;object-fit:cover;">'
              : '<div class="no-img" style="width:80px;height:60px;font-size:1.4rem;">' + esc(o.discount_pct || 0) + '%</div>') +
            '<div class="info"><div class="nm">' + esc(o.title) +
            (Number(o.active) === 0 ? ' <span class="badge badge-cancelled">hidden</span>' : ' <span class="badge badge-confirmed">live</span>') +
            '</div><div class="sub">' + esc(o.badge) + (o.code ? ' | Code: ' + esc(o.code) : "") + '<br>' + esc(o.text) + '</div></div>' +
            '<div class="ops">' +
            '<button class="btn btn-sm btn-line edit-offer" data-id="' + o.id + '">Edit</button>' +
            '<button class="btn btn-sm btn-line toggle-offer" data-id="' + o.id + '">' + (Number(o.active) ? "Hide" : "Show") + '</button>' +
            '<button class="btn btn-sm btn-danger del-offer" data-id="' + o.id + '">Delete</button>' +
            '</div></div>';
        }).join("") + '</div>' +
        (d.offers.length ? "" : '<p class="f-hint">No offers yet. Add one and it appears on the home page right away.</p>') + '</div>';
    }).then(function () {
      dragList(document.getElementById("offers-list"), "offers.php");
      document.getElementById("add-offer").addEventListener("click", function () { offerModal(null); });
      document.querySelectorAll(".edit-offer").forEach(function (b) {
        b.addEventListener("click", function () { offerModal(Number(b.dataset.id)); });
      });
      document.querySelectorAll(".toggle-offer").forEach(function (b) {
        b.addEventListener("click", function () {
          api("offers.php", { action: "toggle" }, { id: Number(b.dataset.id) })
            .then(function () { toast("Updated", "ok"); viewOffers(); })
            .catch(function (e) { toast(e.message, "err"); });
        });
      });
      document.querySelectorAll(".del-offer").forEach(function (b) {
        b.addEventListener("click", function () {
          confirmDialog("Remove this offer?", function () {
            api("offers.php", { action: "delete" }, { id: Number(b.dataset.id) })
              .then(function () { toast("Offer removed", "ok"); viewOffers(); })
              .catch(function (e) { toast(e.message, "err"); });
          });
        });
      });
    });
  }

  /* announcements */
  function announcementModal(id) {
    api("announcements.php", { action: "list" }).then(function (d) {
      var a = (d.announcements || []).find(function (x) { return Number(x.id) === id; }) || {};
      var raw = a.images;
      if (typeof raw === "string") {
        try { raw = JSON.parse(raw); } catch (err) { raw = null; }
      }
      if (!Array.isArray(raw)) raw = [];
      var images = raw.slice();
      var kinds = ["Notice", "Guest perk", "News"];
      var body =
        '<label class="f-label">Headline</label>' +
        '<input class="f-input" id="an-title" value="' + esc(a.title || "") + '" placeholder="e.g. Closed for maintenance on 20 October">' +
        '<label class="f-label">Type</label>' +
        '<select class="f-input" id="an-kind">' +
          kinds.map(function (k) {
            return '<option' + ((a.kind || "Notice") === k ? " selected" : "") + '>' + k + '</option>';
          }).join("") +
        '</select>' +
        '<label class="f-label">Message</label>' +
        '<textarea class="f-textarea" id="an-body" rows="7" placeholder="What guests need to know, in your own words.">' + esc(a.body || "") + '</textarea>' +
        '<div class="form-grid">' +
          '<div><label class="f-label">Show from (optional)</label><input class="f-input" id="an-starts" type="date" value="' + esc(a.starts_on || "") + '"></div>' +
          '<div><label class="f-label">Hide after (optional)</label><input class="f-input" id="an-ends" type="date" value="' + esc(a.ends_on || "") + '"></div>' +
        '</div>' +
        '<label class="f-label">Photos (up to 6; click a thumbnail to remove it)</label>' +
        '<div id="an-image-zone"></div>' +
        '<div id="an-image-prev" class="thumbs">' +
          images.map(function (g) { return '<img src="../' + esc(g) + '" data-g="' + esc(g) + '" alt="">'; }).join("") +
        '</div>' +
        '<label class="f-label"><input type="checkbox" id="an-pinned"' + (Number(a.pinned) === 1 ? " checked" : "") + '> Pin to the top of every page (for closures and urgent notices)</label>' +
        '<label class="f-label"><input type="checkbox" id="an-active"' + (Number(a.active) !== 0 ? " checked" : "") + '> Publish now</label>';
      openModal(id ? "Edit announcement" : "New announcement", body, function (e, close) {
        var title = document.getElementById("an-title").value.trim();
        var text = document.getElementById("an-body").value.trim();
        if (!title) { toast("Give the announcement a headline.", "err"); return; }
        if (!text) { toast("Write the message guests should read.", "err"); return; }
        api("announcements.php", { action: "save" }, {
          id: id || 0,
          title: title,
          kind: document.getElementById("an-kind").value,
          body: text,
          starts_on: document.getElementById("an-starts").value,
          ends_on: document.getElementById("an-ends").value,
          pinned: document.getElementById("an-pinned").checked ? 1 : 0,
          active: document.getElementById("an-active").checked ? 1 : 0,
          images: images,
          sort: 0
        }).then(function () { close(); toast("Announcement saved", "ok"); viewAnnouncements(); })
          .catch(function (err) { toast(err.message, "err"); });
      });
      document.getElementById("an-image-zone").appendChild(uploadZone(function (url) {
        if (images.length >= 6) { toast("Up to 6 photos per announcement.", "err"); return; }
        images.push(url);
        document.getElementById("an-image-prev").innerHTML = images.map(function (g) {
          return '<img src="../' + esc(g) + '" data-g="' + esc(g) + '" alt="">';
        }).join("");
        toast("Photo added", "ok");
      }));
      document.getElementById("an-image-prev").addEventListener("click", function (e) {
        var img = e.target.closest("img[data-g]");
        if (!img) return;
        images = images.filter(function (g) { return g !== img.dataset.g; });
        img.remove();
      });
    }).catch(function (e) { toast(e.message, "err"); });
  }

  /* full announcement, opened by clicking a row in the list */
  function announcementDetail(id) {
    api("announcements.php", { action: "list" }).then(function (d) {
      var a = (d.announcements || []).find(function (x) { return Number(x.id) === id; });
      if (!a) { toast("That announcement is gone.", "err"); viewAnnouncements(); return; }
      var imgs = Array.isArray(a.images) ? a.images : [];
      var when = [];
      if (a.starts_on) when.push("from " + a.starts_on);
      if (a.ends_on) when.push("until " + a.ends_on);
      var body =
        '<div class="m-detail-row"><span>Type</span><span>' + esc(a.kind || "Notice") + '</span></div>' +
        '<div class="m-detail-row"><span>State</span><span>' +
          (Number(a.active) ? "Live on the site" : "Draft (hidden)") +
          (Number(a.pinned) ? " | pinned to the top of every page" : "") +
        '</span></div>' +
        '<div class="m-detail-row"><span>Dates</span><span>' + (when.length ? esc(when.join(", ")) : "always shown") + '</span></div>' +
        '<div class="m-detail-row"><span>Photos</span><span>' + (imgs.length ? imgs.length + (imgs.length === 1 ? " photo" : " photos") : "none") + '</span></div>' +
        '<div class="m-detail-msg">' + esc(a.body || "") + '</div>' +
        (imgs.length
          ? '<label class="f-label">Photos (click one to open it full size)</label>' +
            '<div class="ann-shots">' + imgs.map(function (g, i) {
              return '<a href="../' + esc(g) + '" target="_blank" rel="noopener">' +
                '<img src="../' + esc(g) + '" alt="' + esc(a.title) + ' photo ' + (i + 1) + '"></a>';
            }).join("") + '</div>'
          : "") +
        '<p class="f-hint">This is exactly what a guest sees on the site' +
          (imgs.length > 1 ? ", photos included" : "") + '.</p>';
      openModal(a.title || "Announcement", body, function (e, close) {
        close();
        announcementModal(id);
      });
      var save = document.getElementById("modal-save");
      if (save) save.textContent = "Edit this announcement";
      var ops = document.querySelector("#modal .ops");
      if (ops) {
        var view = document.createElement("a");
        view.className = "btn btn-line btn-sm";
        view.textContent = "See it on the site";
        view.href = "../notice?id=" + id;
        view.target = "_blank";
        view.rel = "noopener";
        ops.insertBefore(view, ops.firstChild);
      }
    }).catch(function (e) { toast(e.message, "err"); });
  }

  function viewAnnouncements() {
    render(async function () {
      var d = await api("announcements.php", { action: "list" });
      var list = d.announcements || [];
      return '<div class="page-head"><h1>Announcements</h1>' +
        '<div class="actions"><button class="btn btn-gold" id="add-ann">New announcement</button></div></div>' +
        '<div class="card"><h2>What this is for</h2>' +
        '<p class="f-hint">Short messages that are not offers: closing for maintenance, a holiday schedule, a treat for guests who stay several nights, a new chef, a new menu. Announcements appear in their own section on the home page, and any you pin also show as a slim bar under the header on every page until the guest dismisses it. Set a hide-after date and it removes itself.</p></div>' +
        '<div class="card"><h2>On the site (' + list.length + ')</h2>' +
        '<p class="drag-hint">Drag the handle to reorder how they appear.</p>' +
        '<div id="ann-list">' +
        list.map(function (a) {
          var imgs = Array.isArray(a.images) ? a.images : [];
          var badges = (Number(a.active) === 0 ? ' <span class="badge badge-cancelled">draft</span>' : ' <span class="badge badge-confirmed">live</span>') +
            (Number(a.pinned) === 1 ? ' <span class="badge badge-pending">pinned</span>' : "");
          var when = (a.starts_on ? "from " + esc(a.starts_on) : "") + (a.ends_on ? " until " + esc(a.ends_on) : "");
          return '<div class="item-row row-click" draggable="true" data-id="' + a.id + '">' +
            '<span class="drag-handle" title="Drag to reorder">&#9776;</span>' +
            (imgs.length
              ? '<img src="../' + esc(imgs[0]) + '" alt="" style="width:80px;height:60px;border-radius:9px;object-fit:cover;">'
              : '<div class="no-img" style="width:80px;height:60px;font-size:1.1rem;">' + esc(a.kind || "Notice") + '</div>') +
            '<div class="info"><div class="nm">' + esc(a.title) + badges + '</div>' +
            '<div class="sub">' + esc(a.kind || "Notice") + (when ? " | " + when : "") + (imgs.length > 1 ? " | " + imgs.length + " photos" : "") + '<br>' + esc(String(a.body || "").slice(0, 110)) + '</div></div>' +
            '<div class="ops">' +
            '<button class="btn btn-sm btn-gold view-ann" data-id="' + a.id + '">View</button>' +
            '<button class="btn btn-sm btn-line edit-ann" data-id="' + a.id + '">Edit</button>' +
            '<button class="btn btn-sm btn-line toggle-ann" data-id="' + a.id + '">' + (Number(a.active) ? "Unpublish" : "Publish") + '</button>' +
            '<button class="btn btn-sm btn-line pin-ann" data-id="' + a.id + '">' + (Number(a.pinned) ? "Unpin" : "Pin") + '</button>' +
            '<button class="btn btn-sm btn-danger del-ann" data-id="' + a.id + '">Delete</button>' +
            '</div></div>';
        }).join("") + '</div>' +
        (list.length ? "" : '<p class="f-hint">Nothing yet. Create one and it shows on the home page right away.</p>') + '</div>';
    }).then(function () {
      dragList(document.getElementById("ann-list"), "announcements.php");
      document.getElementById("add-ann").addEventListener("click", function () { announcementModal(null); });

      /* the whole row opens the announcement, like the bookings list does */
      document.querySelectorAll("#ann-list .item-row").forEach(function (row) {
        row.addEventListener("click", function (e) {
          if (e.target.closest("button") || e.target.closest(".drag-handle")) return;
          announcementDetail(Number(row.dataset.id));
        });
      });
      document.querySelectorAll(".view-ann").forEach(function (b) {
        b.addEventListener("click", function () { announcementDetail(Number(b.dataset.id)); });
      });
      document.querySelectorAll(".edit-ann").forEach(function (b) {
        b.addEventListener("click", function () { announcementModal(Number(b.dataset.id)); });
      });
      document.querySelectorAll(".toggle-ann").forEach(function (b) {
        b.addEventListener("click", function () {
          api("announcements.php", { action: "toggle" }, { id: Number(b.dataset.id), field: "active" })
            .then(function () { toast("Updated", "ok"); viewAnnouncements(); })
            .catch(function (e) { toast(e.message, "err"); });
        });
      });
      document.querySelectorAll(".pin-ann").forEach(function (b) {
        b.addEventListener("click", function () {
          api("announcements.php", { action: "toggle" }, { id: Number(b.dataset.id), field: "pinned" })
            .then(function () { toast("Updated", "ok"); viewAnnouncements(); })
            .catch(function (e) { toast(e.message, "err"); });
        });
      });
      document.querySelectorAll(".del-ann").forEach(function (b) {
        b.addEventListener("click", function () {
          confirmDialog("Remove this announcement?", function () {
            api("announcements.php", { action: "delete" }, { id: Number(b.dataset.id) })
              .then(function () { toast("Announcement removed", "ok"); viewAnnouncements(); })
              .catch(function (e) { toast(e.message, "err"); });
          });
        });
      });
    });
  }

  /* journal */
  function journalModal(id) {
    api("journal.php", { action: "list" }).then(function (d) {
      var p = d.posts.find(function (x) { return Number(x.id) === id; }) || {};
      var raw = p.images;
      if (typeof raw === "string") {
        try { raw = JSON.parse(raw); } catch (err) { raw = null; }
      }
      if (!Array.isArray(raw)) raw = [];
      var images = raw.length ? raw.slice() : (p.image ? [p.image] : []);
      var body =
        '<label class="f-label">Title</label><input class="f-input" id="jr-title" value="' + esc(p.title || "") + '">' +
        '<label class="f-label">Short summary (shows on the journal list)</label><textarea class="f-textarea" id="jr-excerpt">' + esc(p.excerpt || "") + '</textarea>' +
        '<label class="f-label">Full note</label><textarea class="f-textarea" id="jr-body" rows="8">' + esc(p.body || "") + '</textarea>' +
        '<label class="f-label">Photos (add up to 5; click a thumbnail to remove it)</label><div id="jr-image-zone"></div>' +
        '<div id="jr-image-prev" class="thumbs">' + images.map(function (g) { return '<img src="../' + esc(g) + '" data-g="' + esc(g) + '" alt="">'; }).join("") + '</div>';
      openModal(id ? "Edit post" : "Add post", body, function (e, close) {
        var title = document.getElementById("jr-title").value.trim();
        if (!title) { toast("Give the post a title.", "err"); return; }
        api("journal.php", { action: "save" }, {
          id: id || 0,
          title: title,
          excerpt: document.getElementById("jr-excerpt").value.trim(),
          body: document.getElementById("jr-body").value.trim(),
          image: images[0] || "",
          images: images,
          sort: 0
        }).then(function () { close(); toast("Post saved", "ok"); viewJournal(); })
          .catch(function (err) { toast(err.message, "err"); });
      });
      document.getElementById("jr-image-zone").appendChild(uploadZone(function (url) {
        if (images.length >= 5) { toast("Up to 5 photos per post.", "err"); return; }
        images.push(url);
        document.getElementById("jr-image-prev").innerHTML = images.map(function (g) {
          return '<img src="../' + esc(g) + '" data-g="' + esc(g) + '" alt="">';
        }).join("");
        toast("Photo added", "ok");
      }));
      document.getElementById("jr-image-prev").addEventListener("click", function (e) {
        var img = e.target.closest("img[data-g]");
        if (!img) return;
        images = images.filter(function (g) { return g !== img.dataset.g; });
        img.remove();
      });
    }).catch(function (e) { toast(e.message, "err"); });
  }

  function viewJournal() {
    render(async function () {
      var d = await api("journal.php", { action: "list" });
      return '<div class="page-head"><h1>Journal</h1>' +
        '<div class="actions"><button class="btn btn-gold" id="add-post">Add post</button></div></div>' +
        '<div class="card"><h2>What to write</h2>' +
        '<p class="f-hint">The journal is your space to tell guests what makes the inn special. Great topics: how the food comes from our farm and how the kitchen prepares it, stories about our team and their commitments, what is new around the inn, and trips guests can take around Eldoret. Each post needs a title, a short summary, the full note, and one good photo (upload from your phone or computer). Posts appear on the public Journal page the moment you save them.</p></div>' +
        '<div class="card"><h2>Notes (' + d.posts.length + ')</h2>' +
        '<p class="drag-hint">Drag the handle to reorder the notes.</p>' +
        '<div id="journal-list">' +
        d.posts.map(function (p) {
          return '<div class="item-row" draggable="true" data-id="' + p.id + '">' +
            '<span class="drag-handle" title="Drag to reorder">&#9776;</span>' +
            (p.image ? '<img src="../' + esc(p.image) + '" alt="">' : '<div class="no-img">' + esc((p.title || "N").charAt(0)) + '</div>') +
            '<div class="info"><div class="nm">' + esc(p.title) + '</div>' +
            '<div class="sub">' + esc(p.excerpt) + '</div></div>' +
            '<div class="ops">' +
            '<button class="btn btn-sm btn-line edit-post" data-id="' + p.id + '">Edit</button>' +
            '<button class="btn btn-sm btn-danger del-post" data-id="' + p.id + '">Delete</button>' +
            '</div></div>';
        }).join("") + '</div>' +
        (d.posts.length ? "" : '<p class="f-hint">No posts yet. Notes you add here appear on the public Journal page.</p>') + '</div>';
    }).then(function () {
      dragList(document.getElementById("journal-list"), "journal.php");
      document.getElementById("add-post").addEventListener("click", function () { journalModal(null); });
      document.querySelectorAll(".edit-post").forEach(function (b) {
        b.addEventListener("click", function () { journalModal(Number(b.dataset.id)); });
      });
      document.querySelectorAll(".del-post").forEach(function (b) {
        b.addEventListener("click", function () {
          confirmDialog("Remove this post?", function () {
            api("journal.php", { action: "delete" }, { id: Number(b.dataset.id) })
              .then(function () { toast("Post removed", "ok"); viewJournal(); })
              .catch(function (e) { toast(e.message, "err"); });
          });
        });
      });
    });
  }

  /* accounts */
  function viewAccounts() {
    render(async function () {
      var d = await api("accounts.php", { action: "list" });
      return '<div class="page-head"><h1>Accounts</h1>' +
        '<div class="actions"><span class="f-hint">Guests who signed up on the site. Deleting an account removes their sign-in; their bookings stay.</span></div></div>' +
        '<div class="card"><h2>Guests (' + d.users.length + ')</h2>' +
        '<table class="table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Bookings</th><th></th></tr></thead><tbody>' +
        d.users.map(function (u) {
          return '<tr><td>' + esc(u.name) + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.phone) + '</td><td>' + esc(u.created_at) + '</td><td>' + u.bookings + '</td>' +
            '<td><button class="btn btn-sm btn-danger del-user" data-id="' + u.id + '">Delete</button></td></tr>';
        }).join("") + '</tbody></table>' +
        (d.users.length ? "" : '<p class="f-hint">No guest accounts yet. They appear here as soon as someone signs up.</p>') + '</div>';
    }).then(function () {
      document.querySelectorAll(".del-user").forEach(function (b) {
        b.addEventListener("click", function () {
          confirmDialog("Delete this account? The guest will need to sign up again to sign in.", function () {
            api("accounts.php", { action: "delete" }, { id: Number(b.dataset.id) })
              .then(function () { toast("Account deleted", "ok"); viewAccounts(); })
              .catch(function (e) { toast(e.message, "err"); });
          });
        });
      });
    });
  }

  /* every sidebar button needs an entry here or its click goes nowhere */
  var ROUTES = {
    dashboard: viewDashboard,
    bookings: viewBookings,
    orders: viewOrders,
    rooms: viewRooms,
    menu: viewMenu,
    gallery: viewGallery,
    moments: viewMoments,
    offers: viewOffers,
    announcements: viewAnnouncements,
    journal: viewJournal,
    events: viewEvents,
    testimonials: viewTestimonials,
    inbox: viewInbox,
    accounts: viewAccounts,
    content: viewContent,
    settings: viewSettings
  };

  document.querySelectorAll(".side-nav button").forEach(function (b) {
    b.addEventListener("click", function () {
      closeSide();
      setActiveView(b.dataset.view);
      ROUTES[b.dataset.view]();
    });
  });

  /* mobile slide menu */
  var sideEl = document.querySelector(".side");
  var sideToggle = document.getElementById("side-toggle");
  var sideBackdrop = document.getElementById("side-backdrop");
  function closeSide() {
    if (sideEl) sideEl.classList.remove("open");
    if (sideBackdrop) sideBackdrop.hidden = true;
  }
  if (sideToggle) {
    sideToggle.addEventListener("click", function () {
      sideEl.classList.add("open");
      sideBackdrop.hidden = false;
    });
    sideBackdrop.addEventListener("click", closeSide);
  }

  document.getElementById("logout-btn").addEventListener("click", function () {
    fetch("../api/admin/auth.php?action=logout", { credentials: "same-origin" })
      .finally(function () {
        sessionStorage.removeItem("sai_csrf");
        location.href = "login.html";
      });
  });

  /* boot: auth check then dashboard */
  api("auth.php", { action: "check" })
    .then(function (d) {
      if (!d.authed) {
        location.href = "login.html";
        return;
      }
      if (!csrf) {
        return api("auth.php", { action: "check" }).then(function () {
          /* csrf token is issued at login; if missing, force re-login */
          location.href = "login.html";
        });
      }
      setActiveView("dashboard");
      viewDashboard();
      refreshBadges();
    })
    .catch(function () {
      location.href = "login.html";
    });
})();
