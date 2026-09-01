import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { isStrongPassword } from './password-policy';

const ERROR_MESSAGE =
  'La contraseña debe tener al menos 10 caracteres, incluir al menos 3 de: ' +
  'mayúscula, minúscula, número o símbolo, y no ser fácil de adivinar.';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments): boolean {
          return typeof value === 'string' && isStrongPassword(value);
        },
        defaultMessage(_args: ValidationArguments): string {
          return ERROR_MESSAGE;
        },
      },
    });
  };
}
