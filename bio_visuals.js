/**
 * bio_visuals.js
 * Pure rendering logic. 
 * Refactored to match V3.3 visuals exactly.
 * * V4.32 Update:
 * - Fixed ReferenceError for legend generation.
 * - Legend now correctly pulls lane data from GGX_STATE.
 */

// --- 1. Vector Map Renderer (Kept same) ---
export function drawVectorMap(canvasId, seqLen, name, annotations = [], rotationDeg = 0) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2;
  const cy = H / 2;
  const R_plasmid = Math.min(W, H) / 2 - 55;
  const rotRad = (rotationDeg * Math.PI) / 180;
  ctx.beginPath();
  ctx.arc(cx, cy, R_plasmid, 0, 2 * Math.PI);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();
  const regions = annotations.filter(a => a.start !== undefined);
  regions.forEach(f => {
    const startAng = (f.start / seqLen) * 2 * Math.PI - Math.PI / 2 + rotRad;
    const endAng = (f.end / seqLen) * 2 * Math.PI - Math.PI / 2 + rotRad;
    ctx.beginPath();
    ctx.arc(cx, cy, R_plasmid, startAng, endAng);
    ctx.lineWidth = 8;
    ctx.strokeStyle = f.color || '#3b82f6';
    ctx.stroke();
  });
  const cuts = annotations.filter(a => a.start === undefined);
  const items = cuts.map(a => {
    const angle = (a.pos / seqLen) * 2 * Math.PI - Math.PI / 2 + rotRad;
    return { ...a, angle, cutX: cx + Math.cos(angle) * (R_plasmid + 6), cutY: cy + Math.sin(angle) * (R_plasmid + 6), sortY: cy + Math.sin(angle) * R_plasmid };
  });
  const rightSide = items.filter(i => Math.cos(i.angle) >= 0).sort((a, b) => a.sortY - b.sortY);
  const leftSide = items.filter(i => Math.cos(i.angle) < 0).sort((a, b) => a.sortY - b.sortY);
  const layoutSide = (list, isRight) => {
    if (!list.length) return;
    const xDir = isRight ? 1 : -1;
    const totalH = H * 0.8;
    const startY = (H - totalH) / 2;
    list.forEach((item, i) => {
      const t = list.length > 1 ? i / (list.length - 1) : 0.5;
      item.labelY = startY + t * totalH;
      item.labelY = item.labelY * 0.6 + item.cutY * 0.4; 
    });
    for (let k = 0; k < 8; k++) {
      for (let i = 1; i < list.length; i++) {
        if (list[i].labelY < list[i - 1].labelY + 16) { list[i].labelY = list[i - 1].labelY + 16; }
      }
    }
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    list.forEach(s => {
      const dy = s.labelY - cy;
      const ratio = Math.max(-1, Math.min(1, dy / (H/2 * 0.8)));
      const xOffset = 70 + 20 * Math.pow(Math.cos(ratio * Math.PI / 2), 0.6);
      s.labelX = cx + xOffset * xDir;
      ctx.beginPath();
      ctx.moveTo(s.cutX, s.cutY);
      const midX = s.cutX + (s.labelX - s.cutX) * 0.25;
      ctx.lineTo(midX, s.labelY);
      ctx.lineTo(s.labelX, s.labelY);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#334155';
      ctx.textAlign = isRight ? 'left' : 'right';
      const txtX = s.labelX + (isRight ? 5 : -5);
      ctx.fillText(`${s.name} (${s.pos})`, txtX, s.labelY);
    });
  };
  layoutSide(rightSide, true);
  layoutSide(leftSide, false);
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px system-ui';
  ctx.fillText(name || 'Vector', cx, cy - 10);
  ctx.fillStyle = '#64748b';
  ctx.font = '14px system-ui';
  ctx.fillText(`${seqLen} bp`, cx, cy + 12);
}

// --- 2. Gel Renderer ---
const GG_A = 940.5477731863177;
const GG_B = -180.54925772877257;

function ggxYFromBp(bp) {
  return GG_A + GG_B * Math.log10(Math.max(1, bp));
}

function ggxScEffective(bp) {
  return Math.max(100, bp * 0.7);
}

// Shared state for gel data
const GGX_STATE = {
  lanes: [],
  scIdx: new Set(),
  profile: 'neb1kbplus',
  assembledLaneIndex: null,
  insertCount: 0,
  insertNames: [],
  vectorName: null,
  enzymeName: null,
  assembledName: null
};

const LADDER_PROFILES = {
    neb1kbplus: { name: 'NEB 1kb Plus DNA Ladder (default)', sizesKb: [10.0, 8.0, 6.0, 5.0, 4.0, 3.0, 2.0, 1.5, 1.2, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1], boldKb: [3.0, 1.0, 0.5] },
    neb1kb: { name: 'NEB 1kb DNA Ladder', sizesKb: [10.0, 8.0, 6.0, 5.0, 4.0, 3.0, 2.0, 1.5, 1.0, 0.5], boldKb: [3.0] },
    thermo1kbruler: { name: 'GeneRuler 1kb DNA Ladder', sizesKb: [10.0, 8.0, 6.0, 5.0, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.75, 0.5, 0.25], boldKb: [6.0, 3.0, 1.0] },
    thermo1kbplus: { name: 'GeneRuler 1kb Plus DNA Ladder', sizesKb: [20.0, 10.0, 7.0, 5.0, 4.0, 3.0, 2.0, 1.5, 1.0, 0.7, 0.5, 0.4, 0.3, 0.2, 0.075], boldKb: [5.0, 1.5, 0.5] }
};

function ggxFormatBands(arr){
    if(!arr || !arr.length) return '—';
    const sorted = arr.slice().sort((a,b)=>b-a);
    return sorted.map(x => x + ' bp').join(', ');
}

function ggxUpdateLegend(){
    // Access lanes from global state
    const lanes = GGX_STATE.lanes || [];
    if(!lanes.length) return;
    
    const legend = [];
    const prof = LADDER_PROFILES[GGX_STATE.profile] || LADDER_PROFILES.neb1kbplus;
    
    // L1: Ladder
    legend.push('L1 ' + prof.name);

    // L2: Uncut Vector (lane index 1)
    const lane2 = lanes[1] || [];
    const vName = GGX_STATE.vectorName || 'Vector';
    legend.push('L2 Uncut vector (' + vName + '): ' + ggxFormatBands(lane2));

    // L3: Digest (lane index 2)
    const lane3 = lanes[2] || [];
    const enzName = GGX_STATE.enzymeName || 'Type IIS';
    legend.push('L3 ' + enzName + ' digest of vector (' + vName + '): ' + ggxFormatBands(lane3));

    // L4+: Inserts
    const insertCount = GGX_STATE.insertCount || 0;
    for(let i=0; i<insertCount; i++){
      const laneIdx = 3 + i; // visual lane L4 starts at index 3
      const sz = lanes[laneIdx] || [];
      const insName = (GGX_STATE.insertNames && GGX_STATE.insertNames[i]) ? ' (' + GGX_STATE.insertNames[i] + ')' : '';
      legend.push('L' + (laneIdx+1) + ' PCR of insert #' + (i+1) + insName + ': ' + ggxFormatBands(sz));
    }

    // Last: Assembled
    const assembledLaneIndex = GGX_STATE.assembledLaneIndex;
    if(typeof assembledLaneIndex === 'number' && assembledLaneIndex >= 0){
      const last = lanes[assembledLaneIndex] || [];
      const asmName = GGX_STATE.assembledName || 'GoldenGate_assembled';
      legend.push('L' + (assembledLaneIndex+1) + ' Assembled plasmid (' + asmName + '): ' + ggxFormatBands(last));
    }

    // Write to DOM
    const legendEl = document.getElementById('ggx-legend');
    if(legendEl) {
        legendEl.innerHTML = legend.map(s => '<div>' + s + '</div>').join('');
    }
}

function ggxDrawGel(){
    const canvas = document.getElementById('gg-gel-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (canvas.height !== 640) canvas.height = 640; 
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const bandTop = 90;
    const gelTop = bandTop - 32;
    const gelLeft = 180; 
    const gelWidth = 560; 
    const gelHeight = 552; 

    // Background
    const grd = ctx.createLinearGradient(0, gelTop, 0, gelTop + gelHeight);
    grd.addColorStop(0, '#3a3a3a');
    grd.addColorStop(0.5, '#333333');
    grd.addColorStop(1, '#2f2f2f');
    ctx.fillStyle = grd;
    ctx.fillRect(gelLeft, gelTop, gelWidth, gelHeight);

    // Wells
    const laneCount = 10;
    const wellWidth = 42;
    const wellHeight = 12;
    const spacing = (gelWidth - laneCount * wellWidth) / 11;
    let x = gelLeft + spacing;
    const wellY = gelTop + 8;

    ctx.fillStyle = '#050505';
    ctx.font = "18px 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';

    for (let i = 0; i < laneCount; i++) {
        ctx.fillRect(x, wellY, wellWidth, wellHeight);
        const lx = gelLeft + spacing * (i + 1) + wellWidth * (i + 0.5);
        ctx.fillText('L' + (i + 1), lx, gelTop - 10);
        x += wellWidth + spacing;
    }

    const bandWidth = 34;
    const bandHeight = 5;

    const paintBand = (cx, bp, isBright, isSC) => {
        const effBp = isSC ? ggxScEffective(bp) : bp;
        const y = ggxYFromBp(effBp);
        if (y < gelTop || y > gelTop + gelHeight - 2) return;

        let alpha = isBright ? 0.96 : 0.78;
        if (!isBright && !isSC) alpha = 0.58;

        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        const x0 = cx - bandWidth / 2;
        const y0 = y - 2.5; 
        ctx.beginPath();
        ctx.roundRect(x0, y0, bandWidth, bandHeight, 2);
        ctx.fill();
    };

    // Ladder Data
    const prof = LADDER_PROFILES[GGX_STATE.profile] || LADDER_PROFILES.neb1kbplus;
    const ladderBands = prof.sizesKb.map(k => k * 1000);
    const ladderBold = prof.boldKb.map(k => k * 1000);
    const boldSet = new Set(ladderBold);

    // Draw Ladder (L1)
    const markerX = gelLeft + spacing + wellWidth * 0.5;
    ladderBands.forEach(bp => {
        paintBand(markerX, bp, boldSet.has(bp), false);
    });

    // Draw Samples
    const lanes = GGX_STATE.lanes;
    for (let i = 1; i < Math.min(lanes.length, 10); i++) {
        const laneIdx = i; 
        const cx = gelLeft + spacing * (laneIdx + 1) + wellWidth * (laneIdx + 0.5);
        const bands = lanes[i];
        const isSC = GGX_STATE.scIdx.has(i); 
        if (Array.isArray(bands)) {
            bands.forEach(bp => paintBand(cx, bp, false, isSC));
        }
    }

    // Left Labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    const labelX = gelLeft - 72; 
    const connectorStart = gelLeft - 64;
    const connectorMid = gelLeft - 30;
    const connectorEnd = gelLeft - 6;
    
    const sortedLadder = [...ladderBands].sort((a,b)=>b-a);
    const labels = [];

    sortedLadder.forEach((bp) => {
        const bandY = ggxYFromBp(bp);
        const kb = bp / 1000;
        const labelTxt = kb.toFixed(1); 
        const isBold = boldSet.has(bp);
        labels.push({ bp, y: bandY, text: labelTxt, isBold, labelY: bandY });
    });

    const minSpacing = 20; 
    for (let i = 1; i < labels.length; i++) {
        const prev = labels[i-1];
        const curr = labels[i];
        if (curr.labelY < prev.labelY + minSpacing) {
            curr.labelY = prev.labelY + minSpacing;
        }
    }

    labels.forEach(l => {
        if(l.labelY > H - 10) return;
        ctx.font = l.isBold ? "bold 18px 'Segoe UI', sans-serif" : "18px 'Segoe UI', sans-serif";
        ctx.fillStyle = '#000000';
        ctx.fillText(l.text, labelX, l.labelY);

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(connectorStart, l.labelY); 
        ctx.lineTo(connectorMid, l.labelY);   
        ctx.lineTo(connectorEnd, l.y);        
        ctx.stroke();
    });

    ctx.font = "bold 24px 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText('kb', gelLeft - 50, gelTop - 10);
}

// Public API called by main script
export function drawGel(canvasId, lanes, ladderBands, ladderBold, ladderName, options = {}) {
    // This function signature is kept for compatibility but we rely on GGX_STATE internally for full legend data
    // The main script sets GGX_STATE properties directly before calling this if needed,
    // OR we can update GGX_STATE here from arguments.
    // For V4.32, we assume the main script populates GGX_STATE fully (including vector names etc)
    // and then calls this function. But since 'lanes' are passed here, let's update state.
    
    if(lanes) GGX_STATE.lanes = lanes;
    if(options.highlightIndices) GGX_STATE.scIdx = options.highlightIndices;
    
    // Trigger internal draw and update
    ggxDrawGel();
    ggxUpdateLegend();
}

// Helper for main script to update state directly
export function updateGelState(newState) {
    Object.assign(GGX_STATE, newState);
}