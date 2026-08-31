import { ICryptoPort } from '../../ports/crypto.port';

export interface FcmTokenRow {
  id: string;
  fcmToken: string;
}

export interface FcmKeyRotationUpdate {
  id: string;
  newValue: string;
}

export interface FcmKeyRotationPlan {
  updates: FcmKeyRotationUpdate[];
  reencryptedCount: number;
  legacyPlaintextCount: number;
}

/**
 * Detecta si un valor tiene el formato real de sobre cifrado (v1 + 3 partes separadas por ':').
 * Debe coincidir exactamente con la lógica de AesGcmCrypto.decrypt().
 */
function isEncryptedEnvelope(value: string): boolean {
  const parts = value.split(':');
  return parts.length === 4 && parts[0] === 'v1';
}

/**
 * Calcula qué escribir en cada fila para rotar FCM_TOKEN_ENCRYPTION_KEY:
 * desencripta con la clave vieja (o toma el valor tal cual si es texto
 * plano legado) y re-encripta con la clave nueva. No toca la base de
 * datos — eso lo hace el script que invoca esta función.
 */
export function planFcmKeyRotation(
  rows: FcmTokenRow[],
  oldCrypto: ICryptoPort,
  newCrypto: ICryptoPort,
): FcmKeyRotationPlan {
  const updates: FcmKeyRotationUpdate[] = [];
  let reencryptedCount = 0;
  let legacyPlaintextCount = 0;

  for (const row of rows) {
    const isEncrypted = isEncryptedEnvelope(row.fcmToken);
    const plainText = isEncrypted
      ? oldCrypto.decrypt(row.fcmToken)
      : row.fcmToken;

    if (isEncrypted) {
      reencryptedCount++;
    } else {
      legacyPlaintextCount++;
    }

    updates.push({ id: row.id, newValue: newCrypto.encrypt(plainText) });
  }

  return { updates, reencryptedCount, legacyPlaintextCount };
}
