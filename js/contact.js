/* Sai Inn contact page: FAQ accordion + message form */

(function () {
  const faq = document.getElementById("faq");
  if (faq && SAI.faq) {
    faq.innerHTML = SAI.faq.map((item) =>
      '<div class="acc-item">' +
        '<button class="acc-head" aria-expanded="false">' + item.q +
          '<span class="plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg></span>' +
        '</button>' +
        '<div class="acc-body"><p>' + item.a + '</p></div>' +
      '</div>'
    ).join("");

    faq.querySelectorAll(".acc-head").forEach((head) => {
      head.addEventListener("click", () => {
        const item = head.parentElement;
        const body = item.querySelector(".acc-body");
        const isOpen = item.classList.contains("open");
        faq.querySelectorAll(".acc-item").forEach((i) => {
          i.classList.remove("open");
          i.querySelector(".acc-body").style.maxHeight = null;
          i.querySelector(".acc-head").setAttribute("aria-expanded", "false");
        });
        if (!isOpen) {
          item.classList.add("open");
          body.style.maxHeight = body.scrollHeight + "px";
          head.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = {
      name: document.getElementById("ct-name").value.trim(),
      email: document.getElementById("ct-email").value.trim(),
      subject: document.getElementById("ct-subject").value.trim(),
      msg: document.getElementById("ct-msg").value.trim()
    };
    if (!f.name || !f.email || !f.msg) return;

    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Sending";

    fetch("api/contact.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name, email: f.email, subject: f.subject, msg: f.msg, website: ""
      })
    })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        if (!d || !d.ok) throw new Error((d && d.error) || "Could not send your message.");
        const ok = document.createElement("div");
        ok.className = "send-note";
        ok.style.marginTop = "1rem";
        ok.textContent = "Message sent. We will reply soon.";
        form.appendChild(ok);
        button.textContent = "Sent";
      })
      .catch((err) => {
        const failEl = document.createElement("div");
        failEl.className = "send-note";
        failEl.style.marginTop = "1rem";
        failEl.textContent = (err && err.message) || "We could not send your message. Try again, or call 0726 071 111.";
        form.appendChild(failEl);
        button.disabled = false;
        button.textContent = "Send message";
      });
  });
})();
