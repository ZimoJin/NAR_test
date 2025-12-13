/**
 * Gibson Assembly MW Warning Integration Example
 * 
 * This file demonstrates how to integrate the MW warning system into Gibson Assembly module.
 * Add these functions to gibson_v1.0.1.js
 */

import { showMWWarnings, validateSequenceInput, validateParameterRange, validatePerformance, validateFragmentCount, validateOverlapLength } from './bio_visuals_v1.0.1.js';

/**
 * Build Gibson-specific preflight warnings
 * Call this before running the Gibson assembly design
 */
function buildGibsonPreflightWarnings(vectorSeq, insertSeqs, params) {
    const warnings = [];

    // Validate vector sequence
    if (vectorSeq) {
        const vectorWarnings = validateSequenceInput([{ label: 'Vector', seq: vectorSeq }], 'Vector');
        warnings.push(...vectorWarnings);
    } else {
        warnings.push({
            id: 'Gibson-MW-00',
            message:
                "Warning: No vector sequence provided.\n" +
                "Please provide a backbone/vector sequence.\n\n" +
                "Click Cancel to add vector or OK to proceed."
        });
    }

    // Validate insert sequences
    const validInserts = insertSeqs.filter(ins => ins.seq && ins.seq.trim());
    if (validInserts.length > 0) {
        const insertWarnings = validateSequenceInput(
            validInserts.map((ins, i) => ({ label: `Insert #${i + 1}`, seq: ins.seq })),
            'Insert'
        );
        warnings.push(...insertWarnings);
    }

    // Gibson-MW-01: Fragment count validation
    if (validInserts.length < 1) {
        warnings.push({
            id: 'Gibson-MW-01',
            message:
                "Warning: Insufficient fragments for Gibson Assembly.\n" +
                `Provided: ${validInserts.length} insert(s)\n` +
                "Gibson Assembly requires at least 1 insert fragment.\n\n" +
                "Click Cancel to add more inserts or OK to proceed."
        });
    }

    // Gibson-MW-02: Overlap length validation
    const overlapLen = params.overlapLen || 25;
    const overlapWarnings = validateOverlapLength(overlapLen, 15, 40);
    warnings.push(...overlapWarnings);

    // Gibson-MW-03: Total sequence size (performance)
    const totalBp = (vectorSeq?.length || 0) + validInserts.reduce((sum, ins) => sum + (ins.seq?.length || 0), 0);
    const perfWarnings = validatePerformance(validInserts.length + 1, totalBp);
    warnings.push(...perfWarnings);

    // Gibson-MW-04: Overlap sequence repetitiveness
    // (This would require more complex analysis - placeholder for now)

    // Validate thermodynamic parameters
    const paramWarnings = validateParameterRange({
        Na: params.naConc,
        Mg: params.mgConc,
        conc: params.primerConc,
        targetTm: params.targetTm
    });
    warnings.push(...paramWarnings);

    // Gibson-MW-05: Very large vector (>15kb)
    if (vectorSeq && vectorSeq.length > 15000) {
        warnings.push({
            id: 'Gibson-MW-05',
            message:
                `Warning: Large vector sequence detected (${vectorSeq.length} bp > 15 kb).\n` +
                "Gibson Assembly efficiency may decrease with very large vectors.\n" +
                "Consider using smaller fragments or alternative assembly methods.\n\n" +
                "Click Cancel to review or OK to proceed."
        });
    }

    // Gibson-MW-06: Too many inserts (>6)
    if (validInserts.length > 6) {
        warnings.push({
            id: 'Gibson-MW-06',
            message:
                `Warning: Large number of fragments (${validInserts.length} inserts).\n` +
                "Gibson Assembly efficiency decreases with >4-5 fragments.\n" +
                "Consider reducing the number of fragments or using alternative methods.\n\n" +
                "Click Cancel to adjust or OK to proceed."
        });
    }

    return warnings;
}

/**
 * Example integration into the Design button click handler
 * 
 * Replace the existing design button handler with this:
 */
function setupDesignButtonWithWarnings() {
    const designBtn = document.getElementById('design-btn');
    if (!designBtn) return;

    designBtn.addEventListener('click', () => {
        // Gather inputs
        const vectorText = document.getElementById('vector-seq')?.value || '';
        const vectorSeq = cleanSeq(vectorText);

        const insertRows = document.querySelectorAll('.insert-row');
        const insertSeqs = Array.from(insertRows).map(row => {
            const textarea = row.querySelector('.insert-seq');
            return {
                seq: cleanSeq(textarea?.value || '')
            };
        });

        const params = {
            targetTm: parseFloat(document.getElementById('target-tm')?.value || '55'),
            overlapLen: parseInt(document.getElementById('overlap-len')?.value || '25'),
            primerConc: parseFloat(document.getElementById('primer-conc')?.value || '500'),
            naConc: parseFloat(document.getElementById('na-conc')?.value || '50'),
            mgConc: parseFloat(document.getElementById('mg-conc')?.value || '0')
        };

        // Build warnings
        const warnings = buildGibsonPreflightWarnings(vectorSeq, insertSeqs, params);

        // Get container (module-content or body)
        const container = document.getElementById('module-content') || document.body;

        // Show warnings if any, then proceed
        if (warnings.length > 0) {
            showMWWarnings(
                container,
                warnings,
                () => {
                    // User confirmed - proceed with Gibson design
                    proceedWithGibsonDesign(vectorSeq, insertSeqs, params);
                },
                () => {
                    // User cancelled - do nothing
                    console.log('Gibson design cancelled by user');
                }
            );
        } else {
            // No warnings - proceed directly
            proceedWithGibsonDesign(vectorSeq, insertSeqs, params);
        }
    });
}

/**
 * The actual Gibson design logic (existing code)
 * Extract your existing design logic into this function
 */
function proceedWithGibsonDesign(vectorSeq, insertSeqs, params) {
    // ... existing Gibson Assembly design code ...
    console.log('Running Gibson Assembly design...');
    // Your existing code here
}

// Export for use in gibson_v1.0.1.js
export {
    buildGibsonPreflightWarnings,
    setupDesignButtonWithWarnings,
    proceedWithGibsonDesign
};
