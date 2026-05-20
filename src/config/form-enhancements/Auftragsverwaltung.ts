import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'auftragsnummer',
    'auftragsdatum',
    'lieferdatum',
    'auftragsstatus',
    'kunde',
    'motive',
    { row: ['breite_cm', 'hoehe_cm'] },
    'druckort',
    'oberflaechentyp',
    'sonderanforderungen',
    'gesamtpreis',
    'anzahlung',
    'zahlungsstatus',
  ],
  defaults: {
    'auftragsdatum': { kind: 'today' },
    'lieferdatum': { kind: 'todayOffset', days: 14 },
    'auftragsstatus': { kind: 'lookup', key: 'neu', label: 'Neu' },
    'zahlungsstatus': { kind: 'lookup', key: 'offen', label: 'Offen' },
  },
  computed: {
    '_flaeche_qm': { op: 'div', left: { op: 'mul', left: { kind: 'field', key: 'breite_cm' }, right: { kind: 'field', key: 'hoehe_cm' } }, right: { kind: 'literal', value: 10000 } },
    'gesamtpreis': (fields, ctx) => {
      const breite = Number(fields.breite_cm ?? 0);
      const hoehe = Number(fields.hoehe_cm ?? 0);
      const flaeche = (breite * hoehe) / 10000;

      
      const preisSumme = ctx.sumOver('motive', (it) => {
        const basispreis = Number(it.fields?.basispreis_pro_qm ?? 0);
        return basispreis * flaeche;
      }) ?? 0;

      return preisSumme;
    },
  },
};

export const computedDeps: Record<string, string[]> = {
  'gesamtpreis': ['motive'],
};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
