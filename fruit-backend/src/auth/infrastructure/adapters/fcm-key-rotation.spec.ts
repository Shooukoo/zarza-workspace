import { randomBytes } from 'crypto';
import { AesGcmCrypto } from './aes-gcm-crypto.adapter';
import { planFcmKeyRotation } from './fcm-key-rotation';

function makeCrypto(): AesGcmCrypto {
  process.env.FCM_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  return new AesGcmCrypto();
}

describe('planFcmKeyRotation', () => {
  it('re-encripta un token ya cifrado con la clave vieja usando la clave nueva', () => {
    const oldCrypto = makeCrypto();
    const newCrypto = makeCrypto();
    const encryptedWithOld = oldCrypto.encrypt('token-real-123');

    const plan = planFcmKeyRotation(
      [{ id: 'user-1', fcmToken: encryptedWithOld }],
      oldCrypto,
      newCrypto,
    );

    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0].id).toBe('user-1');
    expect(newCrypto.decrypt(plan.updates[0].newValue)).toBe('token-real-123');
    expect(plan.reencryptedCount).toBe(1);
    expect(plan.legacyPlaintextCount).toBe(0);
  });

  it('cifra un token legado en texto plano (backfill) con la clave nueva', () => {
    const oldCrypto = makeCrypto();
    const newCrypto = makeCrypto();

    const plan = planFcmKeyRotation(
      [{ id: 'user-2', fcmToken: 'token-legado-sin-cifrar' }],
      oldCrypto,
      newCrypto,
    );

    expect(plan.updates).toHaveLength(1);
    expect(newCrypto.decrypt(plan.updates[0].newValue)).toBe(
      'token-legado-sin-cifrar',
    );
    expect(plan.legacyPlaintextCount).toBe(1);
    expect(plan.reencryptedCount).toBe(0);
  });

  it('procesa una mezcla de filas cifradas y en texto plano, contando cada tipo', () => {
    const oldCrypto = makeCrypto();
    const newCrypto = makeCrypto();
    const encrypted = oldCrypto.encrypt('cifrado-real');

    const plan = planFcmKeyRotation(
      [
        { id: 'a', fcmToken: encrypted },
        { id: 'b', fcmToken: 'plano-real' },
      ],
      oldCrypto,
      newCrypto,
    );

    expect(plan.reencryptedCount).toBe(1);
    expect(plan.legacyPlaintextCount).toBe(1);
    expect(plan.updates.map((u) => u.id).sort()).toEqual(['a', 'b']);
  });

  it('propaga el error si un valor cifrado no puede desencriptarse con la clave vieja', () => {
    const oldCrypto = makeCrypto();
    const newCrypto = makeCrypto();
    const corrupted =
      'v1:AAAAAAAAAAAAAAAA:BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB:Zg==';

    expect(() =>
      planFcmKeyRotation(
        [{ id: 'user-3', fcmToken: corrupted }],
        oldCrypto,
        newCrypto,
      ),
    ).toThrow();
  });

  it('con una lista vacía no genera updates', () => {
    const oldCrypto = makeCrypto();
    const newCrypto = makeCrypto();

    const plan = planFcmKeyRotation([], oldCrypto, newCrypto);

    expect(plan.updates).toEqual([]);
    expect(plan.reencryptedCount).toBe(0);
    expect(plan.legacyPlaintextCount).toBe(0);
  });
});
