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
  const portalFrame = document.getElementById('portalFrame');
  const APP_URL = String((window.SAP_CONFIG && window.SAP_CONFIG.APP_URL) || '').trim();
  const validUrl = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:[?#].*)?$/.test(APP_URL);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  let deferredPrompt = null;
  let installMode = 'instructions';

  const goToPortal = () => {
  if (!validUrl) {
    splash.classList.add('hidden');
    layer.classList.add('hidden');
    errorText.textContent =
      'URL Google Apps Script belum valid. Buka config.js di repository GitHub dan isi APP_URL dengan URL Web App yang berakhir /exec.';
    errorLayer.classList.remove('hidden');
    return;
  }

  splash.classList.add('hidden');
  layer.classList.add('hidden');
  errorLayer.classList.add('hidden');

  portalFrame.style.display = 'block';

  // Hindari memuat ulang portal jika sudah dimuat.
  if (!portalFrame.src || portalFrame.src === 'about:blank') {
    portalFrame.src = APP_URL;
  }
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
