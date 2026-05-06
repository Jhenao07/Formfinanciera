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

}
