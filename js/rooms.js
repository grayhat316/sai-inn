/* Sai Inn rooms page: detail rows with photo strips + full preview */

const roomListWrap = document.getElementById("room-detail-list");
if (roomListWrap && SAI.rooms) {
  roomListWrap.innerHTML = SAI.rooms.map((r) => {
    const gal = (r.gallery && r.gallery.length ? r.gallery : [r.img]).map((s) => SAI_ASSET(s)).filter(Boolean);
    if (!gal.length) return "";
    const thumbs = gal.map((src, i) =>
      '<a href="#" data-lightbox="' + src + '" data-full="' + src + '">' +
      '<img src="' + src + '" alt="' + r.name + ' photo ' + (i + 1) + '" class="' + (i === 0 ? "active" : "") + '"></a>'
    ).join("");
    const chips = (r.amenities || []).map((a) =>
      '<span class="amenity-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"/></svg>' + a + '</span>'
    ).join("");
    return (
      '<article class="room-detail-row reveal" id="' + r.id + '">' +
        '<div class="room-media">' +
          '<a href="#" data-lightbox="' + gal[0] + '" class="room-main-link">' +
            '<img class="room-main" src="' + gal[0] + '" alt="' + r.name + ' room at Sai Inn" loading="lazy">' +
            '<span class="zoom-hint">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/></svg>' +
              ' View photos' +
            '</span>' +
          '</a>' +
          (gal.length > 1 ? '<div class="thumb-strip">' + thumbs + '</div>' : "") +
        '</div>' +
        '<div class="room-info">' +
          '<span class="eyebrow">Bed &amp; breakfast</span>' +
          '<h2>' + r.name + '</h2>' +
          '<div class="price-tag">KSh ' + r.price.toLocaleString() + ' <small>/ night</small></div>' +
          '<p class="desc">' + r.desc + '</p>' +
          '<div class="amenity-chips">' + chips + '</div>' +
          '<a class="btn btn-gold" href="book?room=' + encodeURIComponent(r.name) + '">Reserve this room</a>' +
        '</div>' +
      '</article>'
    );
  }).join("");

  roomListWrap.querySelectorAll(".thumb-strip a").forEach((t) => {
    t.addEventListener("click", () => {
      const row = t.closest(".room-detail-row");
      const main = row.querySelector(".room-main");
      main.src = t.dataset.full;
      row.querySelector(".room-main-link").dataset.lightbox = t.dataset.full;
      row.querySelectorAll(".thumb-strip img").forEach((x) => x.classList.remove("active"));
      t.querySelector("img").classList.add("active");
    });
  });

  if (window.SAIReveal) window.SAIReveal(roomListWrap);
}
