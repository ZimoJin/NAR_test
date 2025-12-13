/**
 * Mutagenesis MW Warning Integration Example
 * 
 * This file demonstrates how to integrate the MW warning system into Mutagenesis module.
 */

import { showMWWarnings, validateSequenceInput, validateParameterRange } from './bio_visuals_v1.0.1.js';

/**
 * Build Mutagenesis-specific preflight warnings
 */
function buildMutagenesisPreflightWarnings(templateSeq, mutationSites, primerSeqs, params) {
    const warnings = [];

    // Validate template sequence
    if (templateSeq) {
        const templateWarnings = validateSequenceInput([{ label: 'Template', seq: templateSeq }], 'Template');
        warnings.push(...templateWarnings);
    } else {
        warnings.push({
            id: 'MUT-MW-00',
            message:
                "Warning: No template sequence provided.\n" +
                "Please provide a template sequence for mutagenesis design.\n\n" +
                "Click Cancel to add template or OK to proceed."
        });
    }

    // Validate primer sequences
    if (primerSeqs && primerSeqs.length > 0) {
        const primerWarnings = validateSequenceInput(
            primerSeqs.map((seq, i) => ({ label: `Primer ${i + 1}`, seq })),
            'Mutagenesis primer'
        );
        warnings.push(...primerWarnings);
    }

    // MUT-MW-01: Mutation site too close to primer end
    mutationSites.forEach((site, i) => {
        if (site.position < 5 || (templateSeq && site.position > templateSeq.length - 5)) {
            warnings.push({
                id: 'MUT-MW-01',
                message:
                    `Warning: Mutation site ${i + 1} is too close to sequence end (position ${site.position}).\n` +
                    "Mutations within 5 bp of primer ends may have reduced efficiency.\n" +
                    "Consider repositioning the mutation site.\n\n" +
                    "Click Cancel to adjust or OK to proceed."
            });
        }
    });

    // MUT-MW-02: Primer length too short for mutagenesis
    primerSeqs.forEach((seq, i) => {
        if (seq && seq.length < 25) {
            warnings.push({
                id: 'MUT-MW-02',
                message:
                    `Warning: Mutagenesis primer ${i + 1} is short (${seq.length} bp < 25 bp).\n` +
                    "Short primers may have reduced mutagenesis efficiency.\n" +
                    "Recommended minimum length: 25-30 bp.\n\n" +
                    "Click Cancel to adjust or OK to proceed."
            });
        }
    });

    // MUT-MW-03: Too many mutations in single primer
    mutationSites.forEach((site, i) => {
        if (site.mutationCount && site.mutationCount > 3) {
            warnings.push({
                id: 'MUT-MW-03',
                message:
                    `Warning: Mutation site ${i + 1} contains ${site.mutationCount} base changes.\n` +
                    "Multiple mutations (>3) in a single primer may reduce efficiency.\n" +
                    "Consider splitting into multiple mutagenesis steps.\n\n" +
                    "Click Cancel to adjust or OK to proceed."
            });
        }
    });

    // Validate thermodynamic parameters
    const paramWarnings = validateParameterRange({
        Na: params.naConc,
        Mg: params.mgConc,
        conc: params.primerConc,
        targetTm: params.targetTm
    });
    warnings.push(...paramWarnings);

    return warnings;
}

export {
    buildMutagenesisPreflightWarnings
};
