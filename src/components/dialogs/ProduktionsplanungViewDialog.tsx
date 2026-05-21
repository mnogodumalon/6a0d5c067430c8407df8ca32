import type { Produktionsplanung, Auftragsverwaltung, Mitarbeiterverwaltung, Materialverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface ProduktionsplanungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Produktionsplanung | null;
  onEdit: (record: Produktionsplanung) => void;
  auftragsverwaltungList: Auftragsverwaltung[];
  mitarbeiterverwaltungList: Mitarbeiterverwaltung[];
  materialverwaltungList: Materialverwaltung[];
}

export function ProduktionsplanungViewDialog({ open, onClose, record, onEdit, auftragsverwaltungList, mitarbeiterverwaltungList, materialverwaltungList }: ProduktionsplanungViewDialogProps) {
  function getAuftragsverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return auftragsverwaltungList.find(r => r.record_id === id)?.fields.auftragsnummer ?? '—';
  }

  function getMitarbeiterverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return mitarbeiterverwaltungList.find(r => r.record_id === id)?.fields.personalnummer ?? '—';
  }

  function getMaterialverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return materialverwaltungList.find(r => r.record_id === id)?.fields.materialname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Produktionsplanung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Produktionsnummer</Label>
            <p className="text-sm">{record.fields.produktionsnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Produktionsstatus</Label>
            <Badge variant="secondary">{record.fields.produktionsstatus?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Auftrag</Label>
            <p className="text-sm">{getAuftragsverwaltungDisplayName(record.fields.auftrag)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verantwortlicher Mitarbeiter</Label>
            <p className="text-sm">{getMitarbeiterverwaltungDisplayName(record.fields.mitarbeiter)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Materialien</Label>
            {Array.isArray(record.fields.materialien) && record.fields.materialien.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {record.fields.materialien.map((url: any, i: number) => (
                  <span key={i} className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getMaterialverwaltungDisplayName(url)}</span>
                ))}
              </div>
            ) : <p className="text-sm">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geplanter Starttermin</Label>
            <p className="text-sm">{formatDate(record.fields.geplanter_start)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geplanter Endtermin</Label>
            <p className="text-sm">{formatDate(record.fields.geplantes_ende)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tatsächlicher Starttermin</Label>
            <p className="text-sm">{formatDate(record.fields.tatsaechlicher_start)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tatsächlicher Endtermin</Label>
            <p className="text-sm">{formatDate(record.fields.tatsaechliches_ende)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verwendeter Drucker</Label>
            <p className="text-sm">{record.fields.drucker_bezeichnung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Qualitätsprüfung bestanden</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.qualitaetspruefung_bestanden ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.qualitaetspruefung_bestanden ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen zur Produktion</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.PRODUKTIONSPLANUNG} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}