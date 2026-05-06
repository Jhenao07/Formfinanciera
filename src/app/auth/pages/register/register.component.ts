import { Component, inject, signal, OnInit, AfterViewInit, DestroyRef, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit, AfterViewInit {
  private readonly fb         = inject(FormBuilder);
  private readonly auth       = inject(AuthService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = this.auth.isLoading;
  readonly authError = this.auth.error;

  @ViewChild('brandNameRef') brandNameElement!: ElementRef<HTMLSpanElement>;
  form!: FormGroup;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    this.auth.clearError();
    // Validamos los 4 campos requeridos por el webhook de n8n
    this.form = this.fb.group({
      supplierName:  ['', [Validators.required, Validators.minLength(3)]],
      supplierId:    ['', [Validators.required]],
      supplierEmail: ['', [Validators.required, Validators.email]],
      slug:          ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9-]+$/)]], // Solo letras, números y guiones
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

  // Getters para validaciones
  get ctrl() { return this.form.controls; }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && control.touched);
  }

  onInput(): void {
    this.auth.clearError();
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    // Sanitización de datos antes de enviar a n8n
    const payload = {
      supplierName:  (this.form.value.supplierName as string).trim(),
      supplierId:    (this.form.value.supplierId as string).trim(),
      supplierEmail: (this.form.value.supplierEmail as string).trim().toLowerCase(),
      slug:          (this.form.value.slug as string).trim().toLowerCase(),
    };

    this.auth.registerSupplier(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          
          if (response.status === 200) {
            this.router.navigate(['/auth/login'], { state: { fromRegister: true } });
          } else {
            this.auth.setError('Hubo un problema al crear la cuenta. Intenta de nuevo.');
          }
        },
        error: (err) => {
          console.error('Error en n8n:', err);
          this.auth.setError('No pudimos procesar tu registro en este momento.');
        },
      });
  }
}
