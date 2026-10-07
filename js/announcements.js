/* announcements: the pinned strip, the home section, the notice page */

(function () {
  const items = (SAI.announcements || []).filter((a) => a && a.title);
  const asset = (p) => (window.SAI_ASSET ? SAI_ASSET(p) : p);
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const ICONS = {
    Notice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
    "Guest perk": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
    News: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0V9M10 7h8M10 11h8M10 15h6"/></svg>'
  };
  const kindClass = (k) => "ann-" + String(k || "Notice").toLowerCase().replace(/[^a-z]+/g, "-");
  const shortDate = (d) => {
    if (!d) return "";
    const parts = String(d).split("-");
    if (parts.length !== 3) return "";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const m = months[Number(parts[1]) - 1];
    return m ? Number(parts[2]) + " " + m : "";
  };

  /* pinned strip (every page) */
  const strip = document.getElementById("ann-strip");
  if (strip) {
    let dismissed = {};
    try {
      const raw = JSON.parse(localStorage.getItem("sai_ann_dismiss") || "{}");
      const today = new Date().toISOString().slice(0, 10);
      if (raw && raw.day === today && Array.isArray(raw.ids)) {
        raw.ids.forEach((id) => { dismissed[id] = true; });
      }
    } catch (e) { dismissed = {}; }

    const pinned = items.filter((a) => Number(a.pinned) === 1 && !dismissed[a.id]);
    if (pinned.length) {
      const a = pinned[0];
      strip.hidden = false;
      strip.innerHTML =
        '<div class="container ann-strip-inner">' +
          '<span class="ann-strip-icon">' + (ICONS[a.kind] || ICONS.Notice) + '</span>' +
          '<span class="ann-strip-txt"><strong>' + esc(a.title) + '</strong>' +
            (a.body ? '<span class="ann-strip-body">' + esc(a.body.slice(0, 120)) + (a.body.length > 120 ? "..." : "") + '</span>' : "") +
          '</span>' +
          '<a class="ann-strip-link" href="notice?id=' + a.id + '">Read</a>' +
          '<button class="ann-strip-x" type="button" aria-label="Dismiss announcement">&times;</button>' +
        '</div>';
      strip.querySelector(".ann-strip-x").addEventListener("click", () => {
        strip.hidden = true;
        try {
          const today = new Date().toISOString().slice(0, 10);
          let ids = [];
          const raw = JSON.parse(localStorage.getItem("sai_ann_dismiss") || "{}");
          if (raw && raw.day === today && Array.isArray(raw.ids)) ids = raw.ids;
          if (ids.indexOf(a.id) === -1) ids.push(a.id);
          localStorage.setItem("sai_ann_dismiss", JSON.stringify({ day: today, ids: ids }));
        } catch (e) {}
      });
    }
  }

  /* home page section */
  const section = document.getElementById("announcements");
  const grid = document.getElementById("home-announcements");
  if (section && grid) {
    if (items.length) {
      section.hidden = false;
      grid.innerHTML = items.slice(0, 6).map((a, i) => {
        const imgs = Array.isArray(a.images) ? a.images : (a.img ? [a.img] : []);
        const cls = "notice-" + String(a.kind || "Notice").toLowerCase().replace(/[^a-z]+/g, "-");
        return '<article class="post-card reveal ' + cls + (imgs.length ? "" : " no-thumb") + '" style="--d:' + (i * 0.08) + 's">' +
          (imgs.length
            ? '<a class="thumb" href="notice?id=' + a.id + '">' +
                '<img src="' + esc(asset(imgs[0])) + '" alt="' + esc(a.title) + '" loading="lazy">' +
                (imgs.length > 1 ? '<span class="post-count">' + imgs.length + ' photos</span>' : "") +
              '</a>'
            : "") +
          '<div>' +
            '<div class="date"><span class="notice-line">' + (ICONS[a.kind] || ICONS.Notice) + esc(a.kind || "Notice") + '</span>' +
              (a.ends_on ? ' · until ' + esc(shortDate(a.ends_on)) : "") +
            '</div>' +
            '<h3><a href="notice?id=' + a.id + '">' + esc(a.title) + '</a></h3>' +
            '<p>' + esc(a.body.length > 200 ? a.body.slice(0, 200).trim() + "..." : a.body) + '</p>' +
            '<a class="read" href="notice?id=' + a.id + '">Read more' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
            '</a>' +
          '</div>' +
        '</article>';
      }).join("");
      if (window.SAIReveal) window.SAIReveal(grid);
    }
  }

  /* single notice page */
  const root = document.getElementById("notice-root");
  if (root) {
    const id = Number(new URLSearchParams(location.search).get("id") || 0);
    const a = items.find((x) => Number(x.id) === id);
    if (!a) {
      root.innerHTML =
        '<div class="empty-state"><div class="big">Not found</div>' +
        '<p>That notice is no longer on the board.</p>' +
        '<p><a class="btn btn-gold" href="index">Back to the home page</a></p></div>';
      return;
    }
    const imgs = Array.isArray(a.images) ? a.images : (a.img ? [a.img] : []);
    const paras = String(a.body || "").split(/\n{2,}/).map((p) => "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>").join("");
    root.innerHTML =
      '<div class="ann-page">' +
        '<div class="ann-page-top">' +
          '<span class="ann-kind ' + kindClass(a.kind) + '">' + (ICONS[a.kind] || ICONS.Notice) + esc(a.kind || "Notice") + '</span>' +
          (a.ends_on ? '<span class="ann-until">In effect until ' + esc(shortDate(a.ends_on)) + '</span>' : "") +
        '</div>' +
        '<h1>' + esc(a.title) + '</h1>' +
        '<div class="ann-page-body">' + paras + '</div>' +
        (imgs.length
          ? '<div class="ann-page-gallery">' +
            imgs.map((g, i) =>
              '<a href="#" data-lightbox="' + esc(asset(g)) + '" class="ann-shot"><img src="' + esc(asset(g)) + '" alt="' + esc(a.title) + '" loading="lazy" data-idx="' + i + '"></a>'
            ).join("") + '</div>'
          : "") +
        '<div class="ann-page-foot">' +
          '<a class="btn btn-ghost" href="index">Back to the home page</a>' +
          '<a class="btn btn-gold" href="book">Reserve a room</a>' +
        '</div>' +
      '</div>';
  }
})();
