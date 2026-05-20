import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Kundenverwaltung, Mitarbeiterverwaltung, Motivkatalog, Materialverwaltung, Auftragsverwaltung, Produktionsplanung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [kundenverwaltung, setKundenverwaltung] = useState<Kundenverwaltung[]>([]);
  const [mitarbeiterverwaltung, setMitarbeiterverwaltung] = useState<Mitarbeiterverwaltung[]>([]);
  const [motivkatalog, setMotivkatalog] = useState<Motivkatalog[]>([]);
  const [materialverwaltung, setMaterialverwaltung] = useState<Materialverwaltung[]>([]);
  const [auftragsverwaltung, setAuftragsverwaltung] = useState<Auftragsverwaltung[]>([]);
  const [produktionsplanung, setProduktionsplanung] = useState<Produktionsplanung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [kundenverwaltungData, mitarbeiterverwaltungData, motivkatalogData, materialverwaltungData, auftragsverwaltungData, produktionsplanungData] = await Promise.all([
        LivingAppsService.getKundenverwaltung(),
        LivingAppsService.getMitarbeiterverwaltung(),
        LivingAppsService.getMotivkatalog(),
        LivingAppsService.getMaterialverwaltung(),
        LivingAppsService.getAuftragsverwaltung(),
        LivingAppsService.getProduktionsplanung(),
      ]);
      setKundenverwaltung(kundenverwaltungData);
      setMitarbeiterverwaltung(mitarbeiterverwaltungData);
      setMotivkatalog(motivkatalogData);
      setMaterialverwaltung(materialverwaltungData);
      setAuftragsverwaltung(auftragsverwaltungData);
      setProduktionsplanung(produktionsplanungData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [kundenverwaltungData, mitarbeiterverwaltungData, motivkatalogData, materialverwaltungData, auftragsverwaltungData, produktionsplanungData] = await Promise.all([
          LivingAppsService.getKundenverwaltung(),
          LivingAppsService.getMitarbeiterverwaltung(),
          LivingAppsService.getMotivkatalog(),
          LivingAppsService.getMaterialverwaltung(),
          LivingAppsService.getAuftragsverwaltung(),
          LivingAppsService.getProduktionsplanung(),
        ]);
        setKundenverwaltung(kundenverwaltungData);
        setMitarbeiterverwaltung(mitarbeiterverwaltungData);
        setMotivkatalog(motivkatalogData);
        setMaterialverwaltung(materialverwaltungData);
        setAuftragsverwaltung(auftragsverwaltungData);
        setProduktionsplanung(produktionsplanungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const kundenverwaltungMap = useMemo(() => {
    const m = new Map<string, Kundenverwaltung>();
    kundenverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kundenverwaltung]);

  const mitarbeiterverwaltungMap = useMemo(() => {
    const m = new Map<string, Mitarbeiterverwaltung>();
    mitarbeiterverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [mitarbeiterverwaltung]);

  const motivkatalogMap = useMemo(() => {
    const m = new Map<string, Motivkatalog>();
    motivkatalog.forEach(r => m.set(r.record_id, r));
    return m;
  }, [motivkatalog]);

  const materialverwaltungMap = useMemo(() => {
    const m = new Map<string, Materialverwaltung>();
    materialverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [materialverwaltung]);

  const auftragsverwaltungMap = useMemo(() => {
    const m = new Map<string, Auftragsverwaltung>();
    auftragsverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [auftragsverwaltung]);

  return { kundenverwaltung, setKundenverwaltung, mitarbeiterverwaltung, setMitarbeiterverwaltung, motivkatalog, setMotivkatalog, materialverwaltung, setMaterialverwaltung, auftragsverwaltung, setAuftragsverwaltung, produktionsplanung, setProduktionsplanung, loading, error, fetchAll, kundenverwaltungMap, mitarbeiterverwaltungMap, motivkatalogMap, materialverwaltungMap, auftragsverwaltungMap };
}