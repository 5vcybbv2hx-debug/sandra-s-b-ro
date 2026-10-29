import FragebogenListe from '@/components/personal/FragebogenListe';

export default function Personalfragebogen() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Personalfragebögen</h1>
        <p className="text-sm text-muted-foreground">Als PDF herunterladen und an den Steuerberater weitergeben.</p>
      </div>
      <FragebogenListe />
    </div>
  );
}