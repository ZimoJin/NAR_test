/**
 * Golden Gate MW Warning Integration Example
 * 
 * This file demonstrates how to integrate the MW warning system into Golden Gate module.
 */

import { showMWWarnings, validateSequenceInput, validateFragmentCount } from './bio_visuals_v1.0.1.js';

/**
 * Build Golden Gate-specific preflight warnings
 */
function buildGoldenGatePreflightWarnings(vectorSeq, insertSeqs, enzymeInfo, overhangInfo) {
    const warnings = [];

    // Validate vector sequence
    if (vectorSeq) {
        const vectorWarnings = validateSequenceInput([{ label: 'Vector', seq: vectorSeq }], 'Vector');
        warnings.push(...vectorWarnings);
    } else {
        warnings.push({
            id: 'GG-MW-00',
            message:
                "Warning: No vector sequence provided.\n" +
                "Please provide a vector sequence for Golden Gate assembly.\n\n" +
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

    // GG-MW-01: Restriction enzyme site not found
    if (enzymeInfo && enzymeInfo.sitesFound === 0) {
        warnings.push({
            id: 'GG-MW-01',
            message:
                `Warning: Restriction enzyme "${enzymeInfo.enzymeName}" site not found in vector.\n` +
                "Golden Gate assembly requires the specified enzyme recognition sites.\n" +
                "Please verify the enzyme name and vector sequence.\n\n" +
                "Click Cancel to adjust or OK to proceed."
        });
    }

    // GG-MW-02: Fragment count mismatch
    const fragmentWarnings = validateFragmentCount(validInserts.length, 1, 'Golden Gate');
    warnings.push(...fragmentWarnings);

    // GG-MW-03: Overhang sequence conflicts
    if (overhangInfo && overhangInfo.conflicts && overhangInfo.conflicts.length > 0) {
        warnings.push({
            id: 'GG-MW-03',
            message:
                "Warning: Incompatible overhang sequences detected.\n" +
                `Conflicting overhangs: ${overhangInfo.conflicts.join(', ')}\n` +
                "Golden Gate assembly requires unique, compatible overhang sequences.\n" +
                "Conflicting overhangs may cause incorrect assembly.\n\n" +
                "Click Cancel to redesign overhangs or OK to proceed."
        });
    }

    // GG-MW-04: Vector sequence too large
    if (vectorSeq && vectorSeq.length > 15000) {
        warnings.push({
            id: 'GG-MW-04',
            message:
                `Warning: Large vector sequence detected (${vectorSeq.length} bp > 15 kb).\n` +
                "Golden Gate assembly efficiency may decrease with very large vectors.\n\n" +
                "Click Cancel to review or OK to proceed."
        });
    }

    // GG-MW-05: Internal enzyme sites in inserts
    if (enzymeInfo && enzymeInfo.internalSites && enzymeInfo.internalSites.length > 0) {
        warnings.push({
            id: 'GG-MW-05',
            message:
                `Warning: Internal ${enzymeInfo.enzymeName} sites found in insert sequences.\n` +
                `Affected inserts: ${enzymeInfo.internalSites.join(', ')}\n` +
                "Internal enzyme sites will cause fragmentation during Golden Gate assembly.\n" +
                "Consider using a different enzyme or removing internal sites.\n\n" +
                "Click Cancel to adjust or OK to proceed."
        });
    }

    return warnings;
}

export {
    buildGoldenGatePreflightWarnings
};
