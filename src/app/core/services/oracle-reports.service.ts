import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OracleInvoiceItem {
  InvoiceNumber: string;
  PaymentCurrency: string;
  InvoiceAmount: number;
  CreationDate: string;
  PaidStatus: string;
  AccountingStatus: string;
}

export interface OracleInvoicesResponse {
  results: { items: OracleInvoiceItem[] };
}

export interface OraclePdfFile {
  data: string;
  fileName: string;
  mimeType: string;
}

export interface OraclePdfResponse {
  result: 'OK' | 'Error';
  file: OraclePdfFile;
}

@Injectable({ providedIn: 'root' })
export class OracleReportsService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.api.oracleUrl;

  getInvoices(
    slug: string,
    startDate: string,
    endDate: string,
    limit = 25,
    offset = 0
  ): Observable<OracleInvoicesResponse> {
    return this.http.post<OracleInvoicesResponse>(this.url, {
      app: 'PORTAL-PROVEEDORES',
      request: 'getInvoiceSupplier',
      slug,
      startDate,
      endDate,
      limit,
      offset,
    });
  }

  getPaymentsPdf(
    slug: string,
    startDate: string,
    endDate: string,

  ): Observable<OraclePdfResponse> {
    return this.http.post<OraclePdfResponse>(this.url, {
      app: 'PORTAL-PROVEEDORES',
      request: 'getDetailPaymentsSupplier',
      slug,
      startDate,
      endDate,

    });
  }


  getPortfolioPdf(
  slug: string,
  startDate: string,
  endDate: string
): Observable<OraclePdfResponse> {
  return this.http.post<OraclePdfResponse>(this.url, {
    app: 'PORTAL-PROVEEDORES',
    request: 'getAccountsPayableAgeSupliers',
    slug,
    startDate,
    endDate,
  });
}
}
