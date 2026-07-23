import ProjektZeiten from '@/components/projekt/ProjektZeiten';
import ProjektAbrechnung from '@/components/projekt/ProjektAbrechnung';

export default function ProjektZeitGeld({ projekt, onUpdate }) {
  return (
    <div className="space-y-6">
      <ProjektZeiten projekt={projekt} onUpdate={onUpdate} />
      <div className="border-t border-border" />
      <ProjektAbrechnung projekt={projekt} onUpdate={onUpdate} />
    </div>
  );
}