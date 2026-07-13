const KEY = 'sandra_buro_settings';

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function getDefaultStundensatz() {
  return getSettings().default_stundensatz || 0;
}

export function getDefaultSteuerProzent() {
  return getSettings().steuerruecklage_prozent || 30;
}