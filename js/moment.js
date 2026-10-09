/* Sai Inn moment detail page: same shape as the journal post page */

(function () {
  const root = document.getElementById("moment-root");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("m") || "";

  function fail(text) {
    root.innerHTML =
      '<div class="empty-state"><div class="big">Moment not found</div>' +
      '<p>' + text + '</p>' +
      '<a class="btn btn-line" href="moments">Back to moments</a></div>';
  }

  if (!id) {
    fail("No moment was selected.");
    return;
  }

  fetch("api/moments.php?action=one&id=" + encodeURIComponent(id), { credentials: "same-origin" })
    .then((r) => r.json())
    .then((d) => {
      if (!d || !d.ok || !d.moment) { fail("That moment may have been taken down."); return; }
      const m = d.moment;
      const imgs = (m.images && m.images.length) ? m.images : (m.image ? [m.image] : []);
      root.innerHTML =
        '<div class="post-date">' + (m.created_at || "Sai Inn moment") + '</div>' +
        '<h1>' + esc(m.name || "Sai Inn guest") + '</h1>' +
        (() => {
          if (!imgs.length) return "";
          const gridImgs = imgs.map((s, k) =>
            '<a href="#" data-lightbox="' + SAI_ASSET(s) + '" class="pg-img' + (k === 0 ? " pg-main" : "") + '">' +
              '<img src="' + SAI_ASSET(s) + '" alt="Moment photo ' + (k + 1) + '" loading="lazy">' +
            '</a>'
          ).join("");
          return '<div class="post-gallery">' + gridImgs + '</div>';
        })() +
        '<div class="post-copy">' +
          (m.note ? m.note.split(/\n\n+/).map((para) => "<p>" + para + "</p>").join("") : "") +
        '</div>' +
        '<div class="dining-ctas center reveal">' +
          '<a class="btn btn-gold" href="book">Reserve a room</a>' +
          '<a class="btn btn-line" href="moments">Back to moments</a>' +
        '</div>';
      if (window.SAIReveal) window.SAIReveal(root);
    })
    .catch(() => fail("Could not reach the server. Please try again."));
})();
