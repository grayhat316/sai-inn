/* Sai Inn home page rendering from data.js */

/* hero slides */
const heroSlidesWrap = document.querySelector(".hero-slides");
if (heroSlidesWrap && SAI.heroSlides) {
  SAI.heroSlides.forEach((src) => {
    const d = document.createElement("div");
    d.className = "hero-slide";
    d.style.backgroundImage = "url('" + src + "')";
    heroSlidesWrap.appendChild(d);
  });
}

/* amenities rail */
const amenityGrid = document.getElementById("amenity-grid");
const amenityItems = [
  { title: "Rooms", tag: "5 categories", img: "assets/images/organized/home/amenities-rooms.jpg", href: "rooms.html" },
  { title: "Restaurant", tag: "50+ dishes", img: "assets/images/organized/home/amenities-restaurant.jpg", href: "dining.html" },
  { title: "Conference Room", tag: "Events space", img: "assets/images/organized/home/amenities-conference.jpg", href: "events.html" },
  { title: "Solarium Terrace", tag: "Courtyard", img: "assets/images/organized/home/amenities-solarium terrace.jpg", href: "about.html" },
  { title: "Gallery", tag: "51 photos", img: "assets/images/organized/home/home9.jpg", href: "gallery.html" }
];
if (amenityGrid) {
  const cards = amenityItems.map((a, i) =>
    '<a class="amenity-card" href="' + a.href + '">' +
      '<img src="' + a.img + '" alt="' + a.title + ' at Sai Inn" loading="lazy">' +
      '<span class="shade"></span>' +
      '<span class="arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M9 7h8v8"/></svg></span>' +
      '<span class="info"><span class="tag">' + a.tag + '</span><h3>' + a.title + '</h3></span>' +
    '</a>'
  ).join("");
  amenityGrid.classList.remove("amenity-grid");
  amenityGrid.classList.add("amenity-rail");
  amenityGrid.innerHTML = '<div class="amenity-track">' + cards + cards + '</div>';
}

/* rooms */
const roomGrid = document.getElementById("room-grid");
if (roomGrid) {
  roomGrid.innerHTML = SAI.rooms.map((r, i) =>
    '<article class="room-card reveal" style="--d:' + (i * 0.07) + 's">' +
      '<div class="media">' +
        '<img src="' + SAI_ASSET(r.img) + '" alt="' + r.name + ' room at Sai Inn" loading="lazy">' +
        '<span class="price-pill"><em>KSh ' + r.price.toLocaleString() + '</em> / night, B&amp;B</span>' +
      '</div>' +
      '<div class="body">' +
        '<h3>' + r.name + '</h3>' +
        '<p>' + r.desc + '</p>' +
        '<a class="link" href="rooms.html">Details and booking' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
        '</a>' +
      '</div>' +
    '</article>'
  ).join("");
}

/* menu category chips */
const chipsWrap = document.getElementById("menu-chips");
if (chipsWrap) {
  const counts = {};
  SAI.menu.forEach((m) => { counts[m.cat] = (counts[m.cat] || 0) + 1; });
  chipsWrap.innerHTML = Object.keys(counts).map((cat, i) =>
    '<a class="menu-chip reveal" style="--d:' + (i * 0.06) + 's" href="dining">' + cat + '<b>' + counts[cat] + '</b></a>'
  ).join("");
}

/* dish photo strip: a taste of the menu */
const dishStrip = document.getElementById("dish-strip");
if (dishStrip && SAI.menu) {
  const withImg = SAI.menu.filter((m) => m.img);
  const picks = [];
  const used = {};
  for (const m of withImg) {
    if (!used[m.cat] && picks.length < 6) {
      used[m.cat] = true;
      picks.push(m);
    }
  }
  if (picks.length < 6) {
    for (const m of withImg) {
      if (picks.length >= 6) break;
      if (!picks.includes(m)) picks.push(m);
    }
  }
  dishStrip.innerHTML = picks.map((m, i) => {
    const price = m.price === null ? "Ask for price" : "KSh " + Number(m.price).toLocaleString();
    return '<a class="dish-card reveal" style="--d:' + (i * 0.05) + 's" href="dining">' +
      '<span class="media">' +
        (m.img ? '<img src="' + SAI_ASSET(m.img) + '" alt="' + m.name + '" loading="lazy">' : '<span class="no-img">' + m.name.charAt(0) + '</span>') +
        '<span class="cat-tag">' + m.cat + '</span>' +
      '</span>' +
      '<span class="body">' +
        '<h3>' + m.name + '</h3>' +
        '<span class="row">' +
          '<span class="price">' + price + '</span>' +
          '<span class="view-btn">Menu</span>' +
        '</span>' +
        '<span class="order-ago">' + (window.SAI_orderedAgo ? window.SAI_orderedAgo(m.id, m.cat) : "") + '</span>' +
      '</span>' +
    '</a>';
  }).join("");
  if (window.SAIReveal) window.SAIReveal(dishStrip);
}

/* offer strip in the events section */
const eventsStrip = document.getElementById("events-offer-strip");
if (eventsStrip && SAI.offers && SAI.offers.length) {
  const o = SAI.offers[0];
  eventsStrip.hidden = false;
  eventsStrip.innerHTML =
    '<span class="offer-txt">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>' +
      o.title + ' (' + o.discount_pct + '% off)' +
    '</span>' +
    '<a class="btn" href="account?offer=' + encodeURIComponent(o.code || "") + '&next=book">Apply offer</a>';
}

/* gallery strip */
const strip = document.getElementById("gallery-strip");
if (strip) {
  strip.innerHTML = SAI.homeGallery.map((src, i) =>
    '<a class="reveal" style="--d:' + (i % 4) * 0.06 + 's" href="#" data-lightbox="' + SAI_ASSET(src) + '">' +
      '<img src="' + SAI_ASSET(src) + '" alt="Sai Inn interior ' + (i + 1) + '" loading="lazy">' +
    '</a>'
  ).join("");
}

/* offers from the admin */
const offersSection = document.getElementById("offers");
const offersGrid = document.getElementById("home-offers");
if (offersSection && offersGrid && SAI.offers && SAI.offers.length) {
  offersSection.hidden = false;
  offersGrid.innerHTML = SAI.offers.map((o, i) =>
    '<article class="offer-card reveal' + (o.img ? " has-flyer" : "") + '" style="--d:' + (i * 0.08) + 's">' +
      (o.img ? '<div class="offer-flyer"><a href="#" data-lightbox="' + SAI_ASSET(o.img) + '"><img src="' + SAI_ASSET(o.img) + '" alt="' + o.title + ' flyer" loading="lazy"></a></div>' : "") +
      '<div class="offer-body">' +
        '<div class="offer-top">' +
          (o.badge ? '<span class="offer-badge">' + o.badge + '</span>' : '<span class="offer-badge">Limited</span>') +
          '<span class="offer-pct">' + o.discount_pct + '%<small>off</small></span>' +
        '</div>' +
        '<h3>' + o.title + '</h3>' +
        '<p>' + o.text + '</p>' +
        '<div class="offer-foot">' +
          '<a class="btn btn-gold" href="account?offer=' + encodeURIComponent(o.code || "") + '&amp;next=book">Apply offer</a>' +
        '</div>' +
      '</div>' +
    '</article>'
  ).join("");
  if (window.SAIReveal) window.SAIReveal(offersGrid);

  /* one friendly nudge per visit: offers popup after a moment */
  try {
    if (!sessionStorage.getItem("sai_offer_note")) {
      const first = SAI.offers[0];
      setTimeout(function () {
        const pop = document.createElement("div");
        pop.className = "offer-pop";
        pop.innerHTML =
          '<button class="op-close" aria-label="Dismiss">&times;</button>' +
          '<strong>Offer on now</strong>' +
          '<span>' + first.title + ' (' + first.discount_pct + '% off)</span>' +
          '<a class="btn btn-sm btn-gold" href="account?offer=' + encodeURIComponent(first.code || "") + '&amp;next=book">Apply</a>';
        document.body.appendChild(pop);
        requestAnimationFrame(function () { pop.classList.add("show"); });
        pop.querySelector(".op-close").addEventListener("click", function () { pop.remove(); });
        setTimeout(function () { if (pop.parentNode) pop.remove(); }, 14000);
      }, 1600);
      sessionStorage.setItem("sai_offer_note", "1");
    }
  } catch (e) {}
}
