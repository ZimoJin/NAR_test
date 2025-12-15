/**
 * RE Cloning (Restriction Enzyme Cloning) MW Warning Integration Example
 * 
 * This file demonstrates how to integrate the MW warning system into RE Cloning module.
 */

import { showMWWarnings, validateSequenceInput } from './bio_visuals_v1.0.1.js';

/**
 * Build RE Cloning-specific preflight warnings
 */
function buildRECloningPreflightWarnings(vectorSeq, insertSeq, enzymeInfo) {
    const warnings = [];

    // Validate vector sequence
    if (vectorSeq) {
        const vectorWarnings = validateSequenceInput([{ label: 'Vector', seq: vectorSeq }], 'Vector');
        warnings.push(...vectorWarnings);
    } else {
        warnings.push({
            id: 'RE-MW-00',
            message:
                "Warning: No vector sequence provided.\n" +
                "Please provide a vector sequence for restriction enzyme cloning.\n\n" +
                "Click Cancel to add vector or OK to proceed."
        });
    }

    // Validate insert sequence
    if (insertSeq) {
        const insertWarnings = validateSequenceInput([{ label: 'Insert', seq: insertSeq }], 'Insert');
        warnings.push(...insertWarnings);
    } else {
        warnings.push({
            id: 'RE-MW-00B',
            message:
                "Warning: No insert sequence provided.\n" +
                "Please provide an insert sequence for cloning.\n\n" +
                "Click Cancel to add insert or OK to proceed."
        });
    }

    // RE-MW-01: Restriction site exists inside insert
    if (enzymeInfo && enzymeInfo.internalSites && enzymeInfo.internalSites.length > 0) {
        warnings.push({
            id: 'RE-MW-01',
            message:
                `Warning: Internal restriction enzyme sites found in insert sequence.\n` +
                `Enzyme(s): ${enzymeInfo.internalSites.join(', ')}\n` +
                "Internal sites will cause the insert to be cut during cloning.\n" +
                "Consider using different enzymes or removing internal sites via mutagenesis.\n\n" +
                "Click Cancel to adjust or OK to proceed."
        });
    }

    // RE-MW-02: Vector and insert size ratio unusual
    if (vectorSeq && insertSeq) {
        const ratio = insertSeq.length / vectorSeq.length;
        if (ratio > 2 || ratio < 0.01) {
            warnings.push({
                id: 'RE-MW-02',
                message:
                    `Warning: Unusual vector/insert size ratio.\n` +
                    `Vector: ${vectorSeq.length} bp, Insert: ${insertSeq.length} bp (ratio: ${ratio.toFixed(2)})\n` +
                    (ratio > 2
                        ? "Very large insert relative to vector may reduce cloning efficiency.\n"
                        : "Very small insert relative to vector may be difficult to verify.\n") +
                    "\nClick Cancel to review or OK to proceed."
            });
        }
    }

    // RE-MW-03: Enzyme sites too close together
    if (enzymeInfo && enzymeInfo.siteDistance && enzymeInfo.siteDistance < 6) {
        warnings.push({
            id: 'RE-MW-03',
            message:
                `Warning: Restriction enzyme sites are very close (${enzymeInfo.siteDistance} bp < 6 bp).\n` +
                "Closely spaced sites may reduce digestion efficiency.\n" +
                "Recommended minimum distance: 6-10 bp.\n\n" +
                "Click Cancel to adjust or OK to proceed."
        });
    }

    // RE-MW-04: No compatible ends
    if (enzymeInfo && enzymeInfo.compatibleEnds === false) {
        warnings.push({
            id: 'RE-MW-04',
            message:
                "Warning: Incompatible sticky ends detected.\n" +
                "The selected enzymes produce incompatible overhangs that cannot ligate.\n" +
                "Please select enzymes that produce compatible ends.\n\n" +
                "Click Cancel to adjust or OK to proceed."
        });
    }

    return warnings;
}

export {
    buildRECloningPreflightWarnings
};
