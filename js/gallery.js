/* Sai Inn gallery page: filter tabs + masonry grid + captions on hover */

(function () {
  const tabsWrap = document.getElementById("gallery-tabs");
  const grid = document.getElementById("gallery-grid");
  if (!grid || !SAI.gallery) return;

  let active = "All";

  const cats = ["All"].concat(Array.from(new Set(SAI.gallery.map((g) => g.cat))));

  function paint() {
    tabsWrap.innerHTML = cats.map((c) =>
      '<button class="pill-tab' + (active === c ? " active" : "") + '" data-cat="' + c + '">' + c + '<b>' + SAI.gallery.filter((g) => c === "All" || g.cat === c).length + '</b></button>'
    ).join("");
    tabsWrap.querySelectorAll(".pill-tab").forEach((t) => {
      t.addEventListener("click", () => { active = t.dataset.cat; paint(); render(); });
    });
  }

  function render() {
    const list = SAI.gallery.filter((g) => active === "All" || g.cat === active);
    grid.innerHTML = list.map((g, i) => {
      const cap = (g.caption || "").trim();
      return '<a class="reveal" style="--d:' + (i % 3) * 0.06 + 's" href="#" data-lightbox="' + SAI_ASSET(g.src) + '">' +
        '<span class="g-photo"><img src="' + SAI_ASSET(g.src) + '" alt="' + (cap || g.cat + " at Sai Inn") + '" loading="lazy">' +
        (cap ? '<span class="g-cap"><em>' + cap + '</em></span>' : "") +
        '</span>' +
      '</a>';
    }).join("");
    if (window.SAIReveal) window.SAIReveal(grid);
    if (window.SAIGalleryParallax) window.SAIGalleryParallax();
  }

  paint();
  render();
})();
