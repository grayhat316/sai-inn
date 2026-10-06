/* Sai Inn dining page: tabs, search, dish grid */

(function () {
  const tabsWrap = document.getElementById("menu-tabs");
  const grid = document.getElementById("dish-grid");
  const search = document.getElementById("menu-search");
  const countEl = document.getElementById("menu-count");

  let activeCat = "ALL";
  let query = "";

  function cats() {
    const counts = {};
    SAI.menu.forEach((m) => { counts[m.cat] = (counts[m.cat] || 0) + 1; });
    return Object.keys(counts);
  }

  function card(m) {
    const price = m.price === null ? "Ask for price" : "KSh " + m.price.toLocaleString();
    const media = m.img
      ? '<img src="' + SAI_ASSET(m.img) + '" alt="' + m.name + '" loading="lazy">'
      : '<span class="no-img">' + m.name.charAt(0) + '</span>';
    return (
      '<article class="dish-card">' +
        '<div class="media">' + media +
          '<span class="cat-tag">' + m.cat + '</span>' +
        '</div>' +
        '<div class="body">' +
          '<h3>' + m.name + '</h3>' +
          '<div class="row">' +
            '<span class="price">' + price + '</span>' +
            '<a class="view-btn" href="dish.html?id=' + encodeURIComponent(m.id) + '">View</a>' +
          '</div>' +
          '<span class="order-ago">' + (window.SAI_orderedAgo ? window.SAI_orderedAgo(m.id, m.cat) : "") + '</span>' +
        '</div>' +
      '</article>'
    );
  }

  function render() {
    const list = SAI.menu.filter((m) => {
      const okCat = activeCat === "ALL" || m.cat === activeCat;
      const okQuery = !query || m.name.toLowerCase().includes(query) || m.cat.toLowerCase().includes(query);
      return okCat && okQuery;
    });
    grid.innerHTML = list.map(card).join("");
    if (!list.length) {
      grid.innerHTML = '<div class="empty-state"><div class="big">Nothing matches</div><p>Try another word, or browse the full menu.</p><button class="btn btn-line" id="reset-search">Show everything</button></div>';
      const reset = document.getElementById("reset-search");
      if (reset) reset.addEventListener("click", () => { search.value = ""; query = ""; activeCat = "ALL"; paintTabs(); render(); });
    }
    countEl.textContent = list.length + " dishes";
  }

  function paintTabs() {
    const catList = cats();
    tabsWrap.innerHTML = ['<button class="pill-tab' + (activeCat === "ALL" ? " active" : "") + '" data-cat="ALL">All<b>' + SAI.menu.length + '</b></button>']
      .concat(catList.map((c) =>
        '<button class="pill-tab' + (activeCat === c ? " active" : "") + '" data-cat="' + c + '">' + c + '<b>' + SAI.menu.filter((m) => m.cat === c).length + '</b></button>'
      )).join("");
    tabsWrap.querySelectorAll(".pill-tab").forEach((t) => {
      t.addEventListener("click", () => {
        activeCat = t.dataset.cat;
        paintTabs();
        render();
      });
    });
  }

  if (search) {
    let debounce = null;
    search.addEventListener("input", () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        query = search.value.trim().toLowerCase();
        render();
      }, 180);
    });
  }

  paintTabs();
  render();
})();
