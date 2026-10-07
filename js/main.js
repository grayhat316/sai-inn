/* Sai Inn shared interactions: nav, hero, reveals, tilt, parallax, lightbox, shared blocks */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* header scroll state */
const header = document.querySelector(".site-header");
if (header) {
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* mobile menu */
const navToggle = document.querySelector(".nav-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const menuBackdrop = document.querySelector(".menu-backdrop");
const chatMain = document.getElementById("chat-fab-main");
const chatMenu = document.getElementById("chat-fab-menu");
if (chatMain && chatMenu) {
  chatMain.addEventListener("click", () => {
    const opening = chatMenu.hidden;
    chatMenu.hidden = !opening;
    chatMain.classList.toggle("open", opening);
    chatMain.setAttribute("aria-expanded", String(opening));
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#chat-fab") && !chatMenu.hidden) {
      chatMenu.hidden = true;
      chatMain.classList.remove("open");
      chatMain.setAttribute("aria-expanded", "false");
    }
  });
}
if (navToggle && mobileMenu) {
  const open = () => {
    mobileMenu.classList.add("open");
    mobileMenu.setAttribute("aria-hidden", "false");
    if (menuBackdrop) menuBackdrop.classList.add("show");
    document.body.style.overflow = "hidden";
  };
  const close = () => {
    mobileMenu.classList.remove("open");
    mobileMenu.setAttribute("aria-hidden", "true");
    if (menuBackdrop) menuBackdrop.classList.remove("show");
    document.body.style.overflow = "";
  };
  navToggle.addEventListener("click", open);
  if (menuBackdrop) menuBackdrop.addEventListener("click", close);
  mobileMenu.querySelectorAll("a, .close-btn").forEach((el) => el.addEventListener("click", close));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

/* hero slider */
const slides = document.querySelectorAll(".hero-slide");
const dotsWrap = document.querySelector(".hero-dots");
const heroCount = document.querySelector(".hero-count");
let slideIndex = 0;
let slideTimer = null;

function showSlide(i) {
  if (!slides.length) return;
  slideIndex = (i + slides.length) % slides.length;
  slides.forEach((s, idx) => {
    s.classList.remove("active", "zoom");
    if (idx === slideIndex) {
      s.classList.add("active");
      if (!reduceMotion) s.classList.add("zoom");
    }
  });
  document.querySelectorAll(".hero-dot").forEach((d, idx) => d.classList.toggle("active", idx === slideIndex));
  if (heroCount) {
    const pad = String(slideIndex + 1).padStart(2, "0");
    const total = String(slides.length).padStart(2, "0");
    heroCount.textContent = pad + " / " + total;
  }
}

if (slides.length) {
  slides.forEach((_, idx) => {
    const dot = document.createElement("button");
    dot.className = "hero-dot";
    dot.setAttribute("aria-label", "Go to slide " + (idx + 1));
    dot.addEventListener("click", () => { showSlide(idx); restartTimer(); });
    dotsWrap.appendChild(dot);
  });
  showSlide(0);
  function restartTimer() {
    if (slideTimer) clearInterval(slideTimer);
    slideTimer = setInterval(() => showSlide(slideIndex + 1), 6500);
  }
  restartTimer();
  const hero = document.querySelector(".hero");
  if (hero) {
    hero.addEventListener("mouseenter", () => { if (slideTimer) clearInterval(slideTimer); });
    hero.addEventListener("mouseleave", restartTimer);
  }
}

/* scroll reveals */
function observeReveals(scope) {
  const els = (scope || document).querySelectorAll(".reveal:not(.in)");
  if (!els.length) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  els.forEach((el) => io.observe(el));
}
window.SAIReveal = observeReveals;
observeReveals(document);

/* counters */
const counters = document.querySelectorAll("[data-count]");
if (counters.length && "IntersectionObserver" in window) {
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || "";
      const dur = 1600;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      cio.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach((el) => cio.observe(el));
}

/* 3D tilt cards (desktop, no reduced motion) */
if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
  document.querySelectorAll(".room-card, .amenity-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = "perspective(900px) rotateX(" + (-y * 5) + "deg) rotateY(" + (x * 5) + "deg) translateY(-6px)";
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

/* inner page hero backgrounds */
document.querySelectorAll(".page-hero[data-hero]").forEach((el) => {
  el.style.backgroundImage = "url('" + SAI_ASSET(el.dataset.hero) + "')";
});

/* CTA band background + parallax */
const ctaBgEl = document.querySelector(".cta-bg");
if (ctaBgEl) {
  if (!ctaBgEl.style.backgroundImage && typeof SAI !== "undefined" && SAI.ctaBg) {
    ctaBgEl.style.backgroundImage = "url('" + SAI_ASSET(SAI.ctaBg) + "')";
  }
  if (!reduceMotion) {
    const band = document.querySelector(".cta-band");
    let ticking = false;
    const update = () => {
      const r = band.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom > 0 && r.top < vh) {
        const progress = (r.top + r.height / 2 - vh / 2) / vh;
        ctaBgEl.style.transform = "translateY(" + (progress * 9).toFixed(2) + "%)";
      }
      ticking = false;
    };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    request();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });
  }
}

/* lightbox (event delegated, any a[data-lightbox] on the page) */
const lb = document.querySelector(".lightbox");
if (lb) {
  const lbImg = lb.querySelector("img");
  const lbCount = lb.querySelector(".lb-count");
  let lbAnchors = [];
  let lbIndex = 0;

  const openLb = (i) => {
    lbAnchors = Array.from(document.querySelectorAll("a[data-lightbox]"));
    if (!lbAnchors.length) return;
    lbIndex = (i + lbAnchors.length) % lbAnchors.length;
    const a = lbAnchors[lbIndex];
    lbImg.src = a.dataset.lightbox;
    lbImg.alt = a.querySelector("img") ? (a.querySelector("img").alt || "") : "";
    const cap = a.dataset.caption || "";
    const capEl = lb.querySelector(".lb-caption");
    if (capEl) {
      capEl.textContent = cap;
      capEl.hidden = !cap;
    }
    lbCount.textContent = (lbIndex + 1) + " / " + lbAnchors.length;
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
  };
  const closeLb = () => {
    lb.classList.remove("open");
    document.body.style.overflow = "";
  };

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-lightbox]");
    if (a) {
      e.preventDefault();
      const list = Array.from(document.querySelectorAll("a[data-lightbox]"));
      openLb(list.indexOf(a));
    }
  });
  lb.querySelector(".lb-close").addEventListener("click", closeLb);
  lb.querySelector(".lb-prev").addEventListener("click", () => openLb(lbIndex - 1));
  lb.querySelector(".lb-next").addEventListener("click", () => openLb(lbIndex + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") openLb(lbIndex - 1);
    if (e.key === "ArrowRight") openLb(lbIndex + 1);
  });
}

/* gallery inner parallax */
function galleryParallax() {
  const photos = document.querySelectorAll(".gallery-grid .g-photo");
  if (!photos.length || reduceMotion) return;
  let ticking = false;
  const update = () => {
    const vh = window.innerHeight;
    photos.forEach((ph) => {
      const r = ph.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return;
      const center = r.top + r.height / 2 - vh / 2;
      ph.style.setProperty("--gshift", (center * -0.09).toFixed(1) + "px");
    });
    ticking = false;
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  request();
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
}

/* shared dynamic blocks (events, testimonials, values) */
function renderSharedBlocks() {
  const eventsGrid = document.getElementById("events-grid");
  if (eventsGrid && SAI.events) {
    eventsGrid.innerHTML = SAI.events.map((e, i) =>
      '<article class="event-card reveal" style="--d:' + (i * 0.07) + 's" data-evname="' + e.name + '" tabindex="0">' +
        '<div class="ev-media">' +
          '<img src="' + SAI_ASSET(e.img) + '" alt="' + e.name + ' at Sai Inn" loading="lazy">' +
          '<span class="icon">' + (SAI.eventIcons[e.icon] || "") + '</span>' +
        '</div>' +
        '<div class="ev-body">' +
          '<h3>' + e.name + '</h3>' +
          '<p>' + e.desc + '</p>' +
          '<button class="btn btn-sm btn-line ev-book-btn" type="button">Book this event</button>' +
        '</div>' +
      '</article>'
    ).join("");
    observeReveals(eventsGrid);
  }

  const testiGrid = document.getElementById("testi-grid");
  if (testiGrid && SAI.testimonials) {
    testiGrid.innerHTML = SAI.testimonials.map((t, i) =>
      '<article class="testi-card reveal" style="--d:' + (i * 0.09) + 's">' +
        '<span class="quote-mark">&ldquo;</span>' +
        '<div class="testi-stars">' + "\u2605".repeat(t.stars) + '</div>' +
        '<blockquote><p>' + t.text + '</p></blockquote>' +
        '<div class="testi-who">' +
          '<img src="' + t.img + '" alt="' + t.name + '" loading="lazy">' +
          '<div><div class="name">' + t.name + '</div><div class="role">' + t.role + '</div></div>' +
        '</div>' +
      '</article>'
    ).join("");
    observeReveals(testiGrid);
  }

  const valuesGrid = document.getElementById("values-grid");
  if (valuesGrid && SAI.values) {
    valuesGrid.innerHTML = SAI.values.map((v, i) =>
      '<div class="value-card reveal" style="--d:' + (i * 0.06) + 's">' +
        '<span class="n">0' + (i + 1) + '</span>' +
        '<h3>' + v.name + '</h3>' +
        '<p>' + v.desc + '</p>' +
      '</div>'
    ).join("");
    observeReveals(valuesGrid);
  }
}
renderSharedBlocks();
window.SAIGalleryParallax = galleryParallax;
galleryParallax();

/* footer year */
document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

/* event cards: pre-fill the reserve form, or send the guest to it */
function saiPrepHotelEvent(name) {
  const catSelect = document.getElementById("ev-cat");
  if (!catSelect) return false;
  const wanted = (name || "").toLowerCase();
  const stems = (s) =>
    s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3).map((w) => w.slice(0, 4));
  const wantedStems = stems(wanted);
  let best = null;
  let bestScore = 0;
  Array.from(catSelect.options).forEach((o) => {
    if (!o.value) return;
    const value = o.value.trim();
    let score = 0;
    if (value.toLowerCase() === wanted) {
      score = 99;
    } else {
      const optStems = stems(value);
      wantedStems.forEach((t) => { if (optStems.includes(t)) score += 1; });
    }
    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  });
  if (best) catSelect.value = best.value;
  const reserve = document.getElementById("reserve");
  if (reserve) {
    reserve.scrollIntoView({ behavior: "smooth", block: "start" });
    reserve.classList.add("flash");
    setTimeout(() => reserve.classList.remove("flash"), 1600);
  }
  return true;
}
window.SAIPrepHotelEvent = saiPrepHotelEvent;

document.addEventListener("click", (e) => {
  const card = e.target.closest("[data-evname]");
  if (!card) return;
  const name = card.dataset.evname || "";
  if (!name) return;
  if (saiPrepHotelEvent(name)) return;
  location.href = "events?ev=" + encodeURIComponent(name) + "#reserve";
});
