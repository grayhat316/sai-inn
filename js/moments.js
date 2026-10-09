/* Sai Inn moments page: guest photos wall + share (account required, up to 5 photos) */

(function () {
  const grid = document.getElementById("moments-grid");
  const form = document.getElementById("moments-form");
  const formCard = document.getElementById("moments-form-card");
  const shareToggle = document.getElementById("share-toggle");
  const shareInline = document.getElementById("share-inline");
  const PAGE = 12;
  let offset = 0;
  let authed = false;

  /* same card shape as the journal list */
  function momentCard(m, i) {
    const imgs = (m.images && m.images.length) ? m.images : (m.image || m.img ? [m.image || m.img] : []);
    const first = SAI_ASSET(imgs[0] || "");
    const href = "moment?m=" + m.id;
    const thumbs = imgs.slice(1, 4).map((s) => '<img src="' + SAI_ASSET(s) + '" alt="More photos for this moment" loading="lazy">').join("");
    return '<article class="post-card reveal" style="--d:' + (i % 4) * 0.07 + 's">' +
      '<a class="thumb" href="' + href + '">' +
        (first ? '<img src="' + first + '" alt="Moment captured at Sai Inn by ' + esc(m.name || "a guest") + '" loading="lazy">' : "") +
        (imgs.length > 1 ? '<span class="post-count">' + imgs.length + ' photos</span>' : "") +
      '</a>' +
      '<div>' +
        '<div class="date">' + (m.created_at || "Sai Inn moment") + '</div>' +
        '<h3><a href="' + href + '">' + esc(m.name || "Sai Inn guest") + '</a></h3>' +
        (m.note ? '<p>' + esc(m.note) + '</p>' : "") +
        (thumbs ? '<div class="post-thumbs">' + thumbs + '</div>' : "") +
        '<a class="read" href="' + href + '">' +
          'View the moment' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
        '</a>' +
      '</div>' +
    '</article>';
  }

  function loadMoments(reset) {
    if (reset) {
      offset = 0;
      grid.innerHTML = "";
    }
    fetch("api/moments.php?action=list&offset=" + offset + "&limit=" + PAGE)
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        const list = (d.ok && d.moments) || [];
        offset += list.length;
        if (!list.length && offset === 0) {
          grid.innerHTML =
            '<div class="empty-state reveal"><div class="big">No moments yet</div>' +
            '<p>Be the first guest to share a photo from your stay.</p></div>';
          return;
        }
        grid.insertAdjacentHTML("beforeend", list.map(momentCard).join(""));
        const moreBtn = document.getElementById("moments-more");
        if (moreBtn) moreBtn.remove();
        if (d.has_more) {
          const btn = document.createElement("button");
          btn.className = "btn btn-line";
          btn.id = "moments-more";
          btn.textContent = "Show more moments";
          btn.addEventListener("click", () => loadMoments(false));
          const wrap = document.createElement("div");
          wrap.className = "dining-ctas center reveal";
          wrap.style.marginTop = "1rem";
          wrap.appendChild(btn);
          grid.parentElement.insertBefore(wrap, grid.nextSibling);
        }
        if (window.SAIReveal) window.SAIReveal(grid);
      })
      .catch(() => {
        grid.innerHTML =
          '<div class="empty-state"><div class="big">Offline</div>' +
          '<p>Moments will appear here when the site is running with its server.</p></div>';
      });
  }

  loadMoments(true);

  /* share button behaviour: signed in -> open the form; not signed in -> account */
  fetch("api/account.php?action=me", { credentials: "same-origin" })
    .then((r) => r.json().catch(() => ({})))
    .then((d) => {
      authed = !!(d.ok && d.authed);
    })
    .catch(() => { authed = false; });

  /* hold-up modal: must have an account first */
  function holdUp() {
    const bd = document.createElement("div");
    bd.className = "holdup-backdrop";
    bd.innerHTML =
      '<div class="holdup">' +
        '<div class="big">Hold up</div>' +
        '<p>Moments are shared by our guests. You need an account with Sai Inn to share yours. It takes under a minute, then you can come right back here.</p>' +
        '<div class="ops">' +
          '<a class="btn btn-gold" href="account?next=moments&amp;mode=register">Create an account</a>' +
          '<a class="btn btn-line" href="account?next=moments&amp;mode=login">I already have one, sign in</a>' +
          '<button class="btn btn-line" type="button" data-close>Not now</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bd);
    bd.addEventListener("click", (e) => {
      if (e.target === bd || e.target.closest("[data-close]")) bd.remove();
    });
  }

  function openShare() {
    if (authed) {
      const opening = formCard.hidden;
      formCard.hidden = !opening;
      if (opening) {
        formCard.scrollIntoView({ behavior: "smooth", block: "center" });
        formCard.classList.add("flash");
        setTimeout(() => formCard.classList.remove("flash"), 1600);
      }
    } else {
      holdUp();
    }
  }

  if (shareToggle && formCard) {
    shareToggle.addEventListener("click", openShare);
  }
  if (shareInline) {
    shareInline.addEventListener("click", (e) => { e.preventDefault(); openShare(); });
  }

  /* previews for selected files: new picks are ADDED to the previous ones,
     and each preview can be removed before sending */
  const fileInput = document.getElementById("mo-photo");
  const preview = document.getElementById("mo-preview");
  let pending = [];
  if (fileInput && preview) {
    function paintPreviews() {
      preview.innerHTML = "";
      pending.slice(0, 5).forEach((f, i) => {
        const box = document.createElement("span");
        box.className = "mo-thumb";
        const img = document.createElement("img");
        img.src = URL.createObjectURL(f);
        img.alt = "Selected photo " + (i + 1);
        box.appendChild(img);
        const x = document.createElement("button");
        x.type = "button";
        x.className = "mo-remove";
        x.setAttribute("aria-label", "Remove photo");
        x.textContent = "\u00d7";
        x.addEventListener("click", () => {
          pending.splice(i, 1);
          syncInput();
          paintPreviews();
        });
        box.appendChild(x);
        preview.appendChild(box);
      });
    }
    function syncInput() {
      try {
        const dt = new DataTransfer();
        pending.forEach((f) => dt.items.add(f));
        fileInput.files = dt.files;
      } catch (e) { /* older browsers keep their own selection */ }
    }
    fileInput.addEventListener("change", () => {
      const incoming = Array.from(fileInput.files || []);
      pending = pending.concat(incoming).slice(0, 5);
      if (pending.length < incoming.length) {
        const note = document.getElementById("mo-limit-note");
        if (note) note.hidden = false;
      }
      syncInput();
      paintPreviews();
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!fileInput.files.length) {
        fileInput.focus();
        return;
      }
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.textContent = "Sending";
      const fd = new FormData();
      fd.append("note", document.getElementById("mo-note").value.trim());
      fd.append("website", form.querySelector("input[name=website]").value);
      Array.from(fileInput.files).slice(0, 5).forEach((f) => fd.append("photos[]", f));
      try {
        const res = await fetch("api/moments.php", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Could not send the photos.");
        pending = [];
        fileInput.value = "";
        preview.innerHTML = "";
        form.hidden = true;
        const done = document.getElementById("mo-done");
        done.hidden = false;
        done.innerHTML =
          '<div class="empty-state"><div class="big">Received</div>' +
          '<p>' + (data.saved > 1 ? data.saved + " photos received. " : "Photo received. ") +
          'They appear on this wall once our team approves them.</p></div>';
        done.scrollIntoView({ behavior: "smooth" });
      } catch (err) {
        const old = form.querySelector(".send-note");
        if (old) old.remove();
        const note = document.createElement("p");
        note.className = "send-note";
        note.textContent = err.message;
        form.appendChild(note);
        btn.disabled = false;
        btn.textContent = "Send photos";
      }
    });
  }
})();
