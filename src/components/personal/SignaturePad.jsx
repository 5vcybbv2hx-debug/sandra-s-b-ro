import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

export default function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a29';
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
      img.src = value;
    }
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.touches?.[0];
    return { x: (t ? t.clientX : e.clientX) - rect.left, y: (t ? t.clientY : e.clientY) - rect.top };
  };
  const start = (e) => { e.preventDefault(); setDrawing(true); const { x, y } = getPos(e); const ctx = canvasRef.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(x, y); };
  const draw = (e) => { if (!drawing) return; e.preventDefault(); const { x, y } = getPos(e); const ctx = canvasRef.current.getContext('2d'); ctx.lineTo(x, y); ctx.stroke(); };
  const end = () => { if (!drawing) return; setDrawing(false); onChange?.(canvasRef.current.toDataURL('image/png')); };
  const clear = () => { const c = canvasRef.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); onChange?.(''); };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full h-32 border-2 border-dashed border-border rounded-lg touch-none bg-white cursor-crosshair"
        onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
      />
      <Button type="button" variant="ghost" size="sm" onClick={clear} className="mt-1 text-xs text-muted-foreground">
        <Eraser className="w-3.5 h-3.5" /> Unterschrift löschen
      </Button>
    </div>
  );
}