import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichAuftragsverwaltung, enrichProduktionsplanung } from '@/lib/enrich';
import type { EnrichedAuftragsverwaltung, EnrichedProduktionsplanung } from '@/types/enriched';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AuftragsverwaltungDialog } from '@/components/dialogs/AuftragsverwaltungDialog';
import { ProduktionsplanungDialog } from '@/components/dialogs/ProduktionsplanungDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconClipboardList,
  IconUsers, IconPackage, IconPhoto, IconChevronRight,
  IconCalendar, IconCurrencyEuro, IconArrowRight,
} from '@tabler/icons-react';

const APPGROUP_ID = '6a0d5c067430c8407df8ca32';
const REPAIR_ENDPOINT = '/claude/build/repair';

const AUFTRAG_STATUS_ORDER = ['neu', 'in_bearbeitung', 'in_produktion', 'abgeschlossen', 'storniert'];
const AUFTRAG_STATUS_LABELS: Record<string, string> = {
  neu: 'Neu',
  in_bearbeitung: 'In Bearbeitung',
  in_produktion: 'In Produktion',
  abgeschlossen: 'Abgeschlossen',
  storniert: 'Storniert',
};
const AUFTRAG_STATUS_COLORS: Record<string, string> = {
  neu: 'bg-blue-50 border-blue-200 text-blue-700',
  in_bearbeitung: 'bg-amber-50 border-amber-200 text-amber-700',
  in_produktion: 'bg-violet-50 border-violet-200 text-violet-700',
  abgeschlossen: 'bg-green-50 border-green-200 text-green-700',
  storniert: 'bg-red-50 border-red-200 text-red-700',
};
const AUFTRAG_BADGE_COLORS: Record<string, string> = {
  neu: 'bg-blue-100 text-blue-700 border-blue-200',
  in_bearbeitung: 'bg-amber-100 text-amber-700 border-amber-200',
  in_produktion: 'bg-violet-100 text-violet-700 border-violet-200',
  abgeschlossen: 'bg-green-100 text-green-700 border-green-200',
  storniert: 'bg-red-100 text-red-700 border-red-200',
};

const PROD_STATUS_COLORS: Record<string, string> = {
  geplant: 'bg-slate-100 text-slate-700',
  in_produktion: 'bg-violet-100 text-violet-700',
  qualitaetspruefung: 'bg-amber-100 text-amber-700',
  abgeschlossen: 'bg-green-100 text-green-700',
  pausiert: 'bg-red-100 text-red-700',
};

export default function DashboardOverview() {
  const {
    kundenverwaltung, mitarbeiterverwaltung, motivkatalog, materialverwaltung,
    auftragsverwaltung, produktionsplanung,
    kundenverwaltungMap, mitarbeiterverwaltungMap, motivkatalogMap, materialverwaltungMap, auftragsverwaltungMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedAuftragsverwaltung = enrichAuftragsverwaltung(auftragsverwaltung, { kundenverwaltungMap, motivkatalogMap });
  const enrichedProduktionsplanung = enrichProduktionsplanung(produktionsplanung, { auftragsverwaltungMap, mitarbeiterverwaltungMap, materialverwaltungMap });

  // --- State: Aufträge Dialog ---
  const [auftragDialogOpen, setAuftragDialogOpen] = useState(false);
  const [editAuftrag, setEditAuftrag] = useState<EnrichedAuftragsverwaltung | null>(null);
  const [deleteAuftrag, setDeleteAuftrag] = useState<EnrichedAuftragsverwaltung | null>(null);

  // --- State: Produktion Dialog ---
  const [prodDialogOpen, setProdDialogOpen] = useState(false);
  const [editProd, setEditProd] = useState<EnrichedProduktionsplanung | null>(null);
  const [deleteProd, setDeleteProd] = useState<EnrichedProduktionsplanung | null>(null);

  // --- State: Filter ---
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

  // --- KPIs ---
  const offeneAuftraege = useMemo(
    () => auftragsverwaltung.filter(a => {
      const k = a.fields.auftragsstatus?.key ?? '';
      return k !== 'abgeschlossen' && k !== 'storniert';
    }).length,
    [auftragsverwaltung]
  );

  const umsatzGesamt = useMemo(
    () => auftragsverwaltung.reduce((sum, a) => sum + (a.fields.gesamtpreis ?? 0), 0),
    [auftragsverwaltung]
  );

  const tiefBestandMaterialien = useMemo(
    () => materialverwaltung.filter(m =>
      (m.fields.lagerbestand ?? 0) < (m.fields.mindestbestand ?? 0)
    ).length,
    [materialverwaltung]
  );

  const aktiveProduktionen = useMemo(
    () => produktionsplanung.filter(p => p.fields.produktionsstatus?.key === 'in_produktion').length,
    [produktionsplanung]
  );

  // --- Kanban-Spalten ---
  const kanbanColumns = useMemo(() => {
    return AUFTRAG_STATUS_ORDER.map(status => ({
      status,
      label: AUFTRAG_STATUS_LABELS[status],
      items: enrichedAuftragsverwaltung.filter(a => (a.fields.auftragsstatus?.key ?? 'neu') === status),
    }));
  }, [enrichedAuftragsverwaltung]);

  const filteredKanban = useMemo(() => {
    if (!activeStatus) return kanbanColumns;
    return kanbanColumns.filter(c => c.status === activeStatus);
  }, [kanbanColumns, activeStatus]);

  // --- Handlers: Aufträge ---
  const handleCreateAuftrag = async (fields: EnrichedAuftragsverwaltung['fields']) => {
    await LivingAppsService.createAuftragsverwaltungEntry(fields as Parameters<typeof LivingAppsService.createAuftragsverwaltungEntry>[0]);
    fetchAll();
  };
  const handleEditAuftrag = async (fields: EnrichedAuftragsverwaltung['fields']) => {
    if (!editAuftrag) return;
    await LivingAppsService.updateAuftragsverwaltungEntry(editAuftrag.record_id, fields as Parameters<typeof LivingAppsService.updateAuftragsverwaltungEntry>[1]);
    fetchAll();
  };
  const handleDeleteAuftrag = async () => {
    if (!deleteAuftrag) return;
    await LivingAppsService.deleteAuftragsverwaltungEntry(deleteAuftrag.record_id);
    setDeleteAuftrag(null);
    fetchAll();
  };

  // --- Handlers: Produktion ---
  const handleCreateProd = async (fields: EnrichedProduktionsplanung['fields']) => {
    await LivingAppsService.createProduktionsplanungEntry(fields as Parameters<typeof LivingAppsService.createProduktionsplanungEntry>[0]);
    fetchAll();
  };
  const handleEditProd = async (fields: EnrichedProduktionsplanung['fields']) => {
    if (!editProd) return;
    await LivingAppsService.updateProduktionsplanungEntry(editProd.record_id, fields as Parameters<typeof LivingAppsService.updateProduktionsplanungEntry>[1]);
    fetchAll();
  };
  const handleDeleteProd = async () => {
    if (!deleteProd) return;
    await LivingAppsService.deleteProduktionsplanungEntry(deleteProd.record_id);
    setDeleteProd(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Workflow-Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a href="#/intents/auftrag-erstellen" className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow min-w-0 overflow-hidden">
          <IconClipboardList size={24} className="text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">Neuen Auftrag erstellen</div>
            <div className="text-sm text-muted-foreground truncate">Kunde auswählen, Motive wählen, Auftrag anlegen</div>
          </div>
          <IconChevronRight size={18} className="text-muted-foreground shrink-0" />
        </a>
        <a href="#/intents/produktion-starten" className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow min-w-0 overflow-hidden">
          <IconTool size={24} className="text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">Produktion starten</div>
            <div className="text-sm text-muted-foreground truncate">Auftrag → Mitarbeiter → Materialien → Produktionsplan</div>
          </div>
          <IconChevronRight size={18} className="text-muted-foreground shrink-0" />
        </a>
      </div>

      {/* KPI-Statistiken */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Offene Aufträge"
          value={String(offeneAuftraege)}
          description="Noch nicht abgeschlossen"
          icon={<IconClipboardList size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Aktive Produktion"
          value={String(aktiveProduktionen)}
          description="Derzeit in Produktion"
          icon={<IconPackage size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Gesamtumsatz"
          value={formatCurrency(umsatzGesamt)}
          description="Alle Aufträge"
          icon={<IconCurrencyEuro size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Materialwarnung"
          value={String(tiefBestandMaterialien)}
          description="Unter Mindestbestand"
          icon={<IconPackage size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Kanban-Board: Aufträge */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-semibold text-lg truncate">Auftragsübersicht</h2>
            <span className="text-sm text-muted-foreground">({auftragsverwaltung.length} gesamt)</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status-Filter */}
            <Button
              variant={activeStatus === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveStatus(null)}
            >
              Alle
            </Button>
            {AUFTRAG_STATUS_ORDER.filter(s => s !== 'storniert').map(s => (
              <Button
                key={s}
                variant={activeStatus === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveStatus(activeStatus === s ? null : s)}
                className="hidden sm:inline-flex"
              >
                {AUFTRAG_STATUS_LABELS[s]}
              </Button>
            ))}
            <Button
              size="sm"
              onClick={() => { setEditAuftrag(null); setAuftragDialogOpen(true); }}
            >
              <IconPlus size={16} className="shrink-0 mr-1" />
              <span className="hidden sm:inline">Neuer Auftrag</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          </div>
        </div>

        {/* Kanban-Spalten */}
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-max">
            {filteredKanban.map(col => (
              <div
                key={col.status}
                className={`flex flex-col rounded-2xl border p-3 w-72 ${AUFTRAG_STATUS_COLORS[col.status] ?? 'bg-muted border-border'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{col.label}</span>
                    <span className={`inline-flex items-center justify-center rounded-full text-xs font-medium px-2 py-0.5 border ${AUFTRAG_BADGE_COLORS[col.status]}`}>
                      {col.items.length}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-h-[120px]">
                  {col.items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/60 text-xs gap-1">
                      <IconClipboardList size={24} stroke={1.5} />
                      <span>Keine Aufträge</span>
                    </div>
                  )}
                  {col.items.map(auftrag => (
                    <AuftragCard
                      key={auftrag.record_id}
                      auftrag={auftrag}
                      onEdit={() => { setEditAuftrag(auftrag); setAuftragDialogOpen(true); }}
                      onDelete={() => setDeleteAuftrag(auftrag)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Produktionsplanung-Übersicht */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-semibold text-lg truncate">Produktionsplanung</h2>
            <span className="text-sm text-muted-foreground">({produktionsplanung.length} gesamt)</span>
          </div>
          <Button
            size="sm"
            onClick={() => { setEditProd(null); setProdDialogOpen(true); }}
          >
            <IconPlus size={16} className="shrink-0 mr-1" />
            <span className="hidden sm:inline">Neuer Produktionsauftrag</span>
            <span className="sm:hidden">Neu</span>
          </Button>
        </div>

        <div className="overflow-x-auto rounded-2xl border bg-card">
          {enrichedProduktionsplanung.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <IconPackage size={40} stroke={1.5} />
              <p className="text-sm">Noch keine Produktionsaufträge vorhanden.</p>
              <Button size="sm" variant="outline" onClick={() => { setEditProd(null); setProdDialogOpen(true); }}>
                <IconPlus size={14} className="mr-1" />Jetzt erstellen
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nr.</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Auftrag</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Mitarbeiter</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Start</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Ende</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {enrichedProduktionsplanung.map((prod, idx) => {
                  const statusKey = prod.fields.produktionsstatus?.key ?? '';
                  const statusLabel = prod.fields.produktionsstatus?.label ?? statusKey;
                  const colorClass = PROD_STATUS_COLORS[statusKey] ?? 'bg-muted text-muted-foreground';
                  return (
                    <tr key={prod.record_id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/5'}`}>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {prod.fields.produktionsnummer ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
                          {statusLabel || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="truncate max-w-[150px] block">{prod.auftragName || '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <IconUsers size={14} className="shrink-0 text-muted-foreground" />
                          <span className="truncate">{prod.mitarbeiterName || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                        {prod.fields.geplanter_start ? formatDate(prod.fields.geplanter_start) : '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                        {prod.fields.geplantes_ende ? formatDate(prod.fields.geplantes_ende) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => { setEditProd(prod); setProdDialogOpen(true); }}
                          >
                            <IconPencil size={14} className="shrink-0" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteProd(prod)}
                          >
                            <IconTrash size={14} className="shrink-0" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Schnellzugriff: Material & Motive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Materialien mit Mindestbestand-Warnung */}
        <section className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <IconPackage size={16} className="text-muted-foreground shrink-0" />
              Materialien
            </h3>
            <a href="#/materialverwaltung" className="text-xs text-primary flex items-center gap-1 hover:underline">
              Alle <IconArrowRight size={12} />
            </a>
          </div>
          {materialverwaltung.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Keine Materialien vorhanden.</p>
          ) : (
            <div className="space-y-2">
              {materialverwaltung.slice(0, 6).map(mat => {
                const bestand = mat.fields.lagerbestand ?? 0;
                const mindest = mat.fields.mindestbestand ?? 0;
                const warn = bestand < mindest;
                const einheit = mat.fields.einheit?.label ?? '';
                return (
                  <div key={mat.record_id} className={`flex items-center justify-between rounded-xl px-3 py-2 ${warn ? 'bg-red-50 border border-red-200' : 'bg-muted/30'}`}>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${warn ? 'text-red-700' : ''}`}>
                        {mat.fields.materialname ?? '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">{mat.fields.materialtyp?.label ?? ''}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`text-sm font-semibold ${warn ? 'text-red-600' : 'text-foreground'}`}>
                        {bestand} {einheit}
                      </p>
                      {warn && <p className="text-xs text-red-500">Min: {mindest}</p>}
                    </div>
                  </div>
                );
              })}
              {materialverwaltung.length > 6 && (
                <a href="#/materialverwaltung" className="flex items-center justify-center gap-1 text-xs text-primary hover:underline pt-1">
                  +{materialverwaltung.length - 6} weitere <IconChevronRight size={12} />
                </a>
              )}
            </div>
          )}
        </section>

        {/* Motivkatalog-Vorschau */}
        <section className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <IconPhoto size={16} className="text-muted-foreground shrink-0" />
              Motivkatalog
            </h3>
            <a href="#/motivkatalog" className="text-xs text-primary flex items-center gap-1 hover:underline">
              Alle <IconArrowRight size={12} />
            </a>
          </div>
          {motivkatalog.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Keine Motive vorhanden.</p>
          ) : (
            <div className="space-y-2">
              {motivkatalog.slice(0, 6).map(motiv => {
                const verfuegbar = motiv.fields.verfuegbar !== false;
                return (
                  <div key={motiv.record_id} className="flex items-center justify-between rounded-xl px-3 py-2 bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{motiv.fields.motivname ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{motiv.fields.kategorie?.label ?? ''}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {motiv.fields.basispreis_pro_qm != null && (
                        <span className="text-xs text-muted-foreground">{formatCurrency(motiv.fields.basispreis_pro_qm)}/m²</span>
                      )}
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${verfuegbar ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {verfuegbar ? 'Verfügbar' : 'Nicht verfügbar'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {motivkatalog.length > 6 && (
                <a href="#/motivkatalog" className="flex items-center justify-center gap-1 text-xs text-primary hover:underline pt-1">
                  +{motivkatalog.length - 6} weitere <IconChevronRight size={12} />
                </a>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Mitarbeiter-Übersicht */}
      <section className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <IconUsers size={16} className="text-muted-foreground shrink-0" />
            Team
          </h3>
          <a href="#/mitarbeiterverwaltung" className="text-xs text-primary flex items-center gap-1 hover:underline">
            Alle <IconArrowRight size={12} />
          </a>
        </div>
        {mitarbeiterverwaltung.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Keine Mitarbeiter vorhanden.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {mitarbeiterverwaltung.map(ma => {
              const initials = `${(ma.fields.vorname ?? '')[0] ?? ''}${(ma.fields.nachname ?? '')[0] ?? ''}`.toUpperCase();
              return (
                <div key={ma.record_id} className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {initials || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">
                      {ma.fields.vorname} {ma.fields.nachname}
                    </p>
                    <p className="text-xs text-muted-foreground leading-tight">{ma.fields.position?.label ?? ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Auftrags-Dialog */}
      <AuftragsverwaltungDialog
        open={auftragDialogOpen}
        onClose={() => { setAuftragDialogOpen(false); setEditAuftrag(null); }}
        onSubmit={editAuftrag ? handleEditAuftrag : handleCreateAuftrag}
        defaultValues={editAuftrag?.fields}
        recordId={editAuftrag?.record_id}
        kundenverwaltungList={kundenverwaltung}
        motivkatalogList={motivkatalog}
        enablePhotoScan={AI_PHOTO_SCAN['Auftragsverwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Auftragsverwaltung']}
      />

      <ConfirmDialog
        open={!!deleteAuftrag}
        title="Auftrag löschen"
        description={`Auftrag "${deleteAuftrag?.fields.auftragsnummer ?? ''}" wirklich löschen?`}
        onConfirm={handleDeleteAuftrag}
        onClose={() => setDeleteAuftrag(null)}
      />

      {/* Produktions-Dialog */}
      <ProduktionsplanungDialog
        open={prodDialogOpen}
        onClose={() => { setProdDialogOpen(false); setEditProd(null); }}
        onSubmit={editProd ? handleEditProd : handleCreateProd}
        defaultValues={editProd?.fields}
        recordId={editProd?.record_id}
        auftragsverwaltungList={auftragsverwaltung}
        mitarbeiterverwaltungList={mitarbeiterverwaltung}
        materialverwaltungList={materialverwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['Produktionsplanung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Produktionsplanung']}
      />

      <ConfirmDialog
        open={!!deleteProd}
        title="Produktionsauftrag löschen"
        description={`Produktionsauftrag "${deleteProd?.fields.produktionsnummer ?? ''}" wirklich löschen?`}
        onConfirm={handleDeleteProd}
        onClose={() => setDeleteProd(null)}
      />
    </div>
  );
}

// --- AuftragCard Komponente ---
interface AuftragCardProps {
  auftrag: EnrichedAuftragsverwaltung;
  onEdit: () => void;
  onDelete: () => void;
}

function AuftragCard({ auftrag, onEdit, onDelete }: AuftragCardProps) {
  const { fields, kundeName } = auftrag;
  const flaecheQm = fields.breite_cm && fields.hoehe_cm
    ? ((fields.breite_cm / 100) * (fields.hoehe_cm / 100)).toFixed(2)
    : null;

  return (
    <div className="bg-white/80 rounded-xl border border-white/60 shadow-sm p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{fields.auftragsnummer ?? '—'}</p>
          {kundeName && (
            <p className="text-xs text-muted-foreground truncate">{kundeName}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1 rounded-lg hover:bg-black/10 transition-colors"
            title="Bearbeiten"
          >
            <IconPencil size={13} className="text-muted-foreground" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded-lg hover:bg-red-100 transition-colors"
            title="Löschen"
          >
            <IconTrash size={13} className="text-red-500" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {fields.lieferdatum && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <IconCalendar size={11} className="shrink-0" />
            {formatDate(fields.lieferdatum)}
          </span>
        )}
        {flaecheQm && (
          <span className="text-muted-foreground">{flaecheQm} m²</span>
        )}
      </div>

      {fields.gesamtpreis != null && (
        <p className="text-sm font-semibold text-foreground">{formatCurrency(fields.gesamtpreis)}</p>
      )}

      {fields.zahlungsstatus && (
        <Badge variant="outline" className="text-xs py-0 px-2 font-normal">
          {fields.zahlungsstatus.label}
        </Badge>
      )}
    </div>
  );
}

// --- Skeleton ---
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 w-72 shrink-0 rounded-2xl" />)}
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

// --- Error ---
function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte lade die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktiere den Support.</p>}
    </div>
  );
}
