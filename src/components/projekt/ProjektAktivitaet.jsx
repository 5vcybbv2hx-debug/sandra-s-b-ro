import ProjektAufgaben from '@/components/projekt/ProjektAufgaben';
import ProjektTelefonate from '@/components/projekt/ProjektTelefonate';
import ProjektAktivitaetErfassung from '@/components/projekt/ProjektAktivitaetErfassung';

export default function ProjektAktivitaet({ projekt }) {
  return (
    <div className="space-y-6">
      <ProjektAktivitaetErfassung projekt={projekt} />
      <div className="border-t border-border" />
      <ProjektAufgaben projekt={projekt} />
      <div className="border-t border-border" />
      <ProjektTelefonate projekt={projekt} />
    </div>
  );
}