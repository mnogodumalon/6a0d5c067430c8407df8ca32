import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { BudgetTracker } from '@/components/BudgetTracker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Kundenverwaltung, Motivkatalog } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { KundenverwaltungDialog } from '@/components/dialogs/KundenverwaltungDialog';
import { MotivkatalogDialog } from '@/components/dialogs/MotivkatalogDialog';
import {
  IconPlus,
  IconCheck,
  IconChevronRight,
  IconArrowLeft,
  IconUser,
  IconPhoto,
  IconRuler,
  IconCalendar,
  IconCurrencyEuro,
  IconCircleCheck,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Kunde' },
  { label: 'Motive' },
  { label: 'Details' },
  { label: 'Bestätigung' },
];

const druckortOptions = LOOKUP_OPTIONS['auftragsverwaltung']?.druckort ?? [];
const zahlungsstatusOptions = LOOKUP_OPTIONS['auftragsverwaltung']?.zahlungsstatus ?? [];
const auftragsstatusOptions = LOOKUP_OPTIONS['auftragsverwaltung']?.auftragsstatus ?? [];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
}

export default function AuftragErstellenPage() {
  const [searchParams] = useSearchParams();
  const initialStep = (() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    return s >= 1 && s <= 4 ? s : 1;
  })();
  const initialKundeId = searchParams.get('kundeId') ?? null;

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [selectedKunde, setSelectedKunde] = useState<Kundenverwaltung | null>(null);
  const [selectedKundeId, setSelectedKundeId] = useState<string | null>(initialKundeId);
  const [selectedMotivIds, setSelectedMotivIds] = useState<Set<string>>(new Set());
  const [kundeDialogOpen, setKundeDialogOpen] = useState(false);
  const [motivDialogOpen, setMotivDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Step 3 form state
  const [breite, setBreite] = useState('');
  const [hoehe, setHoehe] = useState('');
  const [druckort, setDruckort] = useState(druckortOptions[0]?.key ?? '');
  const [oberflaechentyp, setOberflaechentyp] = useState('');
  const [lieferdatum, setLieferdatum] = useState('');
  const [sonderanforderungen, setSonderanforderungen] = useState('');
  const [anzahlung, setAnzahlung] = useState('');
  const [zahlungsstatus, setZahlungsstatus] = useState(zahlungsstatusOptions[0]?.key ?? '');

  const { kundenverwaltung, motivkatalog, loading, error, fetchAll, kundenverwaltungMap } = useDashboardData();

  // Sync kunde from URL param once data loads
  const syncKunde = useCallback(() => {
    if (initialKundeId && !selectedKunde) {
      const k = kundenverwaltungMap.get(initialKundeId);
      if (k) {
        setSelectedKunde(k);
        setSelectedKundeId(k.record_id);
      }
    }
  }, [initialKundeId, selectedKunde, kundenverwaltungMap]);

  useEffect(() => {
    if (!loading && initialKundeId && !selectedKunde && kundenverwaltungMap.size > 0) {
      syncKunde();
    }
  }, [loading, initialKundeId, selectedKunde, kundenverwaltungMap, syncKunde]);

  const availableMotivs = motivkatalog.filter(m => m.fields.verfuegbar === true);

  const selectedMotivList: Motivkatalog[] = Array.from(selectedMotivIds)
    .map(id => motivkatalog.find(m => m.record_id === id))
    .filter((m): m is Motivkatalog => !!m);

  const breiteNum = parseFloat(breite) || 0;
  const hoeheNum = parseFloat(hoehe) || 0;
  const areaQm = (breiteNum * hoeheNum) / 10000;

  const avgBasispreis =
    selectedMotivList.length > 0
      ? selectedMotivList.reduce((sum, m) => sum + (m.fields.basispreis_pro_qm ?? 0), 0) /
        selectedMotivList.length
      : 0;

  const estimatedPrice = areaQm > 0 && avgBasispreis > 0 ? areaQm * avgBasispreis : 0;
  const anzahlungNum = parseFloat(anzahlung) || 0;

  function toggleMotiv(id: string) {
    setSelectedMotivIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleKundeSelect(id: string) {
    const k = kundenverwaltung.find(c => c.record_id === id) ?? null;
    setSelectedKunde(k);
    setSelectedKundeId(id);
    setCurrentStep(2);
  }

  function canProceedToStep4(): boolean {
    return breiteNum > 0 && hoeheNum > 0 && !!druckort && !!lieferdatum;
  }

  async function handleSubmit() {
    if (!selectedKundeId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const auftragsnummer = `A-${Date.now()}`;
      const today = formatDate(new Date());
      const motivUrls = Array.from(selectedMotivIds).map(id =>
        createRecordUrl(APP_IDS.MOTIVKATALOG, id)
      );
      const defaultStatus = auftragsstatusOptions[0]?.key ?? 'neu';

      await LivingAppsService.createAuftragsverwaltungEntry({
        auftragsnummer,
        auftragsdatum: today,
        lieferdatum: lieferdatum || undefined,
        auftragsstatus: defaultStatus,
        kunde: createRecordUrl(APP_IDS.KUNDENVERWALTUNG, selectedKundeId),
        motive: motivUrls as unknown as string,
        breite_cm: breiteNum || undefined,
        hoehe_cm: hoeheNum || undefined,
        druckort: druckort || undefined,
        oberflaechentyp: oberflaechentyp || undefined,
        sonderanforderungen: sonderanforderungen || undefined,
        gesamtpreis: estimatedPrice > 0 ? estimatedPrice : undefined,
        anzahlung: anzahlungNum > 0 ? anzahlungNum : undefined,
        zahlungsstatus: zahlungsstatus || undefined,
      });
      setCreatedOrderNumber(auftragsnummer);
      setCurrentStep(4);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Unbekannter Fehler beim Erstellen des Auftrags.');
    } finally {
      setSubmitting(false);
    }
  }

  const kundeName = selectedKunde
    ? `${selectedKunde.fields.vorname ?? ''} ${selectedKunde.fields.nachname ?? ''}`.trim() ||
      selectedKunde.fields.firma ||
      selectedKunde.fields.email ||
      'Unbekannt'
    : '–';

  return (
    <IntentWizardShell
      title="Neuen Auftrag erstellen"
      subtitle="Wähle einen Kunden, selektiere Motive und konfiguriere die Auftragsdetails."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── STEP 1: Kunde auswählen ─────────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Schritt 1: Kunde auswählen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle einen bestehenden Kunden aus oder lege einen neuen an.
            </p>
          </div>
          <EntitySelectStep
            items={kundenverwaltung.map(k => ({
              id: k.record_id,
              title: `${k.fields.vorname ?? ''} ${k.fields.nachname ?? ''}`.trim() || k.fields.firma || k.fields.email || k.record_id,
              subtitle: k.fields.firma
                ? k.fields.email
                  ? `${k.fields.firma} · ${k.fields.email}`
                  : k.fields.firma
                : k.fields.email ?? undefined,
              icon: <IconUser size={18} className="text-primary" />,
            }))}
            onSelect={handleKundeSelect}
            searchPlaceholder="Kunden suchen..."
            emptyText="Keine Kunden gefunden. Lege einen neuen Kunden an."
            emptyIcon={<IconUser size={32} />}
            createLabel="Neuen Kunden anlegen"
            onCreateNew={() => setKundeDialogOpen(true)}
            createDialog={
              <KundenverwaltungDialog
                open={kundeDialogOpen}
                onClose={() => setKundeDialogOpen(false)}
                onSubmit={async fields => {
                  const result = await LivingAppsService.createKundenverwaltungEntry(fields);
                  await fetchAll();
                  // Auto-select the newly created record
                  const entries = Object.entries(result as Record<string, unknown>);
                  if (entries.length > 0) {
                    const [newId] = entries[0];
                    setSelectedKundeId(newId);
                    const refreshed = kundenverwaltung.find(k => k.record_id === newId);
                    if (refreshed) {
                      setSelectedKunde(refreshed);
                    }
                    setKundeDialogOpen(false);
                    setCurrentStep(2);
                  }
                }}
                enablePhotoScan={AI_PHOTO_SCAN['Kundenverwaltung']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Kundenverwaltung']}
              />
            }
          />
        </div>
      )}

      {/* ── STEP 2: Motive auswählen ─────────────────────────────────────── */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold">Schritt 2: Motive auswählen</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Wähle ein oder mehrere Motive aus dem Katalog aus.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedMotivIds.size > 0 && (
                <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {selectedMotivIds.size} Motiv{selectedMotivIds.size !== 1 ? 'e' : ''} ausgewählt
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => setMotivDialogOpen(true)} className="gap-1.5">
                <IconPlus size={15} />
                Neues Motiv anlegen
              </Button>
            </div>
          </div>

          {availableMotivs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="mb-3 flex justify-center opacity-40">
                <IconPhoto size={32} />
              </div>
              <p className="text-sm">Keine verfügbaren Motive gefunden.</p>
              <Button variant="outline" size="sm" onClick={() => setMotivDialogOpen(true)} className="mt-3 gap-1.5">
                <IconPlus size={14} />
                Neues Motiv anlegen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableMotivs.map(m => {
                const selected = selectedMotivIds.has(m.record_id);
                return (
                  <button
                    key={m.record_id}
                    onClick={() => toggleMotiv(m.record_id)}
                    className={`text-left p-4 rounded-xl border transition-all overflow-hidden ${
                      selected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border bg-card hover:border-primary/30 hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                      }`}>
                        {selected && <IconCheck size={12} stroke={3} className="text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {m.fields.motivname ?? 'Unbenanntes Motiv'}
                          </span>
                          {m.fields.kategorie && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                              {m.fields.kategorie.label}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {(m.fields.mindestbreite_cm != null || m.fields.mindesthoehe_cm != null) && (
                            <span className="flex items-center gap-1">
                              <IconRuler size={12} />
                              Min: {m.fields.mindestbreite_cm ?? '–'} × {m.fields.mindesthoehe_cm ?? '–'} cm
                            </span>
                          )}
                          {(m.fields.maximalbreite_cm != null || m.fields.maximalhoehe_cm != null) && (
                            <span>
                              Max: {m.fields.maximalbreite_cm ?? '–'} × {m.fields.maximalhoehe_cm ?? '–'} cm
                            </span>
                          )}
                          {m.fields.basispreis_pro_qm != null && (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <IconCurrencyEuro size={12} />
                              {m.fields.basispreis_pro_qm.toFixed(2)} / m²
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <MotivkatalogDialog
            open={motivDialogOpen}
            onClose={() => setMotivDialogOpen(false)}
            onSubmit={async fields => {
              await LivingAppsService.createMotivkatalogEntry(fields);
              await fetchAll();
              setMotivDialogOpen(false);
            }}
            enablePhotoScan={AI_PHOTO_SCAN['Motivkatalog']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Motivkatalog']}
          />

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setCurrentStep(1)} className="gap-1.5">
              <IconArrowLeft size={16} />
              Zurück
            </Button>
            <Button
              onClick={() => setCurrentStep(3)}
              disabled={selectedMotivIds.size === 0}
              className="gap-1.5"
            >
              Weiter
              <IconChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Auftragsdetails ──────────────────────────────────────── */}
      {currentStep === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Schritt 3: Auftragsdetails</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Konfiguriere die Maße, den Druckort und weitere Details.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Breite */}
            <div className="space-y-1.5">
              <Label htmlFor="breite">Breite (cm) <span className="text-destructive">*</span></Label>
              <Input
                id="breite"
                type="number"
                min="0"
                step="0.1"
                placeholder="z. B. 120"
                value={breite}
                onChange={e => setBreite(e.target.value)}
              />
            </div>
            {/* Höhe */}
            <div className="space-y-1.5">
              <Label htmlFor="hoehe">Höhe (cm) <span className="text-destructive">*</span></Label>
              <Input
                id="hoehe"
                type="number"
                min="0"
                step="0.1"
                placeholder="z. B. 80"
                value={hoehe}
                onChange={e => setHoehe(e.target.value)}
              />
            </div>
          </div>

          {/* Druckort */}
          <div className="space-y-2">
            <Label>Druckort <span className="text-destructive">*</span></Label>
            <div className="flex flex-wrap gap-2">
              {druckortOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setDruckort(opt.key)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    druckort === opt.key
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card hover:bg-accent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Oberflächentyp */}
          <div className="space-y-1.5">
            <Label htmlFor="oberflaechentyp">Oberflächentyp</Label>
            <Input
              id="oberflaechentyp"
              placeholder="z. B. matt, glänzend, strukturiert"
              value={oberflaechentyp}
              onChange={e => setOberflaechentyp(e.target.value)}
            />
          </div>

          {/* Lieferdatum */}
          <div className="space-y-1.5">
            <Label htmlFor="lieferdatum">
              <span className="flex items-center gap-1.5">
                <IconCalendar size={15} />
                Lieferdatum <span className="text-destructive">*</span>
              </span>
            </Label>
            <Input
              id="lieferdatum"
              type="date"
              value={lieferdatum}
              onChange={e => setLieferdatum(e.target.value)}
            />
          </div>

          {/* Sonderanforderungen */}
          <div className="space-y-1.5">
            <Label htmlFor="sonder">Sonderanforderungen</Label>
            <Textarea
              id="sonder"
              placeholder="Besondere Wünsche oder Hinweise..."
              value={sonderanforderungen}
              onChange={e => setSonderanforderungen(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Anzahlung */}
            <div className="space-y-1.5">
              <Label htmlFor="anzahlung">Anzahlung (€)</Label>
              <Input
                id="anzahlung"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={anzahlung}
                onChange={e => setAnzahlung(e.target.value)}
              />
            </div>
            {/* Zahlungsstatus */}
            <div className="space-y-1.5">
              <Label htmlFor="zahlungsstatus">Zahlungsstatus</Label>
              <select
                id="zahlungsstatus"
                value={zahlungsstatus}
                onChange={e => setZahlungsstatus(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {zahlungsstatusOptions.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Live-Vorschau */}
          {areaQm > 0 && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-semibold">Vorschau</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-muted-foreground">
                  Fläche: <span className="font-semibold text-foreground">{areaQm.toFixed(4)} m²</span>
                </span>
                {estimatedPrice > 0 && (
                  <span className="text-muted-foreground">
                    Geschätzter Preis: <span className="font-semibold text-foreground">{formatCurrency(estimatedPrice)}</span>
                  </span>
                )}
              </div>
              {estimatedPrice > 0 && anzahlungNum > 0 && (
                <BudgetTracker
                  budget={estimatedPrice}
                  booked={anzahlungNum}
                  label="Anzahlung vs. Gesamtpreis"
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setCurrentStep(2)} className="gap-1.5">
              <IconArrowLeft size={16} />
              Zurück
            </Button>
            <Button
              onClick={() => setCurrentStep(4)}
              disabled={!canProceedToStep4()}
              className="gap-1.5"
            >
              Zur Bestätigung
              <IconChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Bestätigung & Absenden ───────────────────────────────── */}
      {currentStep === 4 && (
        <div className="space-y-5">
          {createdOrderNumber ? (
            // Success state
            <div className="flex flex-col items-center justify-center py-16 gap-5">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                <IconCircleCheck size={36} className="text-green-600" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">Auftrag erfolgreich erstellt!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Auftragsnummer: <span className="font-semibold text-foreground">{createdOrderNumber}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <a
                  href="#/auftragsverwaltung"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Zum Auftrag
                  <IconChevronRight size={15} />
                </a>
                <a
                  href="#/"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-accent transition-colors"
                >
                  Zum Dashboard
                </a>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold">Schritt 4: Bestätigung</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Überprüfe die Angaben und erstelle den Auftrag.
                </p>
              </div>

              {/* Summary card */}
              <div className="rounded-xl border bg-card divide-y overflow-hidden">
                {/* Kunde */}
                <div className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconUser size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Kunde</p>
                    <p className="text-sm font-semibold truncate">{kundeName}</p>
                    {selectedKunde?.fields.email && (
                      <p className="text-xs text-muted-foreground truncate">{selectedKunde.fields.email}</p>
                    )}
                  </div>
                </div>

                {/* Motive */}
                <div className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconPhoto size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                      Motive ({selectedMotivList.length})
                    </p>
                    {selectedMotivList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Keine Motive ausgewählt</p>
                    ) : (
                      <ul className="space-y-0.5">
                        {selectedMotivList.map(m => (
                          <li key={m.record_id} className="text-sm font-medium truncate">
                            {m.fields.motivname ?? 'Unbenannt'}
                            {m.fields.basispreis_pro_qm != null && (
                              <span className="text-muted-foreground font-normal ml-1">
                                ({m.fields.basispreis_pro_qm.toFixed(2)} €/m²)
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Maße */}
                <div className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconRuler size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Maße & Druckort</p>
                    <p className="text-sm font-semibold">
                      {breite} × {hoehe} cm
                      {areaQm > 0 && <span className="font-normal text-muted-foreground ml-1">({areaQm.toFixed(4)} m²)</span>}
                    </p>
                    {druckort && (
                      <p className="text-xs text-muted-foreground">
                        {druckortOptions.find(o => o.key === druckort)?.label ?? druckort}
                      </p>
                    )}
                    {oberflaechentyp && (
                      <p className="text-xs text-muted-foreground">Oberfläche: {oberflaechentyp}</p>
                    )}
                  </div>
                </div>

                {/* Preis & Datum */}
                <div className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconCurrencyEuro size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Preisschätzung & Lieferung</p>
                    {estimatedPrice > 0 ? (
                      <p className="text-sm font-semibold">{formatCurrency(estimatedPrice)}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Kein Preis berechnet</p>
                    )}
                    {lieferdatum && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <IconCalendar size={12} />
                        Lieferdatum: {lieferdatum}
                      </p>
                    )}
                    {anzahlungNum > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Anzahlung: {formatCurrency(anzahlungNum)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sonderanforderungen */}
                {sonderanforderungen && (
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Sonderanforderungen</p>
                    <p className="text-sm text-foreground">{sonderanforderungen}</p>
                  </div>
                )}
              </div>

              {submitError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                  <p className="text-sm text-destructive font-medium">{submitError}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setCurrentStep(3)} disabled={submitting} className="gap-1.5">
                  <IconArrowLeft size={16} />
                  Zurück
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !selectedKundeId}
                  className="gap-1.5 min-w-[160px]"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                      Wird erstellt...
                    </span>
                  ) : (
                    <>
                      <IconCheck size={16} />
                      Auftrag anlegen
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </IntentWizardShell>
  );
}
