/* Sai Inn content sync: pulls admin-managed content from the API and merges
   it over the built-in defaults. Falls back to defaults silently when the API
   is unavailable (file:// preview) or empty (fresh database). */

(function () {
  var data = null;
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "api/public.php", false); // sync: must finish before pages render
    xhr.send();
    if (xhr.status === 200) {
      data = JSON.parse(xhr.responseText);
    }
  } catch (e) {
    data = null;
  }
  if (!data || data.ok !== true) {
    return;
  }
  if (data.announcements) {
    SAI.announcements = data.announcements;
  }
  var path = function (p) { return p; };
  if (data.rooms && data.rooms.length) {
    SAI.rooms = data.rooms.map(function (r) {
      r.img = path(r.img) || r.img;
      return r;
    });
  }
  if (data.menu && data.menu.length) {
    SAI.menu = data.menu;
  }
  if (data.gallery && data.gallery.length) {
    SAI.gallery = data.gallery;
  }
  if (data.events && data.events.length) {
    SAI.events = data.events;
  }
  if (data.testimonials && data.testimonials.length) {
    SAI.testimonials = data.testimonials;
  }
  if (data.content) {
    SAI.content = data.content;
  }
  if (data.offers && data.offers.length) {
    SAI.offers = data.offers;
  }
  if (data.journal && data.journal.length) {
    SAI.posts = data.journal;
  }
  if (data.moments && data.moments.length) {
    SAI.moments = data.moments;
  }
})();
