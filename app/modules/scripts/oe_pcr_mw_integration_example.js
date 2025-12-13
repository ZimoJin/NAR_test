/**
 * OE-PCR (Overlap Extension PCR) MW Warning Integration Example
 * 
 * This file demonstrates how to integrate the MW warning system into OE-PCR module.
 */

import { showMWWarnings, validateSequenceInput, validateOverlapLength } from './bio_visuals_v1.0.1.js';

/**
 * Build OE-PCR-specific preflight warnings
 */
function buildOEPCRPreflightWarnings(fragments, overlapRegions, params) {
    const warnings = [];

    // Validate fragment sequences
    const validFragments = fragments.filter(f => f.seq && f.seq.trim());
    if (validFragments.length > 0) {
        const fragmentWarnings = validateSequenceInput(
            validFragments.map((f, i) => ({ label: f.name || `Fragment ${i + 1}`, seq: f.seq })),
            'Fragment'
        );
        warnings.push(...fragmentWarnings);
    }

    // OE-MW-00: Insufficient fragments
    if (validFragments.length < 2) {
        warnings.push({
            id: 'OE-MW-00',
            message:
                `Warning: Insufficient fragments for OE-PCR (${validFragments.length} < 2).\n` +
                "OE-PCR requires at least 2 fragments to overlap and extend.\n\n" +
                "Click Cancel to add more fragments or OK to proceed."
        });
    }

    // OE-MW-01: Overlap region too short
    overlapRegions.forEach((overlap, i) => {
        if (overlap.length < 15) {
            warnings.push({
                id: 'OE-MW-01',
                message:
                    `Warning: Overlap region ${i + 1} is too short (${overlap.length} bp < 15 bp).\n` +
                    "Short overlap regions may have reduced extension efficiency.\n" +
                    "Recommended minimum: 15-20 bp.\n\n" +
                    "Click Cancel to adjust or OK to proceed."
            });
        }
    });

    // OE-MW-02: Overlap region Tm too low
    overlapRegions.forEach((overlap, i) => {
        if (overlap.tm && overlap.tm < 50) {
            warnings.push({
                id: 'OE-MW-02',
                message:
                    `Warning: Overlap region ${i + 1} has low Tm (${overlap.tm.toFixed(1)}°C < 50°C).\n` +
                    "Low Tm overlap regions may have reduced annealing efficiency.\n" +
                    "Consider increasing overlap length or GC content.\n\n" +
                    "Click Cancel to adjust or OK to proceed."
            });
        }
    });

    // OE-MW-03: Fragment count mismatch with overlaps
    if (validFragments.length > 0 && overlapRegions.length !== validFragments.length - 1) {
        warnings.push({
            id: 'OE-MW-03',
            message:
                `Warning: Fragment/overlap count mismatch.\n` +
                `Fragments: ${validFragments.length}, Overlaps: ${overlapRegions.length}\n` +
                `Expected ${validFragments.length - 1} overlap regions for ${validFragments.length} fragments.\n\n` +
                "Click Cancel to review or OK to proceed."
        });
    }

    // Validate overlap lengths
    overlapRegions.forEach((overlap, i) => {
        const overlapWarnings = validateOverlapLength(overlap.length, 15, 30);
        warnings.push(...overlapWarnings.map(w => ({
            ...w,
            id: `OE-MW-OVERLAP-${i + 1}`,
            message: w.message.replace('Overlap length', `Overlap region ${i + 1} length`)
        })));
    });

    return warnings;
}

export {
    buildOEPCRPreflightWarnings
};
