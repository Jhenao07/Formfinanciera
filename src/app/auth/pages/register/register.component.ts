import {
  Component,
  inject,
  AfterViewInit,
  DestroyRef,
  ViewChild,
  ElementRef,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../core/services/auth.service';

/* ── Validador: las dos contraseñas deben coincidir ── */
function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password        = control.get('password')?.value;
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
export class RegisterComponent implements AfterViewInit {

  /* ── Dependencias ── */
  private readonly fb         = inject(FormBuilder);
  private readonly auth       = inject(AuthService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID); // Evita errores en SSR

  /* ── Elemento DOM (Logo Animado) ── */
  @ViewChild('brandNameRef') brandNameElement!: ElementRef<HTMLSpanElement>;

  /* ── Estado auth (reactivo desde el servicio, igual que login) ── */
  readonly isLoading = this.auth.isLoading;
  readonly authError = this.auth.error;

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
     CICLO DE VIDA Y ANIMACIÓN
     ═══════════════════════════════════════════ */
  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.animateTextLetterByLetter();
    }
  }

  private animateTextLetterByLetter(): void {
    if (!this.brandNameElement) return;

    const brandNameNative = this.brandNameElement.nativeElement;
    const text = brandNameNative.textContent?.trim() || '';

    brandNameNative.textContent = '';

    text.split('').forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.className = 'letter';
      span.style.animationDelay = `${0.3 + index * 0.08}s`;
      brandNameNative.appendChild(span);
    });
  }

  /* ═══════════════════════════════════════════
     GETTERS DE VALIDACIÓN (touched + invalid)
     ═══════════════════════════════════════════ */

  get nameInvalid(): boolean {
    const c = this.form.get('name')!;
    return c.invalid && c.touched;
  }

  get nameError(): string {
    const c = this.form.get('name')!;
    if (c.hasError('required'))  return 'El nombre es obligatorio.';
    if (c.hasError('minlength')) return 'Mínimo 2 caracteres.';
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
    if (c.hasError('required'))                  return 'Confirma tu contraseña.';
    if (this.form.hasError('passwordsMismatch')) return 'Las contraseñas no coinciden.';
    return '';
  }

  /* ═══════════════════════════════════════════
     HANDLERS DE INPUT (limpia error global vía AuthService)
     ═══════════════════════════════════════════ */

  onNameInput():     void { this.auth.clearError(); }
  onEmailInput():    void { this.auth.clearError(); }
  onPasswordInput(): void { this.auth.clearError(); }
  onConfirmInput():  void { this.auth.clearError(); }

  /* ═══════════════════════════════════════════
     TOGGLE MOSTRAR / OCULTAR CONTRASEÑA
     ═══════════════════════════════════════════ */

  togglePassword(): void { this.showPassword = !this.showPassword; }
  toggleConfirm():  void { this.showConfirm  = !this.showConfirm;  }

  /* ═══════════════════════════════════════════
     SUBMIT — Integración real con AuthService
     ═══════════════════════════════════════════ */

  onRegister(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const { name, email, password } = this.form.getRawValue() as {
      name: string;
      email: string;
      password: string;
    };

    this.auth.register({ name, email, password })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Redirige a login con flag `fromRegister` que el LoginComponent
          // detecta vía history.state para mostrar la alerta de éxito.
          this.router.navigate(['/auth/login'], {
            state: { fromRegister: true },
          });
        },
        error: (err: { status: number }) => {
          this.auth.setError(this.resolveRegisterError(err.status));
        },
      });
  }

  /* ═══════════════════════════════════════════
     MAPEO DE ERRORES HTTP A MENSAJES UX
     ═══════════════════════════════════════════ */

  private resolveRegisterError(status: number): string {
    const map: Record<number, string> = {
      400: 'Datos inválidos. Verifica los campos e intenta de nuevo.',
      409: 'Este correo ya está registrado. Prueba iniciando sesión.',
      422: 'No pudimos validar tus datos. Revísalos.',
      429: 'Demasiados intentos. Espera unos minutos.',
      500: 'Error del servidor. Contacta a soporte.',
    };
    return map[status] ?? 'No se pudo crear la cuenta. Intenta de nuevo.';
  }
}
