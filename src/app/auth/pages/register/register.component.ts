import {
  Component,
  inject,
  signal,
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
import { Subject, of, timer } from 'rxjs';
import {
  switchMap,
  debounceTime,
  catchError,
  distinctUntilChanged,
  finalize,
  tap,
} from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';

/* ── Validador: los dos correos deben coincidir ── */
function emailsMatch(control: AbstractControl): ValidationErrors | null {
  const email        = (control.get('email')?.value        ?? '').trim().toLowerCase();
  const confirmEmail = (control.get('confirmEmail')?.value ?? '').trim().toLowerCase();
  if (!email || !confirmEmail) return null;
  return email === confirmEmail ? null : { emailsMismatch: true };
}

/* ── Tipo del lookup de empresa ── */
interface CompanyLookupResult {
  slug: string;        // identificador único (lo que tu LoginComponent llama "slug")
  name: string;        // razón social legible para mostrar al usuario
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

  /* ═══════════════════════════════════════════
     ESTADO REACTIVO — Lookup de empresa por NIT
     ═══════════════════════════════════════════ */
  readonly companyLoading  = signal(false);
  readonly companyFound    = signal(false);
  readonly companyNotFound = signal(false);
  readonly companyName     = signal<string>(''); // razón social (mostrado al usuario)
  readonly companySlug     = signal<string>(''); // identificador (enviado al backend)

  readonly companyHintId   = 'reg-company-hint';

  /** Trigger interno para disparar la búsqueda con debounce */
  private readonly nitLookup$ = new Subject<{ nit: string; dv: string }>();

  private submitAttempted = false;

  /* ── Formulario ── */
  form = this.fb.group(
    {
      name:         ['', [Validators.required, Validators.minLength(2)]],
      nit:          ['', [Validators.required, Validators.pattern(/^\d{6,12}$/)]],
      dv:           ['', [Validators.required, Validators.pattern(/^\d$/)]],
      email:        ['', [Validators.required, Validators.email]],
      confirmEmail: ['', [Validators.required, Validators.email]],
    },
    { validators: emailsMatch }
  );

  constructor() {
    /* Pipeline reactivo del lookup: debounce → distinct → switchMap */
    this.nitLookup$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(
          (a, b) => a.nit === b.nit && a.dv === b.dv,
        ),
        tap(() => {
          this.companyLoading.set(true);
          this.companyFound.set(false);
          this.companyNotFound.set(false);
        }),
        switchMap(({ nit, dv }) =>
          this.lookupCompany(nit, dv).pipe(
            catchError(() => of(null)),
            finalize(() => this.companyLoading.set(false)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.companyLoading.set(false);
        if (result) {
          this.companyFound.set(true);
          this.companyNotFound.set(false);
          this.companyName.set(result.name);
          this.companySlug.set(result.slug);
        } else {
          this.companyFound.set(false);
          this.companyNotFound.set(true);
          this.companyName.set('');
          this.companySlug.set('');
        }
      });
  }

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
     CONSULTA DE EMPRESA — Reemplaza por tu endpoint real
     ═══════════════════════════════════════════ */
  private lookupCompany(nit: string, dv: string) {
    /*
      OPCIÓN REAL: si tu AuthService (o un CompanyService) ya expone un método
      como `getCompanyByNit(nit, dv)` que devuelva Observable<CompanyLookupResult | null>,
      reemplaza este bloque por:

         return this.auth.getCompanyByNit(nit, dv);

      o inyecta un servicio dedicado:

         return this.companyService.findByNit(nit, dv);
    */

    // === Mock temporal — quita cuando conectes el endpoint real ===
    return timer(600).pipe(
      switchMap(() => {
        const knownByNit: Record<string, CompanyLookupResult> = {
          '900123456': { slug: 'acme-co',     name: 'ACME S.A.S.' },
          '901234567': { slug: 'globex-corp', name: 'Globex Corporation' },
          '902345678': { slug: 'initech',     name: 'Initech Ltda.' },
        };
        return of<CompanyLookupResult | null>(knownByNit[nit] ?? null);
      }),
    );
  }

  /** Resetea el estado de la empresa (cuando el NIT cambia o queda inválido) */
  private resetCompanyState(): void {
    this.companyLoading.set(false);
    this.companyFound.set(false);
    this.companyNotFound.set(false);
    this.companyName.set('');
    this.companySlug.set('');
  }

  /** Decide si disparar el lookup según validez de NIT y DV */
  private maybeLookupCompany(): void {
    const nitCtrl = this.form.get('nit')!;
    const dvCtrl  = this.form.get('dv')!;

    if (nitCtrl.valid && dvCtrl.valid) {
      this.nitLookup$.next({ nit: nitCtrl.value!, dv: dvCtrl.value! });
    } else {
      this.resetCompanyState();
    }
  }

  /* ═══════════════════════════════════════════
     COMPUTEDS DE TEMPLATE PARA EL CAMPO EMPRESA
     ═══════════════════════════════════════════ */

  /** Lo que se muestra dentro del input readonly */
  companyDisplay = (): string => this.companyName();

  /** Placeholder dinámico según el estado */
  companyPlaceholder = (): string => {
    if (this.companyLoading())  return 'Buscando empresa…';
    if (this.companyNotFound()) return 'No se encontró empresa con ese NIT';
    return 'Esperando NIT…';
  };

  /** Marca el campo como “inválido visual” cuando se intentó submit y no hay empresa */
  get companyInvalid(): boolean {
    return this.companyNotFound() || (this.submitAttempted && !this.companyFound());
  }

  get companyError(): string {
    if (this.companyNotFound())                       return 'No encontramos una empresa con ese NIT. Verifica el número o contacta a soporte.';
    if (this.submitAttempted && !this.companyFound()) return 'Debes ingresar un NIT válido para detectar tu empresa.';
    return '';
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

  /* ── NIT ── */
  get nitInvalid(): boolean {
    const c = this.form.get('nit')!;
    return c.invalid && c.touched;
  }

  get nitError(): string {
    const c = this.form.get('nit')!;
    if (c.hasError('required')) return 'El NIT es obligatorio.';
    if (c.hasError('pattern'))  return 'NIT inválido (sólo dígitos, 6–12).';
    return '';
  }

  /* ── DV (dígito de verificación) ── */
  get dvInvalid(): boolean {
    const c = this.form.get('dv')!;
    return c.invalid && c.touched;
  }

  get dvError(): string {
    const c = this.form.get('dv')!;
    if (c.hasError('required')) return 'Ingresa el dígito de verificación (DV).';
    if (c.hasError('pattern'))  return 'El DV debe ser un único dígito (0–9).';
    return '';
  }

  /* ── Email ── */
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

  /* ── Confirmar Email ── */
  get confirmEmailInvalid(): boolean {
    const c = this.form.get('confirmEmail')!;
    const mismatch = this.form.hasError('emailsMismatch') && c.touched;
    return (c.invalid && c.touched) || mismatch;
  }

  get confirmEmailError(): string {
    const c = this.form.get('confirmEmail')!;
    if (c.hasError('required'))               return 'Confirma tu correo.';
    if (c.hasError('email'))                  return 'Ingresa un correo válido.';
    if (this.form.hasError('emailsMismatch')) return 'Los correos no coinciden.';
    return '';
  }

  /* ═══════════════════════════════════════════
     HANDLERS DE INPUT
     ═══════════════════════════════════════════ */

  onNameInput(): void { this.auth.clearError(); }

  onNitInput(): void {
    const c = this.form.get('nit')!;
    const cleaned = (c.value ?? '').replace(/\D+/g, '');
    if (cleaned !== c.value) c.setValue(cleaned, { emitEvent: false });
    this.auth.clearError();
    this.maybeLookupCompany();
  }

  onDvInput(): void {
    const c = this.form.get('dv')!;
    const cleaned = (c.value ?? '').replace(/\D+/g, '').slice(0, 1);
    if (cleaned !== c.value) c.setValue(cleaned, { emitEvent: false });
    this.auth.clearError();
    this.maybeLookupCompany();
  }

  onEmailInput():        void { this.auth.clearError(); }
  onConfirmEmailInput(): void { this.auth.clearError(); }

  /* ═══════════════════════════════════════════
     SUBMIT — Integración real con AuthService
     ═══════════════════════════════════════════ */

  onRegister(): void {
    this.submitAttempted = true;
    this.form.markAllAsTouched();

    if (this.form.invalid) return;

    // No permitir submit si no hay empresa válida detectada
    if (!this.companyFound() || !this.companySlug()) return;

    const { name, nit, dv, email } = this.form.getRawValue() as {
      name: string;
      nit: string;
      dv: string;
      email: string;
      confirmEmail: string;
    };

    this.auth.register({
      name:  name.trim(),
      email: email.trim().toLowerCase(),
      nit:   nit.trim(),
      dv:    dv.trim(),
      slug:  this.companySlug(),
    } as any)
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
      409: 'Este correo o NIT ya está registrado. Prueba iniciando sesión.',
      422: 'No pudimos validar tus datos. Revísalos.',
      429: 'Demasiados intentos. Espera unos minutos.',
      500: 'Error del servidor. Contacta a soporte.',
    };
    return map[status] ?? 'No se pudo crear la cuenta. Intenta de nuevo.';
  }
}
