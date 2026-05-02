import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

/* ── Validador: las dos contraseñas deben coincidir ── */
function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password    = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {

  /* ── Dependencias ── */
  private fb     = inject(FormBuilder);
  private router = inject(Router);

  /* ── Signals ── */
  isLoading = signal(false);
  authError = signal<string | null>(null);

  /* ── UI state ── */
  showPassword = false;
  showConfirm  = false;

  /* ── Formulario ── */
  form = this.fb.group(
    {
      name:            ['', [Validators.required, Validators.minLength(2)]],
      email:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch }
  );

  /* ═══════════════════════════════════════════
     GETTERS DE VALIDACIÓN (touched + invalid)
     ═══════════════════════════════════════════ */

  get nameInvalid(): boolean {
    const c = this.form.get('name')!;
    return c.invalid && c.touched;
  }

  get nameError(): string {
    const c = this.form.get('name')!;
    if (c.hasError('required'))   return 'El nombre es obligatorio.';
    if (c.hasError('minlength'))  return 'Mínimo 2 caracteres.';
    return '';
  }

  get emailInvalid(): boolean {
    const c = this.form.get('email')!;
    return c.invalid && c.touched;
  }

  get emailError(): string {
    const c = this.form.get('email')!;
    if (c.hasError('required')) return 'El correo es obligatorio.';
    if (c.hasError('email'))    return 'Ingresa un correo válido.';
    return '';
  }

  get passwordInvalid(): boolean {
    const c = this.form.get('password')!;
    return c.invalid && c.touched;
  }

  get passwordError(): string {
    const c = this.form.get('password')!;
    if (c.hasError('required'))  return 'La contraseña es obligatoria.';
    if (c.hasError('minlength')) return 'Mínimo 8 caracteres.';
    return '';
  }

  get confirmInvalid(): boolean {
    const c = this.form.get('confirmPassword')!;
    const mismatch = this.form.hasError('passwordsMismatch') && c.touched;
    return (c.invalid && c.touched) || mismatch;
  }

  get confirmError(): string {
    const c = this.form.get('confirmPassword')!;
    if (c.hasError('required'))              return 'Confirma tu contraseña.';
    if (this.form.hasError('passwordsMismatch')) return 'Las contraseñas no coinciden.';
    return '';
  }

  /* ═══════════════════════════════════════════
     HANDLERS DE INPUT (limpia error global)
     ═══════════════════════════════════════════ */

  onNameInput():    void { this.authError.set(null); }
  onEmailInput():   void { this.authError.set(null); }
  onPasswordInput(): void { this.authError.set(null); }
  onConfirmInput(): void { this.authError.set(null); }

  /* ═══════════════════════════════════════════
     TOGGLE MOSTRAR / OCULTAR CONTRASEÑA
     ═══════════════════════════════════════════ */

  togglePassword(): void { this.showPassword = !this.showPassword; }
  toggleConfirm():  void { this.showConfirm  = !this.showConfirm;  }

  /* ═══════════════════════════════════════════
     SUBMIT
     ═══════════════════════════════════════════ */

  async onRegister(): Promise<void> {
    this.form.markAllAsTouched();

    if (this.form.invalid) return;

    this.isLoading.set(true);
    this.authError.set(null);

    const { name, email, password } = this.form.getRawValue();

    try {
      // TODO: reemplaza con tu servicio de autenticación
      // await this.authService.register({ name, email, password });

      // Simula llamada async
      await new Promise(r => setTimeout(r, 1000));

      // Redirige al login con flag de registro exitoso
      this.router.navigate(['/auth/login'], {
        queryParams: { registered: 'true' },
      });

    } catch (err: any) {
      this.authError.set(
        err?.message ?? 'Ocurrió un error al crear la cuenta. Inténtalo de nuevo.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
