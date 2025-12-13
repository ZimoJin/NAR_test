/**
 * Multiplex PCR MW Warning Integration Example
 * 
 * This file demonstrates how to integrate the MW warning system into Multiplex PCR module.
 */

import { showMWWarnings, validateSequenceInput, validateParameterRange, validatePerformance } from './bio_visuals_v1.0.1.js';

/**
 * Build Multiplex PCR-specific preflight warnings
 */
function buildMultiplexPCRPreflightWarnings(templateSeq, primerPairs, params) {
    const warnings = [];

    // Validate template sequence
    if (templateSeq) {
        const templateWarnings = validateSequenceInput([{ label: 'Template', seq: templateSeq }], 'Template');
        warnings.push(...templateWarnings);
    } else {
        warnings.push({
            id: 'MPX-MW-00',
            message:
                "Warning: No template sequence provided.\n" +
                "Please provide a template sequence for multiplex PCR design.\n\n" +
                "Click Cancel to add template or OK to proceed."
        });
    }

    // Validate primer pairs
    const allPrimers = [];
    primerPairs.forEach((pair, i) => {
        if (pair.forward) allPrimers.push({ label: `Pair ${i + 1} Forward`, seq: pair.forward });
        if (pair.reverse) allPrimers.push({ label: `Pair ${i + 1} Reverse`, seq: pair.reverse });
    });

    if (allPrimers.length > 0) {
        const primerWarnings = validateSequenceInput(allPrimers, 'Primer');
        warnings.push(...primerWarnings);
    }

    // MPX-MW-01: Too many primer pairs (performance warning)
    if (primerPairs.length > 10) {
        warnings.push({
            id: 'MPX-MW-01',
            message:
                `Warning: Large number of primer pairs detected (${primerPairs.length} pairs).\n` +
                "Multiplex PCR with >10 primer pairs may have reduced efficiency and increased cross-dimer formation.\n" +
                "Consider splitting into multiple reactions.\n\n" +
                "Click Cancel to adjust or OK to proceed."
        });
    }

    // MPX-MW-02: Primer cross-dimer risk
    // (This would require dimer analysis - placeholder)
    if (primerPairs.length >= 5) {
        warnings.push({
            id: 'MPX-MW-02',
            message:
                `Warning: ${primerPairs.length} primer pairs in multiplex reaction.\n` +
                "Risk of primer cross-dimer formation increases with number of primers.\n" +
                "Ensure primers are designed to minimize cross-interactions.\n\n" +
                "Click Cancel to review or OK to proceed."
        });
    }

    // MPX-MW-03: Product length range too large
    // (Would need product length calculation - placeholder)

    // Validate thermodynamic parameters (reuse from QC module)
    const paramWarnings = validateParameterRange({
        Na: params.naConc,
        Mg: params.mgConc,
        conc: params.primerConc,
        targetTm: params.targetTm
    });
    warnings.push(...paramWarnings);

    // Performance warnings
    const totalBp = (templateSeq?.length || 0) + allPrimers.reduce((sum, p) => sum + (p.seq?.length || 0), 0);
    const perfWarnings = validatePerformance(primerPairs.length, totalBp);
    warnings.push(...perfWarnings);

    return warnings;
}

export {
    buildMultiplexPCRPreflightWarnings
};
