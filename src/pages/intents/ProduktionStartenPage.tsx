import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import type { Auftragsverwaltung, Mitarbeiterverwaltung, Materialverwaltung } from '@/types/app';
import { AuftragsverwaltungDialog } from '@/components/dialogs/AuftragsverwaltungDialog';
import { MitarbeiterverwaltungDialog } from '@/components/dialogs/MitarbeiterverwaltungDialog';
import { MaterialverwaltungDialog } from '@/components/dialogs/MaterialverwaltungDialog';
import {
  IconPackage,
  IconUser,
  IconBoxSeam,
  IconCalendarEvent,
  IconRocket,
  IconAlertTriangle,
  IconCircleCheck,
  IconPrinter,
  IconArrowRight,
  IconArrowLeft,
  IconCheck,
  IconClipboardList,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Auftrag' },
  { label: 'Mitarbeiter' },
  { label: 'Materialien' },
  { label: 'Zeitplan' },
  { label: 'Bestätigung' },
];

// Orders that are ready for production (not yet in production or completed/cancelled)
const PRODUCTION_READY_STATUSES = ['neu', 'in_bearbeitung'];

export default function ProduktionStartenPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { loading, error, fetchAll, auftragsverwaltung, mitarbeiterverwaltung, materialverwaltung, kundenverwaltungMap, kundenverwaltung, motivkatalog } = useDashboardData();

  // Step state — initialize from URL
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    return urlStep >= 1 && urlStep <= 5 ? urlStep : 1;
  });

  // Selections
  const [selectedAuftrag, setSelectedAuftrag] = useState<Auftragsverwaltung | null>(null);
  const [selectedMitarbeiter, setSelectedMitarbeiter] = useState<Mitarbeiterverwaltung | null>(null);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());

  // Step 4 form
  const [druckerBezeichnung, setDruckerBezeichnung] = useState('');
  const [geplanterStart, setGeplanterStart] = useState('');
  const [geplantesEnde, setGeplantesEnde] = useState('');
  const [notizen, setNotizen] = useState('');

  // Dialog states
  const [auftragDialogOpen, setAuftragDialogOpen] = useState(false);
  const [mitarbeiterDialogOpen, setMitarbeiterDialogOpen] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successProdNummer, setSuccessProdNummer] = useState<string | null>(null);

  // Deep-link: if auftragId in URL, pre-select and advance to step 2 once data loaded
  useEffect(() => {
    if (loading) return;
    const auftragId = searchParams.get('auftragId');
    if (auftragId && !selectedAuftrag) {
      const found = auftragsverwaltung.find(a => a.record_id === auftragId);
      if (found) {
        setSelectedAuftrag(found);
        setCurrentStep(2);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, auftragsverwaltung]);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  // Sync step to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('step', String(currentStep));
    if (selectedAuftrag) {
      params.set('auftragId', selectedAuftrag.record_id);
    }
    setSearchParams(params, { replace: true });
  }, [currentStep, selectedAuftrag, searchParams, setSearchParams]);

  // Duration calculation
  const durationText = (() => {
    if (!geplanterStart || !geplantesEnde) return null;
    const start = new Date(geplanterStart);
    const end = new Date(geplantesEnde);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return 'Endzeitpunkt muss nach Startzeitpunkt liegen';
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes} Min.`;
    if (minutes === 0) return `${hours} Std.`;
    return `${hours} Std. ${minutes} Min.`;
  })();

  const selectedMaterials = materialverwaltung.filter(m => selectedMaterialIds.has(m.record_id));
  const hasLowStockSelected = selectedMaterials.some(
    m => (m.fields.lagerbestand ?? 0) < (m.fields.mindestbestand ?? 0)
  );

  const handleSelectAuftrag = (id: string) => {
    const found = auftragsverwaltung.find(a => a.record_id === id);
    if (found) {
      setSelectedAuftrag(found);
      setCurrentStep(2);
    }
  };

  const handleSelectMitarbeiter = (id: string) => {
    const found = mitarbeiterverwaltung.find(m => m.record_id === id);
    if (found) {
      setSelectedMitarbeiter(found);
      setCurrentStep(3);
    }
  };

  const toggleMaterial = (id: string) => {
    setSelectedMaterialIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedAuftrag || !selectedMitarbeiter) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const prodNummer = `P-${Date.now()}`;
      const materialienUrls = Array.from(selectedMaterialIds).map(id =>
        createRecordUrl(APP_IDS.MATERIALVERWALTUNG, id)
      );
      await LivingAppsService.createProduktionsplanungEntry({
        produktionsnummer: prodNummer,
        produktionsstatus: 'geplant',
        auftrag: createRecordUrl(APP_IDS.AUFTRAGSVERWALTUNG, selectedAuftrag.record_id),
        mitarbeiter: createRecordUrl(APP_IDS.MITARBEITERVERWALTUNG, selectedMitarbeiter.record_id),
        materialien: materialienUrls as unknown as string,
        geplanter_start: geplanterStart,
        geplantes_ende: geplantesEnde,
        drucker_bezeichnung: druckerBezeichnung,
        notizen: notizen || undefined,
      });
      setSuccessProdNummer(prodNummer);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSubmitting(false);
    }
  };

  // Render order items for EntitySelectStep
  const auftragItems = auftragsverwaltung.map(a => {
    const kundeId = extractRecordId(a.fields.kunde);
    const kunde = kundeId ? kundenverwaltungMap.get(kundeId) : null;
    const kundeName = kunde
      ? [kunde.fields.vorname, kunde.fields.nachname].filter(Boolean).join(' ') || kunde.fields.firma || ''
      : '';
    const isReady = PRODUCTION_READY_STATUSES.includes(a.fields.auftragsstatus?.key ?? '');
    return {
      id: a.record_id,
      title: a.fields.auftragsnummer ?? `Auftrag ${a.record_id.slice(-6)}`,
      subtitle: [kundeName, a.fields.lieferdatum ? `Lieferung: ${a.fields.lieferdatum}` : null]
        .filter(Boolean).join(' · '),
      status: a.fields.auftragsstatus
        ? { key: a.fields.auftragsstatus.key, label: a.fields.auftragsstatus.label }
        : undefined,
      icon: <IconPackage size={18} className={isReady ? 'text-primary' : 'text-muted-foreground'} />,
    };
  });

  // Filter to show ready orders first (ready at top)
  const readyAuftraege = auftragItems.filter(i =>
    PRODUCTION_READY_STATUSES.includes(
      auftragsverwaltung.find(a => a.record_id === i.id)?.fields.auftragsstatus?.key ?? ''
    )
  );
  const otherAuftraege = auftragItems.filter(i => !readyAuftraege.find(r => r.id === i.id));
  const sortedAuftragItems = [...readyAuftraege, ...otherAuftraege];

  const mitarbeiterItems = mitarbeiterverwaltung.map(m => ({
    id: m.record_id,
    title: [m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ') || `Mitarbeiter ${m.record_id.slice(-6)}`,
    subtitle: m.fields.position?.label,
    icon: <IconUser size={18} className="text-primary" />,
  }));

  const step4Valid =
    druckerBezeichnung.trim() !== '' &&
    geplanterStart !== '' &&
    geplantesEnde !== '' &&
    (durationText === null || !durationText.includes('muss nach'));

  // Success screen
  if (successProdNummer) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <a href="#/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <IconArrowLeft size={14} className="shrink-0" />
            Zurück zum Dashboard
          </a>
          <h1 className="text-2xl font-bold tracking-tight">Produktion starten</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <IconCircleCheck size={36} className="text-green-600" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">Produktion gestartet!</h2>
            <p className="text-muted-foreground">
              Der Produktionsplan <span className="font-semibold text-foreground">{successProdNummer}</span> wurde erfolgreich angelegt.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <a href="#/produktionsplanung">
              <Button variant="default">
                <IconClipboardList size={16} className="mr-2" />
                Zur Produktionsplanung
              </Button>
            </a>
            <a href="#/">
              <Button variant="outline">Zum Dashboard</Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <IntentWizardShell
      title="Produktion starten"
      subtitle="Wähle einen Auftrag, weise einen Mitarbeiter zu und plane den Produktionsablauf."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* STEP 1: Auftrag auswählen */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Auftrag auswählen</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Wähle einen Auftrag aus, der in die Produktion gehen soll.
              {readyAuftraege.length > 0 && (
                <span className="ml-1 text-primary font-medium">
                  {readyAuftraege.length} {readyAuftraege.length === 1 ? 'Auftrag bereit' : 'Aufträge bereit'}.
                </span>
              )}
            </p>
          </div>
          <EntitySelectStep
            items={sortedAuftragItems}
            onSelect={handleSelectAuftrag}
            searchPlaceholder="Auftrag suchen..."
            emptyIcon={<IconPackage size={32} />}
            emptyText="Keine Aufträge gefunden."
            createLabel="Neuen Auftrag anlegen"
            onCreateNew={() => setAuftragDialogOpen(true)}
            createDialog={
              <AuftragsverwaltungDialog
                open={auftragDialogOpen}
                onClose={() => setAuftragDialogOpen(false)}
                onSubmit={async (fields) => {
                  await LivingAppsService.createAuftragsverwaltungEntry(fields);
                  await fetchAll();
                }}
                kundenverwaltungList={kundenverwaltung}
                motivkatalogList={motivkatalog}
                enablePhotoScan={AI_PHOTO_SCAN['Auftragsverwaltung']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Auftragsverwaltung']}
              />
            }
          />
        </div>
      )}

      {/* STEP 2: Mitarbeiter zuweisen */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Mitarbeiter zuweisen</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Wähle den verantwortlichen Mitarbeiter für diesen Produktionsauftrag.
              </p>
            </div>
            {selectedAuftrag && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 text-sm min-w-0">
                <IconPackage size={15} className="text-primary shrink-0" />
                <span className="truncate font-medium">{selectedAuftrag.fields.auftragsnummer ?? 'Auftrag'}</span>
                <StatusBadge
                  statusKey={selectedAuftrag.fields.auftragsstatus?.key}
                  label={selectedAuftrag.fields.auftragsstatus?.label}
                />
              </div>
            )}
          </div>
          <EntitySelectStep
            items={mitarbeiterItems}
            onSelect={handleSelectMitarbeiter}
            searchPlaceholder="Mitarbeiter suchen..."
            emptyIcon={<IconUser size={32} />}
            emptyText="Keine Mitarbeiter gefunden."
            createLabel="Neuen Mitarbeiter anlegen"
            onCreateNew={() => setMitarbeiterDialogOpen(true)}
            createDialog={
              <MitarbeiterverwaltungDialog
                open={mitarbeiterDialogOpen}
                onClose={() => setMitarbeiterDialogOpen(false)}
                onSubmit={async (fields) => {
                  await LivingAppsService.createMitarbeiterverwaltungEntry(fields);
                  await fetchAll();
                }}
                enablePhotoScan={AI_PHOTO_SCAN['Mitarbeiterverwaltung']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Mitarbeiterverwaltung']}
              />
            }
          />
          <div className="flex justify-start pt-2">
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}>
              <IconArrowLeft size={15} className="mr-1.5" />
              Zurück
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Materialien prüfen */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Materialien prüfen</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Wähle die benötigten Materialien für diesen Produktionsauftrag aus.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedAuftrag && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 text-sm">
                  <IconPackage size={15} className="text-primary shrink-0" />
                  <span className="font-medium truncate">{selectedAuftrag.fields.auftragsnummer ?? 'Auftrag'}</span>
                </div>
              )}
              {selectedMitarbeiter && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 text-sm">
                  <IconUser size={15} className="text-primary shrink-0" />
                  <span className="font-medium truncate">
                    {[selectedMitarbeiter.fields.vorname, selectedMitarbeiter.fields.nachname].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {hasLowStockSelected && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
              <IconAlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Lagerbestand zu niedrig</p>
                <p className="text-xs mt-0.5">
                  Einige der ausgewählten Materialien haben einen Lagerbestand unter dem Mindestbestand. Bitte prüfe die Verfügbarkeit.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {materialverwaltung.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <IconBoxSeam size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Keine Materialien vorhanden.</p>
              </div>
            ) : (
              materialverwaltung.map((mat: Materialverwaltung) => {
                const isSelected = selectedMaterialIds.has(mat.record_id);
                const lager = mat.fields.lagerbestand ?? 0;
                const mindest = mat.fields.mindestbestand ?? 0;
                const isLow = lager < mindest;
                return (
                  <div
                    key={mat.record_id}
                    onClick={() => toggleMaterial(mat.record_id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors overflow-hidden ${
                      isSelected
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border bg-card hover:bg-accent'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleMaterial(mat.record_id)}
                      className="shrink-0"
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {mat.fields.materialname ?? `Material ${mat.record_id.slice(-6)}`}
                        </span>
                        {mat.fields.materialtyp && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                            {mat.fields.materialtyp.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                        <span>
                          Bestand: <span className={`font-medium ${isLow ? 'text-red-600' : 'text-green-700'}`}>{lager}</span>
                          {mat.fields.einheit && <span className="ml-0.5">{mat.fields.einheit.label}</span>}
                        </span>
                        <span>
                          Mindestbestand: <span className="font-medium text-foreground">{mindest}</span>
                          {mat.fields.einheit && <span className="ml-0.5">{mat.fields.einheit.label}</span>}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isLow ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-red-100 text-red-700 border-red-200">
                          Zu wenig
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-green-100 text-green-700 border-green-200">
                          Ausreichend
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)}>
              <IconArrowLeft size={15} className="mr-1.5" />
              Zurück
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setMaterialDialogOpen(true)}>
                <IconBoxSeam size={15} className="mr-1.5" />
                Neues Material anlegen
              </Button>
              <Button
                onClick={() => setCurrentStep(4)}
                disabled={selectedMaterialIds.size === 0}
              >
                Weiter ({selectedMaterialIds.size} ausgewählt)
                <IconArrowRight size={15} className="ml-1.5" />
              </Button>
            </div>
          </div>

          <MaterialverwaltungDialog
            open={materialDialogOpen}
            onClose={() => setMaterialDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createMaterialverwaltungEntry(fields);
              await fetchAll();
            }}
            enablePhotoScan={AI_PHOTO_SCAN['Materialverwaltung']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Materialverwaltung']}
          />
        </div>
      )}

      {/* STEP 4: Produktionsplan festlegen */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Produktionsplan festlegen</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gib die Zeitplanung und den Drucker für diesen Auftrag an.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Form */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 rounded-2xl border bg-card space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="drucker">
                    Drucker-Bezeichnung <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <IconPrinter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="drucker"
                      placeholder="z. B. Großformat-Drucker A1"
                      value={druckerBezeichnung}
                      onChange={e => setDruckerBezeichnung(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="geplanter_start">
                      Geplanter Start <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="geplanter_start"
                      type="datetime-local"
                      value={geplanterStart}
                      onChange={e => setGeplanterStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="geplantes_ende">
                      Geplantes Ende <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="geplantes_ende"
                      type="datetime-local"
                      value={geplantesEnde}
                      onChange={e => setGeplantesEnde(e.target.value)}
                    />
                  </div>
                </div>

                {durationText && (
                  <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                    durationText.includes('muss nach')
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-primary/5 text-primary border border-primary/20'
                  }`}>
                    <IconCalendarEvent size={15} className="shrink-0" />
                    {durationText.includes('muss nach')
                      ? durationText
                      : `Geplante Dauer: ${durationText}`
                    }
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notizen">Notizen (optional)</Label>
                  <Textarea
                    id="notizen"
                    placeholder="Besondere Hinweise zur Produktion..."
                    value={notizen}
                    onChange={e => setNotizen(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Summary sidebar */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Zusammenfassung</h3>
              <div className="p-4 rounded-2xl border bg-card space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconPackage size={14} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Auftrag</p>
                    <p className="font-medium truncate">{selectedAuftrag?.fields.auftragsnummer ?? '–'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconUser size={14} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Mitarbeiter</p>
                    <p className="font-medium truncate">
                      {selectedMitarbeiter
                        ? [selectedMitarbeiter.fields.vorname, selectedMitarbeiter.fields.nachname].filter(Boolean).join(' ')
                        : '–'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconBoxSeam size={14} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Materialien</p>
                    <p className="font-medium">{selectedMaterialIds.size} ausgewählt</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)}>
              <IconArrowLeft size={15} className="mr-1.5" />
              Zurück
            </Button>
            <Button
              onClick={() => setCurrentStep(5)}
              disabled={!step4Valid}
            >
              Weiter zur Bestätigung
              <IconArrowRight size={15} className="ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Bestätigung & Starten */}
      {currentStep === 5 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Bestätigung & Starten</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Prüfe alle Angaben und starte dann die Produktion.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Auftrag */}
            <div className="p-4 rounded-2xl border bg-card space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <IconPackage size={14} />
                Auftrag
              </div>
              <p className="font-semibold">{selectedAuftrag?.fields.auftragsnummer ?? '–'}</p>
              {selectedAuftrag?.fields.auftragsstatus && (
                <StatusBadge
                  statusKey={selectedAuftrag.fields.auftragsstatus.key}
                  label={selectedAuftrag.fields.auftragsstatus.label}
                />
              )}
              {selectedAuftrag?.fields.lieferdatum && (
                <p className="text-xs text-muted-foreground">Lieferung: {selectedAuftrag.fields.lieferdatum}</p>
              )}
            </div>

            {/* Mitarbeiter */}
            <div className="p-4 rounded-2xl border bg-card space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <IconUser size={14} />
                Mitarbeiter
              </div>
              <p className="font-semibold">
                {selectedMitarbeiter
                  ? [selectedMitarbeiter.fields.vorname, selectedMitarbeiter.fields.nachname].filter(Boolean).join(' ')
                  : '–'}
              </p>
              {selectedMitarbeiter?.fields.position && (
                <p className="text-xs text-muted-foreground">{selectedMitarbeiter.fields.position.label}</p>
              )}
            </div>

            {/* Zeitplan */}
            <div className="p-4 rounded-2xl border bg-card space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <IconCalendarEvent size={14} />
                Zeitplan
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs w-10">Start</span>
                  <span className="font-medium">{geplanterStart.replace('T', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs w-10">Ende</span>
                  <span className="font-medium">{geplantesEnde.replace('T', ' ')}</span>
                </div>
                {durationText && !durationText.includes('muss nach') && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs w-10">Dauer</span>
                    <span className="font-medium text-primary">{durationText}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Drucker */}
            <div className="p-4 rounded-2xl border bg-card space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <IconPrinter size={14} />
                Drucker
              </div>
              <p className="font-semibold">{druckerBezeichnung}</p>
            </div>
          </div>

          {/* Materialien */}
          <div className="p-4 rounded-2xl border bg-card space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <IconBoxSeam size={14} />
              Materialien ({selectedMaterials.length})
            </div>
            {hasLowStockSelected && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                <IconAlertTriangle size={14} className="shrink-0" />
                Achtung: Einige Materialien haben unzureichenden Lagerbestand.
              </div>
            )}
            <div className="space-y-1">
              {selectedMaterials.map(mat => {
                const lager = mat.fields.lagerbestand ?? 0;
                const mindest = mat.fields.mindestbestand ?? 0;
                const isLow = lager < mindest;
                return (
                  <div key={mat.record_id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-b-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <IconCheck size={13} className="text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {mat.fields.materialname ?? `Material ${mat.record_id.slice(-6)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {lager} {mat.fields.einheit?.label ?? ''}
                      </span>
                      {isLow && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                          Niedrig
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notizen */}
          {notizen && (
            <div className="p-4 rounded-2xl border bg-card">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notizen</p>
              <p className="text-sm whitespace-pre-wrap">{notizen}</p>
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
              <IconAlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p className="text-sm">{submitError}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep(4)}>
              <IconArrowLeft size={15} className="mr-1.5" />
              Zurück
            </Button>
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2"
            >
              <IconRocket size={18} />
              {submitting ? 'Wird gestartet...' : 'Produktion starten'}
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
