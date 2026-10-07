/* Sai Inn events page: bookable event cards + reserve-a-space form */

(function () {
  const form = document.getElementById("event-form");


  /* clickable event cards are handled globally in main.js (works on home too) */

  /* event picked from another page (?ev=) lands here: pre-fill and scroll down */
  if (typeof SAIPrepHotelEvent === "function") {
    const wanted = new URLSearchParams(location.search).get("ev");
    if (wanted) setTimeout(() => SAIPrepHotelEvent(wanted), 120);
  }

  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = {
      name: document.getElementById("ev-name").value.trim(),
      email: document.getElementById("ev-email").value.trim(),
      cat: document.getElementById("ev-cat").value,
      num: document.getElementById("ev-num").value,
      date: document.getElementById("ev-date").value,
      msg: document.getElementById("ev-msg").value.trim()
    };
    if (!f.name || !f.email || !f.cat || !f.num) return;

    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Sending";

    fetch("api/events.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name, email: f.email, category: f.cat,
        attendees: f.num, event_date: f.date, msg: f.msg, website: ""
      })
    })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        if (!d || !d.ok) throw new Error((d && d.error) || "Could not send your inquiry.");
        const ok = document.createElement("div");
        ok.className = "send-note";
        ok.style.marginTop = "1rem";
        ok.textContent = "Inquiry sent. Our events team will call you.";
        form.appendChild(ok);
        button.textContent = "Sent";
      })
      .catch((err) => {
        const failEl = document.createElement("div");
        failEl.className = "send-note";
        failEl.style.marginTop = "1rem";
        failEl.textContent = (err && err.message) || "We could not send your inquiry. Try again, or call 0726 071 111.";
        form.appendChild(failEl);
        button.disabled = false;
        button.textContent = "Send inquiry";
      });
  });
})();
