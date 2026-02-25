import { query } from '../db';
import type { AISettings, AIProvider } from '../../types';
import { encrypt, decrypt } from '../utils';

const SETTINGS_ID = 1;

export async function getSettings(decryptKeys = false): Promise<AISettings> {
  const result = await query('SELECT settings FROM app_settings WHERE id = $1', [SETTINGS_ID]);

  if (result.rows.length === 0) {
    throw new Error('App settings not found.');
  }

  const settings = result.rows[0].settings as AISettings;

  if (decryptKeys) {
    for (const provider of Object.keys(settings.apiKeys || {}) as AIProvider[]) {
      if (settings.apiKeys[provider]) {
        settings.apiKeys[provider] = decrypt(settings.apiKeys[provider]!);
      }
    }
  } else {
    // Return masked value for configured keys, empty string for unconfigured
    for (const provider of Object.keys(settings.apiKeys || {}) as AIProvider[]) {
      settings.apiKeys[provider] = settings.apiKeys[provider] ? '********' : '';
    }
  }

  return settings;
}

export async function updateSettings(newSettings: Partial<AISettings>): Promise<AISettings> {
  const currentSettings = await getSettings(true); // Get decrypted keys

  // Start with currentSettings for a safe base
  const updatedSettings: AISettings = { ...currentSettings };

  // Update all non-apiKeys fields from newSettings
  for (const key of Object.keys(newSettings)) {
    if (key !== 'apiKeys') {
      (updatedSettings as any)[key] = (newSettings as any)[key];
    }
  }

  // Now, specifically and carefully handle API key updates
  if (newSettings.apiKeys) {
    for (const provider of Object.keys(newSettings.apiKeys) as AIProvider[]) {
      // Only update if the key was explicitly sent from the client
      if (newSettings.apiKeys[provider] !== undefined) {
        updatedSettings.apiKeys[provider] = newSettings.apiKeys[provider];
      }
    }
  }

  // Then re-encrypt ALL keys in the final merged object before saving
  for (const provider of Object.keys(updatedSettings.apiKeys) as AIProvider[]) {
    const keyToEncrypt = updatedSettings.apiKeys[provider];
    if (keyToEncrypt) {
      updatedSettings.apiKeys[provider] = encrypt(keyToEncrypt);
    } else {
      updatedSettings.apiKeys[provider] = ''; // Ensure it's an empty string if falsy
    }
  }

  const result = await query(
    'UPDATE app_settings SET settings = $1 WHERE id = $2 RETURNING settings',
    [JSON.stringify(updatedSettings), SETTINGS_ID]
  );

  const finalSettings = result.rows[0].settings as AISettings;

  // Clear/mask keys before returning to client
  for (const provider of Object.keys(finalSettings.apiKeys || {}) as AIProvider[]) {
    finalSettings.apiKeys[provider] = finalSettings.apiKeys[provider] ? '********' : '';
  }

  return finalSettings;
}
