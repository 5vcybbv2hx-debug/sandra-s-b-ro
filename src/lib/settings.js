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