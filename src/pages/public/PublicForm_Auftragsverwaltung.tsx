import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a0d5bde35eb2cf86f7eb849';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormAuftragsverwaltung() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Auftragsverwaltung — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="auftragsnummer">Auftragsnummer</Label>
            <Input
              id="auftragsnummer"
              placeholder=""
              value={fields.auftragsnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, auftragsnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auftragsdatum">Auftragsdatum</Label>
            <DatePicker
              id="auftragsdatum"
              placeholder=""
              mode="date"
              value={fields.auftragsdatum ?? null}
              onChange={v => setFields(f => ({ ...f, auftragsdatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lieferdatum">Gewünschtes Lieferdatum</Label>
            <DatePicker
              id="lieferdatum"
              placeholder=""
              mode="date"
              value={fields.lieferdatum ?? null}
              onChange={v => setFields(f => ({ ...f, lieferdatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auftragsstatus">Auftragsstatus</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.auftragsstatus) === 'neu'}
                onClick={() => setFields(f => ({ ...f, auftragsstatus: (lookupKey(f.auftragsstatus) === 'neu' ? undefined : 'neu') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.auftragsstatus) === 'neu'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Neu
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.auftragsstatus) === 'in_bearbeitung'}
                onClick={() => setFields(f => ({ ...f, auftragsstatus: (lookupKey(f.auftragsstatus) === 'in_bearbeitung' ? undefined : 'in_bearbeitung') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.auftragsstatus) === 'in_bearbeitung'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                In Bearbeitung
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.auftragsstatus) === 'in_produktion'}
                onClick={() => setFields(f => ({ ...f, auftragsstatus: (lookupKey(f.auftragsstatus) === 'in_produktion' ? undefined : 'in_produktion') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.auftragsstatus) === 'in_produktion'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                In Produktion
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.auftragsstatus) === 'abgeschlossen'}
                onClick={() => setFields(f => ({ ...f, auftragsstatus: (lookupKey(f.auftragsstatus) === 'abgeschlossen' ? undefined : 'abgeschlossen') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.auftragsstatus) === 'abgeschlossen'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Abgeschlossen
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.auftragsstatus) === 'storniert'}
                onClick={() => setFields(f => ({ ...f, auftragsstatus: (lookupKey(f.auftragsstatus) === 'storniert' ? undefined : 'storniert') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.auftragsstatus) === 'storniert'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Storniert
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="motive">Motive</Label>
            <Input
              id="motive"
              value={fields.motive ?? ''}
              onChange={e => setFields(f => ({ ...f, motive: e.target.value }))}
              placeholder="Record URL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="breite_cm">Breite des Wandbildes (cm)</Label>
            <Input
              id="breite_cm"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.breite_cm ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, breite_cm: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hoehe_cm">Höhe des Wandbildes (cm)</Label>
            <Input
              id="hoehe_cm"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.hoehe_cm ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, hoehe_cm: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="druckort">Druckort</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.druckort) === 'innenbereich'}
                onClick={() => setFields(f => ({ ...f, druckort: (lookupKey(f.druckort) === 'innenbereich' ? undefined : 'innenbereich') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.druckort) === 'innenbereich'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Innenbereich
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.druckort) === 'aussenbereich'}
                onClick={() => setFields(f => ({ ...f, druckort: (lookupKey(f.druckort) === 'aussenbereich' ? undefined : 'aussenbereich') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.druckort) === 'aussenbereich'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Außenbereich
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="oberflaechentyp">Oberflächentyp</Label>
            <Input
              id="oberflaechentyp"
              placeholder=""
              value={fields.oberflaechentyp ?? ''}
              onChange={e => setFields(f => ({ ...f, oberflaechentyp: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sonderanforderungen">Sonderanforderungen</Label>
            <Textarea
              id="sonderanforderungen"
              placeholder=""
              value={fields.sonderanforderungen ?? ''}
              onChange={e => setFields(f => ({ ...f, sonderanforderungen: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesamtpreis">Gesamtpreis (€)</Label>
            <Input
              id="gesamtpreis"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.gesamtpreis ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, gesamtpreis: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anzahlung">Anzahlung (€)</Label>
            <Input
              id="anzahlung"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.anzahlung ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, anzahlung: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zahlungsstatus">Zahlungsstatus</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zahlungsstatus) === 'offen'}
                onClick={() => setFields(f => ({ ...f, zahlungsstatus: (lookupKey(f.zahlungsstatus) === 'offen' ? undefined : 'offen') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zahlungsstatus) === 'offen'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Offen
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zahlungsstatus) === 'anzahlung_erhalten'}
                onClick={() => setFields(f => ({ ...f, zahlungsstatus: (lookupKey(f.zahlungsstatus) === 'anzahlung_erhalten' ? undefined : 'anzahlung_erhalten') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zahlungsstatus) === 'anzahlung_erhalten'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Anzahlung erhalten
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zahlungsstatus) === 'vollstaendig_bezahlt'}
                onClick={() => setFields(f => ({ ...f, zahlungsstatus: (lookupKey(f.zahlungsstatus) === 'vollstaendig_bezahlt' ? undefined : 'vollstaendig_bezahlt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zahlungsstatus) === 'vollstaendig_bezahlt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Vollständig bezahlt
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zahlungsstatus) === 'ueberfaellig'}
                onClick={() => setFields(f => ({ ...f, zahlungsstatus: (lookupKey(f.zahlungsstatus) === 'ueberfaellig' ? undefined : 'ueberfaellig') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zahlungsstatus) === 'ueberfaellig'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Überfällig
              </button>
            </div>
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
