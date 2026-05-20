import type { EnrichedAuftragsverwaltung, EnrichedProduktionsplanung } from '@/types/enriched';
import type { Auftragsverwaltung, Kundenverwaltung, Materialverwaltung, Mitarbeiterverwaltung, Motivkatalog, Produktionsplanung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface AuftragsverwaltungMaps {
  kundenverwaltungMap: Map<string, Kundenverwaltung>;
  motivkatalogMap: Map<string, Motivkatalog>;
}

export function enrichAuftragsverwaltung(
  auftragsverwaltung: Auftragsverwaltung[],
  maps: AuftragsverwaltungMaps
): EnrichedAuftragsverwaltung[] {
  return auftragsverwaltung.map(r => ({
    ...r,
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenverwaltungMap, 'vorname', 'nachname'),
    motiveName: resolveDisplay(r.fields.motive, maps.motivkatalogMap, 'motivname'),
  }));
}

interface ProduktionsplanungMaps {
  auftragsverwaltungMap: Map<string, Auftragsverwaltung>;
  mitarbeiterverwaltungMap: Map<string, Mitarbeiterverwaltung>;
  materialverwaltungMap: Map<string, Materialverwaltung>;
}

export function enrichProduktionsplanung(
  produktionsplanung: Produktionsplanung[],
  maps: ProduktionsplanungMaps
): EnrichedProduktionsplanung[] {
  return produktionsplanung.map(r => ({
    ...r,
    auftragName: resolveDisplay(r.fields.auftrag, maps.auftragsverwaltungMap, 'auftragsnummer'),
    mitarbeiterName: resolveDisplay(r.fields.mitarbeiter, maps.mitarbeiterverwaltungMap, 'vorname', 'nachname'),
    materialienName: resolveDisplay(r.fields.materialien, maps.materialverwaltungMap, 'materialname'),
  }));
}
