import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {
  /**
   * Valida que la contraseña cumpla con requisitos de seguridad
   * - Al menos 8 caracteres
   * - Al menos una mayúscula
   * - Al menos una minúscula
   * - Al menos un número
   * - Al menos un carácter especial
   */
  static strongPassword(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value as string;

      if (!value) {
        return null; // El validador 'required' maneja esto
      }

      const hasMinLength = value.length >= 8;
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

      const passwordValid =
        hasMinLength &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumber &&
        hasSpecialChar;

      return passwordValid ? null : { weakPassword: true };
    };
  }

  /**
   * Valida que dos campos coincidan (útil para confirmación de contraseña)
   */
  static matchFields(fieldName: string, matchFieldName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const field = control.get(fieldName);
      const matchField = control.get(matchFieldName);

      if (!field || !matchField) {
        return null;
      }

      if (matchField.value === '') {
        return null;
      }

      if (field.value !== matchField.value) {
        matchField.setErrors({ ...matchField.errors, passwordMismatch: true });
        return { passwordMismatch: true };
      } else {
        // Limpiar error de mismatch si coinciden
        if (matchField.errors) {
          delete matchField.errors['passwordMismatch'];
          matchField.setErrors(
            Object.keys(matchField.errors).length === 0 ? null : matchField.errors
          );
        }
        return null;
      }
    };
  }
}
