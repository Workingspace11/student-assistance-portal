(() => {
  const splash = document.getElementById('splash');
  const layer = document.getElementById('installLayer');
  const errorLayer = document.getElementById('errorLayer');
  const installButton = document.getElementById('installButton');
  const continueButton = document.getElementById('continueButton');
  const installCopy = document.getElementById('installCopy');
  const installHelp = document.getElementById('installHelp');
  const errorText = document.getElementById('errorText');
  const retryButton = document.getElementById('retryButton');
  const APP_URL = String((window.SAP_CONFIG && window.SAP_CONFIG.APP_URL) || '').trim();
  const validUrl = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:[?#].*)?$/.test(APP_URL);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  let deferredPrompt = null;
  let installMode = 'instructions';

  /* Mode tampilan portal:
     'pwa'      → portal ditampilkan di alamat GitHub ini, Apps Script hanya backend (fetch).
     'redirect' → perilaku lama: pindah ke alamat Apps Script.
     Urutan penentu: ?mode=... di alamat (untuk uji) → SAP_CONFIG.MODE → 'redirect'.
     Jika mode PWA gagal dimuat karena apa pun, otomatis kembali ke 'redirect'. */
  const modeDariUrl = (() => { try { return new URLSearchParams(location.search).get('mode') || ''; } catch (_) { return ''; } })();
  const MODE = /^(pwa|redirect)$/.test(modeDariUrl) ? modeDariUrl : (String((window.SAP_CONFIG && window.SAP_CONFIG.MODE) || 'redirect').toLowerCase() === 'pwa' ? 'pwa' : 'redirect');
  const KUNCI_CACHE = 'sap_halaman_portal_v1';
  const splashNote = document.getElementById('splashNote');

  const redirectLama = () => window.location.replace(APP_URL);

  /* Pengganti google.script.run: setiap panggilan dikirim ke Apps Script lewat fetch (Api.gs).
     Disisipkan ke halaman portal sebagai teks, jadi harus berdiri sendiri. */
  function pasangJembatan(URL_API) {
    var PESAN_PUTUS = 'Koneksi ke server terputus. Periksa internet lalu coba lagi.';
    function panggil(fn, args) {
      var badan;
      try { badan = JSON.stringify({ __api: 1, fn: fn, args: args }); } catch (e) { return Promise.reject(new Error('Data yang dikirim tidak valid.')); }
      return fetch(URL_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: badan, redirect: 'follow', credentials: 'omit', cache: 'no-store' })
        .then(function (r) { return r.text(); }, function () { throw new Error(PESAN_PUTUS); })
        .then(function (t) {
          var j; try { j = JSON.parse(t); } catch (e) { throw new Error('Server tidak memberi jawaban yang valid. Coba lagi sebentar lagi.'); }
          if (!j || j.ok !== true) { var er = new Error((j && j.error) || 'Terjadi kesalahan di server.'); er.name = 'ScriptError'; throw er; }
          return j.hasil;
        });
    }
    function pelari(sukses, gagal, objek) {
      return new Proxy({}, {
        get: function (_, nama) {
          if (nama === 'withSuccessHandler') return function (h) { return pelari(h, gagal, objek); };
          if (nama === 'withFailureHandler') return function (h) { return pelari(sukses, h, objek); };
          if (nama === 'withUserObject') return function (o) { return pelari(sukses, gagal, o); };
          if (typeof nama !== 'string' || nama === 'then') return undefined;
          return function () {
            var args = Array.prototype.slice.call(arguments);
            panggil(nama, args).then(function (v) {
              if (sukses) { try { sukses(v, objek); } catch (e) { setTimeout(function () { throw e; }); } }
            }, function (e) {
              if (gagal) { try { gagal(e, objek); } catch (x) { setTimeout(function () { throw x; }); } } else if (window.console) console.error(e);
            });
          };
        }
      });
    }
    window.google = window.google || {};
    window.google.script = { run: pelari(null, null, undefined), host: { close: function () {}, setHeight: function () {}, setWidth: function () {}, editor: {} } };
    window.SAP_MODE_PWA = true;
  }

  function bacaCache() { try { const v = JSON.parse(localStorage.getItem(KUNCI_CACHE) || 'null'); return v && v.versi && v.html ? v : null; } catch (_) { return null; } }
  function simpanCache(versi, html) { try { localStorage.setItem(KUNCI_CACHE, JSON.stringify({ versi: versi, html: html })); } catch (_) { /* penyimpanan penuh: abaikan */ } }

  async function ambilHalaman() {
    const cache = bacaCache();
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => { try { ctrl && ctrl.abort(); } catch (_) {} }, 20000);
    try {
      const r = await fetch(APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ __api: 1, fn: '__halaman', punya: cache ? cache.versi : '' }), redirect: 'follow', credentials: 'omit', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
      const j = JSON.parse(await r.text());
      if (j && j.ok && j.sama && cache) return cache.html;
      if (j && j.ok && typeof j.html === 'string' && /<html|<body|<head/i.test(j.html)) { simpanCache(j.versi, j.html); return j.html; }
      throw new Error('jawaban halaman tidak sesuai');
    } finally { clearTimeout(timer); }
  }

  function tampilkanPortal(html) {
    const sisipan =
      '<meta name="theme-color" content="#173a73">' +
      '<link rel="manifest" href="./manifest.json">' +
      '<link rel="icon" type="image/x-icon" href="./favicon.ico">' +
      '<link rel="apple-touch-icon" sizes="180x180" href="./icons/apple-touch-icon.png">' +
      '<title>Student Assistance Portal</title>' +
      '<script>(' + pasangJembatan.toString() + ')(' + JSON.stringify(APP_URL) + ');<\/script>';
    const lengkap = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + sisipan) : sisipan + html;
    document.open();
    document.write(lengkap);
    document.close();
  }

  async function bukaModePwa() {
    if (splashNote) splashNote.textContent = 'Memuat portal…';
    splash.classList.remove('hidden');
    let html = '';
    try { html = await ambilHalaman(); }
    catch (_) { const c = bacaCache(); html = c ? c.html : ''; }
    if (!html || typeof fetch !== 'function' || typeof Proxy !== 'function') { redirectLama(); return; }
    tampilkanPortal(html);
  }

  const goToPortal = () => {
    if (!validUrl) {
      splash.classList.add('hidden');
      layer.classList.add('hidden');
      errorText.textContent = 'URL Google Apps Script belum valid. Buka config.js di repository GitHub dan isi APP_URL dengan URL Web App yang berakhir /exec.';
      errorLayer.classList.remove('hidden');
      return;
    }
    if (MODE === 'pwa') { bukaModePwa().catch(redirectLama); return; }
    redirectLama();
  };
  const markSeen = () => { try { localStorage.setItem('sap_install_prompt_seen_v2', '1'); } catch (_) {} };
  const hasSeen = () => { try { return localStorage.getItem('sap_install_prompt_seen_v2') === '1'; } catch (_) { return false; } };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; markSeen(); });

  function showInstallPrompt() {
    splash.classList.add('hidden');
    layer.classList.remove('hidden');
    if (deferredPrompt) {
      installMode = 'native';
      installButton.textContent = 'Install sekarang';
      installCopy.textContent = 'Pasang Student Assistance Portal agar bisa dibuka dari layar utama seperti aplikasi.';
      installHelp.textContent = 'Setelah pemasangan, buka ikon SAP untuk langsung menuju halaman login.';
    } else if (ios) {
      installMode = 'instructions';
      installButton.textContent = 'Cara install di iPhone';
      installCopy.textContent = 'Tambahkan portal ke layar utama iPhone agar lebih mudah dibuka seperti aplikasi.';
      installHelp.textContent = 'Di Safari, tekan Bagikan lalu pilih Tambahkan ke Layar Utama.';
    } else {
      installMode = 'instructions';
      installButton.textContent = 'Cara install';
      installCopy.textContent = 'Tambahkan Student Assistance Portal ke layar utama agar lebih mudah dibuka seperti aplikasi.';
      installHelp.textContent = 'Jika opsi pemasangan tidak muncul, buka menu browser dan cari Install app atau Add to Home Screen.';
    }
  }

  installButton.addEventListener('click', async () => {
    if (installMode === 'native' && deferredPrompt) {
      const promptEvent = deferredPrompt;
      deferredPrompt = null;
      try { await promptEvent.prompt(); await promptEvent.userChoice; } catch (_) {}
      markSeen();
      layer.classList.add('hidden');
      goToPortal();
      return;
    }
    if (installMode === 'instructions') {
      if (ios) {
        installCopy.textContent = '1. Buka menu Bagikan di Safari. 2. Pilih Tambahkan ke Layar Utama. 3. Tekan Tambahkan. Setelah itu, buka ikon SAP dari layar utama.';
        installHelp.textContent = 'Pemasangan iPhone perlu dikonfirmasi lewat menu Bagikan; website tidak dapat memasangnya otomatis.';
      } else {
        installCopy.textContent = 'Buka menu browser lalu pilih Install app atau Add to Home Screen. Jika menu tidak tersedia, lanjutkan ke portal dan coba lagi di browser yang mendukung PWA.';
        installHelp.textContent = 'Pemasangan bergantung pada browser dan perangkat.';
      }
      installMode = 'continue';
      installButton.textContent = 'Lanjut ke login';
      continueButton.classList.add('hidden');
      return;
    }
    markSeen();
    layer.classList.add('hidden');
    goToPortal();
  });
  continueButton.addEventListener('click', () => { markSeen(); layer.classList.add('hidden'); goToPortal(); });
  retryButton.addEventListener('click', () => window.location.reload());

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
  }
  if (!validUrl) {
    window.setTimeout(() => { splash.classList.add('hidden'); errorLayer.classList.remove('hidden'); }, 1400);
    return;
  }
  window.setTimeout(() => {
    if (standalone || hasSeen()) { goToPortal(); return; }
    showInstallPrompt();
  }, 1450);
})();
