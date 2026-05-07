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
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MfaModalComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // ── ESTADO REACTIVO (Signals) ────────────────────────────
  readonly isLoading = this.auth.isLoading;
  readonly authError = this.auth.error;

  readonly justRegistered = signal(false);
  readonly showMfaModal = signal(false);
  readonly pendingEmail = signal('');
  readonly isMfaLoading = signal(false);
  readonly mfaError = signal<string | null>(null);

  @ViewChild('brandNameRef') brandNameElement!: ElementRef<HTMLSpanElement>;
  form!: FormGroup;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if ((history.state as { fromRegister?: boolean })?.fromRegister) {
      this.justRegistered.set(true);
      setTimeout(() => this.justRegistered.set(false), 6000);
    }

    this.form = this.fb.group({
      slug: ['', [Validators.required]],
      supplierId: ['', [Validators.required]],
      supplierEmail: ['', [Validators.required, Validators.email]],
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.animateTextLetterByLetter();
    }
  }

  private animateTextLetterByLetter(): void {
    if (!this.brandNameElement) return;
    const el = this.brandNameElement.nativeElement;
    const text = el.textContent?.trim() || '';
    el.textContent = '';

    text.split('').forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.className = 'letter';
      span.style.animationDelay = `${0.2 + index * 0.05}s`;
      el.appendChild(span);
    });
  }

  // ── CONTROLES Y VALIDACIONES UI ──────────────────────────
  get ctrl() { return this.form.controls; }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && control.touched);
  }

  get emailError(): string {
    const e = this.ctrl['supplierEmail'].errors;
    if (!e) return '';
    if (e['required']) return 'El correo es obligatorio.';
    if (e['email']) return 'El formato del correo es inválido.';
    return '';
  }

  clearErrors(): void {
    this.auth.clearError();
    if (this.justRegistered()) this.justRegistered.set(false);
  }

  // ── FLUJO DE AUTENTICACIÓN ───────────────────────────────
  requestOtp(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const { slug, supplierId, supplierEmail } = this.form.value;
    const app = "PORTAL-PROVEEDORES";

    this.auth.sendOtp(supplierEmail, slug, supplierId, app)
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

    const cleanCode = code.replace(/\s+/g, '').trim();
    const { slug, supplierId } = this.form.value;
    const app = "PORTAL-PROVEEDORES";

    this.auth.validateOtp(slug.toLowerCase(), app, this.pendingEmail(), supplierId, cleanCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const target = slug ? `/dashboard?slug=${encodeURIComponent(slug)}` : '/dashboard';
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

  private resolveOtpError(status: number): string {
    const map: Record<number, string> = {
      401: 'Credenciales o Workspace incorrectos.',
      404: 'Este usuario no está registrado en el sistema.',
      429: 'Demasiados intentos. Espera unos minutos.',
      500: 'Error interno del servidor. Contacta a soporte.',
    };
    return map[status] ?? 'Ocurrió un error al enviar el código. Inténtalo de nuevo.';
  }
}
