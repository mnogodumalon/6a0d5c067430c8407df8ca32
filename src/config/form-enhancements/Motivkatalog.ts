import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'motivname',
    'kategorie',
    { row: ['mindestbreite_cm', 'mindesthoehe_cm'] },
    { row: ['maximalbreite_cm', 'maximalhoehe_cm'] },
    'basispreis_pro_qm',
    'verfuegbar',
    'beschreibung',
  ],
  defaults: {
    'basispreis_pro_qm': { kind: 'literal', value: 0 },
    'verfuegbar': { kind: 'literal', value: true },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
