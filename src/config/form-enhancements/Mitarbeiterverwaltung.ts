import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'personalnummer',
    { row: ['vorname', 'nachname'] },
    'position',
    'eintrittsdatum',
    'email',
    'notizen',
  ],
  defaults: {
    'eintrittsdatum': { kind: 'today' },
    'position': { kind: 'lookup', key: 'sonstiges', label: 'Sonstiges' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
