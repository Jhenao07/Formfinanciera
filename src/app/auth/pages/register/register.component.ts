import { Component, inject, signal, OnInit, AfterViewInit, DestroyRef, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';

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

  readonly supplierContacts = signal<string[]>([]);
  readonly isLoading = this.auth.isLoading;
  readonly authError = this.auth.error;

  @ViewChild('brandNameRef') brandNameElement!: ElementRef<HTMLSpanElement>;
  form!: FormGroup;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    this.auth.clearError();
    // Validamos los 4 campos requeridos por el webhook de n8n
    this.form = this.fb.group({
      supplierName: [{ value: '', disabled: false }],
      supplierId:    ['', [Validators.required]],
      supplierEmail: ['', [Validators.required, Validators.email]],
      slug:          ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9-]+$/)]], // Solo letras, números y guiones
      supplierContacts: signal<string[]>([])

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

validateId(): void {
  const slug = (this.form.value.slug as string)?.trim().toLowerCase();
  const supplierId = (this.form.value.supplierId as string)?.trim();

  if (!slug || !supplierId) {
    Swal.fire({
      icon: 'warning',
      title: 'Faltan datos',
      text: 'Por favor llena el Workspace y el NIT antes de validar.',
      customClass: { popup: 'swal-modern' }
    });
    return;
  }

  // Reset previo
  this.supplierContacts.set([]);
  this.form.patchValue({ supplierName: '', supplierEmail: '' });

  this.auth.validateId(slug, supplierId)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (response: any) => {
        const data = response.body;

        if (data?.exists && data.supplierName) {
          const contacts: string[] = data.contacts || [];

          this.supplierContacts.set(contacts);

          this.form.patchValue({
            supplierName: data.supplierName,
            supplierEmail: contacts[0] ?? ''
          });

          Swal.fire({
            icon: 'success',
            title: '¡Empresa encontrada!',
            text: contacts.length > 0
              ? 'Selecciona tu correo de contacto en la lista desplegable.'
              : 'Se ha completado el nombre de la empresa.',
            timer: 3000,
            showConfirmButton: false,
            customClass: { popup: 'swal-modern' }
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'NIT no encontrado',
            text: 'Verifica los datos e intenta de nuevo.',
            customClass: { popup: 'swal-modern' }
          });
        }
      },
      error: () => {
        this.supplierContacts.set([]);
        this.form.patchValue({ supplierName: '', supplierEmail: '' });
        Swal.fire({
          icon: 'error',
          title: 'NIT no encontrado',
          text: 'Verifica los datos e intenta de nuevo.',
          customClass: { popup: 'swal-modern' }
        });
      }
    });
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
