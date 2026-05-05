import {
  Component,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  DestroyRef,
  ViewChild,
  ElementRef,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';

import { AuthService } from '../../../core/services/auth.service';
import { MfaModalComponent } from '../../../shared/components/mfa-modal/mfa-modal.component';

@Component({
  selector:    'app-login',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink, MfaModalComponent],
  templateUrl: './login.component.html',
  styleUrl:    './login.component.scss',
})
export class LoginComponent implements OnInit, AfterViewInit {
  private readonly fb         = inject(FormBuilder);
  private readonly auth       = inject(AuthService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // ── Estado auth (reactivo desde el servicio) ─────────────
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

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  // ── Lifecycle ────────────────────────────────────────────
  ngOnInit(): void {
    if ((history.state as { fromRegister?: boolean })?.fromRegister) {
      this.justRegistered.set(true);
      setTimeout(() => this.justRegistered.set(false), 5000);
    }

    this.form = this.fb.group({
      supplierEmail: ['', [Validators.required, Validators.email]],
      slug: ['', [Validators.required]],
    });
  }

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

  // ── Getters ──────────────────────────────────────────────
  get supplierEmailCtrl() { return this.form.get('supplierEmail')!; }
  get slugCtrl()  { return this.form.get('slug')!;  }
  get supplierEmailInvalid(): boolean {
    return this.supplierEmailCtrl.invalid && this.supplierEmailCtrl.touched;
  }

  get supplierEmailError(): string {
    const e = this.supplierEmailCtrl.errors;
    if (!e) return '';
    if (e['required']) return 'El correo es obligatorio.';
    if (e['email'])    return 'Ingresa un correo válido.';
    return '';
  }

  // ── Handlers ─────────────────────────────────────────────
  onSupplierEmailInput(): void {
    this.auth.clearError();
    if (this.justRegistered()) this.justRegistered.set(false);
  }
  setSlug(slug: string): void {
    this.slugCtrl.setValue(slug);
    this.requestOtp();
  }


  requestOtp(): void {
    this.supplierEmailCtrl.markAsTouched();
    if (this.form.invalid) return;

    const supplierEmail = this.supplierEmailCtrl.value as string;
    const slug = this.slugCtrl.value as string;

    this.auth.sendOtp(supplierEmail, slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pendingEmail.set(supplierEmail);
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

    // 1. Limpiamos espacios extra por si copiaste y pegaste mal
    const cleanCode = code.replace(/\s+/g, '').trim();
    const currentEmail = this.pendingEmail();

    // 2. Obtenemos el slug actual que el usuario digitó en el formulario
    const currentSlug = (this.slugCtrl.value as string).trim().toLowerCase();

    // 3. Enviamos los 3 datos al servicio 👇
    this.auth.validateOtp(currentEmail, currentSlug, cleanCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const target = currentSlug
            ? `/dashboard?slug=${encodeURIComponent(currentSlug)}`
            : '/dashboard';

          this.isMfaLoading.set(false);
          this.showMfaModal.set(false);
          this.router.navigateByUrl(target);
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

  // ── Mapeo de errores HTTP a mensajes UX ──────────────────
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
