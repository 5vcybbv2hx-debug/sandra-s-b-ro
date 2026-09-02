import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Star, Building2, Navigation, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * AddressInput — Smart Adress-Eingabe für Fahrten
 * 
 * Drei Quellen (quick & dirty):
 * 1. Häufige Adressen: Aus vergangenen Fahrten (startort/zielort)
 * 2. Baustellen: Aus aktiven Projekten + deren Firmen-Adresse
 * 3. Live-Suche: Nominatim (OpenStreetMap, kostenlos, kein API-Key)
 * 
 * Props:
 * - value: string (aktueller Wert)
 * - onChange: (value) => void
 * - placeholder: string
 * - frequentAddresses: [{ label, count }] — top Ziele aus vergangenen Fahrten
 * - projectAddresses: [{ label, sublabel }] — aktive Projekte/Baustellen
 * - label: string (für <Label> außerhalb)
 */
export default function AddressInput({
  value,
  onChange,
  placeholder = 'Adresse eingeben...',
  frequentAddresses = [],
  projectAddresses = [],
  autoFocus = false,
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [liveResults, setLiveResults] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const lastQueryRef = useRef('');

  // Live-Suche via Nominatim (debounced)
  const searchLive = useCallback(async (query) => {
    if (query.length < 3) { setLiveResults([]); return; }
    setLiveLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=de&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'de' },
      });
      const data = await res.json();
      setLiveResults(data.map(r => ({
        label: r.display_name?.split(',').slice(0, 3).join(','),
        full: r.display_name,
      })));
    } catch {
      setLiveResults([]);
    } finally {
      setLiveLoading(false);
    }
  }, []);

  // Debounce live search
  useEffect(() => {
    const query = value?.trim() || '';
    // Only search live if the text doesn't match a frequent/project address exactly
    const isKnown = [
      ...frequentAddresses.map(a => a.label),
      ...projectAddresses.map(a => a.label),
    ].some(l => l?.toLowerCase() === query.toLowerCase());

    if (query.length >= 3 && !isKnown && query !== lastQueryRef.current) {
      lastQueryRef.current = query;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchLive(query), 500);
    } else if (query.length < 3) {
      setLiveResults([]);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, frequentAddresses, projectAddresses, searchLive]);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasFrequent = frequentAddresses.length > 0 && (!value || value.length < 2);
  const hasProjects = projectAddresses.length > 0 && (!value || value.length < 2);
  const hasLive = liveResults.length > 0;
  const showDropdown = showSuggestions && (hasFrequent || hasProjects || hasLive || liveLoading);

  const allSuggestions = [
    ...(hasFrequent ? frequentAddresses.slice(0, 5).map(a => ({ ...a, type: 'frequent' })) : []),
    ...(hasProjects ? projectAddresses.slice(0, 5).map(a => ({ ...a, type: 'project' })) : []),
    ...(hasLive ? liveResults.map(a => ({ ...a, type: 'live' })) : []),
  ];

  const selectSuggestion = (s) => {
    onChange(s.label);
    setShowSuggestions(false);
    setLiveResults([]);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, allSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      selectSuggestion(allSuggestions[highlightIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => { onChange(e.target.value); setShowSuggestions(true); setHighlightIndex(-1); }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="min-h-[48px] pl-10"
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
        {liveLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 rounded-lg border bg-popover shadow-lg max-h-72 overflow-y-auto">
          {/* Häufige Adressen */}
          {hasFrequent && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                <Star className="w-3 h-3 inline mr-1" /> Häufige Ziele
              </div>
              {frequentAddresses.slice(0, 5).map((a, i) => (
                <button
                  key={`freq-${i}`}
                  type="button"
                  onClick={() => selectSuggestion(a)}
                  className={cn(
                    'w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors border-b border-border/30',
                    highlightIndex === i && 'bg-accent'
                  )}
                >
                  <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate flex-1">{a.label}</span>
                  {a.count > 1 && <span className="text-xs text-muted-foreground shrink-0">{a.count}×</span>}
                </button>
              ))}
            </div>
          )}

          {/* Baustellen / Projekte */}
          {hasProjects && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground bg-muted/50">
                <Building2 className="w-3 h-3 inline mr-1" /> Baustellen
              </div>
              {projectAddresses.slice(0, 5).map((a, i) => {
                const idx = (hasFrequent ? frequentAddresses.slice(0, 5).length : 0) + i;
                return (
                  <button
                    key={`proj-${i}`}
                    type="button"
                    onClick={() => selectSuggestion(a)}
                    className={cn(
                      'w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors border-b border-border/30',
                      highlightIndex === idx && 'bg-accent'
                    )}
                  >
                    <Building2 className="w-3.5 h-3.5 text-brand shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.label}</p>
                      {a.sublabel && <p className="text-xs text-muted-foreground truncate">{a.sublabel}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Live-Suche */}
          {(hasLive || liveLoading) && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground bg-muted/50">
                <Navigation className="w-3 h-3 inline mr-1" /> Live-Suche
              </div>
              {liveLoading && liveResults.length === 0 && (
                <div className="px-3 py-3 text-sm text-muted-foreground">Suche Adressen...</div>
              )}
              {liveResults.map((a, i) => {
                const idx = (hasFrequent ? frequentAddresses.slice(0, 5).length : 0) + (hasProjects ? projectAddresses.slice(0, 5).length : 0) + i;
                return (
                  <button
                    key={`live-${i}`}
                    type="button"
                    onClick={() => selectSuggestion(a)}
                    className={cn(
                      'w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors',
                      highlightIndex === idx && 'bg-accent'
                    )}
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate flex-1">{a.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Leer-Hinweis */}
          {!hasFrequent && !hasProjects && !hasLive && !liveLoading && value?.length >= 3 && (
            <div className="px-3 py-3 text-sm text-muted-foreground">Keine Vorschläge gefunden</div>
          )}
        </div>
      )}
    </div>
  );
}
