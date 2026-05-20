import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Kundenverwaltung, Mitarbeiterverwaltung, Motivkatalog, Materialverwaltung, Auftragsverwaltung, Produktionsplanung } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { KundenverwaltungDialog } from '@/components/dialogs/KundenverwaltungDialog';
import { KundenverwaltungViewDialog } from '@/components/dialogs/KundenverwaltungViewDialog';
import { MitarbeiterverwaltungDialog } from '@/components/dialogs/MitarbeiterverwaltungDialog';
import { MitarbeiterverwaltungViewDialog } from '@/components/dialogs/MitarbeiterverwaltungViewDialog';
import { MotivkatalogDialog } from '@/components/dialogs/MotivkatalogDialog';
import { MotivkatalogViewDialog } from '@/components/dialogs/MotivkatalogViewDialog';
import { MaterialverwaltungDialog } from '@/components/dialogs/MaterialverwaltungDialog';
import { MaterialverwaltungViewDialog } from '@/components/dialogs/MaterialverwaltungViewDialog';
import { AuftragsverwaltungDialog } from '@/components/dialogs/AuftragsverwaltungDialog';
import { AuftragsverwaltungViewDialog } from '@/components/dialogs/AuftragsverwaltungViewDialog';
import { ProduktionsplanungDialog } from '@/components/dialogs/ProduktionsplanungDialog';
import { ProduktionsplanungViewDialog } from '@/components/dialogs/ProduktionsplanungViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPencil, IconTrash, IconPlus, IconFilter, IconX, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconSearch, IconCopy, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const KUNDENVERWALTUNG_FIELDS = [
  { key: 'kundennummer', label: 'Kundennummer', type: 'string/text' },
  { key: 'vorname', label: 'Vorname', type: 'string/text' },
  { key: 'nachname', label: 'Nachname', type: 'string/text' },
  { key: 'firma', label: 'Firma', type: 'string/text' },
  { key: 'email', label: 'E-Mail-Adresse', type: 'string/email' },
  { key: 'telefon', label: 'Telefonnummer', type: 'string/tel' },
  { key: 'strasse', label: 'Straße', type: 'string/text' },
  { key: 'hausnummer', label: 'Hausnummer', type: 'string/text' },
  { key: 'plz', label: 'Postleitzahl', type: 'string/text' },
  { key: 'ort', label: 'Ort', type: 'string/text' },
  { key: 'land', label: 'Land', type: 'string/text' },
  { key: 'notizen', label: 'Notizen', type: 'string/textarea' },
];
const MITARBEITERVERWALTUNG_FIELDS = [
  { key: 'personalnummer', label: 'Personalnummer', type: 'string/text' },
  { key: 'vorname', label: 'Vorname', type: 'string/text' },
  { key: 'nachname', label: 'Nachname', type: 'string/text' },
  { key: 'position', label: 'Position / Rolle', type: 'lookup/select', options: [{ key: 'drucker', label: 'Drucker / Druckerin' }, { key: 'projektleitung', label: 'Projektleitung' }, { key: 'vertrieb', label: 'Vertrieb' }, { key: 'design', label: 'Design' }, { key: 'lager_logistik', label: 'Lager / Logistik' }, { key: 'geschaeftsfuehrung', label: 'Geschäftsführung' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'eintrittsdatum', label: 'Eintrittsdatum', type: 'date/date' },
  { key: 'email', label: 'E-Mail-Adresse', type: 'string/email' },
  { key: 'telefon', label: 'Telefonnummer', type: 'string/tel' },
  { key: 'notizen', label: 'Notizen', type: 'string/textarea' },
];
const MOTIVKATALOG_FIELDS = [
  { key: 'motivname', label: 'Motivname', type: 'string/text' },
  { key: 'beschreibung', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'kategorie', label: 'Kategorie', type: 'lookup/select', options: [{ key: 'natur', label: 'Natur' }, { key: 'architektur', label: 'Architektur' }, { key: 'abstrakt', label: 'Abstrakt' }, { key: 'tiere', label: 'Tiere' }, { key: 'menschen_portraet', label: 'Menschen / Porträt' }, { key: 'stadtansichten', label: 'Stadtansichten' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'vorschaubild', label: 'Vorschaubild', type: 'file' },
  { key: 'mindestbreite_cm', label: 'Mindestbreite (cm)', type: 'number' },
  { key: 'mindesthoehe_cm', label: 'Mindesthöhe (cm)', type: 'number' },
  { key: 'maximalbreite_cm', label: 'Maximalbreite (cm)', type: 'number' },
  { key: 'maximalhoehe_cm', label: 'Maximalhöhe (cm)', type: 'number' },
  { key: 'basispreis_pro_qm', label: 'Basispreis pro m² (€)', type: 'number' },
  { key: 'verfuegbar', label: 'Motiv verfügbar', type: 'bool' },
];
const MATERIALVERWALTUNG_FIELDS = [
  { key: 'materialname', label: 'Materialname', type: 'string/text' },
  { key: 'materialtyp', label: 'Materialtyp', type: 'lookup/select', options: [{ key: 'druckfolie', label: 'Druckfolie' }, { key: 'druckfarbe', label: 'Druckfarbe' }, { key: 'grundierung', label: 'Grundierung' }, { key: 'reinigungsmittel', label: 'Reinigungsmittel' }, { key: 'verpackungsmaterial', label: 'Verpackungsmaterial' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'einheit', label: 'Einheit', type: 'lookup/select', options: [{ key: 'liter', label: 'Liter' }, { key: 'kilogramm', label: 'Kilogramm' }, { key: 'meter', label: 'Meter' }, { key: 'quadratmeter', label: 'Quadratmeter' }, { key: 'stueck', label: 'Stück' }, { key: 'rolle', label: 'Rolle' }] },
  { key: 'lagerbestand', label: 'Aktueller Lagerbestand', type: 'number' },
  { key: 'mindestbestand', label: 'Mindestbestand', type: 'number' },
  { key: 'lieferant', label: 'Lieferant', type: 'string/text' },
  { key: 'preis_pro_einheit', label: 'Preis pro Einheit (€)', type: 'number' },
  { key: 'notizen', label: 'Notizen', type: 'string/textarea' },
];
const AUFTRAGSVERWALTUNG_FIELDS = [
  { key: 'auftragsnummer', label: 'Auftragsnummer', type: 'string/text' },
  { key: 'auftragsdatum', label: 'Auftragsdatum', type: 'date/date' },
  { key: 'lieferdatum', label: 'Gewünschtes Lieferdatum', type: 'date/date' },
  { key: 'auftragsstatus', label: 'Auftragsstatus', type: 'lookup/select', options: [{ key: 'neu', label: 'Neu' }, { key: 'in_bearbeitung', label: 'In Bearbeitung' }, { key: 'in_produktion', label: 'In Produktion' }, { key: 'abgeschlossen', label: 'Abgeschlossen' }, { key: 'storniert', label: 'Storniert' }] },
  { key: 'kunde', label: 'Kunde', type: 'applookup/select', targetEntity: 'kundenverwaltung', targetAppId: 'KUNDENVERWALTUNG', displayField: 'kundennummer' },
  { key: 'motive', label: 'Motive', type: 'multipleapplookup/select', targetEntity: 'motivkatalog', targetAppId: 'MOTIVKATALOG', displayField: 'motivname' },
  { key: 'breite_cm', label: 'Breite des Wandbildes (cm)', type: 'number' },
  { key: 'hoehe_cm', label: 'Höhe des Wandbildes (cm)', type: 'number' },
  { key: 'druckort', label: 'Druckort', type: 'lookup/radio', options: [{ key: 'innenbereich', label: 'Innenbereich' }, { key: 'aussenbereich', label: 'Außenbereich' }] },
  { key: 'oberflaechentyp', label: 'Oberflächentyp', type: 'string/text' },
  { key: 'sonderanforderungen', label: 'Sonderanforderungen', type: 'string/textarea' },
  { key: 'gesamtpreis', label: 'Gesamtpreis (€)', type: 'number' },
  { key: 'anzahlung', label: 'Anzahlung (€)', type: 'number' },
  { key: 'zahlungsstatus', label: 'Zahlungsstatus', type: 'lookup/select', options: [{ key: 'offen', label: 'Offen' }, { key: 'anzahlung_erhalten', label: 'Anzahlung erhalten' }, { key: 'vollstaendig_bezahlt', label: 'Vollständig bezahlt' }, { key: 'ueberfaellig', label: 'Überfällig' }] },
];
const PRODUKTIONSPLANUNG_FIELDS = [
  { key: 'produktionsnummer', label: 'Produktionsnummer', type: 'string/text' },
  { key: 'produktionsstatus', label: 'Produktionsstatus', type: 'lookup/select', options: [{ key: 'geplant', label: 'Geplant' }, { key: 'in_produktion', label: 'In Produktion' }, { key: 'qualitaetspruefung', label: 'Qualitätsprüfung' }, { key: 'abgeschlossen', label: 'Abgeschlossen' }, { key: 'pausiert', label: 'Pausiert' }] },
  { key: 'auftrag', label: 'Auftrag', type: 'applookup/select', targetEntity: 'auftragsverwaltung', targetAppId: 'AUFTRAGSVERWALTUNG', displayField: 'auftragsnummer' },
  { key: 'mitarbeiter', label: 'Verantwortlicher Mitarbeiter', type: 'applookup/select', targetEntity: 'mitarbeiterverwaltung', targetAppId: 'MITARBEITERVERWALTUNG', displayField: 'personalnummer' },
  { key: 'materialien', label: 'Materialien', type: 'multipleapplookup/select', targetEntity: 'materialverwaltung', targetAppId: 'MATERIALVERWALTUNG', displayField: 'materialname' },
  { key: 'geplanter_start', label: 'Geplanter Starttermin', type: 'date/datetimeminute' },
  { key: 'geplantes_ende', label: 'Geplanter Endtermin', type: 'date/datetimeminute' },
  { key: 'tatsaechlicher_start', label: 'Tatsächlicher Starttermin', type: 'date/datetimeminute' },
  { key: 'tatsaechliches_ende', label: 'Tatsächlicher Endtermin', type: 'date/datetimeminute' },
  { key: 'drucker_bezeichnung', label: 'Verwendeter Drucker', type: 'string/text' },
  { key: 'qualitaetspruefung_bestanden', label: 'Qualitätsprüfung bestanden', type: 'bool' },
  { key: 'notizen', label: 'Notizen zur Produktion', type: 'string/textarea' },
];

const ENTITY_TABS = [
  { key: 'kundenverwaltung', label: 'Kundenverwaltung', pascal: 'Kundenverwaltung' },
  { key: 'mitarbeiterverwaltung', label: 'Mitarbeiterverwaltung', pascal: 'Mitarbeiterverwaltung' },
  { key: 'motivkatalog', label: 'Motivkatalog', pascal: 'Motivkatalog' },
  { key: 'materialverwaltung', label: 'Materialverwaltung', pascal: 'Materialverwaltung' },
  { key: 'auftragsverwaltung', label: 'Auftragsverwaltung', pascal: 'Auftragsverwaltung' },
  { key: 'produktionsplanung', label: 'Produktionsplanung', pascal: 'Produktionsplanung' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('kundenverwaltung');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    'kundenverwaltung': new Set(),
    'mitarbeiterverwaltung': new Set(),
    'motivkatalog': new Set(),
    'materialverwaltung': new Set(),
    'auftragsverwaltung': new Set(),
    'produktionsplanung': new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    'kundenverwaltung': {},
    'mitarbeiterverwaltung': {},
    'motivkatalog': {},
    'materialverwaltung': {},
    'auftragsverwaltung': {},
    'produktionsplanung': {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'kundenverwaltung': return (data as any).kundenverwaltung as Kundenverwaltung[] ?? [];
      case 'mitarbeiterverwaltung': return (data as any).mitarbeiterverwaltung as Mitarbeiterverwaltung[] ?? [];
      case 'motivkatalog': return (data as any).motivkatalog as Motivkatalog[] ?? [];
      case 'materialverwaltung': return (data as any).materialverwaltung as Materialverwaltung[] ?? [];
      case 'auftragsverwaltung': return (data as any).auftragsverwaltung as Auftragsverwaltung[] ?? [];
      case 'produktionsplanung': return (data as any).produktionsplanung as Produktionsplanung[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'auftragsverwaltung':
        lists.kundenverwaltungList = (data as any).kundenverwaltung ?? [];
        lists.motivkatalogList = (data as any).motivkatalog ?? [];
        break;
      case 'produktionsplanung':
        lists.auftragsverwaltungList = (data as any).auftragsverwaltung ?? [];
        lists.mitarbeiterverwaltungList = (data as any).mitarbeiterverwaltung ?? [];
        lists.materialverwaltungList = (data as any).materialverwaltung ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'auftragsverwaltung' && fieldKey === 'kunde') {
      const match = (lists.kundenverwaltungList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.kundennummer ?? '—';
    }
    if (entity === 'auftragsverwaltung' && fieldKey === 'motive') {
      const match = (lists.motivkatalogList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.motivname ?? '—';
    }
    if (entity === 'produktionsplanung' && fieldKey === 'auftrag') {
      const match = (lists.auftragsverwaltungList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.auftragsnummer ?? '—';
    }
    if (entity === 'produktionsplanung' && fieldKey === 'mitarbeiter') {
      const match = (lists.mitarbeiterverwaltungList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.personalnummer ?? '—';
    }
    if (entity === 'produktionsplanung' && fieldKey === 'materialien') {
      const match = (lists.materialverwaltungList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.materialname ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'kundenverwaltung': return KUNDENVERWALTUNG_FIELDS;
      case 'mitarbeiterverwaltung': return MITARBEITERVERWALTUNG_FIELDS;
      case 'motivkatalog': return MOTIVKATALOG_FIELDS;
      case 'materialverwaltung': return MATERIALVERWALTUNG_FIELDS;
      case 'auftragsverwaltung': return AUFTRAGSVERWALTUNG_FIELDS;
      case 'produktionsplanung': return PRODUKTIONSPLANUNG_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'kundenverwaltung': return {
        create: (fields: any) => LivingAppsService.createKundenverwaltungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateKundenverwaltungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteKundenverwaltungEntry(id),
      };
      case 'mitarbeiterverwaltung': return {
        create: (fields: any) => LivingAppsService.createMitarbeiterverwaltungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateMitarbeiterverwaltungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteMitarbeiterverwaltungEntry(id),
      };
      case 'motivkatalog': return {
        create: (fields: any) => LivingAppsService.createMotivkatalogEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateMotivkatalogEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteMotivkatalogEntry(id),
      };
      case 'materialverwaltung': return {
        create: (fields: any) => LivingAppsService.createMaterialverwaltungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateMaterialverwaltungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteMaterialverwaltungEntry(id),
      };
      case 'auftragsverwaltung': return {
        create: (fields: any) => LivingAppsService.createAuftragsverwaltungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateAuftragsverwaltungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteAuftragsverwaltungEntry(id),
      };
      case 'produktionsplanung': return {
        create: (fields: any) => LivingAppsService.createProduktionsplanungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateProduktionsplanungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteProduktionsplanungEntry(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <IconFilter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <IconPencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Feld bearbeiten</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <IconCopy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Kopieren</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <IconTrash className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ausgewählte löschen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <IconX className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Auswahl aufheben</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.startsWith('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.startsWith('multipleapplookup')) {
                    return (
                      <TableCell key={fm.key}>
                        {Array.isArray(val) && val.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {val.map((url: any, i: number) => (
                              <span key={i} className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, url)}</span>
                            ))}
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type.startsWith('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'kundenverwaltung' || dialogState?.entity === 'kundenverwaltung') && (
        <KundenverwaltungDialog
          open={createEntity === 'kundenverwaltung' || dialogState?.entity === 'kundenverwaltung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'kundenverwaltung' ? handleUpdate : (fields: any) => handleCreate('kundenverwaltung', fields)}
          defaultValues={dialogState?.entity === 'kundenverwaltung' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Kundenverwaltung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Kundenverwaltung']}
        />
      )}
      {(createEntity === 'mitarbeiterverwaltung' || dialogState?.entity === 'mitarbeiterverwaltung') && (
        <MitarbeiterverwaltungDialog
          open={createEntity === 'mitarbeiterverwaltung' || dialogState?.entity === 'mitarbeiterverwaltung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'mitarbeiterverwaltung' ? handleUpdate : (fields: any) => handleCreate('mitarbeiterverwaltung', fields)}
          defaultValues={dialogState?.entity === 'mitarbeiterverwaltung' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Mitarbeiterverwaltung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Mitarbeiterverwaltung']}
        />
      )}
      {(createEntity === 'motivkatalog' || dialogState?.entity === 'motivkatalog') && (
        <MotivkatalogDialog
          open={createEntity === 'motivkatalog' || dialogState?.entity === 'motivkatalog'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'motivkatalog' ? handleUpdate : (fields: any) => handleCreate('motivkatalog', fields)}
          defaultValues={dialogState?.entity === 'motivkatalog' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Motivkatalog']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Motivkatalog']}
        />
      )}
      {(createEntity === 'materialverwaltung' || dialogState?.entity === 'materialverwaltung') && (
        <MaterialverwaltungDialog
          open={createEntity === 'materialverwaltung' || dialogState?.entity === 'materialverwaltung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'materialverwaltung' ? handleUpdate : (fields: any) => handleCreate('materialverwaltung', fields)}
          defaultValues={dialogState?.entity === 'materialverwaltung' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Materialverwaltung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Materialverwaltung']}
        />
      )}
      {(createEntity === 'auftragsverwaltung' || dialogState?.entity === 'auftragsverwaltung') && (
        <AuftragsverwaltungDialog
          open={createEntity === 'auftragsverwaltung' || dialogState?.entity === 'auftragsverwaltung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'auftragsverwaltung' ? handleUpdate : (fields: any) => handleCreate('auftragsverwaltung', fields)}
          defaultValues={dialogState?.entity === 'auftragsverwaltung' ? dialogState.record?.fields : undefined}
          kundenverwaltungList={(data as any).kundenverwaltung ?? []}
          motivkatalogList={(data as any).motivkatalog ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Auftragsverwaltung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Auftragsverwaltung']}
        />
      )}
      {(createEntity === 'produktionsplanung' || dialogState?.entity === 'produktionsplanung') && (
        <ProduktionsplanungDialog
          open={createEntity === 'produktionsplanung' || dialogState?.entity === 'produktionsplanung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'produktionsplanung' ? handleUpdate : (fields: any) => handleCreate('produktionsplanung', fields)}
          defaultValues={dialogState?.entity === 'produktionsplanung' ? dialogState.record?.fields : undefined}
          auftragsverwaltungList={(data as any).auftragsverwaltung ?? []}
          mitarbeiterverwaltungList={(data as any).mitarbeiterverwaltung ?? []}
          materialverwaltungList={(data as any).materialverwaltung ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Produktionsplanung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Produktionsplanung']}
        />
      )}
      {viewState?.entity === 'kundenverwaltung' && (
        <KundenverwaltungViewDialog
          open={viewState?.entity === 'kundenverwaltung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'kundenverwaltung', record: r }); }}
        />
      )}
      {viewState?.entity === 'mitarbeiterverwaltung' && (
        <MitarbeiterverwaltungViewDialog
          open={viewState?.entity === 'mitarbeiterverwaltung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'mitarbeiterverwaltung', record: r }); }}
        />
      )}
      {viewState?.entity === 'motivkatalog' && (
        <MotivkatalogViewDialog
          open={viewState?.entity === 'motivkatalog'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'motivkatalog', record: r }); }}
        />
      )}
      {viewState?.entity === 'materialverwaltung' && (
        <MaterialverwaltungViewDialog
          open={viewState?.entity === 'materialverwaltung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'materialverwaltung', record: r }); }}
        />
      )}
      {viewState?.entity === 'auftragsverwaltung' && (
        <AuftragsverwaltungViewDialog
          open={viewState?.entity === 'auftragsverwaltung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'auftragsverwaltung', record: r }); }}
          kundenverwaltungList={(data as any).kundenverwaltung ?? []}
          motivkatalogList={(data as any).motivkatalog ?? []}
        />
      )}
      {viewState?.entity === 'produktionsplanung' && (
        <ProduktionsplanungViewDialog
          open={viewState?.entity === 'produktionsplanung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'produktionsplanung', record: r }); }}
          auftragsverwaltungList={(data as any).auftragsverwaltung ?? []}
          mitarbeiterverwaltungList={(data as any).mitarbeiterverwaltung ?? []}
          materialverwaltungList={(data as any).materialverwaltung ?? []}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}