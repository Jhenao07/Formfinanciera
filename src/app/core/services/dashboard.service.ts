import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';

export interface Invoice {
  id: string;
  number: string;
  date: string;
  client: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  daysOverdue?: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  // Mock API endpoints - reemplaza con tus endpoints reales
  private readonly API_URL = '/api/dashboard';

  /**
   * Obtiene las facturas radicadas
   */
  getInvoices(): Observable<Invoice[]> {
    // Mock data - reemplaza con: return this.http.get<Invoice[]>(`${this.API_URL}/invoices`);
    return of([
      {
        id: '1',
        number: 'INV-2024-001',
        date: '2024-04-15',
        client: 'Carboquimica S.A.S',
        amount: 15000000,
        status: 'approved'
      },
      {
        id: '2',
        number: 'INV-2024-002',
        date: '2024-04-18',
        client: 'Nuvant S.A.S',
        amount: 8500000,
        status: 'pending',
        daysOverdue: 5
      },
      {
        id: '3',
        number: 'INV-2024-003',
        date: '2024-04-20',
        client: 'Lamitech',
        amount: 22000000,
        status: 'pending',
        daysOverdue: 12
      },
      {
        id: '4',
        number: 'INV-2024-004',
        date: '2024-04-22',
        client: 'Distribuidora Nacional',
        amount: 5200000,
        status: 'approved'
      },
      {
        id: '5',
        number: 'INV-2024-005',
        date: '2024-04-25',
        client: 'Comercial Sur',
        amount: 18750000,
        status: 'rejected'
      }
    ] as Invoice[]).pipe(delay(800)); // Simula latencia de red
  }

  /**
   * Sube archivo de soportes de pago
   */
  uploadPaymentSupport(file: File): Observable<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    // Mock response - reemplaza con: return this.http.post<...>(`${this.API_URL}/payment-support`, formData);
    return of({
      success: true,
      message: `Archivo "${file.name}" cargado exitosamente`
    }).pipe(delay(1200));
  }

  /**
   * Sube archivo de edad de cartera
   */
  uploadPortfolioAge(file: File): Observable<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    // Mock response - reemplaza con: return this.http.post<...>(`${this.API_URL}/portfolio-age`, formData);
    return of({
      success: true,
      message: `Archivo "${file.name}" procesado correctamente`
    }).pipe(delay(1200));
  }
}
