// app-main.js
// Minimal router: render module HTML first, then defer heavy module init to app-module-loader.js.

const moduleContent = document.getElementById('module-content');

const moduleMap = {
  'qc': 'modules/QC_V1.0.1.html',
  'restriction': 'modules/RE_cloning_v1.0.1.html',
  'golden-gate': 'modules/Golden_Gate_v1.0.1.html',
  'gibson': 'modules/Gibson_V1.0.1.html',
  'overlap-pcr': 'modules/oe_pcr_v1.0.1.html',
  'user': 'modules/USER_V1.0.1.html',
  'mutagenesis': 'modules/mutagenesis_v1.0.1.html',
  'multiplex-pcr': 'modules/multiplex_pcr_v1.0.1.html'
};

let loaderPromise = null;
function loadLoader() {
  if (!loaderPromise) loaderPromise = import('./app-module-loader.js');
  return loaderPromise;
}

function deferAfterFirstPaint(fn) {
  window.requestAnimationFrame(() => window.setTimeout(fn, 0));
}

async function loadModule(moduleName) {
  const path = moduleMap[moduleName];
  if (!path) {
    moduleContent.innerHTML = '<p>Error: Module not found.</p>';
    return;
  }

  moduleContent.innerHTML = '<p>Loading...</p>';

  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Network response was not ok');
    const html = await response.text();
    moduleContent.innerHTML = html;

    // UI is now in the DOM; defer heavy JS init until after first paint.
    deferAfterFirstPaint(async () => {
      try {
        const loader = await loadLoader();
        await loader.initModule(moduleName, moduleContent);
      } catch (e) {
        console.error('Module init error:', e);
      }
    });
  } catch (e) {
    console.error('Error loading module:', e);
    moduleContent.innerHTML = '<p>Error loading module.</p>';
  }
}

function handleHashChange() {
  let hash = window.location.hash.substring(1);
  if (!hash || !moduleMap[hash]) hash = 'golden-gate';
  loadModule(hash);
}

window.addEventListener('hashchange', handleHashChange);
handleHashChange();

