import { Component, inject, signal, OnInit, DestroyRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardService, Invoice } from '../../core/services/dashboard.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
// ✅ FIX: ruta corregida
import { FileUploadComponent } from './components/file-upload/file-upload.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FileUploadComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private router           = inject(Router);
  private destroyRef       = inject(DestroyRef);

  @ViewChild('paymentUpload')   paymentUpload!:   FileUploadComponent;
  @ViewChild('portfolioUpload') portfolioUpload!: FileUploadComponent;

  currentView          = signal<'invoices' | 'payment' | 'portfolio' | 'home'>('home');
  invoices             = signal<Invoice[]>([]);
  isLoadingInvoices    = signal(false);
  isUploadingPayment   = signal(false);
  isUploadingPortfolio = signal(false);
  showHelp             = signal(false);
  uploadSuccess        = signal<string | null>(null);

  ngOnInit(): void {}

  loadInvoices(): void {
    this.currentView.set('invoices');
    this.isLoadingInvoices.set(true);
    this.dashboardService.getInvoices()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (data) => { this.invoices.set(data); this.isLoadingInvoices.set(false); },
        error: ()     => { this.isLoadingInvoices.set(false); }
      });
  }

  showPaymentUpload(): void {
    this.currentView.set('payment');
    this.uploadSuccess.set(null);
  }

  onPaymentFileSelected(file: File): void {
    this.isUploadingPayment.set(true);
    this.paymentUpload.setDisabled(true);
    this.dashboardService.uploadPaymentSupport(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isUploadingPayment.set(false);
          this.paymentUpload.setDisabled(false);
          this.uploadSuccess.set(res.message);
          setTimeout(() => this.uploadSuccess.set(null), 5000);
        },
        error: () => { this.isUploadingPayment.set(false); this.paymentUpload.setDisabled(false); }
      });
  }

  showPortfolioUpload(): void {
    this.currentView.set('portfolio');
    this.uploadSuccess.set(null);
  }

  onPortfolioFileSelected(file: File): void {
    this.isUploadingPortfolio.set(true);
    this.portfolioUpload.setDisabled(true);
    this.dashboardService.uploadPortfolioAge(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isUploadingPortfolio.set(false);
          this.portfolioUpload.setDisabled(false);
          this.uploadSuccess.set(res.message);
          setTimeout(() => this.uploadSuccess.set(null), 5000);
        },
        error: () => { this.isUploadingPortfolio.set(false); this.portfolioUpload.setDisabled(false); }
      });
  }

  goHome():     void { this.currentView.set('home'); }
  toggleHelp(): void { this.showHelp.update(v => !v); }
  logout():     void { this.router.navigate(['/auth/login']); }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  }

  getStatusBadge(status: string): string {
    const badges: { [key: string]: string } = { pending: 'badge--warning', approved: 'badge--success', rejected: 'badge--danger' };
    return badges[status] || '';
  }

  getStatusLabel(status: string): string {
    return ({ pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' } as Record<string, string>)[status] || status;
  }
}
