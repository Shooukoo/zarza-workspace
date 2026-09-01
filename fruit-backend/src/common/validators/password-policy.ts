import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEsEsPackage from '@zxcvbn-ts/language-es-es';

const zxcvbnInstance = new ZxcvbnFactory({
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEsEsPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnEsEsPackage.translations,
});

export const MIN_LENGTH = 10;
export const MIN_TYPES = 3;
export const MIN_SCORE = 2;

export function isStrongPassword(password: string): boolean {
  if (typeof password !== 'string' || password.length === 0) return false;

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const typesCount = [hasUpper, hasLower, hasNumber, hasSymbol].filter(
    Boolean,
  ).length;

  const meetsComposition =
    password.length >= MIN_LENGTH && typesCount >= MIN_TYPES;
  if (!meetsComposition) return false;

  const result = zxcvbnInstance.check(password);
  return result.score >= MIN_SCORE;
}
