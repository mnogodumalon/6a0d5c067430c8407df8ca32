import type { Auftragsverwaltung, Produktionsplanung } from './app';

export type EnrichedAuftragsverwaltung = Auftragsverwaltung & {
  kundeName: string;
  motiveName: string;
};

export type EnrichedProduktionsplanung = Produktionsplanung & {
  auftragName: string;
  mitarbeiterName: string;
  materialienName: string;
};
