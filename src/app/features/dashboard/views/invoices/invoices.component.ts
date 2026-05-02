import { Component, inject, signal, DestroyRef, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardService, Invoice } from '../../../../core/services/dashboard.service';
import { CurrencyFormatPipe } from '../../../../core/pipes/currency-format.pipe';

@Component({
  selector:  'app-invoices',
  standalone: true,
  imports:   [NgClass, CurrencyFormatPipe],
  templateUrl: './invoices.component.html',
  styleUrl:  './invoices.component.scss',
})
export class InvoicesComponent implements OnInit {
  private readonly service    = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly invoices  = signal<Invoice[]>([]);
  readonly isLoading = signal(false);
  readonly hasError  = signal(false);

  ngOnInit(): void {
    this.isLoading.set(true);
    this.service.getInvoices()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  data => { this.invoices.set(data);  this.isLoading.set(false); },
        error: ()   => { this.hasError.set(true);  this.isLoading.set(false); },
      });
  }

  getStatusClass(status: string): string {
    return { pending: 'badge--warning', approved: 'badge--success', rejected: 'badge--danger' }[status] ?? '';
  }

  getStatusLabel(status: string): string {
    return { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' }[status] ?? status;
  }
}
