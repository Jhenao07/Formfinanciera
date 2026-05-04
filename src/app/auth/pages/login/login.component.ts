import { Component, inject, signal, OnInit, DestroyRef, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { MfaModalComponent } from '../../../shared/components/mfa-modal/mfa-modal.component';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector:    'app-login',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink, MfaModalComponent],
  templateUrl: './login.component.html',
  styleUrl:    './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly fb         = inject(FormBuilder);
  private readonly auth       = inject(AuthService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // ── Estado auth ──────────────────────────────────────────
  readonly isLoading = this.auth.isLoading;
  readonly authError = this.auth.error;

  // ── Estado local ─────────────────────────────────────────
  readonly justRegistered = signal(false);
  readonly showMfaModal   = signal(false);
  readonly pendingEmail   = signal('');
  readonly isMfaLoading   = signal(false);
  readonly mfaError       = signal<string | null>(null);
  @ViewChild('brandNameRef') brandNameElement!: ElementRef<HTMLSpanElement>;
  form!: FormGroup;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

 ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.animateTextLetterByLetter();
    }
  }
    private animateTextLetterByLetter() {
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

  ngOnInit(): void {
    if ((history.state as { fromRegister?: boolean })?.fromRegister) {
      this.justRegistered.set(true);
      setTimeout(() => this.justRegistered.set(false), 5000);
    }

    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  // ── Getters ──────────────────────────────────────────────
  get emailCtrl() { return this.form.get('email')!; }

  get emailInvalid(): boolean {
    return this.emailCtrl.invalid && this.emailCtrl.touched;
  }

  get emailError(): string {
    const e = this.emailCtrl.errors;
    if (!e) return '';
    if (e['required']) return 'El correo es obligatorio.';
    if (e['email'])    return 'Ingresa un correo válido.';
    return '';
  }

  // ── Handlers ─────────────────────────────────────────────
  onEmailInput(): void {
    this.auth.clearError();
    if (this.justRegistered()) this.justRegistered.set(false);
  }

  requestOtp(): void {
    this.emailCtrl.markAsTouched();
    if (this.form.invalid) return;

    const email = this.emailCtrl.value as string;

    this.auth.sendOtp(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pendingEmail.set(email);
          this.mfaError.set(null);
          this.showMfaModal.set(true);
        },
        error: (err: { status: number }) => {
          this.auth.setError(this.resolveOtpError(err.status));
        },
      });
  }

  validateOtp(code: string): void {
    this.isMfaLoading.set(true);
    this.mfaError.set(null);

    this.auth.validateOtp(this.pendingEmail(), code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showMfaModal.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: () => {
          this.isMfaLoading.set(false);
          this.mfaError.set('Código incorrecto. Verifica e intenta de nuevo.');
        },
      });
  }

  onModalCancelled(): void {
    this.showMfaModal.set(false);
    this.isMfaLoading.set(false);
    this.mfaError.set(null);
  }

  // ── Mapeo de errores (responsabilidad del componente UI) ─
  private resolveOtpError(status: number): string {
    const map: Record<number, string> = {
      401: 'No tienes permiso para solicitar este código.',
      404: 'Este correo no está registrado en el sistema.',
      429: 'Demasiados intentos. Espera unos minutos.',
      500: 'Error del servidor. Contacta a soporte.',
    };
    return map[status] ?? 'No se pudo enviar el código. Intenta de nuevo.';
  }

}
