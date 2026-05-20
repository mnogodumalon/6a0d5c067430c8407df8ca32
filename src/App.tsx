import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import KundenverwaltungPage from '@/pages/KundenverwaltungPage';
import MitarbeiterverwaltungPage from '@/pages/MitarbeiterverwaltungPage';
import MotivkatalogPage from '@/pages/MotivkatalogPage';
import MaterialverwaltungPage from '@/pages/MaterialverwaltungPage';
import AuftragsverwaltungPage from '@/pages/AuftragsverwaltungPage';
import ProduktionsplanungPage from '@/pages/ProduktionsplanungPage';
import PublicFormKundenverwaltung from '@/pages/public/PublicForm_Kundenverwaltung';
import PublicFormMitarbeiterverwaltung from '@/pages/public/PublicForm_Mitarbeiterverwaltung';
import PublicFormMotivkatalog from '@/pages/public/PublicForm_Motivkatalog';
import PublicFormMaterialverwaltung from '@/pages/public/PublicForm_Materialverwaltung';
import PublicFormAuftragsverwaltung from '@/pages/public/PublicForm_Auftragsverwaltung';
import PublicFormProduktionsplanung from '@/pages/public/PublicForm_Produktionsplanung';
// <public:imports>
// </public:imports>
// <custom:imports>
const AuftragErstellenPage = lazy(() => import('@/pages/intents/AuftragErstellenPage'));
const ProduktionStartenPage = lazy(() => import('@/pages/intents/ProduktionStartenPage'));
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a0d5bd682b288448498c893" element={<PublicFormKundenverwaltung />} />
              <Route path="public/6a0d5bdccaf0f5c145ae2818" element={<PublicFormMitarbeiterverwaltung />} />
              <Route path="public/6a0d5bddc1775469ec9ca83e" element={<PublicFormMotivkatalog />} />
              <Route path="public/6a0d5bde933c27e481cf9817" element={<PublicFormMaterialverwaltung />} />
              <Route path="public/6a0d5bde35eb2cf86f7eb849" element={<PublicFormAuftragsverwaltung />} />
              <Route path="public/6a0d5bdfe6982a58739b3802" element={<PublicFormProduktionsplanung />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="kundenverwaltung" element={<KundenverwaltungPage />} />
                <Route path="mitarbeiterverwaltung" element={<MitarbeiterverwaltungPage />} />
                <Route path="motivkatalog" element={<MotivkatalogPage />} />
                <Route path="materialverwaltung" element={<MaterialverwaltungPage />} />
                <Route path="auftragsverwaltung" element={<AuftragsverwaltungPage />} />
                <Route path="produktionsplanung" element={<ProduktionsplanungPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                <Route path="intents/auftrag-erstellen" element={<Suspense fallback={null}><AuftragErstellenPage /></Suspense>} />
                <Route path="intents/produktion-starten" element={<Suspense fallback={null}><ProduktionStartenPage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
