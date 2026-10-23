(() => {
  const link = document.getElementById("openPortal");
  const hint = document.getElementById("setupHint");
  const raw = (window.SAP_CONFIG && window.SAP_CONFIG.APP_URL) || "";
  const valid = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:[?#].*)?$/.test(raw);

  if (valid) {
    link.href = raw;
    link.addEventListener("click", () => {
      // Intentionally open the existing Apps Script app; do not proxy or cache it.
    });
    hint.textContent = "Login, sesi pengguna, dan data tetap berjalan di Google Apps Script.";
  } else {
    link.href = "#";
    link.setAttribute("aria-disabled", "true");
    link.addEventListener("click", (event) => {
      event.preventDefault();
      hint.textContent = "Isi APP_URL di config.js dengan URL Web app Google Apps Script yang berakhir dengan /exec, lalu unggah ulang ke GitHub Pages.";
    });
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }
})();
