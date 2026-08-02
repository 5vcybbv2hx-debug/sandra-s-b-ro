const KEY = 'sandra_buro_settings';

export function getSettings() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export function saveSettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function getWeeklyCapacity() { return getSettings().woechentliche_zielstunden || 25; }
export function getDefaultStundensatz() { return getSettings().stundensatz_standard || 65; }
export function getDefaultSteuerProzent() { return getSettings().steuerrueckstellung_prozent || 30; }
export function getMonthlyUmsatzziel() { return getSettings().monatliches_umsatzziel || 6500; }
export function getErfahrungswerte() { return getSettings().erfahrungswerte || {}; }
export function getWarningThreshold() { return getSettings().warning_threshold || 80; }

// Sync settings from server (Kapazitaetseinstellung entity) to localStorage
// Call this on app init to ensure settings are consistent across devices
export async function syncSettingsFromServer() {
  try {
    const { base44 } = await import('@/api/base44Client');
    const settings = await base44.entities.Kapazitaetseinstellung.list();
    if (settings[0]) {
      const s = settings[0];
      saveSettings({
        woechentliche_zielstunden: s.woechentliche_zielstunden,
        stundensatz_standard: s.stundensatz_standard,
        steuerrueckstellung_prozent: s.steuerrueckstellung_prozent,
        monatliches_umsatzziel: s.monatliches_umsatzziel,
        erfahrungswerte: s.erfahrungswerte || {},
        warning_threshold: getSettings().warning_threshold || 80
      });
    }
  } catch (e) {
    console.error('Settings sync failed:', e);
  }
}
