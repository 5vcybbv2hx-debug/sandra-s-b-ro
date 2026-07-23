import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import { TimerProvider } from '@/lib/TimerContext';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Projekte from '@/pages/Projekte';
import ProjektDetail from '@/pages/ProjektDetail';
import Telefonjournal from '@/pages/Telefonjournal';
import Aufgaben from '@/pages/Aufgaben';
import Finanzen from '@/pages/Finanzen';
import Einstellungen from '@/pages/Einstellungen';
import Kontakte from '@/pages/Kontakte';
import FirmenDetail from '@/pages/FirmenDetail';
import PersonDetail from '@/pages/PersonDetail';
import Zeiten from '@/pages/Zeiten';
import Wochenuebersicht from '@/pages/Wochenuebersicht';
import Abrechnung from '@/pages/Abrechnung';
import AbrechnungDetail from '@/pages/AbrechnungDetail';
import KapazitaetPlanung from '@/pages/KapazitaetPlanung';
import Kalender from '@/pages/Kalender';
import Angebote from '@/pages/Angebote';
import AngebotDetail from '@/pages/AngebotDetail';
import Fahrtenliste from '@/pages/Fahrtenliste';
import Vertraege from '@/pages/Vertraege';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <TimerProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/projekte" element={<Projekte />} />
          <Route path="/projekte/:id" element={<ProjektDetail />} />
          <Route path="/kontakte" element={<Kontakte />} />
          <Route path="/firmen/:id" element={<FirmenDetail />} />
          <Route path="/personen/:id" element={<PersonDetail />} />
          <Route path="/zeiten" element={<Zeiten />} />
          <Route path="/telefon" element={<Telefonjournal />} />
          <Route path="/aufgaben" element={<Aufgaben />} />
          <Route path="/finanzen" element={<Finanzen />} />
          <Route path="/einstellungen" element={<Einstellungen />} />
          <Route path="/wochenuebersicht" element={<Wochenuebersicht />} />
          <Route path="/abrechnung" element={<Abrechnung />} />
          <Route path="/abrechnung/:id" element={<AbrechnungDetail />} />
          <Route path="/kapazitaet" element={<KapazitaetPlanung />} />
          <Route path="/kalender" element={<Kalender />} />
          <Route path="/angebote" element={<Angebote />} />
          <Route path="/angebote/:id" element={<AngebotDetail />} />
          <Route path="/fahrten" element={<Fahrtenliste />} />
          <Route path="/vertraege" element={<Vertraege />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </TimerProvider>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App