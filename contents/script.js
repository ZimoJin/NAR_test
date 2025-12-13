// Declare the variables here with 'let', but don't assign them yet.
// We will assign them after the page loads.
let view, welcomeScreen, appHeader, appFooter;

// Basic hash router
const routes = {
    '/': welcomeRoute,
    '/tools': appDashboard, // The '/tools' route now points to the appDashboard
    '/docs': docs,
    '/help': help,
    '/about': about,
};

// --- Welcome Screen Logic ---
function initWelcomeScreen() {
    // Remove the local 'const welcomeScreen = ...'
    // This function will now use the global 'welcomeScreen' variable,
    // which will be correctly assigned on page load.
    if (!welcomeScreen) return;

    const proceedButton = welcomeScreen.querySelector('.proceed-button');
    if (proceedButton) {
        proceedButton.addEventListener('click', () => {
            location.hash = '#/tools';
        });
    }
}

function navigate() {
    let hash = location.hash.substring(1) || '/';
    let path = hash;
    let anchor = null;

    if (hash.includes('#')) {
        const parts = hash.split('#');
        path = parts[0] || '/';
        anchor = '#' + parts[1];
    }
    if (path[0] !== '/') {
        path = '/' + path;
    }

    // NEW: A flag to check if we are on any "app" page
    const isAppPage = path.startsWith('/app/') || path === '/tools';

    if (path.startsWith('/app/')) {
        // --- This part is for loading a specific module (e.g., /app/gibson) ---
        if (welcomeScreen) welcomeScreen.classList.add('hidden');
        if (appHeader) appHeader.classList.add('visible');
        if (view) view.classList.add('visible');
        if (appFooter) appFooter.classList.add('visible');

        const moduleName = path.split('/')[2];
        if (view) {
            view.innerHTML = loadAppModule(moduleName);
            view.classList.add('view-is-app'); // <-- Applies the CSS rule

            // --- Bind Fullscreen Button Logic ---
            const fsBtn = document.getElementById('fullscreen-btn');
            const appShell = document.getElementById('app-shell-container');

            if (fsBtn && appShell) {
                // Function to toggle fullscreen
                fsBtn.addEventListener('click', () => {
                    if (!document.fullscreenElement) {
                        appShell.requestFullscreen().catch(err => {
                            alert(`Error enabling full-screen: ${err.message}`);
                        });
                    } else {
                        document.exitFullscreen();
                    }
                });

                // Function to update button text
                const updateFsBtn = () => {
                    if (document.fullscreenElement === appShell) {
                        fsBtn.innerHTML = `
                            <svg class="btn-icon" aria-hidden="true"><use xlink:href="#icon-fullscreen-exit"></use></svg>
                            <span>Exit Fullscreen</span>
                        `;
                    } else {
                        fsBtn.innerHTML = `
                            <svg class="btn-icon" aria-hidden="true"><use xlink:href="#icon-fullscreen-enter"></use></svg>
                            <span>Fullscreen</span>
                        `;
                    }
                };

                appShell.addEventListener('fullscreenchange', updateFsBtn);
            }
            // --- End of new logic ---
        }
        setActive('/tools'); // Keep the "Launch App" button active

    } else {
        // --- This part is for all other pages (/, /tools, /docs, etc.) ---
        if (path === '/') {
            // Welcome Screen
            if (welcomeScreen) welcomeScreen.classList.remove('hidden');
            if (appHeader) appHeader.classList.remove('visible');
            if (view) view.classList.remove('visible');
            if (appFooter) appFooter.classList.remove('visible');
        } else {
            // All other main pages
            if (welcomeScreen) welcomeScreen.classList.add('hidden');
            if (appHeader) appHeader.classList.add('visible');
            if (view) view.classList.add('visible');
            if (appFooter) appFooter.classList.add('visible');
        }

        // Render the correct page's HTML
        const renderFunction = routes[path] || notFound;
        if (view) {
            view.innerHTML = renderFunction();
            view.classList.remove('view-is-app');
        }
        setActive(path);
    }

    // Call binders for specific pages
    if (path === '/docs') { bindDocs(anchor) }
    if (path === '/about') { bindAbout() }
}

window.addEventListener('hashchange', navigate);

window.addEventListener('load', () => {
    // --- CHANGE 3 ---
    // NOW that the page is loaded, we find the elements
    // and assign them to our global variables.
    view = document.getElementById('view');
    welcomeScreen = document.getElementById('welcome-screen');
    appHeader = document.getElementById('app-header');
    appFooter = document.getElementById('app-footer');
    // --- END OF CHANGE 3 ---

    initWelcomeScreen();
    initMobileMenu();
    initLogoLink();
    navigate();
});

function welcomeRoute() {
    return ``;
}

// --- Mobile Drawer Logic ---
function initMobileMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const menu = document.querySelector('.menu');
    const backdrop = document.getElementById('backdrop');

    if (!menuBtn || !menu || !backdrop) return;

    const menuLinks = document.querySelectorAll('.menu a:not(.dropdown-toggle)');
    const dropdown = document.querySelector('.menu .dropdown');
    const dropdownToggle = dropdown ? dropdown.querySelector('.dropdown-toggle') : null;


    function closeMenu() {
        menu.classList.remove('is-open');
        backdrop.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
    }

    function openMenu() {
        menu.classList.add('is-open');
        backdrop.classList.add('is-open');
        menuBtn.setAttribute('aria-expanded', 'true');
    }

    menuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = menu.classList.contains('is-open');
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    backdrop.addEventListener('click', closeMenu);

    menuLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    if (dropdownToggle) {
        dropdownToggle.addEventListener('click', (e) => {
            if (window.innerWidth <= 1000) {
                e.preventDefault();
                const isOpen = dropdown.classList.contains('is-open');
                dropdown.classList.toggle('is-open');
                dropdownToggle.setAttribute('aria-expanded', !isOpen);
            }
        });
    }
}

function initLogoLink() {
    const logoLink = document.getElementById('brand-logo');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            location.hash = '#/';
        });
    }
}

function setActive(path) {
    document.querySelectorAll('.menu [data-route]').forEach(el => {
        const route = el.getAttribute('data-route');
        let active = (route === path);

        // --- ADDED ---
        // Make sure "Launch App" button is active even when on a sub-module page
        if (path.startsWith('/app/') && route === '/tools') {
            active = true;
        }
        // --- END ADDED ---

        el.setAttribute('aria-current', active ? 'page' : 'false');
    });
}

// --- Helper Function to load app modules ---
function loadAppModule(moduleName) {
    // --- Pretty Name Lookup (Still needed for iframe title) ---
    const prettyNameMap = {
        'qc': 'Primer QC',
        'restriction': 'Restriction Cloning',
        'golden-gate': 'Golden Gate Assembly',
        'gibson': 'Gibson Assembly',
        'overlap-pcr': 'Overlap PCR',
        'user': 'USER Cloning',
        'mutagenesis': 'Mutagenesis',
        'multiplex-pcr': 'Multiplex PCR'
    };

    const prettyName = prettyNameMap[moduleName] || moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

    // We still point to the app-index.html shell and pass the hash
    const filePath = `app/app-index.html#${moduleName}`;

    // This HTML is injected into the <main> tag
    return `
    
    <svg width="0" height="0" style="position:absolute">
        <defs>
            <symbol id="icon-fullscreen-enter" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </symbol>
            <symbol id="icon-fullscreen-exit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
            </symbol>
        </defs>
    </svg>

    <div class="app-shell-stacked" id="app-shell-container">
            
        <nav class="app-shell-header">
            
            <h3 class="app-shell-title" style="display:flex;align-items:center;gap:8px">
              <span>${prettyName}</span>
              ${moduleName==='qc'?`
              <span class="help-icon" style="position: relative; display: inline-block; cursor: help; z-index: 1; flex-shrink: 0;">
                <span style="display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 50%; background: #6b7280; color: white; font-size: 0.8rem; font-weight: bold; transition: background 0.2s; position: relative; z-index: 1;">?</span>
                <span class="help-tooltip" style="position: absolute; top: calc(100% + 10px); left: 0; width: 400px; padding: 14px; background: #1f2937; color: #fff; border-radius: 8px; font-size: 0.85rem; line-height: 1.6; opacity: 0; visibility: hidden; transition: opacity 0.3s, visibility 0.3s; z-index: 99999; box-shadow: 0 8px 24px rgba(0,0,0,0.4); pointer-events: none; white-space: normal;">
                  <strong style="display: block; margin-bottom: 8px; font-size: 0.9rem;">Purpose:</strong>
                  <p style="margin: 0;">Quality check for PCR primers. Evaluates primer properties including melting temperature (Tm), self-dimer formation, cross-dimer formation, hairpin structures, GC content, 3'-clamp, and homopolymer runs. Helps identify potential issues before PCR experiments.</p>
                  <span style="position: absolute; top: -6px; left: 20px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 6px solid #1f2937;"></span>
                </span>
              </span>`:''}
              ${moduleName==='overlap-pcr'?`
              <span class="help-icon" style="position: relative; display: inline-block; cursor: help; z-index: 1; flex-shrink: 0;">
                <span style="display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 50%; background: #6b7280; color: white; font-size: 0.8rem; font-weight: bold; transition: background 0.2s; position: relative; z-index: 1;">?</span>
                <span class="help-tooltip" style="position: absolute; top: calc(100% + 10px); left: 0; width: 420px; padding: 14px; background: #1f2937; color: #fff; border-radius: 8px; font-size: 0.85rem; line-height: 1.6; opacity: 0; visibility: hidden; transition: opacity 0.3s, visibility 0.3s; z-index: 99999; box-shadow: 0 8px 24px rgba(0,0,0,0.4); pointer-events: none; white-space: normal;">
                  <strong style="display: block; margin-bottom: 8px; font-size: 0.9rem;">Purpose:</strong>
                  <p style="margin: 0;">Design primers for Overlap Extension PCR (OE-PCR) to join multiple DNA fragments. Primers create overlaps that allow adjacent fragments to anneal and extend, forming seamless junctions. Linker sequences are supported between fragments.</p>
                  <span style="position: absolute; top: -6px; left: 20px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 6px solid #1f2937;"></span>
                </span>
              </span>`:''}
              ${moduleName==='mutagenesis'?`
              <span class="help-icon" style="position: relative; display: inline-block; cursor: help; z-index: 1; flex-shrink: 0;">
                <span style="display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 50%; background: #6b7280; color: white; font-size: 0.8rem; font-weight: bold; transition: background 0.2s; position: relative; z-index: 1;">?</span>
                <span class="help-tooltip" style="position: absolute; top: calc(100% + 10px); left: 0; width: 420px; padding: 14px; background: #1f2937; color: #fff; border-radius: 8px; font-size: 0.85rem; line-height: 1.6; opacity: 0; visibility: hidden; transition: opacity 0.3s, visibility 0.3s; z-index: 99999; box-shadow: 0 8px 24px rgba(0,0,0,0.4); pointer-events: none; white-space: normal;">
                  <strong style="display: block; margin-bottom: 8px; font-size: 0.9rem;">Purpose:</strong>
                  <p style="margin: 0;">Perform site-directed mutagenesis via overlap PCR. Supports single or multiple amino acid or DNA edits (substitutions, insertions, deletions) and designs inner overlap and outer flanking primers with integrated QC (Tm, GC%, hairpin/dimer).</p>
                  <span style="position: absolute; top: -6px; left: 20px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 6px solid #1f2937;"></span>
                </span>
              </span>`:''}
              ${moduleName==='multiplex-pcr'?`
              <span class="help-icon" style="position: relative; display: inline-block; cursor: help; z-index: 1; flex-shrink: 0;">
                <span style="display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 50%; background: #6b7280; color: white; font-size: 0.8rem; font-weight: bold; transition: background 0.2s; position: relative; z-index: 1;">?</span>
                <span class="help-tooltip" style="position: absolute; top: calc(100% + 10px); left: 0; width: 420px; padding: 14px; background: #1f2937; color: #fff; border-radius: 8px; font-size: 0.85rem; line-height: 1.6; opacity: 0; visibility: hidden; transition: opacity 0.3s, visibility 0.3s; z-index: 99999; box-shadow: 0 8px 24px rgba(0,0,0,0.4); pointer-events: none; white-space: normal;">
                  <strong style="display: block; margin-bottom: 8px; font-size: 0.9rem;">Purpose:</strong>
                  <p style="margin: 0;">Design multiplex PCR primer pairs for many targets under a shared PCR condition. Includes cross-dimer screening and automated pooling suggestions to reduce primer–primer conflicts.</p>
                  <span style="position: absolute; top: -6px; left: 20px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 6px solid #1f2937;"></span>
                </span>
              </span>`:''}
              ${moduleName==='restriction'?`
              <span class="help-icon" style="position: relative; display: inline-block; cursor: help; z-index: 1; flex-shrink: 0;">
                <span style="display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 50%; background: #6b7280; color: white; font-size: 0.8rem; font-weight: bold; transition: background 0.2s; position: relative; z-index: 1;">?</span>
                <span class="help-tooltip" style="position: absolute; top: calc(100% + 10px); left: 0; width: 420px; padding: 14px; background: #1f2937; color: #fff; border-radius: 8px; font-size: 0.85rem; line-height: 1.6; opacity: 0; visibility: hidden; transition: opacity 0.3s, visibility 0.3s; z-index: 99999; box-shadow: 0 8px 24px rgba(0,0,0,0.4); pointer-events: none; white-space: normal;">
                  <strong style="display: block; margin-bottom: 8px; font-size: 0.9rem;">Purpose:</strong>
                  <p style="margin: 0;">Design primers for restriction enzyme cloning (RE cloning) using one or two enzymes. Generates directional/non-directional cloning primers with enzyme sites and optional extra bases, and provides an in-silico digest/assembly preview.</p>
                  <span style="position: absolute; top: -6px; left: 20px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 6px solid #1f2937;"></span>
                </span>
              </span>`:''}
              ${moduleName==='golden-gate'?`
              <span class="help-icon" style="position: relative; display: inline-block; cursor: help; z-index: 1; flex-shrink: 0;">
                <span style="display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 50%; background: #6b7280; color: white; font-size: 0.8rem; font-weight: bold; transition: background 0.2s; position: relative; z-index: 1;">?</span>
                <span class="help-tooltip" style="position: absolute; top: calc(100% + 10px); left: 0; width: 420px; padding: 14px; background: #1f2937; color: #fff; border-radius: 8px; font-size: 0.85rem; line-height: 1.6; opacity: 0; visibility: hidden; transition: opacity 0.3s, visibility 0.3s; z-index: 99999; box-shadow: 0 8px 24px rgba(0,0,0,0.4); pointer-events: none; white-space: normal;">
                  <strong style="display: block; margin-bottom: 8px; font-size: 0.9rem;">Purpose:</strong>
                  <p style="margin: 0;">Design Golden Gate assembly primers using Type IIS restriction enzymes. Automatically selects overhangs, checks for internal enzyme sites, and produces assembly-ready primers with optional clamping bases and gel/assembly previews.</p>
                  <span style="position: absolute; top: -6px; left: 20px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 6px solid #1f2937;"></span>
                </span>
              </span>`:''}
              ${moduleName==='gibson'?`
              <span class="help-icon" style="position: relative; display: inline-block; cursor: help; z-index: 1; flex-shrink: 0;">
                <span style="display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 50%; background: #6b7280; color: white; font-size: 0.8rem; font-weight: bold; transition: background 0.2s; position: relative; z-index: 1;">?</span>
                <span class="help-tooltip" style="position: absolute; top: calc(100% + 10px); left: 0; width: 420px; padding: 14px; background: #1f2937; color: #fff; border-radius: 8px; font-size: 0.85rem; line-height: 1.6; opacity: 0; visibility: hidden; transition: opacity 0.3s, visibility 0.3s; z-index: 99999; box-shadow: 0 8px 24px rgba(0,0,0,0.4); pointer-events: none; white-space: normal;">
                  <strong style="display: block; margin-bottom: 8px; font-size: 0.9rem;">Purpose:</strong>
                  <p style="margin: 0;">Design primers for Gibson Assembly. Optimizes overlap regions at each junction and designs core primers for vector and inserts, supporting single or multiple inserts with assembly preview and QC metrics.</p>
                  <span style="position: absolute; top: -6px; left: 20px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 6px solid #1f2937;"></span>
                </span>
              </span>`:''}
              ${moduleName==='user'?`
              <span class="help-icon" style="position: relative; display: inline-block; cursor: help; z-index: 1; flex-shrink: 0;">
                <span style="display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 50%; background: #6b7280; color: white; font-size: 0.8rem; font-weight: bold; transition: background 0.2s; position: relative; z-index: 1;">?</span>
                <span class="help-tooltip" style="position: absolute; top: calc(100% + 10px); left: 0; width: 420px; padding: 14px; background: #1f2937; color: #fff; border-radius: 8px; font-size: 0.85rem; line-height: 1.6; opacity: 0; visibility: hidden; transition: opacity 0.3s, visibility 0.3s; z-index: 99999; box-shadow: 0 8px 24px rgba(0,0,0,0.4); pointer-events: none; white-space: normal;">
                  <strong style="display: block; margin-bottom: 8px; font-size: 0.9rem;">Purpose:</strong>
                  <p style="margin: 0;">Design primers for USER cloning (Uracil-Specific Excision Reagent). Supports dU-containing primers and overlap-based assembly to create seamless junctions, with automated primer core selection and junction validation.</p>
                  <span style="position: absolute; top: -6px; left: 20px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 6px solid #1f2937;"></span>
                </span>
              </span>`:''}
            </h3>
            <div class="app-header-buttons">
                <button id="fullscreen-btn" class="btn ghost app-btn">
                    <svg class="btn-icon" aria-hidden="true"><use xlink:href="#icon-fullscreen-enter"></use></svg>
                    <span>Fullscreen</span>
                </button>
                <a href="#/tools" class="btn ghost app-btn">&larr; Back to Dashboard</a>
            </div>
        </nav>

        <article class="app-shell-content">
            <iframe 
                src="${filePath}" 
                title="${prettyName} Module" 
                class="app-iframe">
            </iframe>
        </article>
    </div>
    `;
}

// --- Page Content Functions ---
function docs() {
    return `
<div class="info-layout">
<nav class="info-sidebar" id="doc-nav">
  <h3>Documents</h3>
  <a href="#" data-doc="#d-intro">Introduction</a>
  <a href="#" data-doc="#d-qc">Primer QC</a>
  <a href="#" data-doc="#d-opcr">Overlap PCR</a>
  <a href="#" data-doc="#d-muta">Mutagenesis</a>
  <a href="#" data-doc="#d-mp">Multiplex PCR</a>
  <a href="#" data-doc="#d-re">Restriction Cloning</a>
  <a href="#" data-doc="#d-user">USER Cloning</a>
  <a href="#" data-doc="#d-gg">Golden Gate</a>
  <a href="#" data-doc="#d-gb">Gibson Assembly</a>
</nav>

<article class="card info-content" id="docBody">
  </article>
</div>`;
}

function help() {
    return `
<section class="card" style="padding:22px 28px">

<svg width="0" height="0" style="position:absolute">
    <defs>
    <symbol id="icon-format" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>
    </symbol>
    <symbol id="icon-fail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
    </symbol>
    <symbol id="icon-pool" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>
    </symbol>
    <symbol id="icon-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </symbol>
    <symbol id="icon-cite" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </symbol>
    <symbol id="icon-user" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
    </symbol>
    <symbol id="icon-scissors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle>
    <line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line>
    <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
    </symbol>
    <symbol id="icon-layers" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>
    </symbol>
    <symbol id="icon-list" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
    </symbol>
    <symbol id="icon-settings" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 .57 1.92v.5a2 2 0 0 1-1.73 1l-.25.43a2 2 0 0 1 0 2l.25.43a2 2 0 0 1 1.73 1v.5a2 2 0 0 1-.57 1.92l-.15.1a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-.57-1.92v-.5a2 2 0 0 1 1.73-1l.25-.43a2 2 0 0 1 0 2l-.25-.43a2 2 0 0 1-1.73-1v-.5a2 2 0 0 1 .57-1.92l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
    <circle cx="12" cy="12" r="3"></circle>
    </symbol>
    <symbol id="icon-play" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </symbol>
    <symbol id="icon-download" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>
    </symbol>
    <symbol id="icon-dna" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 14.899A7 7 0 1 1 15 9.101"></path><path d="M9 9.101A7 7 0 1 1 20 14.899"></path><line x1="4" y1="14.9" x2="9" y2="9.1"></line><line x1="15" y1="14.9" x2="20" y2="9.1"></line><line x1="12" y1="6" x2="12" y2="7"></line><line x1="12" y1="17" x2="12" y2="18"></line><line x1="7" y1="12" x2="8" y2="12"></line><line x1="16" y1="12" x2="17" y2="12"></line>
    </symbol>
    </defs>
</svg>

<h2 style="margin-bottom: 24px;">Help & FAQs</h2>

<div class="faq-item">
    <svg class="faq-icon" aria-hidden="true"><use xlink:href="#icon-format"></use></svg>
    <details class="faq-content" open>
    <summary>What sequence formats are accepted?</summary>
    <div>
        <p>PrimerWeaver accepts standard DNA sequences in either <strong>FASTA</strong> or <strong>plain text</strong> format. Any numbers, whitespace, or non-sequence characters are automatically removed. For multi-fragment assembly (like Golden Gate or Gibson), you can either paste sequences as a multi-FASTA block or simply paste each sequence on a new line.</p>
    </div>
    </details>
</div>

<div class="faq-item">
    <svg class="faq-icon" aria-hidden="true"><use xlink:href="#icon-fail"></use></svg>
    <details class="faq-content">
    <summary>My primer design failed. What are the common reasons?</summary>
    <div>
        <p>Design can fail for several reasons, typically related to your constraints:</p>
        <ul>
        <li><strong>No Valid Primers Found:</strong> The tool could not find a primer pair that met all constraints (e.g., Tm, GC%, product size). Try broadening the Tm range.</li>
        <li><strong>Domestication Failed:</strong> The tool found an internal restriction site within a coding region but could not find a silent mutation to remove it. You may need to remove this site manually.</li>
        <li><strong>High Dimer Score:</strong> In Multiplex mode, if a primer has unavoidable high-affinity dimers with all other primers, it may be excluded.</li>
        <li><strong>Low-Complexity Regions:</strong> Primers cannot be designed in regions of very low complexity (e.g., 'AAAAAAAAAA').</li>
        </ul>
    </div>
    </details>
</div>

<div class="faq-item">
    <svg class="faq-icon" aria-hidden="true"><use xlink:href="#icon-dna"></use></svg>
    <details class="faq-content">
    <summary>How does "coding-aware domestication" work?</summary>
    <div>
        <p>This feature is for <strong>Restriction</strong> and <strong>Golden Gate</strong> cloning. The tool scans your insert(s) for any internal recognition sites that match your chosen assembly enzyme(s) (e.g., an internal BsaI site in a Golden Gate fragment).</p>
        <p>If a site is found inside a coding region, it attempts to find a <strong>silent mutation</strong> (a change to a synonymous codon) that will disrupt the restriction site without changing the final amino acid sequence. This "domesticated" sequence is then used to design the final primers.</p>
    </div>
    </details>
</div>

<div class="faq-item">
    <svg class="faq-icon" aria-hidden="true"><use xlink:href="#icon-pool"></use></svg>
    <details class="faq-content">
    <summary>How does the multiplex PCR pooling work?</summary>
    <div>
        <p>The multiplex module first designs optimal primers for all targets. Then, it calculates a cross-dimerization score for every possible primer pair, especially checking 3' end complementarity.</p>
        <p>It uses a graph-coloring algorithm to automatically sort all primers into the <strong>minimum number of compatible pools</strong>, ensuring that no two primers within the same pool are predicted to form significant cross-dimers.</p>
    </div>
    </details>
</div>

<div class="faq-item">
    <svg class="faq-icon" aria-hidden="true"><use xlink:href="#icon-lock"></use></svg>
    <details class="faq-content">
    <summary>Is my sequence data saved on your server?</summary>
    <div>
        <p><strong>No.</strong> All calculations, from primer design to <i>in-silico</i> QC, are performed <strong>100% in your local browser</strong> (client-side). Your sequences are never uploaded to, transmitted to, or stored on our server. This ensures your data remains completely private and secure.</p>
    </div>
    </details>
</div>

<div class="faq-item">
    <svg class="faq-icon" aria-hidden="true"><use xlink:href="#icon-cite"></use></svg>
    <details class="faq-content">
    <summary>How do I cite the server?</summary>
    <div>
        <p>If you use PrimerWeaver in your research, please cite the following publication:</p>
        <p><em>PrimerWeaver: an integrated web server for primer design across restriction, Golden Gate, Gibson and multiplex PCR. Nucleic Acids Research, 2026, Web Server Issue, Vol. XX, gkabXXX.</em></p>
    </div>
    </details>
</div>

<div class="faq-item">
    <svg class="faq-icon" aria-hidden="true"><use xlink:href="#icon-user"></use></svg>
    <details class="faq-content" open>
    <summary>Any login or cost?</summary>
    <div>
        <p>No. PrimerWeaver is <strong>free for academic and non-commercial use</strong>. No login or cookies are required, respecting the NAR Web Server guidelines.</p>
    </div>
    </details>
</div>
</section>
`;
}

function about() {
    return `
<svg width="0" height="0" style="position:absolute">
<defs>
    <symbol id="icon-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
    </symbol>
    
    <symbol id="icon-status" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>
    </symbol>
    <symbol id="icon-award" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 17 17 23 15.79 13.88"></polyline>
    </symbol>
    <symbol id="icon-file" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>
    </symbol>
</defs>
</svg>

<section class="grid cols-2">
<div class="card" style="padding:22px 28px">
    
    <div class="about-item">
    <svg class="about-icon" aria-hidden="true"><use xlink:href="#icon-info"></use></svg>
    <div class="about-content">
        <h3>About PrimerWeaver</h3>
        <p class="muted">PrimerWeaver is developed and maintained by the <strong>Ignea Lab</strong> as a free, open-access tool for the molecular biology community. Our goal is to provide a single, unified platform that streamlines complex primer design for modern, high-throughput assembly workflows.</p>
        <p class="muted">This server adheres to the NAR Web Server guidelines, requiring no login and storing no user data. All computations are performed client-side.</p>
    </div>
    </div>
    
    <div class="about-item">
    <svg class="about-icon" aria-hidden="true"><use xlink:href="#icon-edit"></use></svg>
    <div class="about-content">
        <h3>Contact Us</h3>
        <p class="small muted">For bug reports, feature requests, or collaboration inquiries, please use the form below or contact the corresponding author via email.</p>
        
        <form id="contactForm">
        <label for="c-email">Your email (for a reply)</label>
        <input type="email" id="c-email" required />
        
        <label for="c-msg">Message</label>
        <textarea id="c-msg" required placeholder="Report a bug, suggest a feature..."></textarea>
        
        <div class="btn-group">
            <button class="btn" type="submit">Send Message</button>
            <button class="btn ghost" type="reset">Reset</button>
        </div>
        </form>
    </div>
    </div>

</div>
<div class="card" style="padding:22px 28px">

    <div class="about-item">
    <svg class="about-icon" aria-hidden="true"><use xlink:href="#icon-status"></use></svg>
    <div class="about-content">
        <h3>System Status</h3>
        <ul class="small muted" style="padding-left: 20px; margin-top: 0;">
        <li><strong>Uptime (last 30d):</strong> 99.9%</li>
        <li><strong>Median job time:</strong> 2.1 s (single construct)</li>
        <li><strong>Queue policy:</strong> All jobs are client-side (no queue).</li>
        <li><strong>Last Update:</strong> 2025-11-13 (v1.1.3)</li>
        </ul>
    </div>
    </div>

    <div class="about-item">
    <svg class="about-icon" aria-hidden="true"><use xlink:href="#icon-award"></use></svg>
    <div class="about-content">
        <h3>Credits & Acknowledgements</h3>
        <p class="small muted">PrimerWeaver relies on the exceptional open-source ecosystems of <a href="https://primer3.org/" target="_blank" rel="noopener noreferrer">primer3</a>, <a href="https://blast.ncbi.nlm.nih.gov/Blast.cgi?PAGE_TYPE=BlastDocs&DOC_TYPE=Download" target="_blank" rel="noopener noreferrer">BLAST+</a>, and various community-sourced datasets for Type IIS overhang fidelity and Tm calculations.</p>
    </div>
    </div>
    
    <div class="about-item">
    <svg class="about-icon" aria-hidden="true"><use xlink:href="#icon-file"></use></svg>
    <div class="about-content">
        <h3 id="impressum">Impressum (Legal Notice)</h3>
        <p class="small muted">
        <strong>Responsible for this service:</strong><br>
        Zimo Jin, Codruta Ignea<br>
        Ignea Lab, Biological and Biomedical Engineering<br>
        McGill University<br>
        Montreal, QC, Canada<br>
        <strong>Email:</strong> zimo.jin@mail.mcgill.ca, codruta.ignea@mcgill.ca
        </p>
    </div>
    </div>

</div>
</section>
`;
}


function appDashboard() {
    return `
    <svg width="0" height="0" style="position:absolute">
        <defs>
            <symbol id="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></symbol>
            <symbol id="icon-pool" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>
            </symbol>
            <symbol id="icon-scissors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle>
            <line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line>
            <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
            </symbol>
            <symbol id="icon-layers" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>
            </symbol>
            <symbol id="icon-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </symbol>
            <symbol id="icon-puzzle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
            </symbol>
            <symbol id="icon-beaker" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4.5 3h15"></path>
                <path d="M6 3v16c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V3"></path>
                <path d="M6 14h12"></path>
                <path d="M9 9h.01"></path>
                <path d="M15 9h.01"></path>
                <path d="M12 11h.01"></path>
            </symbol>
            <symbol id="icon-merge" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 18c-3.31 0-6-2.69-6-6V4M4 4v8c0 3.31 2.69 6 6 6h4"/><polyline points="15 15 18 18 15 21"/>
            </symbol>
            <symbol id="icon-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </symbol>
            <symbol id="icon-loader" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </symbol>
            <symbol id="icon-fullscreen-enter" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </symbol>
            <symbol id="icon-fullscreen-exit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
            </symbol>
        </defs>
    </svg>

    <section class="hero">
        <div>
            <h2>PrimerWeaver App Dashboard</h2>
            <p class="muted">Select a cloning or analysis module to begin.</p>
            
            <div class="grid cols-3" style="margin-top:30px;">
                
                <div class="card tool-card">
                    <svg class="tool-card-icon" aria-hidden="true"><use xlink:href="#icon-check"></use></svg>
                    <h3>Primer QC</h3>
                    <p class="small muted">Analyze existing primers for Tm, GC, hairpins, and dimers.</p>
                    <div class="tool-card-buttons">
                        <a href="#/docs#d-qc" class="btn ghost">Read Docs</a>
                        <a href="#/app/qc" class="btn">Open App</a>
                    </div>
                </div>
                <div class="card tool-card">
                    <svg class="tool-card-icon" aria-hidden="true"><use xlink:href="#icon-merge"></use></svg>
                    <h3>Overlap PCR</h3>
                    <p class="small muted">Design primers to stitch two or more DNA fragments together (SOE-PCR).</p>
                    <div class="tool-card-buttons">
                        <a href="#/docs#d-opcr" class="btn ghost">Read Docs</a>
                        <a href="#/app/overlap-pcr" class="btn">Open App</a>
                    </div>
                </div>
                <div class="card tool-card">
                    <svg class="tool-card-icon" aria-hidden="true"><use xlink:href="#icon-edit"></use></svg>
                    <h3>Mutagenesis</h3>
                    <p class="small muted">Generate primers for site-directed mutagenesis.</p>
                    <div class="tool-card-buttons">
                        <a href="#/docs#d-muta" class="btn ghost">Read Docs</a>
                        <a href="#/app/mutagenesis" class="btn">Open App</a>
                    </div>
                </div>
                <div class="card tool-card">
                    <svg class="tool-card-icon" aria-hidden="true"><use xlink:href="#icon-beaker"></use></svg>
                    <h3>Multiplex PCR</h3>
                    <p class="small muted">Design and sort primers into compatible, non-conflicting pools.</p>
                    <div class="tool-card-buttons">
                        <a href="#/docs#d-mp" class="btn ghost">Read Docs</a>
                        <a href="#/app/multiplex-pcr" class="btn">Open App</a>
                    </div>
                </div>
                <div class="card tool-card">
                    <svg class="tool-card-icon" aria-hidden="true"><use xlink:href="#icon-scissors"></use></svg>
                    <h3>Restriction Cloning</h3>
                    <p class="small muted">Design primers for traditional enzyme-based cloning.</p>
                    <div class="tool-card-buttons">
                        <a href="#/docs#d-re" class="btn ghost">Read Docs</a>
                        <a href="#/app/restriction" class="btn">Open App</a>
                    </div>
                </div>
                <div class="card tool-card">
                    <svg class="tool-card-icon" aria-hidden="true"><use xlink:href="#icon-layers"></use></svg>
                    <h3>USER Cloning</h3>
                    <p class="small muted">Designs primers incorporating uracil for seamless cloning.</p>
                    <div class="tool-card-buttons">
                        <a href="#/docs#d-user" class="btn ghost">Read Docs</a>
                        <a href="#/app/user" class="btn">Open App</a>
                    </div>
                </div>
                <div class="card tool-card">
                    <svg class="tool-card-icon" aria-hidden="true"><use xlink:href="#icon-puzzle"></use></svg>
                    <h3>Golden Gate Assembly</h3>
                    <p class="small muted">Designs primers for Type IIS multi-fragment assembly.</p>
                    <div class="tool-card-buttons">
                        <a href="#/docs#d-gg" class="btn ghost">Read Docs</a>
                        <a href="#/app/golden-gate" class="btn">Open App</a>
                    </div>
                </div>
                <div class="card tool-card">
                    <svg class="tool-card-icon" aria-hidden="true"><use xlink:href="#icon-link"></use></svg>
                    <h3>Gibson Assembly</h3>
                    <p class="small muted">Generates optimized homology overlaps with a uniform target Tm.</p>
                    <div class="tool-card-buttons">
                        <a href="#/docs#d-gb" class="btn ghost">Read Docs</a>
                        <a href="#/app/gibson" class="btn">Open App</a>
                    </div>
                </div>
                <div class="card tool-card" style="opacity: 0.6; border-style: dashed;">
                    <svg class="tool-card-icon" aria-hidden="true"><use xlink:href="#icon-loader"></use></svg>
                    <h3>More is coming...</h3>
                    <p class="small muted">
                        New tools and modules are currently in development.
                    </p>
                    <a href="#" onclick="return false;" class="btn" style="margin-top: auto; padding: 6px 12px; font-size: 14px; background-color: var(--muted);">Coming Soon</a>
                </div>
            </div>
        </div>
    </section>
    `;
}


function notFound() {
    return `<section class="card" style="padding:18px"><h2>404</h2><p>Page not found.</p></section>`;
}

// --- Documentation Page Content ---
function docIntro() {
    return `
    <h3 id="d-intro">Introduction</h3>
    <p>PrimerWeaver is an integrated web server that designs assembly-ready primers for four major molecular cloning and amplification workflows. It streamlines the complex and often-siloed task of primer design by providing specific modules for Restriction/Ligation, Golden Gate, Gibson Assembly, and Multiplex PCR.</p>
    <p>The server's core principle is to not only generate primers but also to validate them through robust <i>in-silico</i> quality control (QC) checks, ensuring high success rates in the lab. This includes virtual gel previews, fidelity-aware overhang selection, and cross-dimer analysis, all accessible from a single interface.</p>
`;
}
function docRE() {
    return `
        <h3 id="d-re">Restriction Cloning</h3>
        <p>This module designs primers for traditional restriction enzyme-based cloning of a single insert into a vector.</p>
        <ul>
            <li><strong>Enzyme Selection:</strong> Intelligently suggests optimal single or dual-cutter pairs from a vector's Multiple Cloning Site (MCS) or from a user-provided list. It flags non-unique cutters.</li>
            <li><strong>Domestication:</strong> Performs coding-sequence-aware domestication by scanning the insert for conflicting restriction sites. It will recommend silent mutations to remove internal sites, preserving the final amino acid sequence.</li>
            <li><strong>Primer Design:</strong> Generates forward and reverse primers, adding the selected enzyme sites and 5-6 bp non-coding "spacer" regions required for efficient cleavage.</li>
            <li><strong><i>In-silico</i> QC:</strong> Provides a virtual diagnostic digest gel to help you plan your post-transformation colony screening, showing the expected band sizes for both the empty vector and the final construct.</li>
        </ul>
`;
}
function docGG() {
    return `
        <h3 id="d-gg">Golden Gate</h3>
        <p>This module designs primers for Type IIS assembly, which allows for the ordered, one-pot assembly of multiple fragments.</p>
        <ul>
            <li><strong>Enzyme Support:</strong> Supports common Type IIS enzymes (e.g., BsaI, BsmBI, BbsI) and automatically adds the correct, properly-oriented recognition sites to the primers.</li>
            <li><strong>Overhang Fidelity:</strong> For multi-fragment assembly, PrimerWeaver generates a complete set of non-palindromic 4-bp overhangs. It references published overhang fidelity libraries to select high-fidelity sets, minimizing ligation errors and ensuring correct assembly order.</li>
            <li><strong>Domestication:</strong> Automatically scans all fragments for internal Type IIS sites and designs primers for silent mutation (domestication) where necessary.</li>
            <li><strong>Output:</strong> Outputs a complete primer list for amplifying each fragment with its correct flanking overhangs, ready for the assembly reaction.</li>
        </ul>
`;
}
function docGB() {
    return `
        <h3 id="d-gb">Gibson Assembly</h3>
        <p>This module designs primers for Gibson Assembly, a flexible, homology-based method for seamless, multi-part cloning.</p>
        <ul>
            <li><strong>Homology Arms:</strong> Automatically generates primers with the required 5' homology arms (typically 20-40 bp) to bridge each adjacent fragment and the linearized vector.</li>
            <li><strong>Tm Optimization:</strong> Optimizes all overlap regions to a user-defined target melting temperature (Tm), ensuring uniform annealing and efficient assembly. The default target is 60°C, ideal for most standard master mixes.</li>
            <li><strong>QC Checks:</strong> Scans all primers for potential secondary structures (hairpins, self-dimers) in the 3' end and.</li>
        </ul>
`;
}
function docMP() {
    return `
        <h3 id="d-mp">Multiplex PCR</h3>
        <p>This module is designed for high-throughput screening or library generation where many amplicons must be amplified in a single reaction. Its primary goal is to design compatible primer pools.</p>
        <ul>
            <li><strong>Dimer Analysis:</strong> Analyzes all possible primer pairs in a set to identify and score potential cross-dimer and self-dimer formation, particularly at the 3' ends.</li>
            <li><strong>Automated Pooling:</strong> If conflicts are detected, the tool automatically groups primers into the minimum number of compatible, non-conflicting pools for parallel reactions.</li>
            <li><strong>Tm Balancing:</strong> Ensures that all primers within a single pool have a compatible annealing temperature (within 2-3°C) for efficient and specific amplification.</li>
        </ul>
`;
}

function docQC() {
    return `
        <h3 id="d-qc">Primer QC</h3>
        <p>This module is a utility to check the quality and compatibility of pre-existing primers. It's ideal for validating primers from a publication, a previous experiment, or a colleague before ordering new oligos.</p>
        <ul>
            <li><strong>Core Metrics:</strong> Calculates key metrics like Melting Temperature (Tm) using the latest unified thermodynamic parameters, GC content percentage, and molecular weight.</li>
            <li><strong>Secondary Structures:</strong> Analyzes each primer for potential secondary structures, including self-dimers and hairpins, paying special attention to 3' end stability which can inhibit PCR.</li>
            <li><strong>Pair Analysis:</strong> When primers are entered as a pair (in FASTA or on sequential lines), it also calculates the potential for cross-dimer formation between the forward and reverse primers.</li>
        </ul>
    `;
}
function docUSER() {
    return `
        <h3 id="d-user">USER Cloning</h3>
        <p>This module designs primers for USER (Uracil-Specific Excision Reagent) cloning, a powerful, ligation-independent method that uses uracil incorporation for seamless, directional assembly.</p>
        <ul>
            <li><strong>Uracil Incorporation:</strong> Automatically designs forward and reverse primers that include a specific uracil (U) residue near the 5' end, followed by a short sequence-specific region.</li>
            <li><strong>Seamless Overhangs:</strong> When amplicons are treated with the USER enzyme mix, the uracil is excised, creating long (e.g., 8-12 bp), complementary 3' overhangs. These overhangs anneal to create a stable, seamless joint.</li>
            <li><strong>High Fidelity:</strong> This method is highly efficient for both single-insert cloning and multi-part assembly, as the long, specific overhangs ensure high fidelity and correct fragment orientation.</li>
        </ul>
`;
}

function docOPCR() {
    return `
        <h3 id="d-opcr">Overlap PCR (SOE-PCR)</h3>
        <p>This module designs primers for Splicing by Overlap Extension (SOE) PCR, a method used to stitch two or more DNA fragments together using overlapping primers.</p>
        <ul>
            <li>Generates outer "flanking" primers and inner "bridge" primers.</li>
            <li>The inner primers contain complementary 5' tails that create an overlapping region between adjacent fragments.</li>
            <li>A final PCR reaction using only the outer primers uses the annealed fragments as a template to generate the full-length, stitched product.</li>
        </ul>
`;
}
function docMUTA() {
    return `
        <h3 id="d-muta">Mutagenesis</h3>
        <p>This module designs primers for site-directed mutagenesis to efficiently introduce point mutations, insertions, or deletions into a target plasmid.</p>
        <ul>
            <li><strong>Point Mutations:</strong> Generates complementary primers containing the desired base change in the middle.</li>
            <li><strong>Deletions:</strong> Designs primers that flank the region to be deleted, with 5' ends that will be ligated together.</li>
            <li><strong>Insertions:</strong> Uses primers with 5' tails that contain the sequence to be inserted.</li>
        </ul>
`;
}

// --- End of Page Content Functions ---

const docRoutes = {
    '#d-intro': docIntro,
    '#d-qc': docQC,
    '#d-opcr': docOPCR,
    '#d-muta': docMUTA,
    '#d-mp': docMP,
    '#d-re': docRE,
    '#d-user': docUSER,
    '#d-gg': docGG,
    '#d-gb': docGB,
};

function bindDocs(anchor) {
    const docNav = document.getElementById('doc-nav');
    const docBody = document.getElementById('docBody');
    const headerDocNav = document.getElementById('header-doc-nav');

    function renderDocContent(id) {
        if (!id) id = '#d-intro';
        const renderFunc = docRoutes[id] || docIntro;
        if (docBody) {
            docBody.innerHTML = renderFunc();
        }

        if (docNav) {
            docNav.querySelectorAll('a').forEach(a => a.classList.remove('is-active'));
            const activeLink = docNav.querySelector(`a[data-doc="${id}"]`);
            if (activeLink) {
                activeLink.classList.add('is-active');
            }
        }

        setTimeout(() => {
            if (!docBody) return;
            const targetElement = docBody.querySelector(id);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                docBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 0);
    }

    if (docNav) {
        docNav.addEventListener('click', e => {
            if (e.target.tagName !== 'A' || !e.target.getAttribute('data-doc')) return;
            e.preventDefault();

            const id = e.target.getAttribute('data-doc');
            renderDocContent(id);
            history.replaceState(null, '', `#/docs${id}`);
        });
    }

    if (headerDocNav) {
        headerDocNav.addEventListener('click', e => {
            if (e.target.tagName !== 'A' || !e.target.getAttribute('data-doc')) return;

            const menu = document.querySelector('.menu');
            if (menu && menu.classList.contains('is-open')) {
                document.getElementById('menuBtn').click();
            }
        });
    }

    if (docBody) {
        docBody.addEventListener('click', e => {
            if (e.target.tagName === 'A' && e.target.getAttribute('data-doc')) {
                e.preventDefault();
                const id = e.target.getAttribute('data-doc');
                const sidebarLink = docNav.querySelector(`a[data-doc="${id}"]`);
                if (sidebarLink) {
                    sidebarLink.click();
                }
            }
        });
    }

    renderDocContent(anchor);
}

function bindAbout() {
    const form = document.getElementById('contactForm');
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Message queued (demo).');
        form.reset();
    })
}
