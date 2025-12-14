/**
 * MW (Message Warning) System - Shared Modal Component Library
 * 
 * Provides a unified warning/error modal system for all PrimerWeaver modules.
 * Extracted from QC module and generalized for reuse.
 * 
 * @version 1.0.0
 */

// ============================================================================
// CORE MODAL COMPONENT
// ============================================================================

/**
 * Show a single MW warning modal
 * @param {HTMLElement} container - Container element (or document.body)
 * @param {string} message - Warning message to display
 * @param {Function} onConfirm - Callback when user clicks OK
 * @param {Function} onCancel - Callback when user clicks Cancel
 */
export function showMWModal(container, message, onConfirm, onCancel) {
  // Create modal if it doesn't exist
  let modal = container.querySelector('#mw-modal');
  if (!modal) {
    // Create styles
    const style = document.createElement('style');
    style.textContent = `
      #mw-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .mw-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }
      .mw-modal-content {
        position: relative;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: mwModalSlideIn 0.3s ease-out;
      }
      @keyframes mwModalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      .mw-modal-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 20px 24px;
        background: #fff7ed;
        border-bottom: 1px solid #fde68a;
      }
      .mw-warning-icon {
        font-size: 1.5rem;
        line-height: 1;
      }
      .mw-modal-header h3 {
        margin: 0;
        font-size: 1.2rem;
        color: #92400e;
        font-weight: 600;
      }
      .mw-modal-body {
        padding: 24px;
        flex: 1;
        overflow-y: auto;
      }
      .mw-modal-body p {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.6;
        color: #374151;
        white-space: pre-line;
      }
      .mw-modal-footer {
        padding: 16px 24px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        background: #f9fafb;
      }
      .mw-modal-footer .btn {
        min-width: 80px;
      }
    `;
    document.head.appendChild(style);
    
    modal = document.createElement('div');
    modal.id = 'mw-modal';
    modal.style.display = 'none';
    
    const overlay = document.createElement('div');
    overlay.className = 'mw-modal-overlay';
    
    const content = document.createElement('div');
    content.className = 'mw-modal-content';
    
    const header = document.createElement('div');
    header.className = 'mw-modal-header';
    const icon = document.createElement('span');
    icon.className = 'mw-warning-icon';
    icon.textContent = '⚠️';
    const title = document.createElement('h3');
    title.textContent = 'Warning';
    header.appendChild(icon);
    header.appendChild(title);
    
    const body = document.createElement('div');
    body.className = 'mw-modal-body';
    const messageP = document.createElement('p');
    messageP.id = 'mw-message';
    body.appendChild(messageP);
    
    const footer = document.createElement('div');
    footer.className = 'mw-modal-footer';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'mw-cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn ghost';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.id = 'mw-confirm-btn';
    confirmBtn.textContent = 'OK';
    confirmBtn.className = 'btn';
    
    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);
    
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    
    modal.appendChild(overlay);
    modal.appendChild(content);
    
    // Append to container or body
    const parent = container || document.body;
    parent.appendChild(modal);
  }
  
  // Update message
  const messageEl = modal.querySelector('#mw-message');
  if (messageEl) {
    messageEl.textContent = message;
  }
  
  // Show modal
  modal.style.display = 'flex';
  
  // Remove existing listeners and add new ones
  const confirmBtn = modal.querySelector('#mw-confirm-btn');
  const cancelBtn = modal.querySelector('#mw-cancel-btn');
  const overlay = modal.querySelector('.mw-modal-overlay');
  
  const closeModal = () => {
    modal.style.display = 'none';
  };
  
  // Clone buttons to remove old listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  
  newConfirmBtn.onclick = () => {
    closeModal();
    if (onConfirm) onConfirm();
  };
  
  newCancelBtn.onclick = () => {
    closeModal();
    if (onCancel) onCancel();
  };
  
  if (overlay) {
    overlay.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };
  }
  
  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape' && modal.style.display !== 'none') {
      closeModal();
      if (onCancel) onCancel();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

/**
 * Show multiple warnings in sequence
 * @param {HTMLElement} container - Container element
 * @param {Array<{id: string, message: string}>} warnings - Array of warning objects
 * @param {Function} onComplete - Callback when all warnings are confirmed
 * @param {Function} onCancel - Callback when user cancels
 */
export function showMWWarnings(container, warnings, onComplete, onCancel) {
  if (!warnings || warnings.length === 0) {
    if (onComplete) onComplete();
    return;
  }
  
  let idx = 0;
  const showNext = () => {
    idx += 1;
    if (idx >= warnings.length) {
      if (onComplete) onComplete();
      return;
    }
    showMWModal(container, warnings[idx].message, showNext, onCancel || (() => {}));
  };
  
  showMWModal(container, warnings[0].message, showNext, onCancel || (() => {}));
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Normalize sequence (keep only IUPAC DNA codes)
 */
export function normalizeSeq(raw) {
  return (raw || "").toUpperCase().replace(/[^ACGTRYSWKMBDHVN]/g, "");
}

/**
 * Analyze primer sequence for invalid/degenerate characters
 */
export function analyzePrimerSequence(rawSeq) {
  const cleaned = String(rawSeq || '').replace(/\s+/g, '').toUpperCase();
  const normalized = normalizeSeq(rawSeq);
  const invalidMatches = cleaned.match(/[^ACGTRYSWKMBDHVN]/g) || [];
  const invalidCount = invalidMatches.length;
  const invalidAt3 = cleaned.length ? /[^ACGTRYSWKMBDHVN]/.test(cleaned.slice(-5)) : false;

  const degenerateMatches = normalized.match(/[RYSWKMBDHVN]/g) || [];
  const degenerateCount = degenerateMatches.length;
  const degenerateFrac = normalized.length ? (degenerateCount / normalized.length) : 0;

  return {
    cleaned,
    normalized,
    invalidCount,
    invalidAt3,
    degenerateCount,
    degenerateFrac,
    isValid: normalized.length > 0
  };
}

/**
 * Validate sequence input and generate warnings
 * @param {Array} sequences - Array of {label, seq} objects
 * @param {string} inputType - Type of input (e.g., "Forward", "Reverse", "Fragment")
 * @returns {Array} Array of warning objects
 */
export function validateSequenceInput(sequences, inputType = "Sequence") {
  const warnings = [];
  
  if (!sequences || sequences.length === 0) {
    return warnings;
  }
  
  const analyses = sequences.map(s => ({ label: s.label, ...analyzePrimerSequence(s.seq) }));
  const validCount = analyses.filter(a => a.isValid).length;
  
  // MW-04: No valid sequences after normalization
  if (validCount === 0) {
    warnings.push({
      id: 'MW-04',
      message:
        `Warning: No valid ${inputType} sequences detected.\n` +
        "All provided sequences become empty after normalization (only IUPAC DNA codes are kept: A/C/G/T/R/Y/S/W/K/M/B/D/H/V/N).\n\n" +
        "Click Cancel to check your input or OK to proceed (results will be empty)."
    });
    return warnings;
  }
  
  // MW-05: Non-IUPAC characters removed
  const invalidSeqs = analyses.filter(a => a.invalidCount > 0);
  const invalidAt3 = invalidSeqs.filter(a => a.invalidAt3);
  if (invalidSeqs.length > 0) {
    const examples = invalidSeqs.slice(0, 4).map(a => a.label);
    warnings.push({
      id: 'MW-05',
      message:
        `Warning: Non-IUPAC characters were removed from ${inputType} sequences.\n` +
        `Affected sequences: ${invalidSeqs.length}\n` +
        (examples.length ? `Examples: ${examples.join(', ')}\n` : "") +
        (invalidAt3.length
          ? "At least one sequence contains invalid characters near the 3' end, which is especially risky.\n"
          : "") +
        "Processing will proceed using the normalized sequences only.\n\n" +
        "Click Cancel to review/correct your input or OK to proceed."
    });
  }
  
  // MW-06: Degenerate bases detected
  const degenerateThresholdCount = 1;
  const degenerateThresholdFrac = 0.10;
  const degenerateSeqs = analyses.filter(a =>
    a.degenerateCount >= degenerateThresholdCount || a.degenerateFrac > degenerateThresholdFrac
  );
  if (degenerateSeqs.length > 0) {
    const examples = degenerateSeqs.slice(0, 4).map(a => a.label);
    warnings.push({
      id: 'MW-06',
      message:
        `Warning: Degenerate (IUPAC) bases detected in ${inputType} sequences.\n` +
        `Affected sequences: ${degenerateSeqs.length}\n` +
        (examples.length ? `Examples: ${examples.join(', ')}\n` : "") +
        "Thermodynamic values (Tm and ΔG) are estimated for the most stable variant (worst-case), which may be conservative.\n\n" +
        "Click Cancel to confirm/replace degenerate bases or OK to proceed."
    });
  }
  
  return warnings;
}

/**
 * Validate parameter ranges (Na+, Mg2+, primer concentration, Tm)
 * @param {Object} params - {Na, Mg, conc, targetTm}
 * @returns {Array} Array of warning objects
 */
export function validateParameterRange(params) {
  const warnings = [];
  const { Na, Mg, conc, targetTm } = params;
  
  const naMin = 10, naMax = 200;
  const mgMin = 0.5, mgMax = 5;
  const concMin = 25, concMax = 1000;
  const tmMin = 45, tmMax = 75;
  
  if (Na !== undefined && (!isFinite(Na) || Na < naMin || Na > naMax)) {
    warnings.push({
      id: 'MW-10',
      message:
        `Na+ out of range: current ${isFinite(Na) ? Na : 'unset'} mM (recommended ${naMin}–${naMax} mM).\n\n` +
        "Click Cancel to adjust or OK to proceed (results may be unreliable)."
    });
  }
  
  if (Mg !== undefined && (!isFinite(Mg) || Mg < mgMin || Mg > mgMax)) {
    warnings.push({
      id: 'MW-11',
      message:
        `Mg2+ out of range: current ${isFinite(Mg) ? Mg : 'unset'} mM (recommended ${mgMin}–${mgMax} mM).\n` +
        "Mg2+ strongly affects Tm and structures; keep it within the recommended range.\n\n" +
        "Click Cancel to adjust or OK to proceed."
    });
  }
  
  if (conc !== undefined && (!isFinite(conc) || conc < concMin || conc > concMax)) {
    warnings.push({
      id: 'MW-12',
      message:
        `Primer concentration out of range: current ${isFinite(conc) ? conc : 'unset'} nM (recommended ${concMin}–${concMax} nM).\n\n` +
        "Click Cancel to adjust or OK to proceed."
    });
  }
  
  if (targetTm !== undefined && (!isFinite(targetTm) || targetTm < tmMin || targetTm > tmMax)) {
    warnings.push({
      id: 'MW-13',
      message:
        `Target Tm out of range: current ${isFinite(targetTm) ? targetTm : 'unset'} °C (recommended ${tmMin}–${tmMax} °C).\n\n` +
        "Click Cancel to adjust or OK to proceed."
    });
  }
  
  // MW-14: High Mg2+ and Na+ simultaneously
  if (isFinite(Mg) && isFinite(Na) && Mg >= 4 && Na >= 150) {
    warnings.push({
      id: 'MW-14',
      message:
        "High Mg2+ and Na+ concentrations provided simultaneously.\n" +
        "Duplex stability may be substantially overestimated by the model.\n\n" +
        "Click Cancel to adjust or OK to proceed."
    });
  }
  
  // MW-15: Parameters outside validated range
  if ((isFinite(Na) && Na < 5) || (isFinite(Mg) && Mg > 10) || (isFinite(conc) && conc > 5000)) {
    warnings.push({
      id: 'MW-15',
      message:
        "Selected parameters fall outside the validated range of the thermodynamic model.\n" +
        "Results may not be physically meaningful.\n\n" +
        "Click Cancel to adjust or OK to proceed."
    });
  }
  
  return warnings;
}

/**
 * Validate performance (large datasets)
 * @param {number} totalItems - Total number of items to process
 * @param {number} totalBp - Total base pairs
 * @returns {Array} Array of warning objects
 */
export function validatePerformance(totalItems, totalBp) {
  const warnings = [];
  
  // MW-09: Too many items
  if (totalItems > 500) {
    warnings.push({
      id: 'MW-09',
      message:
        "Warning: Large dataset detected.\n" +
        `Total items: ${totalItems}\n` +
        "Processing may run slowly and could cause the browser tab to become unresponsive.\n\n" +
        "Click Cancel to reduce your input (e.g., run in batches) or OK to proceed."
    });
  }
  
  // MW-19: Large total sequence size
  if (totalBp > 20000) {
    warnings.push({
      id: 'MW-19',
      message:
        "Large total sequence size detected (>20,000 bp).\n" +
        "Computation may be slow in browser environments.\n\n" +
        "Click Cancel to adjust or OK to proceed."
    });
  }
  
  return warnings;
}

/**
 * Validate fragment count for assembly methods
 * @param {number} fragmentCount - Number of fragments
 * @param {number} minFragments - Minimum required fragments
 * @param {string} methodName - Name of assembly method
 * @returns {Array} Array of warning objects
 */
export function validateFragmentCount(fragmentCount, minFragments, methodName = "Assembly") {
  const warnings = [];
  
  if (fragmentCount < minFragments) {
    warnings.push({
      id: 'MW-FRAG-01',
      message:
        `Warning: Insufficient fragments for ${methodName}.\n` +
        `Provided: ${fragmentCount}, Required: at least ${minFragments}\n\n` +
        "Click Cancel to add more fragments or OK to proceed."
    });
  }
  
  return warnings;
}

/**
 * Validate overlap length for assembly methods
 * @param {number} overlapLength - Overlap length in bp
 * @param {number} minOverlap - Minimum recommended overlap
 * @param {number} maxOverlap - Maximum recommended overlap
 * @returns {Array} Array of warning objects
 */
export function validateOverlapLength(overlapLength, minOverlap = 15, maxOverlap = 40) {
  const warnings = [];
  
  if (overlapLength < minOverlap || overlapLength > maxOverlap) {
    warnings.push({
      id: 'MW-OVERLAP-01',
      message:
        `Warning: Overlap length outside recommended range.\n` +
        `Current: ${overlapLength} bp, Recommended: ${minOverlap}–${maxOverlap} bp\n` +
        (overlapLength < minOverlap 
          ? "Short overlaps may reduce assembly efficiency.\n"
          : "Long overlaps may increase off-target assembly.\n") +
        "\nClick Cancel to adjust or OK to proceed."
    });
  }
  
  return warnings;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  showMWModal,
  showMWWarnings,
  normalizeSeq,
  analyzePrimerSequence,
  validateSequenceInput,
  validateParameterRange,
  validatePerformance,
  validateFragmentCount,
  validateOverlapLength
};
