/* ==========================================================================
   Diagnostics Store - Manages LSP diagnostics for Problems panel
   ========================================================================== */

import { create } from 'zustand';
import type { Diagnostic } from '../services/lsp/types';
import { uriToPath } from '../services/lsp/TypeScriptLsp';

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

export interface FileDiagnostics {
    uri: string;
    path: string;
    diagnostics: Diagnostic[];
}

export interface DiagnosticsCounts {
    errors: number;
    warnings: number;
    info: number;
    hints: number;
}

interface DiagnosticsState {
    // Map stored as array of entries for stable references
    diagnosticsEntries: Array<{ uri: string; diagnostics: Diagnostic[] }>;

    // Computed counts - stored as state, not computed on the fly
    counts: DiagnosticsCounts;

    // Actions
    setDiagnostics: (uri: string, diagnostics: Diagnostic[]) => void;
    clearDiagnostics: (uri?: string) => void;
}

// -------------------------------------------------------------------------
// Helper to compute counts
// -------------------------------------------------------------------------

function computeCounts(entries: Array<{ uri: string; diagnostics: Diagnostic[] }>): DiagnosticsCounts {
    const counts: DiagnosticsCounts = { errors: 0, warnings: 0, info: 0, hints: 0 };

    for (const entry of entries) {
        for (const d of entry.diagnostics) {
            switch (d.severity) {
                case 1: // DiagnosticSeverity.Error
                    counts.errors++;
                    break;
                case 2: // DiagnosticSeverity.Warning
                    counts.warnings++;
                    break;
                case 3: // DiagnosticSeverity.Information
                    counts.info++;
                    break;
                case 4: // DiagnosticSeverity.Hint
                    counts.hints++;
                    break;
                default:
                    counts.errors++; // Default to error if severity is undefined
            }
        }
    }

    return counts;
}

// -------------------------------------------------------------------------
// Helper to convert entries to FileDiagnostics (for use outside selectors)
// -------------------------------------------------------------------------

export function entriesToFileDiagnostics(entries: Array<{ uri: string; diagnostics: Diagnostic[] }>): FileDiagnostics[] {
    return entries
        .map(entry => ({
            uri: entry.uri,
            path: uriToPath(entry.uri),
            diagnostics: entry.diagnostics,
        }))
        .sort((a, b) => a.path.localeCompare(b.path));
}

// -------------------------------------------------------------------------
// Store
// -------------------------------------------------------------------------

export const useDiagnosticsStore = create<DiagnosticsState>((set) => ({
    diagnosticsEntries: [],
    counts: { errors: 0, warnings: 0, info: 0, hints: 0 },

    setDiagnostics: (uri: string, diagnostics: Diagnostic[]) => {
        set((state) => {
            // Filter out existing entry for this URI
            const filtered = state.diagnosticsEntries.filter(e => e.uri !== uri);

            // Add new entry if there are diagnostics
            const newEntries = diagnostics.length > 0
                ? [...filtered, { uri, diagnostics }]
                : filtered;

            return {
                diagnosticsEntries: newEntries,
                counts: computeCounts(newEntries),
            };
        });
    },

    clearDiagnostics: (uri?: string) => {
        set((state) => {
            if (uri) {
                const newEntries = state.diagnosticsEntries.filter(e => e.uri !== uri);
                return {
                    diagnosticsEntries: newEntries,
                    counts: computeCounts(newEntries),
                };
            }
            return {
                diagnosticsEntries: [],
                counts: { errors: 0, warnings: 0, info: 0, hints: 0 },
            };
        });
    },
}));
