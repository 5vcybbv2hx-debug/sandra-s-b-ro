import { useState } from 'react';
import { Phone } from 'lucide-react';
import PhoneModal from './PhoneModal';

export default function PhoneFAB() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 w-14 h-14 rounded-full bg-accent text-white shadow-lg hover:bg-accent-dark flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        aria-label="Telefonat notieren"
      >
        <Phone className="w-6 h-6" />
      </button>
      <PhoneModal open={open} onOpenChange={setOpen} />
    </>
  );
}