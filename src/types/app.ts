// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Kundenverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kundennummer?: string;
    vorname?: string;
    nachname?: string;
    firma?: string;
    email?: string;
    telefon?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    land?: string;
    notizen?: string;
  };
}

export interface Mitarbeiterverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    personalnummer?: string;
    vorname?: string;
    nachname?: string;
    position?: LookupValue;
    eintrittsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    email?: string;
    telefon?: string;
    notizen?: string;
  };
}

export interface Motivkatalog {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    motivname?: string;
    beschreibung?: string;
    kategorie?: LookupValue;
    vorschaubild?: string;
    mindestbreite_cm?: number;
    mindesthoehe_cm?: number;
    maximalbreite_cm?: number;
    maximalhoehe_cm?: number;
    basispreis_pro_qm?: number;
    verfuegbar?: boolean;
  };
}

export interface Materialverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    materialname?: string;
    materialtyp?: LookupValue;
    einheit?: LookupValue;
    lagerbestand?: number;
    mindestbestand?: number;
    lieferant?: string;
    preis_pro_einheit?: number;
    notizen?: string;
  };
}

export interface Auftragsverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    auftragsnummer?: string;
    auftragsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    lieferdatum?: string; // Format: YYYY-MM-DD oder ISO String
    auftragsstatus?: LookupValue;
    kunde?: string; // applookup -> URL zu 'Kundenverwaltung' Record
    motive?: string;
    breite_cm?: number;
    hoehe_cm?: number;
    druckort?: LookupValue;
    oberflaechentyp?: string;
    sonderanforderungen?: string;
    gesamtpreis?: number;
    anzahlung?: number;
    zahlungsstatus?: LookupValue;
  };
}

export interface Produktionsplanung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    produktionsnummer?: string;
    produktionsstatus?: LookupValue;
    auftrag?: string; // applookup -> URL zu 'Auftragsverwaltung' Record
    mitarbeiter?: string; // applookup -> URL zu 'Mitarbeiterverwaltung' Record
    materialien?: string;
    geplanter_start?: string; // Format: YYYY-MM-DD oder ISO String
    geplantes_ende?: string; // Format: YYYY-MM-DD oder ISO String
    tatsaechlicher_start?: string; // Format: YYYY-MM-DD oder ISO String
    tatsaechliches_ende?: string; // Format: YYYY-MM-DD oder ISO String
    drucker_bezeichnung?: string;
    qualitaetspruefung_bestanden?: boolean;
    notizen?: string;
  };
}

export const APP_IDS = {
  KUNDENVERWALTUNG: '6a0d5bd682b288448498c893',
  MITARBEITERVERWALTUNG: '6a0d5bdccaf0f5c145ae2818',
  MOTIVKATALOG: '6a0d5bddc1775469ec9ca83e',
  MATERIALVERWALTUNG: '6a0d5bde933c27e481cf9817',
  AUFTRAGSVERWALTUNG: '6a0d5bde35eb2cf86f7eb849',
  PRODUKTIONSPLANUNG: '6a0d5bdfe6982a58739b3802',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'mitarbeiterverwaltung': {
    position: [{ key: "drucker", label: "Drucker / Druckerin" }, { key: "projektleitung", label: "Projektleitung" }, { key: "vertrieb", label: "Vertrieb" }, { key: "design", label: "Design" }, { key: "lager_logistik", label: "Lager / Logistik" }, { key: "geschaeftsfuehrung", label: "Geschäftsführung" }, { key: "sonstiges", label: "Sonstiges" }],
  },
  'motivkatalog': {
    kategorie: [{ key: "natur", label: "Natur" }, { key: "architektur", label: "Architektur" }, { key: "abstrakt", label: "Abstrakt" }, { key: "tiere", label: "Tiere" }, { key: "menschen_portraet", label: "Menschen / Porträt" }, { key: "stadtansichten", label: "Stadtansichten" }, { key: "sonstiges", label: "Sonstiges" }],
  },
  'materialverwaltung': {
    materialtyp: [{ key: "druckfolie", label: "Druckfolie" }, { key: "druckfarbe", label: "Druckfarbe" }, { key: "grundierung", label: "Grundierung" }, { key: "reinigungsmittel", label: "Reinigungsmittel" }, { key: "verpackungsmaterial", label: "Verpackungsmaterial" }, { key: "sonstiges", label: "Sonstiges" }],
    einheit: [{ key: "liter", label: "Liter" }, { key: "kilogramm", label: "Kilogramm" }, { key: "meter", label: "Meter" }, { key: "quadratmeter", label: "Quadratmeter" }, { key: "stueck", label: "Stück" }, { key: "rolle", label: "Rolle" }],
  },
  'auftragsverwaltung': {
    auftragsstatus: [{ key: "neu", label: "Neu" }, { key: "in_bearbeitung", label: "In Bearbeitung" }, { key: "in_produktion", label: "In Produktion" }, { key: "abgeschlossen", label: "Abgeschlossen" }, { key: "storniert", label: "Storniert" }],
    druckort: [{ key: "innenbereich", label: "Innenbereich" }, { key: "aussenbereich", label: "Außenbereich" }],
    zahlungsstatus: [{ key: "offen", label: "Offen" }, { key: "anzahlung_erhalten", label: "Anzahlung erhalten" }, { key: "vollstaendig_bezahlt", label: "Vollständig bezahlt" }, { key: "ueberfaellig", label: "Überfällig" }],
  },
  'produktionsplanung': {
    produktionsstatus: [{ key: "geplant", label: "Geplant" }, { key: "in_produktion", label: "In Produktion" }, { key: "qualitaetspruefung", label: "Qualitätsprüfung" }, { key: "abgeschlossen", label: "Abgeschlossen" }, { key: "pausiert", label: "Pausiert" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kundenverwaltung': {
    'kundennummer': 'string/text',
    'vorname': 'string/text',
    'nachname': 'string/text',
    'firma': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'land': 'string/text',
    'notizen': 'string/textarea',
  },
  'mitarbeiterverwaltung': {
    'personalnummer': 'string/text',
    'vorname': 'string/text',
    'nachname': 'string/text',
    'position': 'lookup/select',
    'eintrittsdatum': 'date/date',
    'email': 'string/email',
    'telefon': 'string/tel',
    'notizen': 'string/textarea',
  },
  'motivkatalog': {
    'motivname': 'string/text',
    'beschreibung': 'string/textarea',
    'kategorie': 'lookup/select',
    'vorschaubild': 'file',
    'mindestbreite_cm': 'number',
    'mindesthoehe_cm': 'number',
    'maximalbreite_cm': 'number',
    'maximalhoehe_cm': 'number',
    'basispreis_pro_qm': 'number',
    'verfuegbar': 'bool',
  },
  'materialverwaltung': {
    'materialname': 'string/text',
    'materialtyp': 'lookup/select',
    'einheit': 'lookup/select',
    'lagerbestand': 'number',
    'mindestbestand': 'number',
    'lieferant': 'string/text',
    'preis_pro_einheit': 'number',
    'notizen': 'string/textarea',
  },
  'auftragsverwaltung': {
    'auftragsnummer': 'string/text',
    'auftragsdatum': 'date/date',
    'lieferdatum': 'date/date',
    'auftragsstatus': 'lookup/select',
    'kunde': 'applookup/select',
    'motive': 'multipleapplookup/select',
    'breite_cm': 'number',
    'hoehe_cm': 'number',
    'druckort': 'lookup/radio',
    'oberflaechentyp': 'string/text',
    'sonderanforderungen': 'string/textarea',
    'gesamtpreis': 'number',
    'anzahlung': 'number',
    'zahlungsstatus': 'lookup/select',
  },
  'produktionsplanung': {
    'produktionsnummer': 'string/text',
    'produktionsstatus': 'lookup/select',
    'auftrag': 'applookup/select',
    'mitarbeiter': 'applookup/select',
    'materialien': 'multipleapplookup/select',
    'geplanter_start': 'date/datetimeminute',
    'geplantes_ende': 'date/datetimeminute',
    'tatsaechlicher_start': 'date/datetimeminute',
    'tatsaechliches_ende': 'date/datetimeminute',
    'drucker_bezeichnung': 'string/text',
    'qualitaetspruefung_bestanden': 'bool',
    'notizen': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKundenverwaltung = StripLookup<Kundenverwaltung['fields']>;
export type CreateMitarbeiterverwaltung = StripLookup<Mitarbeiterverwaltung['fields']>;
export type CreateMotivkatalog = StripLookup<Motivkatalog['fields']>;
export type CreateMaterialverwaltung = StripLookup<Materialverwaltung['fields']>;
export type CreateAuftragsverwaltung = StripLookup<Auftragsverwaltung['fields']>;
export type CreateProduktionsplanung = StripLookup<Produktionsplanung['fields']>;