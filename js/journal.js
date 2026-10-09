/* Sai Inn journal page: post list, read more opens the post page */

(function () {
  const list = document.getElementById("post-list");
  if (!list || !SAI.posts || !SAI.posts.length) return;

  list.innerHTML = SAI.posts.map((p, i) => {
    const href = p.slug
      ? "post?p=" + encodeURIComponent(p.slug)
      : (p.id ? "post?p=" + encodeURIComponent(p.id) : "post?p=unknown");
    const imgs = (p.images && p.images.length) ? p.images : (p.img ? [p.img] : []);
    const first = SAI_ASSET(imgs[0] || "");
    const thumbs = imgs.slice(1, 4).map((s) => '<img src="' + SAI_ASSET(s) + '" alt="More photos for ' + esc(p.title) + '" loading="lazy">').join("");
    return '<article class="post-card reveal" style="--d:' + (i * 0.1) + 's">' +
      '<a class="thumb" href="' + href + '">' +
        (first ? '<img src="' + first + '" alt="' + esc(p.title) + '" loading="lazy">' : "") +
        (imgs.length > 1 ? '<span class="post-count">' + imgs.length + ' photos</span>' : "") +
      '</a>' +
      '<div>' +
        '<div class="date">' + (p.date || "Journal") + '</div>' +
        '<h3><a href="' + href + '">' + esc(p.title) + '</a></h3>' +
        '<p>' + esc(p.excerpt) + '</p>' +
        (thumbs ? '<div class="post-thumbs">' + thumbs + '</div>' : "") +
        '<a class="read" href="' + href + '">' +
          'Read the note' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
        '</a>' +
      '</div>' +
    '</article>';
  }).join("");

  if (window.SAIReveal) window.SAIReveal(list);
})();
