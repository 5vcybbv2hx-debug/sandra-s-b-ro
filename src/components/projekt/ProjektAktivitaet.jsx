import ProjektAufgaben from '@/components/projekt/ProjektAufgaben';
import ProjektTelefonate from '@/components/projekt/ProjektTelefonate';

export default function ProjektAktivitaet({ projekt }) {
  return (
    <div className="space-y-6">
      <ProjektAufgaben projekt={projekt} />
      <div className="border-t border-border" />
      <ProjektTelefonate projekt={projekt} />
    </div>
  );
}