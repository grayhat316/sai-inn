/* Sai Inn journal post page: renders one post from ?p=slug or ?p=id */

(function () {
  const root = document.getElementById("post-root");
  if (!root || !SAI.posts) return;

  const params = new URLSearchParams(location.search);
  const key = params.get("p") || "";
  const post = SAI.posts.find((p) =>
    String(p.id) === String(key) || p.slug === key || (p.href || "").includes(key)
  );

  if (!post) {
    root.innerHTML =
      '<div class="empty-state"><div class="big">Note not found</div>' +
      '<p>That note may have moved. Head back to the journal for the latest.</p>' +
      '<div class="dining-ctas center"><a class="btn btn-gold" href="journal">Back to the journal</a></div></div>';
    return;
  }

  const hero = document.querySelector(".page-hero");
  if (hero) {
    hero.setAttribute("data-hero", post.img || hero.getAttribute("data-hero") || "");
    if (window.SAIHero) window.SAIHero();
    const h1 = hero.querySelector("h1");
    const lede = hero.querySelector(".lede p");
    if (h1) h1.textContent = post.title;
    if (lede) lede.textContent = post.excerpt || "";
  }

  root.innerHTML =
    '<div class="post-date">' + (post.date || "Journal") + '</div>' +
    (() => {
      const imgs = (post.images && post.images.length) ? post.images : (post.img ? [post.img] : []);
      if (!imgs.length) return "";
      const gridImgs = imgs.map((s, k) =>
        '<a href="#" data-lightbox="' + SAI_ASSET(s) + '" class="pg-img' + (k === 0 ? " pg-main" : "") + '">' +
          '<img src="' + SAI_ASSET(s) + '" alt="' + post.title + ' photo ' + (k + 1) + '" loading="lazy">' +
        '</a>'
      ).join("");
      return '<div class="post-gallery">' + gridImgs + '</div>';
    })() +
    '<div class="post-copy">' +
      (post.body || post.excerpt || "").split(/\n\n+/).map((para) => "<p>" + para + "</p>").join("") +
    '</div>' +
    '<div class="dining-ctas center reveal">' +
      '<a class="btn btn-gold" href="book">Reserve a room</a>' +
      '<a class="btn btn-line" href="journal">Back to the journal</a>' +
    '</div>';
  if (window.SAIReveal) window.SAIReveal(root);
})();
