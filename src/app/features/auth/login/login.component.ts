import { Component, inject, signal, OnInit, DestroyRef, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MfaModalComponent } from '../components/mfa-modal/mfa-modal.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MfaModalComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MfaModalComponent) mfaModal!: MfaModalComponent;

  // Signals
  readonly isLoading = this.auth.isLoading;
  readonly authError = this.auth.error;
  readonly justRegistered = signal(false);
  readonly submitted = signal(false);
  readonly showMfaModal = signal(false);

  form!: FormGroup;
  currentEmail = '';

  ngOnInit(): void {
    const nav = history.state as { fromRegister?: boolean };
    if (nav?.fromRegister) {
      this.justRegistered.set(true);
      // Auto-hide después de 5s
      setTimeout(() => this.justRegistered.set(false), 5000);
    }

    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get emailInvalid(): boolean {
    return this.submitted() && !!this.form?.get('email')?.invalid;
  }

  get emailError(): string {
    const ctrl = this.form?.get('email');
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required']) return 'El correo es obligatorio.';
    if (ctrl.errors['email']) return 'Ingresa un correo válido.';
    return '';
  }

  onEmailInput(): void {
    this.auth.clearError();
    if (this.justRegistered()) this.justRegistered.set(false);
  }

requestToken(): void {
  this.submitted.set(true);

  if (this.form.invalid) return;

  const email = this.form.get('email')?.value;
  this.currentEmail = email;

  // Llamada al servicio
  this.auth.sendTokenEmail(email)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: () => {
        // Mostramos el modal inmediatamente
        this.showMfaModal.set(true);

        // Usamos requestAnimationFrame en lugar de setTimeout
        // para esperar al siguiente ciclo de renderizado de forma eficiente
        requestAnimationFrame(() => {
          if (this.mfaModal) {
            this.mfaModal.open(email);
          }
        });
      },
      error: (err) => {
        this.auth.error.set(this.handleError(err.status));
      },
    });
}

// Extraer lógica de error para limpiar el flujo principal
private handleError(status: number): string {
  if (status === 401) return 'No tienes permiso para solicitar este código.';
  if (status === 500) return 'Error del servidor. Contacta a soporte.';
  return 'No se pudo enviar el código. Intenta de nuevo.';
}
validateTokenEmail(code: string): void {
  this.auth.validateTokenEmail(this.currentEmail, code)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: () => {
        localStorage.setItem('auth_token', 'true');

        // Cerramos el modal inmediatamente antes de navegar
        // para dar feedback visual instantáneo
        this.showMfaModal.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.mfaModal.showError();
        this.mfaModal.isSubmitting.set(false);
      },
    });
}


  onModalCancelled(): void {
    this.showMfaModal.set(false);
  }
}
