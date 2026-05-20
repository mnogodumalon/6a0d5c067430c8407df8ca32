import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'produktionsnummer',
    'produktionsstatus',
    'auftrag',
    'mitarbeiter',
    'materialien',
    { row: ['geplanter_start', 'geplantes_ende'] },
    { row: ['tatsaechlicher_start', 'tatsaechliches_ende'] },
    'drucker_bezeichnung',
    'qualitaetspruefung_bestanden',
    'notizen',
  ],
  defaults: {
    'geplanter_start': { kind: 'today', withTime: true },
    'geplantes_ende': { kind: 'todayOffset', days: 1, withTime: true },
    'produktionsstatus': { kind: 'lookup', key: 'geplant', label: 'Geplant' },
  },
  computed: {
    '_geplante_dauer_stunden': { kind: 'dateDiff', from: 'geplanter_start', to: 'geplantes_ende', unit: 'hours' },
    '_tatsaechliche_dauer_stunden': { kind: 'dateDiff', from: 'tatsaechlicher_start', to: 'tatsaechliches_ende', unit: 'hours' },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
