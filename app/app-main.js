// This is your new app/app-main.js

// Load heavy computation/visualization modules after first paint to keep UI responsive.
let CORE = null;
let VIZ = null;
function ensureCoreVizLoaded() {
  if (window.__coreVizPromise) return window.__coreVizPromise;
  window.__coreVizPromise = Promise.all([
    import('./modules/scripts/core_v1.0.1.js'),
    import('./modules/scripts/bio_visuals_v1.0.1.js')
  ]).then(([core, viz]) => {
    CORE = core;
    VIZ = viz;
    window.CORE = core;
    window.VIZ = viz;
    window.pickCorePrimerForward = CORE.pickCorePrimerForward || pickCorePrimerForwardFallback;
    window.pickCorePrimerReverse = CORE.pickCorePrimerReverse || pickCorePrimerReverseFallback;
    window.makeSmartClamp = CORE.makeSmartClamp || (() => '');
    return { CORE: core, VIZ: viz };
  });
  return window.__coreVizPromise;
}

// Direct use of CORE functions - no aliases needed
// Helper to clean FASTA (remove headers and normalize) - uses CORE functions directly
function cleanFasta(raw) {
  if (!raw) return '';
  const records = CORE.parseFASTA(raw);
  if (records.length === 0) return '';
  return records.map(r => CORE.normalizeSeq(r.seq)).join('');
}
// Helper for NEB-style Tm calculation - uses CORE.tmcalNN directly
function tmNEB(seq, Na_mM = 50, conc_nM = 500) {
  return CORE.tmcalNN(seq, Na_mM, 0, conc_nM);
}
const rc = (seq) => CORE.reverseComplementSeq(seq);
const revcompSeq = (seq) => CORE.reverseComplementSeq(seq);
const gcPct = (seq) => CORE.gcPct(seq);

// Fallbacks for core primer pickers (used by Golden Gate)
function pickCorePrimerForwardFallback(seq, tmTarget, Na, conc){
  const s = (seq || '').toUpperCase();
  const minL = 18, maxL = 28;
  let best = s.slice(0, minL);
  for(let L=minL; L<=maxL; L++){
    const cand = s.slice(0, L);
    const ok3 = /[GC]$/.test(cand);
    const Tm = tmNEB(cand, Na, conc);
    if(ok3 && Tm >= tmTarget - 0.5) return cand;
    best = cand;
  }
  return best;
}
function pickCorePrimerReverseFallback(seq, tmTarget, Na, conc){
  const s = (seq || '').toUpperCase();
  const minL = 18, maxL = 28;
  let best = rc(s.slice(-minL));
  for(let L=minL; L<=maxL; L++){
    const core = s.slice(-L);
    const p = rc(core);
    const ok3 = /[GC]$/.test(p);
    const Tm = tmNEB(p, Na, conc);
    if(ok3 && Tm >= tmTarget - 0.5) return p;
    best = p;
  }
  return best;
}

// Loaded on-demand to avoid parsing a ~1.1MB dataset on initial app load.
const COMMON_FEATURES_SRC = './modules/scripts/common_features_v1.0.1.js';
function ensureCommonFeaturesLoaded() {
  if (Array.isArray(window.COMMON_FEATURES)) return Promise.resolve(window.COMMON_FEATURES);
  if (window.__commonFeaturesPromise) return window.__commonFeaturesPromise;

  window.__commonFeaturesPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${COMMON_FEATURES_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => {
        try { window.dispatchEvent(new CustomEvent('common-features-ready')); } catch {}
        resolve(window.COMMON_FEATURES || []);
      }, { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load common features DB')), { once: true });
      return;
    }

    const s = document.createElement('script');
    s.src = COMMON_FEATURES_SRC;
    s.async = true;
    s.onload = () => {
      try { window.dispatchEvent(new CustomEvent('common-features-ready')); } catch {}
      resolve(window.COMMON_FEATURES || []);
    };
    s.onerror = () => reject(new Error('Failed to load common features DB'));
    document.head.appendChild(s);
  });

  return window.__commonFeaturesPromise;
}

function deferAfterFirstPaint(fn) {
  window.requestAnimationFrame(() => window.setTimeout(fn, 0));
}

function deferUntilIdle(fn) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => fn(), { timeout: 2000 });
    return;
  }
  deferAfterFirstPaint(fn);
}

const COMMON_FEATURE_MODULES = new Set(['golden-gate', 'restriction', 'gibson', 'user']);
function kickoffCommonFeaturesLoadIfNeeded(moduleName) {
  if (!COMMON_FEATURE_MODULES.has(moduleName)) return;
  if (Array.isArray(window.COMMON_FEATURES) || window.__commonFeaturesPromise) return;
  deferUntilIdle(() => ensureCommonFeaturesLoaded().catch(() => {}));
}

document.addEventListener('DOMContentLoaded', () => {
    const moduleContent = document.getElementById('module-content');
    // We will add the nav tab logic later if we add tabs inside the iframe
    // const navTabs = document.getElementById('app-nav-tabs');

    // This map links the hash to the actual HTML fragment file
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

    // Function to fetch and load a module
    async function loadModule(moduleName) {
        const path = moduleMap[moduleName];
        if (!path) {
            moduleContent.innerHTML = '<p>Error: Module not found.</p>';
            return;
        }

        // Determine if this module should be loaded as standalone HTML in iframe
        // or as fragment with innerHTML injection
        const standaloneModules = [];
        
        if (standaloneModules.includes(moduleName)) {
            // Load as complete HTML document in iframe
            moduleContent.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.src = path;
            iframe.style.width = '100%';
            iframe.style.height = '100vh';
            iframe.style.border = 'none';
            iframe.style.display = 'block';
            moduleContent.appendChild(iframe);
        } else {
            // Load as HTML fragment via innerHTML (for modules using init functions)
            moduleContent.innerHTML = '<p>Loading...</p>';
            try {
                const response = await fetch(path);
                if (!response.ok) throw new Error('Network response was not ok');
                const html = await response.text();
                
                // Inject the HTML fragment
                moduleContent.innerHTML = html;
                
                kickoffCommonFeaturesLoadIfNeeded(moduleName);
                deferAfterFirstPaint(async () => {
                    try { await ensureCoreVizLoaded(); } catch (e) {}
                    switch (moduleName) {
                        case 'golden-gate': {
                            setTimeout(() => {
                                const run = () => {
                                // If already loaded (app-main inline or external), run immediately
                                if (window.initGoldenGate) {
                                    window.initGoldenGate(moduleContent);
                                    return;
                                }
                                // If script is loading, wait for it
                                const existingScript = document.querySelector('script[src="./modules/scripts/golden_gate_v1.0.1.js"]');
                                if (existingScript) {
                                    existingScript.addEventListener('load', () => {
                                        if (window.initGoldenGate) {
                                            window.initGoldenGate(moduleContent);
                                        }
                                    });
                                    return;
                                }
                                // Load external Golden Gate module
                                const script = document.createElement('script');
                                script.type = 'module';
                                script.src = './modules/scripts/golden_gate_v1.0.1.js';
                                script.onload = () => {
                                    if (window.initGoldenGate) {
                                        window.initGoldenGate(moduleContent);
                                    }
                                };
                                script.onerror = (e) => {
                                    console.error('Failed to load golden_gate_v1.0.1.js', e);
                                };
                                document.head.appendChild(script);
                                };
                                run();
                            }, 50);
                            break;
                        }
                        case 'qc': {
                            // QC_V1.0.1: load inline/src scripts in sequence then init
                            setTimeout(() => {
                                const scripts = Array.from(moduleContent.querySelectorAll('script'));
                                const runSequential = (i = 0) => {
                                    if (i >= scripts.length) {
                                        if (window.initQC_V4) {
                                            window.initQC_V4(moduleContent);
                                        }
                                        return;
                                    }
                                    const script = scripts[i];
                                    const newScript = document.createElement('script');
                                    if (script.src) {
                                        newScript.src = script.src;
                                        newScript.onload = () => runSequential(i + 1);
                                        newScript.onerror = (e) => {
                                            console.error('QC_V1.0.1 script load error:', e);
                                            runSequential(i + 1);
                                        };
                                        document.head.appendChild(newScript);
                                    } else {
                                        try {
                                            newScript.textContent = script.textContent;
                                            document.head.appendChild(newScript);
                                            document.head.removeChild(newScript);
                                        } catch(e) {
                                            console.error('QC_V1.0.1 inline script error:', e);
                                        }
                                        runSequential(i + 1);
                                    }
                                };
                                runSequential();
                            }, 50);
                            break;
                        }
                        case 'restriction': {
                            // RE_cloning_v1.0.1: load inline/src scripts in sequence
                            setTimeout(() => {
                                const scripts = Array.from(moduleContent.querySelectorAll('script'));
                                const runSequential = (i = 0) => {
                                    if (i >= scripts.length) return;
                                    const script = scripts[i];
                                    const newScript = document.createElement('script');
                                    if (script.src) {
                                        newScript.src = script.src;
                                        newScript.onload = () => runSequential(i + 1);
                                        newScript.onerror = (e) => {
                                            console.error('RE script load error:', e);
                                            runSequential(i + 1);
                                        };
                                        document.head.appendChild(newScript);
                                    } else {
                                        try {
                                            newScript.textContent = script.textContent;
                                            document.head.appendChild(newScript);
                                            document.head.removeChild(newScript);
                                        } catch(e) {
                                            console.error('RE inline script error:', e);
                                        }
                                        runSequential(i + 1);
                                    }
                                };
                                runSequential();
                            }, 50);
                            break;
                        }
                        case 'gibson':
                            initGibson(moduleContent);
                            // Load Gibson module JS dynamically
                            setTimeout(() => {
                                // Check if script is already loaded
                                if (window.initGibsonModule) {
                                    window.initGibsonModule(moduleContent);
                                    window.__gibsonInitialized = true;
                                    return;
                                }
                                
                                // Check if script tag already exists
                                const existingScript = document.querySelector('script[src="./modules/scripts/gibson_v1.0.1.js"]');
                                if (existingScript) {
                                    existingScript.addEventListener('load', () => {
                                        setTimeout(() => {
                                            if (window.initGibsonModule) {
                                                window.initGibsonModule(moduleContent);
                                                window.__gibsonInitialized = true;
                                            }
                                        }, 100);
                                    });
                                    return;
                                }
                                
                                // Load Gibson module dynamically
                                const script = document.createElement('script');
                                script.type = 'module';
                                script.src = './modules/scripts/gibson_v1.0.1.js';
                                
                                script.onload = () => {
                                    setTimeout(() => {
                                        if (window.initGibsonModule) {
                                            window.initGibsonModule(moduleContent);
                                            window.__gibsonInitialized = true;
                                        } else {
                                            console.error('initGibsonModule not found after script load');
                                        }
                                    }, 100);
                                };
                                
                                script.onerror = () => {
                                    console.error('Failed to load gibson_v1.0.1.js');
                                };
                                
                                document.head.appendChild(script);
                            }, 50);
                            break;
                        case 'user':
                            // Load USER module dynamically
                            // The JS file uses ES6 imports, so we need to load it as a module
                            const userScript = document.createElement('script');
                            userScript.type = 'module';
                            userScript.src = './modules/scripts/user_cloning_v1.0.1.js';
                            
                            // Initialize after script loads
                            userScript.onload = () => {
                                if (window.initUSERModule) {
                                    window.initUSERModule();
                                } else {
                                    console.error('initUSERModule not found');
                                }
                            };
                            
                            userScript.onerror = () => {
                                console.error('Failed to load user_cloning_v1.0.1.js');
                            };
                            
                            // Append to document head to ensure proper module resolution
                            document.head.appendChild(userScript);
                            break;
                        case 'overlap-pcr':
                            initOEPCR(moduleContent);
                            break;
                        case 'multiplex-pcr':
                            // Wait a bit longer for HTML to be fully injected
                            setTimeout(() => {
                              initMultiplexPCR(moduleContent);
                            }, 50);
                            break;
                        case 'mutagenesis':
                            // Mutagenesis module - need to manually load the script
                            // because innerHTML doesn't execute script tags
                            console.log('Mutagenesis case: manually loading script...');
                            
                            // Remove any script tag from HTML (won't execute anyway)
                            const oldScript = moduleContent.querySelector('script');
                            if (oldScript) {
                                oldScript.remove();
                            }
                            
                            // Check if already loaded
                            if (window.initMutagenesisModule) {
                                console.log('Script already loaded, initializing immediately');
                                setTimeout(() => {
                                    window.initMutagenesisModule(moduleContent);
                                }, 50);
                            } else {
                                // Check if script is already loading
                                const existingScript = document.querySelector('script[src="./modules/scripts/mutagenesis_v1.0.1.js"]');
                                if (existingScript) {
                                    console.log('Script already loading, waiting...');
                                    existingScript.addEventListener('load', () => {
                                        setTimeout(() => {
                                            if (window.initMutagenesisModule) {
                                                window.initMutagenesisModule(moduleContent);
                                            }
                                        }, 100);
                                    });
                                } else {
                                    // Create and inject script manually
                                    const script = document.createElement('script');
                                    script.type = 'module';
                                    script.src = './modules/scripts/mutagenesis_v1.0.1.js';
                                    
                                    script.onload = () => {
                                        console.log('mutagenesis_v1.0.1.js loaded successfully');
                                        setTimeout(() => {
                                            if (window.initMutagenesisModule) {
                                                console.log('Calling initMutagenesisModule with container:', moduleContent);
                                                window.initMutagenesisModule(moduleContent);
                                            } else {
                                                console.error('initMutagenesisModule not found after script load');
                                            }
                                        }, 100);
                                    };
                                    
                                    script.onerror = (e) => {
                                    console.error('Failed to load mutagenesis_v1.0.1.js:', e);
                                    };
                                    
                                    document.head.appendChild(script);
                                }
                            }
                            break;
                    }
                });

            } catch (error) {
                console.error('Error loading module:', error);
                moduleContent.innerHTML = '<p>Error loading module.</p>';
            }
        }
    }

    // Function to handle URL hash changes
    function handleHashChange() {
        let hash = window.location.hash.substring(1);
        if (!hash || !moduleMap[hash]) {
            hash = 'golden-gate'; // Default to golden-gate for now
        }
        loadModule(hash);
    }

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Load the initial module based on the URL
    handleHashChange();
});

//  LOGIC FOR: Gibson Assembly
// ===================================================================
function initGibson(container) {
  // New Gibson module (Gibson_V1.0.1.html) uses gibson_v1.0.1.js
  // The initialization is handled by the script loading in the switch case above
  // This function is kept for compatibility but does nothing
  // All logic is in gibson_v1.0.1.js
  return;
  
  // Old code below (not used, kept for reference)
  /*
  const comp = CORE.IUPAC_COMP;
  // rc uses global alias

  // Use CORE.tmcalNN instead of tmNEB
  function tmNN(seq, Na_mM = 50, conc_nM = 500) {
    return CORE.tmcalNN(seq, Na_mM, 0, conc_nM);
  }

  // QC Functions
  function renderAlignment(A, Brc, off){
    let minI = Math.min(0, off);
    let maxI = Math.max(A.length, Brc.length+off);
    let lineA = "", lineB = "", lineM = "";
    for(let pos=minI; pos<maxI; pos++){
      const i = pos; const j = pos - off;
      const a = (i>=0 && i<A.length)? A[i] : " ";
      const b = (j>=0 && j<Brc.length)? Brc[j] : " ";
      lineA += a; lineB += b;
      lineM += (a!==" " && b!==" " && comp[a]===b)? "I": " ";
    }
    return ["5' "+lineA+" 3'","   "+lineM,"3' "+lineB+" 5' (rc)"].join("\n");
  }
  // Use CORE.dimerScan for dimer detection
  function bestPCRDimer(A, B, kmin=5){
    const result = CORE.dimerScan(A, B);
    if (!result || !result.overlap) return null;
    const k = result.overlap.length;
    if (k < kmin) return null;
    const align = renderAlignment(A.toUpperCase(), rc(B.toUpperCase()), result.offset);
    return {
      off: result.offset,
      side: result.touches3 ? 'A3' : 'B3',
      k: k,
      align: align
    };
  }
  // Use CORE.threePrimeDG to check for palindromic tail
  function selfTail6YES(p){
    if(p.length<6) return false;
    const tail = p.slice(-6).toUpperCase();
    const rcTail = rc(tail);
    return tail === rcTail;
  }
  // Use CORE.hairpinScan for hairpin detection
  function hairpinYES(p){
    const result = CORE.hairpinScan(p);
    if (!result) return false;
    const endWin = 5;
    const p3 = p.length - 1;
    const touches3 = (result.end >= p3 - endWin + 1 && result.end <= p3);
    return result.stem >= 5 && touches3;
  }
  function qcSummaryGibson(primers){
    let out=[];
    primers.forEach((p,i)=>{
      const sdF=bestPCRDimer(p.F,p.F,5); const sdR=bestPCRDimer(p.R,p.R,5); const xd=bestPCRDimer(p.F,p.R,5);
      if(sdF) out.push(`Insert #${i+1} Forward self-dimer (3�?matches=${sdF.k})`);
      if(sdR) out.push(`Insert #${i+1} Reverse self-dimer (3�?matches=${sdR.k})`);
      if(xd)  out.push(`Insert #${i+1} Cross-dimer F×R (3�?matches=${xd.k})`);
      if(selfTail6YES(p.F)) out.push(`Insert #${i+1} Forward has 6-bp palindromic tail`);
      if(selfTail6YES(p.R)) out.push(`Insert #${i+1} Reverse has 6-bp palindromic tail`);
      if(hairpinYES(p.F)) out.push(`Insert #${i+1} Forward hairpin risk`);
      if(hairpinYES(p.R)) out.push(`Insert #${i+1} Reverse hairpin risk`);
    });
    if(!out.length) return '<div class="aside">No red flags with k<sub>min</sub>=5. Core-region Tm shown.</div>';
    return '<ul><li>'+out.join('</li><li>')+'</li></ul>';
  }

  // Gel
  const SimGel_LADDER=[10000,8000,7000,6000,5000,4000,3500,3000,2500,2000,1500,1200,1000,900,800,700,600,500,400,300,200,100];
  function SimGel_apparentSC(bp){ return Math.max(100, Math.round(bp*0.7)); }
  function SimGel_yFrom(bp){ const top=22,bottom=392,minbp=80,maxbp=12000; const c=Math.max(minbp,Math.min(maxbp,bp)); return top+(Math.log10(maxbp)-Math.log10(c))/(Math.log10(maxbp)-Math.log10(minbp))*(bottom-top); }
  function SimGel_draw(svgId, lanes, scIdx=new Set()){
    const svg=container.querySelector('#'+svgId);
    const W=1000,H=400,L=30,R=20,T=10,B=10; const laneW=(W-L-R)/lanes.length;
    let g=`<rect x="0" y="0" width="${W}" height="${H}" fill="#0a0a0a"/>`;
    for(let i=0;i<lanes.length;i++){ const x=L+i*laneW; g+=`<line x1="${x}" y1="${T}" x2="${x}" y2="${H-B}" stroke="#1f2937" stroke-width="1"/>`; g+=`<text fill="#cbd5e1" x="${x+laneW*0.5}" y="${H-6}" text-anchor="middle">L${i+1}</text>`; }
    lanes.forEach((bands,i)=>{
      const x0=L+i*laneW; const sc=scIdx.has(i);
      bands.forEach(bp=>{ const eff=sc?SimGel_apparentSC(bp):bp; const y=SimGel_yFrom(eff); g+=`<rect x="${x0+laneW*0.2}" y="${y}" width="${laneW*0.6}" height="2" rx="1" ry="1" fill="rgba(173,216,230,.9)"/>`; });
    });
    svg.innerHTML=g;
  }

  // Type IIS enzyme helpers
  const TYPEIIS={BsaI:{site:'GGTCTC',rc:'GAGACC',cutF:1,cutR:5},Esp3I:{site:'CGTCTC',rc:'GAGACG',cutF:1,cutR:5}};
  function findSites(seq, site){ const res=[]; for(let i=0;i<=seq.length-site.length;i++) if(seq.slice(i,i+site.length)===site) res.push(i); return res; }
  function deriveVectorCut(seq, enzyme, userSite){
    if(!seq) return null;
    if(enzyme==='User' && userSite){ const s = userSite.toUpperCase().replace(/[^ACGT]/g,''); const pos = findSites(seq,s)[0]; if(pos!==undefined) return {site:s,pos:pos}; return null; }
    if(enzyme in TYPEIIS){
      const enz = TYPEIIS[enzyme]; const F = findSites(seq, enz.site); const R = findSites(seq, enz.rc);
      if(F.length && R.length){
        let best=null,bd=Infinity;
        for(const i of F) for(const j of R){
          let dist = (j>=i)?(j-i):(seq.length-i+j);
          if(dist>enz.site.length && dist<bd){ bd=dist; best={i,j}; }
        }
        if(best){ return {enz:enzyme, type:'typeiis', leftIndex:best.i, rightIndex:best.j, leftOH: seq.slice(best.i+enz.cutF, best.i+enz.cutR), rightOH: seq.slice(best.j-enz.cutR+(enz.cutR-enz.cutF), best.j)} }
      }
      return null;
    } else {
      const map = {EcoRI:'GAATTC', XhoI:'CTCGAG'};
      const site = map[enzyme] || null;
      if(site){ const pos = findSites(seq, site)[0]; if(pos!==undefined) return {enz:enzyme, site:site, pos:pos}; }
      return null;
    }
  }

  // Auto-height sync
  const fragListEl = container.querySelector('#frag-list');
  function syncVectorHeight(){
    try{
      const leftTA=container.querySelector('#vector');
      const rect = fragListEl.getBoundingClientRect();
      const target = Math.max(140, Math.min(1200, rect.height || fragListEl.scrollHeight || 140));
      leftTA.style.height = target + 'px';
    }catch(e){}
  }
  function scheduleSync(){ window.requestAnimationFrame(syncVectorHeight); }

  // Fragment UI
  const fragList = container.querySelector('#frag-list');
  function addFragment(seq=''){
    if(fragList.children.length>=6) return;
    const wrap=document.createElement('div'); wrap.className='frag-row'; wrap.style.marginBottom='8px';
    wrap.innerHTML = `
      <div class="frag-label">Insert #?</div>
      <div class="frag-body">
        <textarea class="frag-seq" placeholder=">insert
ATG...">${seq}</textarea>
        <div class="frag-tools">
          <input type="file" class="frag-file" accept=".fa,.fasta,.txt" style="display:none">
          <button class="btn demo btn-frag-demo" type="button">Demo</button>
          <button class="ghost btn btn-frag-upload" type="button">Upload</button>
          <button class="ghost btn btn-frag-flip" type="button" title="Reverse-complement this insert">Flip (rc)</button>
        </div>
      </div>
      <div></div>
      <div class="frag-actions">
        <button class="ghost btn sm up" type="button" title="Move up">�?/button>
        <button class="ghost btn sm down" type="button" title="Move down">�?/button>
        <button class="ghost btn sm del" type="button" title="Delete">�?/button>
      </div>`;
    fragList.appendChild(wrap); renumber(); scheduleSync(); bindFragEvents(wrap); scheduleSync();
  }
  function renumber(){ [...fragList.querySelectorAll('.frag-label')].forEach((el,i)=>el.textContent='Insert #'+(i+1)); }
  function bindFragEvents(wrap){
    wrap.querySelector('.up')?.addEventListener('click',()=>{ const p=wrap.previousElementSibling; if(p) fragList.insertBefore(wrap,p); renumber(); scheduleSync(); });
    wrap.querySelector('.down')?.addEventListener('click',()=>{ const n=wrap.nextElementSibling; if(n) fragList.insertBefore(n,wrap); renumber(); scheduleSync(); });
    wrap.querySelector('.del')?.addEventListener('click',()=>{ wrap.remove(); renumber(); scheduleSync(); });
    wrap.querySelector('.btn-frag-upload')?.addEventListener('click',()=>wrap.querySelector('.frag-file').click());
    wrap.querySelector('.btn-frag-flip')?.addEventListener('click',()=>{ 
      const ta=wrap.querySelector('.frag-seq');
      const raw = ta.value || '';
      const seq = clean(raw);
      if(!seq){ alert('Insert is empty.'); return; }
      // Preserve header if present
      const headerMatch = raw.match(/^(>[^\r\n]*)/m);
      const header = headerMatch ? headerMatch[1] + '\n' : '';
      ta.value = header + rc(seq);
    });
    wrap.querySelector('.frag-file')?.addEventListener('change',(e)=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>wrap.querySelector('.frag-seq').value=ev.target.result; r.readAsText(f); });
  }

  window.addEventListener('resize', scheduleSync);
  fragListEl.addEventListener('input', scheduleSync);
  try{ new MutationObserver(scheduleSync).observe(fragListEl,{childList:true,subtree:true}); }catch(e){}

  // controls
  container.querySelector('#add-insert').addEventListener('click', ()=>addFragment(''));
  container.querySelector('#flip-order').addEventListener('click', ()=>{ const rows=[...fragList.children]; rows.reverse().forEach(r=>fragList.appendChild(r)); renumber(); scheduleSync(); });

  // pcr linear checkbox toggle
  container.querySelector('#use-pcr-linear').addEventListener('change',(e)=>{
    container.querySelector('#pcr-linear-box').style.display = e.target.checked ? 'block' : 'none';
  });

  // load sample / reset / upload
  container.querySelector('#load-sample').addEventListener('click', ()=>{
    container.querySelector('#vector').value='>vec\n' + 'A'.repeat(1200) + 'GGTCTC' + 'C'.repeat(8) + 'GAGACC' + 'T'.repeat(1200);
    fragList.innerHTML=''; addFragment('ATG'+'A'.repeat(220)); addFragment('ATG'+'C'.repeat(150)); renumber(); scheduleSync(); scheduleSync();
  });
  container.querySelector('#reset').addEventListener('click', ()=>{ container.querySelector('#vector').value=''; fragList.innerHTML=''; container.querySelector('#results').style.display='none'; addFragment(); addFragment(); scheduleSync(); });
  container.querySelector('#upload-vector').addEventListener('click', ()=>container.querySelector('#file-vector').click());
  container.querySelector('#file-vector').addEventListener('change',(e)=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>container.querySelector('#vector').value=ev.target.result; r.readAsText(f); });

  // Demo button functionality
  let sampleSequences = null;
  async function loadSampleSequences() {
    if (sampleSequences) return sampleSequences;
    try {
      const response = await fetch('../sample/SampleSequence.txt');
      const text = await response.text();
      const sequences = [];
      const lines = text.split('\n');
      let currentHeader = '';
      let currentSeq = '';
      for (const line of lines) {
        if (line.startsWith('>')) {
          if (currentHeader) {
            sequences.push({ header: currentHeader, sequence: currentSeq });
          }
          currentHeader = line.substring(1).trim();
          currentSeq = '';
        } else {
          currentSeq += line.trim();
        }
      }
      if (currentHeader) {
        sequences.push({ header: currentHeader, sequence: currentSeq });
      }
      sampleSequences = sequences;
      return sampleSequences;
    } catch (error) {
      console.error('Failed to load sample sequences:', error);
      return [];
    }
  }

  // Vector demo button
  container.querySelector('#btn-vector-demo')?.addEventListener('click', async ()=>{
    const samples = await loadSampleSequences();
    const vectorSample = samples.find(s => s.header.includes('Vector') || s.header.includes('pSEV2'));
    if (vectorSample) {
      container.querySelector('#vector').value = `>${vectorSample.header}\n${vectorSample.sequence}`;
    }
  });

  // Insert demo buttons (event delegation)
  fragList.addEventListener('click', async (e)=>{
    if (e.target.classList.contains('btn-frag-demo')) {
      const fragRow = e.target.closest('.frag-row');
      const labelText = fragRow.querySelector('.frag-label').textContent;
      const insertNum = parseInt(labelText.match(/\d+/)?.[0]) || 1;
      
      const samples = await loadSampleSequences();
      const insertSamples = samples.filter(s => s.header.includes('Insert_'));
      const insertSample = insertSamples[insertNum - 1];
      
      if (insertSample) {
        const textarea = fragRow.querySelector('.frag-seq');
        textarea.value = `>${insertSample.header}\n${insertSample.sequence}`;
      }
    }
  });

  // collect fragments
  function collectFrags(){ return [...fragList.querySelectorAll('.frag-seq')].map(ta=>clean(ta.value)).filter(s=>s.length>0).slice(0,6); }

  // design function
  function design(){
    const frags = collectFrags(); if(frags.length===0){ alert('Please enter at least one insert'); return; }
    const vecRaw = clean(container.querySelector('#vector').value);
    const usePCR = container.querySelector('#use-pcr-linear').checked;
    const vecF = clean(container.querySelector('#vec-primer-fwd').value);
    const vecR = clean(container.querySelector('#vec-primer-rev').value);
    const enzyme1 = container.querySelector('#dig-enzyme-1').value;
    const enzyme2 = container.querySelector('#dig-enzyme-2').value;
    const userSite1 = container.querySelector('#user-site-1').value;
    const userSite2 = container.querySelector('#user-site-2').value;

    const minL = parseInt(container.querySelector('#gib-min').value||20,10);
    const maxL = parseInt(container.querySelector('#gib-max').value||25,10);
    const targetTm = parseFloat(container.querySelector('#gib-tm').value||55);
    const clamp = parseInt(container.querySelector('#gib-clamp').value||0,10);

    let vecLeft=null, vecRight=null, vecCutInfo={};
    if(usePCR && vecF && vecR){
      vecLeft = vecF.slice(0,maxL); vecRight = vecR.slice(-maxL);
      vecCutInfo = {method:'PCR', info:'user primers used'};
    } else {
      const cut1 = deriveVectorCut(vecRaw, enzyme1, userSite1);
      const cut2 = deriveVectorCut(vecRaw, enzyme2, userSite2);
      vecCutInfo = {method:'enzyme'};
      if(cut1 && cut2){
        vecCutInfo.info = `double digest: ${enzyme1} (left) / ${enzyme2} (right)`;
        if(cut1.type==='typeiis'){ vecLeft = vecRaw.slice(Math.max(0, cut1.leftIndex - maxL), cut1.leftIndex).slice(-maxL); }
        else if(cut1.pos!==undefined){ vecLeft = vecRaw.slice(Math.max(0, cut1.pos - maxL), cut1.pos).slice(-maxL); }
        else { vecLeft = vecRaw.slice(0,maxL); }
        if(cut2.type==='typeiis'){ const siteLen = TYPEIIS[enzyme2] ? TYPEIIS[enzyme2].site.length : 0; vecRight = vecRaw.slice(cut2.rightIndex + (siteLen), Math.min(vecRaw.length, cut2.rightIndex + (siteLen) + maxL)).slice(0,maxL); }
        else if(cut2.pos!==undefined){ vecRight = vecRaw.slice(cut2.pos + (cut2.site?cut2.site.length:0), Math.min(vecRaw.length, cut2.pos + (cut2.site?cut2.site.length:0) + maxL)).slice(0,maxL); }
        else { vecRight = vecRaw.slice(-maxL); }
      } else if(cut1){
        vecCutInfo.info = `single enzyme: ${enzyme1}`;
        if(cut1.type==='typeiis'){ vecLeft = vecRaw.slice(Math.max(0, cut1.leftIndex - maxL), cut1.leftIndex).slice(-maxL); vecRight = vecRaw.slice(cut1.rightIndex + TYPEIIS[enzyme1].site.length, Math.min(vecRaw.length, cut1.rightIndex + TYPEIIS[enzyme1].site.length + maxL)).slice(0,maxL); }
        else if(cut1.pos!==undefined){ vecLeft = vecRaw.slice(Math.max(0, cut1.pos - maxL), cut1.pos).slice(-maxL); vecRight = vecRaw.slice(cut1.pos + (cut1.site?cut1.site.length:0), Math.min(vecRaw.length, cut1.pos + (cut1.site?cut1.site.length:0) + maxL)).slice(0,maxL); }
        else { vecLeft = vecRaw.slice(0,maxL); vecRight = vecRaw.slice(-maxL); }
      } else if(cut2){
        vecCutInfo.info = `single enzyme: ${enzyme2}`;
        if(cut2.type==='typeiis'){ vecLeft = vecRaw.slice(Math.max(0, cut2.leftIndex - maxL), cut2.leftIndex).slice(-maxL); vecRight = vecRaw.slice(cut2.rightIndex + TYPEIIS[enzyme2].site.length, Math.min(vecRaw.length, cut2.rightIndex + TYPEIIS[enzyme2].site.length + maxL)).slice(0,maxL); }
        else if(cut2.pos!==undefined){ vecLeft = vecRaw.slice(Math.max(0, cut2.pos - maxL), cut2.pos).slice(-maxL); vecRight = vecRaw.slice(cut2.pos + (cut2.site?cut2.site.length:0), Math.min(vecRaw.length, cut2.pos + (cut2.site?cut2.site.length:0) + maxL)).slice(0,maxL); }
        else { vecLeft = vecRaw.slice(0,maxL); vecRight = vecRaw.slice(-maxL); }
      } else {
        vecCutInfo.info = 'no enzyme sites found �?fallback to vector ends';
        vecLeft = vecRaw.slice(0,maxL); vecRight = vecRaw.slice(-maxL);
      }
    }

    const k = frags.length; const overlaps = [];
    for(let i=0;i<k;i++){
      if(i===0){
        let chosen=null; for(let L=maxL; L>=minL; L--){ const cand = vecLeft.slice(-L); if(tmNN(cand)>=targetTm){ chosen=cand; break; } }
        if(!chosen) chosen = vecLeft.slice(-minL);
        overlaps.push({label:'Vector �?Insert #1', seq: chosen, ok: tmNN(chosen) >= targetTm});
      } else {
        const up = frags[i-1]; let chosen=null;
        for(let L=maxL; L>=minL; L--){ const cand = up.slice(-L); if(tmNN(cand)>=targetTm){ chosen=cand; break; } }
        if(!chosen) chosen = up.slice(-minL);
        overlaps.push({label:'Insert #'+i+' �?Insert #'+(i+1), seq: chosen, ok: tmNN(chosen) >= targetTm});
      }
    }
    let lastChosen=null; for(let L=maxL; L>=minL; L--){ const cand = vecRight.slice(0,L); if(tmNN(cand)>=targetTm){ lastChosen=cand; break; } }
    if(!lastChosen) lastChosen = vecRight.slice(0,minL);
    overlaps.push({label:'Insert #'+k+' �?Vector', seq: lastChosen, ok: tmNN(lastChosen) >= targetTm});

    const primers = [];
    for(let i=0;i<k;i++){
      const ins = frags[i];
      const coreF = ins.slice(0,20); const coreR = rc(ins.slice(-20));
      const overL = overlaps[i].seq || ''; const overR = overlaps[i+1] ? overlaps[i+1].seq : '';
      const F = overL + 'N'.repeat(clamp) + coreF; const R = overR + 'N'.repeat(clamp) + coreR;
      primers.push({name:'Insert #'+(i+1), len:ins.length, overL, overR, F, R, coreF, coreR, tmF:tmNN(coreF), tmR:tmNN(coreR), okL:overlaps[i].ok, okR: overlaps[i+1] ? overlaps[i+1].ok : true});
    }

    renderResults(primers, overlaps, vecCutInfo);
    const totalInsLen = frags.reduce((a,b)=>a+b.length,0);
    const assembled = vecRaw.length + totalInsLen;
    const pcrSizes = frags.map(s=>s.length);
    const lanes = [SimGel_LADDER.slice(), [vecRaw.length], pcrSizes, [assembled]];
    SimGel_draw('gib-gel-svg', lanes, new Set([1,3]));
    const leg = container.querySelector('#gib-gel-legend');
    leg.innerHTML = 'L1 Ladder · L2 Linearized vector (SC) · L3 PCR inserts · L4 Assembled plasmid (SC)';
  }

  function renderResults(primers, overlaps, vecCutInfo){
    container.querySelector('#results').style.display='grid';
    const pdiv = container.querySelector('#primer-output'); pdiv.innerHTML='';
    primers.forEach((p,i)=>{
      const box = document.createElement('div'); box.className='box'; box.style.marginBottom='8px';
      box.innerHTML = `<h4>Insert #${i+1} <small style="color:#64748b">len:${p.len} bp</small></h4>
        <table><thead><tr><th>Primer</th><th>Sequence (5'�?')</th><th>Tm (core)</th><th>Len (core)</th></tr></thead>
        <tbody>
          <tr><td>Forward</td><td class="seq mono">${p.F}</td><td>${isFinite(p.tmF)?p.tmF.toFixed(1):'�?}</td><td>${p.coreF.length}</td></tr>
          <tr><td>Reverse</td><td class="seq mono">${p.R}</td><td>${isFinite(p.tmR)?p.tmR.toFixed(1):'�?}</td><td>${p.coreR.length}</td></tr>
        </tbody></table>`;
      pdiv.appendChild(box);
    });

    const oh = container.querySelector('#oh-output'); oh.innerHTML='';
    if(overlaps && overlaps.length){
      let html = '<table><thead><tr><th>Junction</th><th>Overlap (5′→3�?</th><th>Tm (°C)</th><th>Status</th></tr></thead><tbody>';
      overlaps.forEach((o,i)=>{
        const ok = o.ok; const color = ok ? '' : ' class="highlight-bad"';
        const __tm = tmNN(o.seq) || 0; html += `<tr${color}><td class="mono">J${i+1}</td><td class="mono">${o.seq}</td><td>${__tm.toFixed(1)}</td><td>${ok?'<span style="color:#15803d">OK</span>':'<span style="color:#b91c1c">Low Tm</span>'}</td></tr>`;
      });
      html += '</tbody></table>'; oh.innerHTML = html;
    }

    container.querySelector('#qc-output').innerHTML = `<div class="aside">Vector linearization: <strong>${vecCutInfo.method}</strong> �?${vecCutInfo.info||''}. Core primer Tm shown. If overlap is <span style=\"color:#b91c1c\">Low Tm</span>, increase overlap length or adjust sequence.</div>` + qcSummaryGibson(primers);

    const asm = container.querySelector('#asm-diag'); asm.innerHTML='';
    const colors=['#60a5fa','#fda4af','#34d399','#fbbf24','#a78bfa','#f472b6'];
    const k = primers.length || 1;
    const w = 120; const gap=8;
    const svgNS='http://www.w3.org/2000/svg';
    const totalW = Math.max(500, k*(w+gap));
    const svg = document.createElementNS(svgNS,'svg'); svg.setAttribute('width','100%'); svg.setAttribute('height','120'); svg.setAttribute('viewBox','0 0 '+totalW+' 120');
    for(let i=0;i<k;i++){
      const rect = document.createElementNS(svgNS,'rect');
      rect.setAttribute('x', i*(w+gap)+20); rect.setAttribute('y',30); rect.setAttribute('width',w); rect.setAttribute('height',50);
      rect.setAttribute('fill', colors[i%colors.length]);
      svg.appendChild(rect);
      const t = document.createElementNS(svgNS,'text');
      t.setAttribute('x', i*(w+gap)+20 + w/2); t.setAttribute('y',60); t.setAttribute('fill','#0b1220');
      t.setAttribute('text-anchor','middle'); t.textContent = 'Insert '+(i+1); svg.appendChild(t);
    }
    const infoT = document.createElementNS(svgNS,'text');
    infoT.setAttribute('x',10); infoT.setAttribute('y',15); infoT.setAttribute('fill','#475569'); infoT.setAttribute('font-size','12');
    infoT.textContent = `Vector linearization: ${vecCutInfo.method} �?${vecCutInfo.info||''}`;
    svg.appendChild(infoT);
    asm.appendChild(svg);
  }

  container.querySelector('#design').addEventListener('click', design);
  container.querySelector('#clear').addEventListener('click', ()=>{ container.querySelector('#results').style.display='none'; });

  // init
  addFragment(); addFragment();
  */
}

// ===================================================================
//  LOGIC FOR: USER Cloning
// ===================================================================
function initOEPCR(container) {
  // Load OE-PCR module dynamically
  // The JS file uses ES6 imports, so we need to load it as a module
  // Import paths in oe_pcr_v1.0.1.js are relative to modules/scripts/, which is correct
  const script = document.createElement('script');
  script.type = 'module';
  script.src = './modules/scripts/oe_pcr_v1.0.1.js';
  
  // Initialize after script loads
  script.onload = () => {
    // Wait a bit for the module to initialize, then call init function if available
    setTimeout(() => {
      if (window.initOEPCRModule) {
        window.initOEPCRModule();
      }
    }, 100);
  };
  
  // Append to document head to ensure proper module resolution
  document.head.appendChild(script);
}

/*
function initUSER(container) {
  // Helpers (using global aliases)
  const comp = {A:'T',T:'A',G:'C',C:'G'}; // Used in hairpinYES and others locally
  function lastN(s,n){ return (s||'').slice(-n); }
  function firstN(s,n){ return (s||'').slice(0,n); }

  // Tm (using CORE.tmcalNN)
  function tmNN_core(seq, Na_mM=50, conc_nM=500){ return CORE.tmcalNN(seq, Na_mM, 0, conc_nM); }
  function tmNN_overlap(seq, Na_mM=50){ return CORE.tmcalNN(seq.replace(/U/g,'T'), Na_mM, 0, 1000); }

  // QC (using CORE functions)
  // Use CORE.dimerScan for dimer detection
  function bestPCRDimer(A, B, kmin=5){
    const result = CORE.dimerScan(A, B);
    if (!result || !result.overlap) return null;
    const k = result.overlap.length;
    if (k < kmin) return null;
    return {
      k: k,
      off: result.offset,
      side: result.touches3 ? 'A3' : 'B3'
    };
  }
  // Use CORE.hairpinScan for hairpin detection
  function hairpinYES(p){
    const result = CORE.hairpinScan(p);
    if (!result) return false;
    const endWin = 5;
    const p3 = p.length - 1;
    const touches3 = (result.end >= p3 - endWin + 1 && result.end <= p3);
    return result.stem >= 5 && touches3;
  }

  // Gel
  const LAD=[10000,8000,7000,6000,5000,4000,3500,3000,2500,2000,1500,1200,1000,900,800,700,600,500,400,300,200,100];
  function yFrom(bp){ const top=22,bottom=392,minbp=80,maxbp=12000; const c=Math.max(minbp,Math.min(maxbp,bp)); return top+(Math.log10(maxbp)-Math.log10(c))/(Math.log10(maxbp)-Math.log10(minbp))*(bottom-top); }
  function drawGel(svgId, lanes){
    const svg=container.querySelector('#'+svgId); const W=1000,H=400,L=30,R=20,T=10,B=10; const laneW=(W-L-R)/lanes.length;
    let g=`<rect x="0" y="0" width="${W}" height="${H}" fill="#0a0a0a"/>`;
    for(let i=0;i<lanes.length;i++){ const x=L+i*laneW; g+=`<line class="gel-sep-sg" x1="${x}" y1="${T}" x2="${x}" y2="${H-B}"/>`; g+=`<text class="gel-laneLabel-sg" x="${x+laneW*0.5}" y="${H-6}" text-anchor="middle">L${i+1}</text>`; }
    lanes.forEach((bands,i)=>{ const x0=L+i*laneW; bands.forEach(bp=>{ const y=yFrom(bp); g+=`<rect class="gel-band-sg" x="${x0+laneW*0.2}" y="${y}" width="${laneW*0.6}" height="2" rx="1" ry="1"/>`; }); });
    svg.innerHTML=g;
  }

  // Overhang generator
  function userOH_from(seq, len){
    const base=(seq||'').toUpperCase().replace(/[^ACGT]/g,'A').slice(0,len);
    if(!base.length) return '';
    return base.slice(0, Math.max(0, base.length-1)) + 'U';
  }

  // Find circular flanks by multi-hit pairing
  function allIdx(hay, needle){
    const out=[]; let pos=0;
    while(true){
      const i = hay.indexOf(needle, pos);
      if(i < 0) break;
      out.push(i); pos = i+1;
    }
    return out;
  }
  function findFlanksByPrimers(vecRaw, Fwd, Rev){
    const V = cleanFasta(vecRaw);
    const F = (Fwd||'').toUpperCase().replace(/[^ACGT]/g,'');
    const R = (Rev||'').toUpperCase().replace(/[^ACGT]/g,'');
    if(!F || !R) throw new Error('Please provide both vector PCR primers.');
    if(V.length === 0) throw new Error('Vector sequence is empty.');

    const RR = rc(R);
    const fHits = allIdx(V, F);
    const rHits = allIdx(V, RR);
    if(fHits.length===0 || rHits.length===0) throw new Error('Cannot locate one or both primers on the vector.');

    const N = V.length, Flen = F.length;
    let best = null;
    for(const fIdx of fHits){
      const fend = (fIdx + Flen) % N;
      for(const rIdx of rHits){
        const gap = (rIdx - fend + N) % N;
        if(best===null || gap < best.gap){
          best = {fIdx, rIdx, gap};
        }
      }
    }
    const fIdx = best.fIdx, rIdx = best.rIdx;
    if (fIdx <= rIdx){
      return { left: V.slice(0, fIdx + F.length), right: V.slice(rIdx) };
    } else {
      return { left: V.slice(rIdx), right: V.slice(0, fIdx + F.length) };
    }
  }

  // Primer core pickers
  function pickCoreForward(seq, tmTarget, Na, conc){
    const s=(seq||'').toUpperCase().replace(/[^ACGT]/g,'');
    const minL=18, maxL=28; let pick = s.slice(0,minL);
    for(let L=minL; L<=maxL; L++){
      const cand=s.slice(0,L); const Tm=tmNN_core(cand,Na,conc); const ok3=/[GC]$/.test(cand);
      if(ok3 && Tm>=tmTarget-0.5) return cand; pick=cand;
    }
    return pick;
  }
  function pickCoreReverse(seq, tmTarget, Na, conc){
    const s=(seq||'').toUpperCase().replace(/[^ACGT]/g,'');
    const minL=18, maxL=28; let pick = rc(s.slice(-minL));
    for(let L=minL; L<=maxL; L++){
      const core=s.slice(-L); const cand=rc(core); const Tm=tmNN_core(cand,Na,conc); const ok3=/[GC]$/.test(cand);
      if(ok3 && Tm>=tmTarget-0.5) return cand; pick=cand;
    }
    return pick;
  }

  // Design engine
  function designUSER(vecRaw, vecFwd, vecRev, inserts, ohLen, tmTarget, Na, conc){
    const fl = findFlanksByPrimers(vecRaw, vecFwd, vecRev);
    const leftFlank = fl.left, rightFlank = fl.right;
    const linVecLen = leftFlank.length + rightFlank.length;

    const OH_left = []; const OH_right = [];
    OH_left[0] = userOH_from(lastN(leftFlank, ohLen), ohLen);
    for (let i=1;i<inserts.length;i++) OH_left[i] = userOH_from(lastN(inserts[i-1], ohLen), ohLen);
    for (let i=0;i<inserts.length-1;i++) OH_right[i] = userOH_from(firstN(inserts[i+1], ohLen), ohLen);
    OH_right[inserts.length-1] = userOH_from(firstN(rightFlank, ohLen), ohLen);

    const vF_core = (vecFwd||'').toUpperCase().replace(/[^ACGT]/g,'');
    const vR_core = (vecRev||'').toUpperCase().replace(/[^ACGT]/g,'');

    const vRev_with_tail = (inserts.length>=1 ? OH_left[0] : '') + vR_core;
    const vFwd_with_tail = (inserts.length>=1 ? OH_right[inserts.length-1] : '') + vF_core;

    const primers = [{
      name:'Vector (PCR linearization)',
      F: vFwd_with_tail, R: vRev_with_tail, Fcore: vF_core, Rcore: vR_core,
      tmF: tmNN_core(vF_core, Na, conc), tmR: tmNN_core(vR_core, Na, conc)
    }];

    for (let i=0;i<inserts.length;i++){
      const seq = inserts[i];
      const Fcore = pickCoreForward(seq, tmTarget, Na, conc);
      const Rcore = pickCoreReverse(seq, tmTarget, Na, conc);
      const F = OH_left[i] + Fcore;
      const R = OH_right[i] + Rcore;
      primers.push({name:`Insert #${i+1}`, len:seq.length,
                    OH_L:OH_left[i], OH_R:OH_right[i],
                    F, R, Fcore, Rcore,
                    tmF: tmNN_core(Fcore, Na, conc),
                    tmR: tmNN_core(Rcore, Na, conc)});
    }

    const junctions = [OH_left[0], ...OH_right];
    return {primers, linVecLen, insLens: inserts.map(s=>s.length), junctions};
  }

  // Renderers
  function highlightU(seq){ return (seq||'').replace(/U/g,'<span class="u-base">U</span>'); }
  function renderPrimerTable(primers){
    function row(name, dir, seqCore, fullSeq){
      const na=parseFloat(container.querySelector('#na').value||'50');
      const conc=parseFloat(container.querySelector('#pconc').value||'500');
      const tm=isFinite(tmNN_core(seqCore,na,conc))? tmNN_core(seqCore,na,conc).toFixed(2):'NaN';
      const len=seqCore.length; const gc=gcPct(seqCore).toFixed(1)+'%';
      return `<tr><td>${name}</td><td>${dir}</td><td class="mono seqcell">${highlightU(fullSeq)}</td><td>${tm}</td><td>${len}</td><td>${gc}</td></tr>`;
    }
    let h = `<table><thead><tr><th>Target</th><th>Primer</th><th>Sequence (5′→3�?</th><th>Tm</th><th>Len</th><th>GC%</th></tr></thead><tbody>`;
    primers.forEach(p=>{
      if(p.name.startsWith('Vector')){
        h+=row('Vector','Forward', p.Fcore, p.F);
        h+=row('Vector','Reverse', p.Rcore, p.R);
      }else{
        h+=row(p.name,'Forward', p.Fcore, p.F);
        h+=row(p.name,'Reverse', p.Rcore, p.R);
      }
    });
    h+='</tbody></table>';
    return h;
  }
  function renderOHTable(junctions){
    const na=parseFloat(container.querySelector('#na').value||'50');
    let html = '<table><thead><tr><th>Junction</th><th>Overlap (5′→3�?</th><th>Tm (°C)</th><th>Status</th></tr></thead><tbody>';
    junctions.forEach((seq,i)=>{
      const tm=tmNN_overlap(seq,na);
      const ok = isFinite(tm) && tm>=20;
      const color = ok ? '' : ' style="background:#fff7ed"';
      html += `<tr${color}><td class="mono">J${i+1}</td><td class="mono">${highlightU(seq)}</td><td>${isFinite(tm)?tm.toFixed(1):'NaN'}</td><td>${ok?'<span style="color:#15803d">OK</span>':'<span style="color:#b91c1c">Low Tm</span>'}</td></tr>`;
    });
    html+='</tbody></table>'; return html;
  }
  function qcSummary(primers){
    let issues=[];
    primers.forEach((p)=>{
      if(!p.F || !p.R) return;
      const sdF=bestPCRDimer(p.F,p.F,5), sdR=bestPCRDimer(p.R,p.R,5), xd=bestPCRDimer(p.F,p.R,5);
      const label=p.name;
      if(sdF) issues.push(`${label} Forward self-dimer (3�?matches=${sdF.k})`);
      if(sdR) issues.push(`${label} Reverse self-dimer (3�?matches=${sdR.k})`);
      if(xd)  issues.push(`${label} Cross-dimer F×R (3�?matches=${xd.k})`);
      if(hairpinYES(p.F))   issues.push(`${label} Forward hairpin risk`);
      if(hairpinYES(p.R))   issues.push(`${label} Reverse hairpin risk`);
    });
    if(!issues.length) return '<div class="aside">No red flags with k<sub>min</sub>=5. Vector primers have USER tails; inserts carry USER tails; U is junction-adjacent.</div>';
    return '<ul><li>'+issues.join('</li><li>')+'</li></ul>';
  }

  // Diagram
  const PAL=['#60a5fa','#fda4af','#34d399','#fbbf24'];
  function drawAssembledFigure(k){
    const svg=container.querySelector('#asm-svg'); const W=1000,H=260,cx=W/2,cy=120,r=78,sw=24;
    function arc(a0,a1,color){ const pi=Math.PI; const rad=d=>d*pi/180; const x0=cx+r*Math.cos(rad(a0-90)), y0=cy+r*Math.sin(rad(a0-90));
      const x1=cx+r*Math.cos(rad(a1-90)), y1=cy+r*Math.sin(rad(a1-90)); const large=(a1-a0)>180?1:0;
      return `<path d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}" stroke="${color}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`; }
    let g=`<rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>`; const gap=4, avail=360-k*gap, span=avail/Math.max(1,k); let a=0; const legend=[];
    for(let i=0;i<Math.max(1,k);i++){ const c=PAL[i%PAL.length], s=a+gap/2, e=s+span; g+=arc(s,e,c); legend.push(`<span class="swatch" style="background:${c}"></span>Insert #${i+1}`); a+=span+gap; }
    g+=`<text x="${cx}" y="${H-24}" text-anchor="middle" font-weight="600" fill="#0b1220">Assembled with ${k} insert${k>1?'s':''}</text>`;
    svg.innerHTML=g; container.querySelector('#asm-legend').innerHTML = legend.join(' · ');
  }

  // Insert list utilities
  const fragList = container.querySelector('#frag-list');
  function enforceFragCap(){
    const btn=container.querySelector('#frag-add'); if(!btn) return;
    const n=fragList.querySelectorAll('.frag-row').length;
    btn.disabled = (n>=3);
    btn.textContent = (n>=3) ? 'Max 3 inserts' : '+ Add insert';
  }
  function renumberFrags(){
    Array.from(fragList.querySelectorAll('.frag-label')).forEach((el,i)=> el.textContent='Insert #'+(i+1));
    enforceFragCap();
  }
  function fragRow(seq=''){
    const wrap=document.createElement('div'); wrap.className='frag-row';
    wrap.innerHTML=`
      <div class="frag-label">Insert #?</div>
      <div class="frag-body">
        <textarea class="frag-seq" placeholder=">insert
ATG...">${seq}</textarea>
        <div class="frag-tools">
          <input type="file" class="file-frag" accept=".fa,.fasta,.fas,.txt" style="display:none">
          <button class="btn demo btn-frag-demo" type="button">Demo</button>
          <button class="ghost btn btn-frag-upload" type="button">Upload</button>
          <button class="ghost btn btn-frag-flip" type="button" title="Reverse-complement this insert">Flip (rc)</button>
        </div>
      </div>
      <div></div>
      <div class="frag-actions">
        <button class="ghost btn sm up" type="button" title="Move up">�?/button>
        <button class="ghost btn sm down" type="button" title="Move down">�?/button>
        <button class="ghost btn sm del" type="button" title="Delete">�?/button>
      </div>`;
    fragList.appendChild(wrap); renumberFrags();
  }
  function collectFragments(){
    return Array.from(container.querySelectorAll('.frag-row .frag-seq')).map(ta=>ta.value).filter(s=>s.trim().length>0).slice(0,3);
  }

  // Wire events
  container.querySelector('#frag-add').addEventListener('click', ()=>{ fragRow(); });
  container.querySelector('#flip-order').addEventListener('click', ()=>{
    const rows=[...fragList.children]; if(rows.length<2) return;
    rows.reverse().forEach(r=>fragList.appendChild(r)); renumberFrags();
  });
  fragList.addEventListener('click',(e)=>{
    const btn=e.target.closest('button'); if(!btn) return;
    const row=e.target.closest('.frag-row'); if(!row) return;
    if(btn.classList.contains('del')){ row.remove(); renumberFrags(); return; }
    if(btn.classList.contains('up')){ if(row.previousElementSibling) fragList.insertBefore(row,row.previousElementSibling); renumberFrags(); return; }
    if(btn.classList.contains('down')){ if(row.nextElementSibling) fragList.insertBefore(row.nextSibling,row); renumberFrags(); return; }
    if(btn.classList.contains('btn-frag-upload')){ row.querySelector('.file-frag').click(); return; }
    if(btn.classList.contains('btn-frag-flip')){
      const ta=row.querySelector('.frag-seq');
      const raw = ta.value || '';
      const cleaned=cleanFasta(raw);
      if(!cleaned){ alert('Insert is empty.'); return; }
      const comp = {A:'T',T:'A',G:'C',C:'G'}; const rcFn = s=>s.split('').reverse().map(b=>comp[b]||'N').join('');
      // Preserve header if present
      const headerMatch = raw.match(/^(>[^\r\n]*)/m);
      const header = headerMatch ? headerMatch[1] + '\n' : '';
      ta.value = header + rcFn(cleaned); return;
    }
  });
  fragList.addEventListener('change',(e)=>{
    const inp=e.target.closest('.file-frag'); if(!inp) return;
    const row=e.target.closest('.frag-row'); if(!row) return;
    const ta=row.querySelector('.frag-seq'); const f=inp.files && inp.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>{ ta.value=ev.target.result; }; r.readAsText(f);
  });

  container.querySelector('#btn-vector-upload').addEventListener('click', ()=> container.querySelector('#file-vector').click());
  container.querySelector('#file-vector').addEventListener('change', ()=>{
    const f=container.querySelector('#file-vector').files[0]; if(!f) return;
    const r=new FileReader(); r.onload=e=>{ container.querySelector('#vec').value=e.target.result; }; r.readAsText(f);
  });

  // Demo button functionality
  let sampleSequences = null;
  async function loadSampleSequences() {
    if (sampleSequences) return sampleSequences;
    try {
      const response = await fetch('../sample/SampleSequence.txt');
      const text = await response.text();
      const sequences = [];
      const lines = text.split('\n');
      let currentHeader = '';
      let currentSeq = '';
      for (const line of lines) {
        if (line.startsWith('>')) {
          if (currentHeader) {
            sequences.push({ header: currentHeader, sequence: currentSeq });
          }
          currentHeader = line.substring(1).trim();
          currentSeq = '';
        } else {
          currentSeq += line.trim();
        }
      }
      if (currentHeader) {
        sequences.push({ header: currentHeader, sequence: currentSeq });
      }
      sampleSequences = sequences;
      return sampleSequences;
    } catch (error) {
      console.error('Failed to load sample sequences:', error);
      return [];
    }
  }

  // Vector demo button
  container.querySelector('#btn-vector-demo')?.addEventListener('click', async ()=>{
    const samples = await loadSampleSequences();
    const vectorSample = samples.find(s => s.header.includes('Vector') || s.header.includes('pSEV2'));
    if (vectorSample) {
      container.querySelector('#vec').value = `>${vectorSample.header}\n${vectorSample.sequence}`;
    }
  });

  // Insert demo buttons (event delegation)
  fragList.addEventListener('click', async (e)=>{
    if (e.target.classList.contains('btn-frag-demo')) {
      const fragRow = e.target.closest('.frag-row');
      const labelText = fragRow.querySelector('.frag-label').textContent;
      const insertNum = parseInt(labelText.match(/\d+/)?.[0]) || 1;
      
      const samples = await loadSampleSequences();
      const insertSamples = samples.filter(s => s.header.includes('Insert_'));
      const insertSample = insertSamples[insertNum - 1];
      
      if (insertSample) {
        const textarea = fragRow.querySelector('.frag-seq');
        textarea.value = `>${insertSample.header}\n${insertSample.sequence}`;
      }
    }
  });

  container.querySelector('#global-demo').addEventListener('click', ()=>{
    container.querySelector('#vec').value='>pUSER_demo\n' + 'A'.repeat(800) + 'GGGGGGGGGGGGGGGGGGGG' + 'C'.repeat(600) + 'CCCCCCCCCCCCCCCCCCCC' + 'A'.repeat(400);
    container.querySelector('#vec-fwd').value='GGGGGGGGGGGGGGGGGGGG';
    container.querySelector('#vec-rev').value='CCCCCCCCCCCCCCCCCCCC';
    if(fragList.querySelectorAll('.frag-row').length===0) fragRow('ATG'+'C'.repeat(300)); else fragList.querySelector('.frag-seq').value='ATG'+'C'.repeat(300);
  });
  container.querySelector('#global-reset').addEventListener('click', ()=>{
    container.querySelector('#vec').value=''; container.querySelector('#vec-fwd').value=''; container.querySelector('#vec-rev').value='';
    container.querySelector('#results-wrap').style.display='none';
    container.querySelector('#primer-table').innerHTML='';
    container.querySelector('#qc-out').innerHTML='';
    container.querySelector('#oh-table').innerHTML='';
    container.querySelector('#gel-section').style.display='none';
    container.querySelector('#gel-svg').innerHTML='';
    container.querySelector('#gel-legend').innerHTML='';
    const first = fragList.querySelector('.frag-row .frag-seq'); if(first) first.value='';
    const rows=[...fragList.querySelectorAll('.frag-row')]; rows.slice(1).forEach(r=>r.remove()); renumberFrags();
  });

  container.querySelector('#run').addEventListener('click', ()=>{
    try{
      const vecRaw=container.querySelector('#vec').value;
      const vecF=container.querySelector('#vec-fwd').value;
      const vecR=container.querySelector('#vec-rev').value;
      const ohLen=parseInt(container.querySelector('#oh-len').value||'10',10);
      const tmTarget=parseFloat(container.querySelector('#tm-target').value||'60');
      const Na=parseFloat(container.querySelector('#na').value||'50');
      const conc=parseFloat(container.querySelector('#pconc').value||'500');
      const inserts = collectFragments().map(s=> cleanFasta(s));

      if(inserts.length<1) { alert('Please add at least one insert.'); return; }
      const {primers, linVecLen, insLens, junctions} = designUSER(vecRaw, vecF, vecR, inserts, ohLen, tmTarget, Na, conc);

      container.querySelector('#primer-table').innerHTML = renderPrimerTable(primers);
      container.querySelector('#qc-out').innerHTML = qcSummary(primers);
      container.querySelector('#oh-table').innerHTML = renderOHTable(junctions);
      drawAssembledFigure(inserts.length);

      const assembled = linVecLen + insLens.reduce((a,b)=>a+b,0);
      const lanes = [LAD.slice(), [linVecLen], insLens, [assembled]];
      drawGel('gel-svg', lanes);
      container.querySelector('#gel-section').style.display='';
      container.querySelector('#gel-legend').innerHTML='L1 Ladder · L2 Vector PCR · L3 Insert PCR(s) · L4 Assembled plasmid';

      container.querySelector('#results-wrap').style.display='grid';
    }catch(err){
      console.error(err); alert('Run error: '+err.message);
    }
  });

  container.querySelector('#clear').addEventListener('click', ()=>{
    container.querySelector('#results-wrap').style.display='none';
    container.querySelector('#primer-table').innerHTML='';
    container.querySelector('#qc-out').innerHTML='';
    container.querySelector('#oh-table').innerHTML='';
    container.querySelector('#gel-section').style.display='none';
    container.querySelector('#gel-svg').innerHTML='';
    container.querySelector('#gel-legend').innerHTML='';
  });

  // Auto-height sync for Vector textarea
  function syncVectorHeight(){
    try{
      const leftPanel = container.querySelector('#left-panel');
      const rightPanel = container.querySelector('#right-panel');
      const vec = container.querySelector('#vec');
      if(!leftPanel || !rightPanel || !vec) return;
      const oldH = vec.style.height;
      vec.style.height = '0px';
      const leftTotal = leftPanel.scrollHeight;
      const other = leftTotal - vec.clientHeight;
      const target = Math.max(140, rightPanel.scrollHeight - other - 6);
      vec.style.height = target + 'px';
    }catch(e){}
  }
  // Observe right panel/resizes/mutations
  (function(){
    const ro = new ResizeObserver(()=> requestAnimationFrame(syncVectorHeight));
    const rightPanel = container.querySelector('#right-panel');
    const fragList = container.querySelector('#frag-list');
    const results = container.querySelector('#results-wrap');
    if(rightPanel) ro.observe(rightPanel);
    if(fragList) ro.observe(fragList);
    if(results) ro.observe(results);
    window.addEventListener('resize', ()=> requestAnimationFrame(syncVectorHeight));
    container.addEventListener('input', (e)=>{
      if(e.target && (e.target.id==='vec' || e.target.classList?.contains('frag-seq'))) {
        requestAnimationFrame(syncVectorHeight);
      }
    });
    ['frag-add','flip-order','global-reset','global-demo','run','clear'].forEach(id=>{
      const el = container.querySelector('#'+id);
      if(el) el.addEventListener('click', ()=> requestAnimationFrame(syncVectorHeight));
    });
  })();

  // Initial renumber and sync
  renumberFrags();
  syncVectorHeight();
}

// ===================================================================
//  LOGIC FOR: Overlap PCR
// ===================================================================
function initOverlapPCR(container) {
  function clean(raw){ return (raw||'').toUpperCase().replace(/^>.*$/gm,'').replace(/[^ACGT]/g,''); }
  const comp={A:'T',T:'A',G:'C',C:'G'};
  const rc=s=>s.split('').reverse().map(b=>comp[b]||'N').join('');

  // Codon tables
  const CODONS={
    ecoli:{A:['GCT','GCC','GCA','GCG'],C:['TGT','TGC'],D:['GAT','GAC'],E:['GAA','GAG'],F:['TTT','TTC'],G:['GGT','GGC','GGA','GGG'],H:['CAT','CAC'],I:['ATT','ATC','ATA'],K:['AAA','AAG'],L:['CTG','TTG','CTT','CTA','CTC','TTA'],M:['ATG'],N:['AAT','AAC'],P:['CCT','CCC','CCA','CCG'],Q:['CAA','CAG'],R:['CGT','CGC','CGA','AGA','AGG','CGG'],S:['TCT','TCC','TCA','TCG','AGC','AGT'],T:['ACT','ACC','ACA','ACG'],V:['GTT','GTC','GTA','GTG'],W:['TGG'],Y:['TAT','TAC'],'*':['TAA','TGA','TAG']},
    yeast:{A:['GCT','GCC','GCA','GCG'],C:['TGT','TGC'],D:['GAT','GAC'],E:['GAA','GAG'],F:['TTT','TTC'],G:['GGT','GGA','GGC','GGG'],H:['CAT','CAC'],I:['ATT','ATC','ATA'],K:['AAA','AAG'],L:['TTG','TTA','CTT','CTA','CTG','CTC'],M:['ATG'],N:['AAT','AAC'],P:['CCT','CCA','CCC','CCG'],Q:['CAA','CAG'],R:['AGA','AGG','CGA','CGT','CGC','CGG'],S:['TCT','TCC','TCA','TCG','AGC','AGT'],T:['ACT','ACA','ACC','ACG'],V:['GTT','GTA','GTC','GTG'],W:['TGG'],Y:['TAT','TAC'],'*':['TAA','TGA','TAG']},
    human:{A:['GCC','GCT','GCA','GCG'],C:['TGC','TGT'],D:['GAT','GAC'],E:['GAG','GAA'],F:['TTC','TTT'],G:['GGC','GGT','GGA','GGG'],H:['CAC','CAT'],I:['ATC','ATT','ATA'],K:['AAG','AAA'],L:['CTG','CTC','CTA','CTT','TTG','TTA'],M:['ATG'],N:['AAC','AAT'],P:['CCC','CCT','CCA','CCG'],Q:['CAG','CAA'],R:['CGC','CGG','AGA','AGG','CGA','CGT'],S:['AGC','TCC','TCT','TCA','TCG','AGT'],T:['ACC','ACT','ACA','ACG'],V:['GTG','GTC','GTA','GTT'],W:['TGG'],Y:['TAC','TAT'],'*':['TAA','TGA','TAG']}
  };
  function aaFromOption(opt, customAA){
    if(opt==='GGGGS') return 'GGGGS';
    if(opt==='GGGGSx2') return 'GGGGSGGGGS';
    if(opt==='GGGGSx3') return 'GGGGSGGGGSGGGGS';
    if(opt==='GSG') return 'GSG';
    if(opt==='GSx3') return 'GSGSGS';
    if(opt==='custom') return (customAA||'').toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g,'');
    return '';
  }
  function optimizeCodons(aaSeq, orgKey){
    const table = CODONS[orgKey] || CODONS['yeast']; let dna='';
    for(let i=0;i<aaSeq.length;i++){
      const aa=aaSeq[i].toUpperCase(); const list=table[aa]; if(!list) continue;
      let chosen=list[0];
      for(let k=0;k<list.length;k++){
        const cand=list[k]; const prev=dna.slice(-6); const join=prev+cand;
        const homopoly=/(A{5,}|T{5,}|G{5,}|C{5,})/.test(join);
        const last3=join.slice(-6,-3), now3=join.slice(-3);
        const triple3=(last3 && now3 && last3===now3);
        if(!homopoly && !triple3){ chosen=cand; break; }
      }
      dna+=chosen;
    }
    return dna;
  }

  // Tm helpers
  const NN={'AA':{dH:-7.9,dS:-22.2},'TT':{dH:-7.9,dS:-22.2},'AT':{dH:-7.2,dS:-20.4},'TA':{dH:-7.2,dS:-21.3},
            'CA':{dH:-8.5,dS:-22.7},'TG':{dH:-8.5,dS:-22.7},'GT':{dH:-8.4,dS:-22.4},'AC':{dH:-8.4,dS:-22.4},
            'CT':{dH:-7.8,dS:-21.0},'AG':{dH:-7.8,dS:-21.0},'GA':{dH:-8.2,dS:-22.2},'TC':{dH:-8.2,dS:-22.2},
            'CG':{dH:-10.6,dS:-27.2},'GC':{dH:-9.8,dS:-24.4},'GG':{dH:-8.0,dS:-19.9},'CC':{dH:-8.0,dS:-19.9}};
  const R=1.987;
  function tmCore(seq,Na=50,conc=500){
    const s=(seq||'').toUpperCase(); if(s.length<2) return NaN;
    let dH=0,dS=0; for(let i=0;i<s.length-1;i++){ const p=NN[s.slice(i,i+2)]; if(!p) return NaN; dH+=p.dH; dS+=p.dS; }
    dH+=0.2; dS+=-5.7; const Cp=conc*1e-9; const Tm1M_K=(1000*dH)/(dS+R*Math.log(Cp));
    const m=Na/1000; const fgc=((s.match(/[GC]/g)||[]).length)/s.length;
    const term=((4.29*fgc-3.95)*Math.log(m)+0.94*Math.log(m)**2)*1e-5;
    return (1/(1/Tm1M_K + term))-273.15;
  }
  function tmOverlap(seq,Na=50){
    const s=(seq||'').toUpperCase(); if(s.length<2) return NaN;
    let dH=0,dS=0; for(let i=0;i<s.length-1;i++){ const p=NN[s.slice(i,i+2)]; if(!p) return NaN; dH+=p.dH; dS+=p.dS; }
    dH+=0.2; dS+=-5.7; const m=Na/1000; const fgc=((s.match(/[GC]/g)||[]).length)/s.length;
    const Tm1M_K=(1000*dH)/(dS + R*Math.log(1e-6));
    const term=((4.29*fgc-3.95)*Math.log(m)+0.94*Math.log(m)**2)*1e-5;
    return (1/(1/Tm1M_K + term))-273.15;
  }
  function gcPct(s){ return s? (100*((s.match(/[GC]/g)||[]).length)/s.length):0; }

  function pickF(seq, tmT, Na, conc){
    const s=clean(seq); const minL=18, maxL=28; let pick=s.slice(0,minL);
    for(let L=minL;L<=maxL;L++){ const cand=s.slice(0,L); const Tm=tmCore(cand,Na,conc); const ok3=/[GC]$/.test(cand);
      if(ok3 && Tm>=tmT-0.5) return cand; pick=cand; }
    return pick;
  }
  function pickR(seq, tmT, Na, conc){
    const s=clean(seq); const minL=18, maxL=28; let pick=rc(s.slice(-minL));
    for(let L=minL;L<=maxL;L++){ const core=s.slice(-L); const cand=rc(core); const Tm=tmCore(cand,Na,conc); const ok3=/[GC]$/.test(cand);
      if(ok3 && Tm>=tmT-0.5) return cand; pick=cand; }
    return pick;
  }

  const stack = container.querySelector('#pair-stack');
  const addPairBtn = container.querySelector('#add-pair');

  function rows(){ return [...stack.querySelectorAll('.pair-row')]; }
  function updateRowsChip(){ container.querySelector('#rows-chip').textContent = `Rows ${rows().length} / 3`; }
  function updateFilledChip(){
    const count = [...container.querySelectorAll('.frag')].map(t=>clean(t.value)).filter(s=>s.length>0).length;
    container.querySelector('#filled-chip').textContent = `Filled ${count} / 6`;
  }

  function linkerOptionsHtml(jLabel,leftIndex){
    return `<div class="between" data-between="${leftIndex}">
      <span class="tag">${jLabel} Linker</span>
      <select class="linker" data-j="${leftIndex}">
        <option value="">None</option>
        <option value="GGGGS">G4S (GGGGS)</option>
        <option value="GGGGSx2">(GGGGS)×2</option>
        <option value="GGGGSx3">(GGGGS)×3</option>
        <option value="GSG">GSG</option>
        <option value="GSx3">GS×3</option>
        <option value="custom">Custom (AA field)</option>
      </select>
    </div>`;
  }

  function addPair(){
    const n = rows().length;
    if(n>=3){ addPairBtn.disabled=true; addPairBtn.textContent='Max 3 rows / 6 fragments'; return; }
    const base = n*2+1;
    if(n>=1){
      const leftIndex = base-1;
      const between = document.createElement('div');
      between.innerHTML = linkerOptionsHtml(`${leftIndex}�?{base}`, leftIndex);
      stack.appendChild(between.firstElementChild);
    }
    const wrap = document.createElement('div');
    wrap.className = 'pair-row';
    wrap.dataset.row = String(n+1);
    wrap.innerHTML = `
      <div class="box">
        <div class="label"><span>Frag #${base}</span><div class="toolbar">
          <input type="file" class="file frag${base}" accept=".fa,.fasta,.fas,.txt" style="display:none">
          <button class="ghost btn sm up" data-idx="${base}" type="button">Flip (rc)</button>
          <button class="ghost btn sm ul" data-idx="${base}" type="button">Upload</button>
          <button class="ghost btn sm cl" data-idx="${base}" type="button">Clear</button>
        </div></div>
        <textarea class="frag" data-idx="${base}" placeholder=">fragment ${base}&#10;ATG..."></textarea>
      </div>
      ${linkerOptionsHtml(`${base}�?{base+1}`, base)}
      <div class="box">
        <div class="label"><span>Frag #${base+1}</span><div class="toolbar">
          <input type="file" class="file frag${base+1}" accept=".fa,.fasta,.fas,.txt" style="display:none">
          <button class="ghost btn sm up" data-idx="${base+1}" type="button">Flip (rc)</button>
          <button class="ghost btn sm ul" data-idx="${base+1}" type="button">Upload</button>
          <button class="ghost btn sm cl" data-idx="${base+1}" type="button">Clear</button>
        </div></div>
        <textarea class="frag" data-idx="${base+1}" placeholder=">fragment ${base+1}&#10;ATG..."></textarea>
      </div>`;
    stack.appendChild(wrap);
    if(n+1>=3){ addPairBtn.disabled=true; addPairBtn.textContent='Max 3 rows / 6 fragments'; }
    updateRowsChip();
  }
  addPairBtn.addEventListener('click', addPair);

  // toolbar & buttons
  container.addEventListener('click',(e)=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.classList.contains('up')){ const idx=b.dataset.idx; const ta=container.querySelector('.frag[data-idx="'+idx+'"]'); const seq=clean(ta.value); if(!seq){alert('Empty fragment');return;} ta.value=rc(seq); updateFilledChip(); }
    if(b.classList.contains('ul')){ const idx=b.dataset.idx; const f=container.querySelector('.file.frag'+idx); if(f) f.click(); }
    if(b.classList.contains('cl')){ const idx=b.dataset.idx; const ta=container.querySelector('.frag[data-idx="'+idx+'"]'); ta.value=''; updateFilledChip(); }
    if(b.id==='flip'){
      const tas=[...container.querySelectorAll('.pair-row')].flatMap(row=>[...row.querySelectorAll('.frag')]);
      const vals=tas.map(t=>t.value).reverse();
      tas.forEach((t,i)=> t.value=vals[i]);
      updateFilledChip();
    }
    if(b.id==='reset'){
      // Clear all fragments
      [...container.querySelectorAll('.frag')].forEach(t=>t.value='');
      container.querySelectorAll('select.linker').forEach(s=>s.value='');
      // Reset all parameters to defaults
      container.querySelector('#organism').value='yeast';
      container.querySelector('#oh').value='25';
      container.querySelector('#tm').value='60';
      container.querySelector('#pconc').value='500';
      container.querySelector('#na').value='50';
      container.querySelector('#customAA').value='';
      // Clear results
      updateFilledChip();
      container.querySelector('#results').style.display='none';
      container.querySelector('#primer-table').innerHTML='';
      container.querySelector('#overlap-table').innerHTML='';
      // Remove extra rows, keep only first pair
      const allRows = [...container.querySelectorAll('.pair-row')];
      allRows.slice(1).forEach(r=>r.remove());
      updateRowsChip();
    }
    if(b.id==='demo'){
      while(rows().length<3) addPair();
      const val=['ATG'+'A'.repeat(200),'C'.repeat(210),'G'.repeat(190),'T'.repeat(180),'A'.repeat(170),'C'.repeat(160)];
      container.querySelectorAll('.frag').forEach((t,i)=> t.value=val[i]||'');
      const links=[['1','GGGGS'],['2',''],['3','GSx3'],['4',''],['5','custom']];
      container.querySelectorAll('select.linker').forEach(s=>{
        const hit=links.find(x=>x[0]===s.dataset.j); if(hit) s.value=hit[1];
      });
      container.querySelector('#customAA').value='GPGSG';
      updateFilledChip();
    }
  });
  container.addEventListener('change',(e)=>{
    const f=e.target.closest('input[type=file].file'); if(!f) return;
    const cls=[...f.classList].find(s=>/^frag\d+$/.test(s)); const idx=cls?cls.replace('frag',''):null;
    if(!idx) return;
    const ta=container.querySelector('.frag[data-idx="'+idx+'"]'); const file=f.files&&f.files[0]; if(!file) return;
    const r=new FileReader(); r.onload=(ev)=>{ ta.value=ev.target.result; updateFilledChip(); }; r.readAsText(file);
  });
  container.addEventListener('input',(e)=>{ if(e.target.classList?.contains('frag')) updateFilledChip(); });

  function collectFrags(){
    return [...container.querySelectorAll('.pair-row')].flatMap(row=>[...row.querySelectorAll('.frag')]).map(t=>clean(t.value));
  }
  function collectLinkers(){
    const map={}; container.querySelectorAll('select.linker').forEach(s=>{ const j=parseInt(s.dataset.j,10); map[j]=s.value||''; }); return map;
  }

  function designWithLinker(frags, linkerMap, L, tmT, Na, conc, org, customAA){
    const seqs=frags.filter(s=>s.length>0);
    const n=seqs.length;
    if(n<2) throw new Error('Please provide at least 2 fragments.');

    const prevTail = Array(n).fill('');
    const nextTail = Array(n).fill('');

    for(let i=0;i<n;i++){
      if(i>0) prevTail[i] = seqs[i-1].slice(-L);
      if(i<n-1) nextTail[i] = seqs[i+1].slice(0,L);
    }

    for(let i=1;i<=n-1;i++){
      const opt = linkerMap[i];
      if(!opt) continue;
      const aa = aaFromOption(opt, customAA); if(!aa) continue;
      const dna = optimizeCodons(aa, org);
      nextTail[i-1] = dna;
      prevTail[i] = rc(dna);
    }

    const primers=[];
    for(let i=0;i<n;i++){
      const Fcore=pickF(seqs[i], tmT, Na, conc);
      const Rcore=pickR(seqs[i], tmT, Na, conc);
      const F = (i>0? prevTail[i] : '') + Fcore;
      const R = (i<n-1? nextTail[i] : '') + Rcore;
      primers.push({name:`Frag #${i+1}`, F,R, Fcore,Rcore,
                    tmF:tmCore(Fcore,Na,conc), tmR:tmCore(Rcore,Na,conc),
                    gcF:gcPct(Fcore), gcR:gcPct(Rcore)});
    }

    const overRows=[];
    for(let i=0;i<n-1;i++){
      const opt = linkerMap[i+1];
      let seq, label;
      if(opt){
        label='Linker';
        seq = optimizeCodons(aaFromOption(opt, customAA), org);
      }else{
        label='Overlap';
        seq = seqs[i+1].slice(0,L);
      }
      const tm = tmOverlap(seq, Na);
      overRows.push({j:i+1, label, seq, tm, status:(isFinite(tm)&&tm>=40)?'OK':'Low Tm'});
    }
    return {primers, overRows};
  }

  function renderPrimers(rows){
    let h='<table><thead><tr><th>Target</th><th>Direction</th><th>Sequence (5′→3�?</th><th>Tm</th><th>Len</th><th>GC%</th></tr></thead><tbody>';
    rows.forEach(p=>{
      h+=`<tr><td>${p.name}</td><td>F</td><td class="seq">${p.F}</td><td>${p.tmF.toFixed(2)}</td><td>${p.Fcore.length}</td><td>${p.gcF.toFixed(1)}%</td></tr>`;
      h+=`<tr><td>${p.name}</td><td>R</td><td class="seq">${p.R}</td><td>${p.tmR.toFixed(2)}</td><td>${p.Rcore.length}</td><td>${p.gcR.toFixed(1)}%</td></tr>`;
    });
    h+='</tbody></table>'; return h;
  }
  function renderOverlaps(rows){
    let h='<table><thead><tr><th>Junction</th><th>Type</th><th>DNA</th><th>Tm (°C)</th><th>Status</th></tr></thead><tbody>';
    rows.forEach(r=>{
      h+=`<tr><td>J${r.j}</td><td>${r.label}</td><td class="seq">${r.seq}</td><td>${isFinite(r.tm)?r.tm.toFixed(1):'NaN'}</td><td>${r.status}</td></tr>`;
    });
    h+='</tbody></table>'; return h;
  }

  container.querySelector('#run').addEventListener('click', ()=>{
    try{
      const L=parseInt(container.querySelector('#oh').value||'25',10);
      const tmT=parseFloat(container.querySelector('#tm').value||'60');
      const Na=parseFloat(container.querySelector('#na').value||'50');
      const conc=parseFloat(container.querySelector('#pconc').value||'500');
      const org=container.querySelector('#organism').value;
      const customAA=(container.querySelector('#customAA').value||'').trim();
      const frags=collectFrags();
      const linkerMap=collectLinkers();
      const {primers, overRows} = designWithLinker(frags, linkerMap, L, tmT, Na, conc, org, customAA);
      container.querySelector('#primer-table').innerHTML = renderPrimers(primers);
      container.querySelector('#overlap-table').innerHTML = renderOverlaps(overRows);
      container.querySelector('#results').style.display='grid';
    }catch(e){ alert(e.message); }
  });

  container.querySelector('#clear').addEventListener('click', ()=>{
    container.querySelector('#results').style.display='none';
    container.querySelector('#primer-table').innerHTML='';
    container.querySelector('#overlap-table').innerHTML='';
  });

  // init chips
  updateRowsChip();
  updateFilledChip();
}
*/

// ===================================================================
//  LOGIC FOR: Multiplex PCR
// ===================================================================
function initMultiplexPCR(container) {
  // Check if script is already loaded
  if (window.initMultiplexPCRModule) {
    // Script already loaded, call init directly
    window.initMultiplexPCRModule(container);
    return;
  }
  
  // Check if script tag already exists
  const existingScript = document.querySelector('script[src="./modules/scripts/multiplex_pcr_v1.0.1.js"]');
  if (existingScript) {
    // Script is loading, wait for it
    existingScript.addEventListener('load', () => {
      setTimeout(() => {
        if (window.initMultiplexPCRModule) {
          window.initMultiplexPCRModule(container);
        }
      }, 100);
    });
    return;
  }
  
  // Load Multiplex PCR module dynamically
  const script = document.createElement('script');
  script.type = 'module';
  script.src = './modules/scripts/multiplex_pcr_v1.0.1.js';
  
  // Initialize after script loads
  script.onload = () => {
    // Wait a bit for the module to initialize, then call init function if available
    setTimeout(() => {
      if (window.initMultiplexPCRModule) {
        window.initMultiplexPCRModule(container);
      } else {
        console.error('initMultiplexPCRModule not found after script load');
      }
    }, 100);
  };
  
  script.onerror = () => {
    console.error('Failed to load multiplex_pcr_v1.0.1.js');
  };
  
  // Append to document head to ensure proper module resolution
  document.head.appendChild(script);
}

// ===================================================================
//  LOGIC FOR: Mutagenesis
// ===================================================================
function initMutagenesis(container) {
  // Module is self-contained with its own script
  console.log('Mutagenesis module loaded');
}
