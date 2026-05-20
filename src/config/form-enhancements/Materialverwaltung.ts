import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'materialname',
    'materialtyp',
    'einheit',
    'lagerbestand',
    'mindestbestand',
    'lieferant',
    'preis_pro_einheit',
    'notizen',
  ],
  defaults: {
    'lagerbestand': { kind: 'literal', value: 0 },
    'mindestbestand': { kind: 'literal', value: 0 },
    'preis_pro_einheit': { kind: 'literal', value: 0 },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
