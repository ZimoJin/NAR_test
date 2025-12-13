/**
 * USER Cloning MW Warning Integration Example
 * 
 * This file demonstrates how to integrate the MW warning system into USER Cloning module.
 */

import { showMWWarnings, validateSequenceInput, validateFragmentCount } from './bio_visuals_v1.0.1.js';

/**
 * Build USER Cloning-specific preflight warnings
 */
function buildUSERCloningPreflightWarnings(vectorSeq, insertSeqs, dUSites) {
    const warnings = [];

    // Validate vector sequence
    if (vectorSeq) {
        const vectorWarnings = validateSequenceInput([{ label: 'Vector', seq: vectorSeq }], 'Vector');
        warnings.push(...vectorWarnings);
    } else {
        warnings.push({
            id: 'USER-MW-00',
            message:
                "Warning: No vector sequence provided.\n" +
                "Please provide a vector sequence for USER cloning.\n\n" +
                "Click Cancel to add vector or OK to proceed."
        });
    }

    // Validate insert sequences
    const validInserts = insertSeqs.filter(ins => ins && ins.trim());
    if (validInserts.length > 0) {
        const insertWarnings = validateSequenceInput(
            validInserts.map((seq, i) => ({ label: `Insert ${i + 1}`, seq })),
            'Insert'
        );
        warnings.push(...insertWarnings);
    }

    // USER-MW-01: Insufficient dU sites
    if (dUSites && dUSites.count < 2) {
        warnings.push({
            id: 'USER-MW-01',
            message:
                `Warning: Insufficient dU sites detected (${dUSites.count} < 2).\n` +
                "USER cloning requires at least 2 dU sites (one at each junction).\n" +
                "Please ensure primers contain dU bases at appropriate positions.\n\n" +
                "Click Cancel to adjust or OK to proceed."
        });
    }

    // USER-MW-02: Fragment overlap length insufficient
    if (dUSites && dUSites.overlaps) {
        dUSites.overlaps.forEach((overlap, i) => {
            if (overlap.length < 10) {
                warnings.push({
                    id: 'USER-MW-02',
                    message:
                        `Warning: Fragment overlap ${i + 1} is too short (${overlap.length} bp < 10 bp).\n` +
                        "Short overlaps may reduce USER cloning efficiency.\n" +
                        "Recommended minimum: 10-15 bp.\n\n" +
                        "Click Cancel to adjust or OK to proceed."
                });
            }
        });
    }

    // USER-MW-03: Non-standard bases in sequence
    const allSeqs = [vectorSeq, ...validInserts].filter(Boolean);
    allSeqs.forEach((seq, i) => {
        // Check for non-ACGT bases (excluding dU which is represented as T)
        const nonStandard = seq.match(/[^ACGT]/gi);
        if (nonStandard && nonStandard.length > 0) {
            warnings.push({
                id: 'USER-MW-03',
                message:
                    `Warning: Non-standard bases detected in sequence ${i === 0 ? 'vector' : `insert ${i}`}.\n` +
                    `Found: ${[...new Set(nonStandard)].join(', ')}\n` +
                    "USER cloning works with standard DNA bases (A, C, G, T) and dU.\n\n" +
                    "Click Cancel to review or OK to proceed."
            });
        }
    });

    // Validate fragment count
    const fragmentWarnings = validateFragmentCount(validInserts.length, 1, 'USER Cloning');
    warnings.push(...fragmentWarnings);

    return warnings;
}

export {
    buildUSERCloningPreflightWarnings
};
