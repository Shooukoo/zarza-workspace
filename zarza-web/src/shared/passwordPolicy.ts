// zarza-web/src/shared/passwordPolicy.ts
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

export interface PasswordEvaluation {
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  typesCount: number;
  meetsComposition: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  meetsScore: boolean;
  valid: boolean;
}

const GENERATOR_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I/O, ambiguos al leer
const GENERATOR_LOWER = 'abcdefghijkmnopqrstuvwxyz'; // sin l
const GENERATOR_DIGITS = '23456789'; // sin 0/1
const GENERATOR_SYMBOLS = '!@#$%^&*()-_=+?';
const GENERATOR_LENGTH = 16;

function secureRandomIndex(max: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

function pickChar(chars: string): string {
  return chars[secureRandomIndex(chars.length)];
}

/** Genera una contraseña aleatoria que cumple la política (longitud, tipos y score). */
export function generatePassword(length = GENERATOR_LENGTH): string {
  const groups = [GENERATOR_UPPER, GENERATOR_LOWER, GENERATOR_DIGITS, GENERATOR_SYMBOLS];
  const chars = groups.map(pickChar);
  const allChars = groups.join('');
  while (chars.length < length) {
    chars.push(pickChar(allChars));
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export function evaluatePassword(
  password: string,
  userInputs: string[] = [],
): PasswordEvaluation {
  const hasMinLength = password.length >= MIN_LENGTH;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const typesCount = [hasUpper, hasLower, hasNumber, hasSymbol].filter(
    Boolean,
  ).length;
  const meetsComposition = hasMinLength && typesCount >= MIN_TYPES;

  const result = password ? zxcvbnInstance.check(password, userInputs) : null;
  const score = (result?.score ?? 0) as 0 | 1 | 2 | 3 | 4;
  const meetsScore = score >= MIN_SCORE;

  return {
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSymbol,
    typesCount,
    meetsComposition,
    score,
    meetsScore,
    valid: meetsComposition && meetsScore,
  };
}
