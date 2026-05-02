import { Component, inject, signal, ViewChild, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';

@Component({
  selector:    'app-payments',
  standalone:  true,
  imports:     [FileUploadComponent],
  templateUrl: './payments.component.html',
  styleUrl:    './payments.component.scss',
})
export class PaymentsComponent {
  private readonly service    = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('upload') upload!: FileUploadComponent;

  readonly isUploading  = signal(false);
  readonly successMsg   = signal<string | null>(null);
  readonly errorMsg     = signal<string | null>(null);

  onFileSelected(file: File): void {
    this.isUploading.set(true);
    this.upload.setDisabled(true);
    this.successMsg.set(null);
    this.errorMsg.set(null);

    this.service.uploadPaymentSupport(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.isUploading.set(false);
          this.upload.setDisabled(false);
          this.successMsg.set(res.message);
          setTimeout(() => this.successMsg.set(null), 5000);
        },
        error: () => {
          this.isUploading.set(false);
          this.upload.setDisabled(false);
          this.errorMsg.set('Error al subir el archivo. Intenta de nuevo.');
        },
      });
  }
}
