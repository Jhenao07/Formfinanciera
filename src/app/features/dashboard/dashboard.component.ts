import {
  Component,
  Inject,
  signal,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  AfterViewInit,
  computed,
  inject,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { isPlatformBrowser, TitleCasePipe, DecimalPipe } from '@angular/common';
import { PdfViewerComponent, PdfViewerModule } from 'ng2-pdf-viewer';
import {
  OracleReportsService,
  OraclePdfResponse,
  OracleInvoicesResponse,
} from './../../core/services/oracle-reports.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TitleCasePipe, PdfViewerModule, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly oracle = inject(OracleReportsService);

  // ──────────────────────────────────────────────────────────
  // ESTADO DE LA VISTA
  // ──────────────────────────────────────────────────────────
  currentView = signal<'home' | 'invoices' | 'payment' | 'portfolio'>('home');
  showHelp = signal(false);
  actionSuccess = signal<string | null>(null);
  companySlug = signal<string>('');

  @ViewChild('brandNameRef') brandNameElement!: ElementRef<HTMLSpanElement>;
  @ViewChild('paymentPdfViewer') paymentPdfViewer?: PdfViewerComponent;
  @ViewChild('portfolioPdfViewer') portfolioPdfViewer?: PdfViewerComponent;
  pdfZoom = signal<number>(1);
  pdfCurrentPage = signal<number>(1);
  pdfTotalPages = signal<number>(0);
  pdfFitMode = signal<'page-width' | 'page-fit'>('page-width');


  // ──────────────────────────────────────────────────────────
  // ESTADO: FACTURAS
  // ──────────────────────────────────────────────────────────
  isLoadingInvoices = signal(false);
  invoices = signal<Invoice[]>([]);
  startDate = signal<string>(this.getDefaultStartDate());
  endDate = signal<string>(this.getDefaultEndDate());
  dateError = signal<string | null>(null);
  hasSearched = signal(false);

  // ──────────────────────────────────────────────────────────
  // ESTADO: COMPROBANTES DE PAGO
  // ──────────────────────────────────────────────────────────
  isGeneratingPayment = signal(false);
  paymentStartDate = signal<string>(this.getDefaultStartDate());
  paymentEndDate = signal<string>(this.getDefaultEndDate());
  paymentDateError = signal<string | null>(null);
  paymentPdfUrl = signal<string | null>(null);
  paymentFileName = signal<string>('');
  paymentError = signal<string | null>(null);
  hasPaymentSearched = signal(false);
  private paymentBlob: Blob | null = null;

  private formatToMMDDYYYY(dateStr: string): string {
    if (!dateStr) return '';
    // El input type="date" SIEMPRE entrega 'YYYY-MM-DD'
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${month}-${day}-${year}`;
  }

  // ──────────────────────────────────────────────────────────
  // ESTADO: EDAD DE CARTERA
  // ──────────────────────────────────────────────────────────
  isGeneratingPortfolio = signal(false);
  portfolioStartDate = signal<string>(this.getDefaultStartDate());
  portfolioEndDate = signal<string>(this.getDefaultEndDate());
  portfolioDateError = signal<string | null>(null);
  portfolioPdfUrl = signal<string | null>(null);
  portfolioFileName = signal<string>('');
  portfolioError = signal<string | null>(null);
  hasPortfolioSearched = signal(false);
  private portfolioBlob: Blob | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // ──────────────────────────────────────────────────────────
  // CICLO DE VIDA
  // ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedSlug = sessionStorage.getItem('nuvant_slug');

      this.route.queryParamMap.subscribe((params) => {
        const urlSlug = (params.get('slug') ?? '').trim().toLowerCase();

        if (urlSlug) {
          this.companySlug.set(urlSlug);
          sessionStorage.setItem('nuvant_slug', urlSlug);
        } else if (savedSlug) {
          this.companySlug.set(savedSlug);
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { slug: savedSlug },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        } else {
          this.router.navigateByUrl('/auth/login', { replaceUrl: true });
        }
      });
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.animateTextLetterByLetter();
    }
  }

  ngOnDestroy(): void {
    this.revokePaymentPdf();
    this.revokePortfolioPdf();
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

  // ──────────────────────────────────────────────────────────
  // NAVEGACIÓN ENTRE VISTAS
  // ──────────────────────────────────────────────────────────
  goHome(): void {
    this.currentView.set('home');
    this.clearActionSuccess();
  }

  showInvoicesGenerator(): void {
    this.currentView.set('invoices');
    this.clearActionSuccess();
  }

  showPaymentGenerator(): void {
    this.currentView.set('payment');
    this.clearActionSuccess();
  }

  showPortfolioGenerator(): void {
    this.currentView.set('portfolio');
    this.clearActionSuccess();
  }

  toggleHelp(): void {
    this.showHelp.update((val) => !val);
  }

  // ──────────────────────────────────────────────────────────
  // FECHAS HELPERS (compartidos)
  // ──────────────────────────────────────────────────────────
  private getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getDefaultStartDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  }

  todayDate = computed<string>(() => new Date().toISOString().split('T')[0]);

  private calcMaxEndDate(startDateStr: string): string {
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return this.getDefaultEndDate();

    start.setDate(start.getDate() + 30);
    const today = new Date();
    if (start > today) return today.toISOString().split('T')[0];

    return start.toISOString().split('T')[0];
  }

  private validateRange(startStr: string, endStr: string): string | null {
    const start = new Date(startStr);
    const end = new Date(endStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'Selecciona fechas válidas.';
    }
    if (end < start) {
      return 'La fecha inicial no puede ser mayor.';
    }
    const diffDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 30) {
      return 'El rango máximo permitido es de 31 días.';
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────
  // FECHAS: FACTURAS
  // ──────────────────────────────────────────────────────────
  maxEndDate = computed<string>(() => this.calcMaxEndDate(this.startDate()));

  updateStartDate(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.startDate.set(input.value);

    const start = new Date(input.value);
    const end = new Date(this.endDate());
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const diffDays = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 30 || end < start) {
        this.endDate.set(this.maxEndDate());
      }
    }
    this.dateError.set(this.validateRange(this.startDate(), this.endDate()));
  }

  updateEndDate(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.endDate.set(input.value);
    this.dateError.set(this.validateRange(this.startDate(), this.endDate()));
  }

  maxPaymentEndDate = computed<string>(() =>
    this.calcMaxEndDate(this.paymentStartDate())
  );

  updatePaymentStartDate(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.paymentStartDate.set(input.value);

    const start = new Date(input.value);
    const end = new Date(this.paymentEndDate());
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const diffDays = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 30 || end < start) {
        this.paymentEndDate.set(this.maxPaymentEndDate());
      }
    }
    this.paymentDateError.set(
      this.validateRange(this.paymentStartDate(), this.paymentEndDate())
    );
  }

  updatePaymentEndDate(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.paymentEndDate.set(input.value);
    this.paymentDateError.set(
      this.validateRange(this.paymentStartDate(), this.paymentEndDate())
    );
  }

  // ──────────────────────────────────────────────────────────
  // FECHAS: EDAD DE CARTERA
  // ──────────────────────────────────────────────────────────
  maxPortfolioEndDate = computed<string>(() =>
    this.calcMaxEndDate(this.portfolioStartDate())
  );

  updatePortfolioStartDate(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.portfolioStartDate.set(input.value);

    const start = new Date(input.value);
    const end = new Date(this.portfolioEndDate());
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const diffDays = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 30 || end < start) {
        this.portfolioEndDate.set(this.maxPortfolioEndDate());
      }
    }
    this.portfolioDateError.set(
      this.validateRange(this.portfolioStartDate(), this.portfolioEndDate())
    );
  }

  updatePortfolioEndDate(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.portfolioEndDate.set(input.value);
    this.portfolioDateError.set(
      this.validateRange(this.portfolioStartDate(), this.portfolioEndDate())
    );
  }

  // ──────────────────────────────────────────────────────────
  // FACTURAS: CONSULTA
  // ──────────────────────────────────────────────────────────
  loadOracleInvoices(): void {
    const err = this.validateRange(this.startDate(), this.endDate());
    this.dateError.set(err);
    if (err) return;

    this.isLoadingInvoices.set(true);
    this.invoices.set([]);
    this.hasSearched.set(true);

    this.oracle
      .getInvoices(this.companySlug(), this.startDate(), this.endDate())
      .subscribe({
        next: (response: OracleInvoicesResponse | string) => {
          // Por si n8n manda el JSON como string en vez de objeto
          const data: OracleInvoicesResponse =
            typeof response === 'string'
              ? (JSON.parse(response) as OracleInvoicesResponse)
              : response;

          const items = data?.results?.items ?? [];

          const facturasMapeadas: Invoice[] = items.map(
            (item, idx) => ({
              id: item.InvoiceNumber ?? `item-${idx}`,
              number: item.InvoiceNumber ?? '',
              date: this.formatDate(item.CreationDate),
              currency: item.PaymentCurrency ?? '',
              amount: Number(item.InvoiceAmount) || 0,
              status:
                item.PaidStatus === 'Paid'
                  ? ('approved' as const)
                  : ('pending' as const),
              accountingStatus: item.AccountingStatus ?? '',
            })
          );

          this.invoices.set(facturasMapeadas);
          this.isLoadingInvoices.set(false);
        },
        error: (err: unknown) => {
          console.error('[Oracle Invoices] Error:', err);
          this.invoices.set([]);
          this.isLoadingInvoices.set(false);
          this.dateError.set(
            'No se pudieron cargar las facturas. Intenta de nuevo.'
          );
        },
      });
  }

  clearInvoices(): void {
    this.invoices.set([]);
    this.hasSearched.set(false);
    this.dateError.set(null);
    this.startDate.set(this.getDefaultStartDate());
    this.endDate.set(this.getDefaultEndDate());
  }

  // ──────────────────────────────────────────────────────────
  // COMPROBANTES DE PAGO: CONSULTA + PDF
  // ──────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────
  // COMPROBANTES DE PAGO: CONSULTA + PDF
  // ──────────────────────────────────────────────────────────
  generatePaymentReport() {
    const err = this.validateRange(this.paymentStartDate(), this.paymentEndDate());
    this.paymentDateError.set(err);
    if (err) return;

    this.revokePaymentPdf();
    this.isGeneratingPayment.set(true);
    this.paymentError.set(null);
    this.hasPaymentSearched.set(true);
    this.clearActionSuccess();

    // 🚀 MAGIA AQUÍ: Convertimos las fechas justo antes de enviarlas
    const formattedStart = this.formatToMMDDYYYY(this.paymentStartDate());
    const formattedEnd   = this.formatToMMDDYYYY(this.paymentEndDate());

    // Le pasamos las fechas ya formateadas al servicio
    this.oracle
      .getPaymentsPdf(
        this.companySlug(),
        formattedStart,
        formattedEnd
      )
     .subscribe({
      next: (response: any) => {
        const data: OraclePdfResponse =
        typeof response === 'string'
          ? (JSON.parse(response) as OraclePdfResponse)
          : (response as OraclePdfResponse);

          if (data.result !== 'OK' || !data.file?.data) {
            this.paymentError.set(
              'No se encontraron comprobantes de pago en el rango seleccionado.'
            );
            this.isGeneratingPayment.set(false);
            return;
          }

          try {
            const blob = this.base64ToBlob(
              data.file.data,
              data.file.mimeType || 'application/pdf'
            );
            this.paymentBlob = blob;
            this.paymentPdfUrl.set(URL.createObjectURL(blob));
            this.paymentFileName.set(
              data.file.fileName || this.defaultPdfName('comprobante-pagos')
            );
            this.showSuccess('✨ Comprobante generado exitosamente');
          } catch (e: any) {
            console.error('[Payment PDF] Error decodificando base64:', e);
            this.paymentError.set('No se pudo procesar el PDF recibido.');
          }

          this.isGeneratingPayment.set(false);
        },
        error: (err: any) => {
          console.error('[Payment PDF] Error:', err);
          this.paymentError.set(
            'No se pudo generar el comprobante. Intenta de nuevo.'
          );
          this.isGeneratingPayment.set(false);
        },
      });
  }

  downloadPaymentPdf(): void {
    if (!this.paymentBlob || !this.paymentFileName()) return;
    this.triggerDownload(this.paymentBlob, this.paymentFileName());
  }

  clearPayment(): void {
    this.revokePaymentPdf();
    this.resetPdfViewer();
    this.paymentError.set(null);
    this.hasPaymentSearched.set(false);
    this.paymentDateError.set(null);
    this.paymentStartDate.set(this.getDefaultStartDate());
    this.paymentEndDate.set(this.getDefaultEndDate());
    this.clearActionSuccess();
  }

  private revokePaymentPdf(): void {
    const url = this.paymentPdfUrl();
    if (url) URL.revokeObjectURL(url);
    this.paymentPdfUrl.set(null);
    this.paymentFileName.set('');
    this.paymentBlob = null;
  }

  // ──────────────────────────────────────────────────────────
// EDAD DE CARTERA: CONSULTA + PDF
// ──────────────────────────────────────────────────────────
generatePortfolioReport(): void {
  const err = this.validateRange(
    this.portfolioStartDate(),
    this.portfolioEndDate()
  );
  this.portfolioDateError.set(err);
  if (err) return;

  this.revokePortfolioPdf();
  this.resetPdfViewer();
  this.isGeneratingPortfolio.set(true);
  this.portfolioError.set(null);
  this.hasPortfolioSearched.set(true);
  this.clearActionSuccess();

  this.oracle
    .getPortfolioPdf(
      this.companySlug(),
      this.portfolioStartDate(),
      this.portfolioEndDate()
    )
    .subscribe({
      next: (response: OraclePdfResponse | string) => {
        const data: OraclePdfResponse =
          typeof response === 'string'
            ? (JSON.parse(response) as OraclePdfResponse)
            : response;

        if (data.result !== 'OK' || !data.file?.data) {
          this.portfolioError.set(
            'No se encontró información de cartera en el rango seleccionado.'
          );
          this.isGeneratingPortfolio.set(false);
          return;
        }

        try {
          const blob = this.base64ToBlob(
            data.file.data,
            data.file.mimeType || 'application/pdf'
          );
          this.portfolioBlob = blob;
          this.portfolioPdfUrl.set(URL.createObjectURL(blob));
          this.portfolioFileName.set(
            data.file.fileName || this.defaultPdfName('edad-cartera')
          );
          this.showSuccess('✨ Análisis de cartera generado exitosamente');
        } catch (e) {
          console.error('[Portfolio PDF] Error decodificando base64:', e);
          this.portfolioError.set('No se pudo procesar el PDF recibido.');
        }

        this.isGeneratingPortfolio.set(false);
      },
      error: (err: unknown) => {
        console.error('[Portfolio PDF] Error:', err);
        this.portfolioError.set(
          'No se pudo generar el análisis de cartera. Intenta de nuevo.'
        );
        this.isGeneratingPortfolio.set(false);
      },
    });
}

  downloadPortfolioPdf(): void {
    if (!this.portfolioBlob || !this.portfolioFileName()) return;
    this.triggerDownload(this.portfolioBlob, this.portfolioFileName());
  }

clearPortfolio(): void {
  this.revokePortfolioPdf();
  this.resetPdfViewer();
  this.portfolioError.set(null);
  this.hasPortfolioSearched.set(false);
  // this.portfolioDateError.set(null);
  // this.portfolioStartDate.set(this.getDefaultStartDate());
  // this.portfolioEndDate.set(this.getDefaultEndDate());
  this.clearActionSuccess();
}

  private revokePortfolioPdf(): void {
    const url = this.portfolioPdfUrl();
    if (url) URL.revokeObjectURL(url);
    this.portfolioPdfUrl.set(null);
    this.portfolioFileName.set('');
    this.portfolioBlob = null;
  }

  // ──────────────────────────────────────────────────────────
  // PDF HELPERS
  // ──────────────────────────────────────────────────────────
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteChars = atob(cleanBase64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private defaultPdfName(prefix: string): string {
    const today = new Date().toISOString().split('T')[0];
    return `${prefix}-${today}.pdf`;
  }

  // ──────────────────────────────────────────────────────────
  // CONTROLES DEL VISOR PDF (compartidos entre payment y portfolio)
  // ──────────────────────────────────────────────────────────
  private static readonly PDF_ZOOM_MIN = 0.5;
  private static readonly PDF_ZOOM_MAX = 3;
  private static readonly PDF_ZOOM_STEP = 0.25;

  /** Página efectiva enviada a <pdf-viewer>. En modo 'page-width' siempre 1
   *  (mostramos todas con scroll); en 'page-fit' la página actual. */
  effectivePdfPage = computed<number>(() =>
    this.pdfFitMode() === 'page-width' ? 1 : this.pdfCurrentPage()
  );

  showAllPages = computed<boolean>(() => this.pdfFitMode() === 'page-width');

  /** Callback de ng2-pdf-viewer cuando termina de cargar el documento.
   *  pdf-lib expone `numPages` directamente; tipamos con `unknown` para soportar
   *  futuras versiones. */
  onPdfLoaded(pdf: unknown): void {
    const numPages = (pdf as { numPages?: number })?.numPages ?? 0;
    this.pdfTotalPages.set(numPages);
    this.pdfCurrentPage.set(1);
  }

  zoomIn(): void {
    const next = Math.min(
      this.pdfZoom() + DashboardComponent.PDF_ZOOM_STEP,
      DashboardComponent.PDF_ZOOM_MAX
    );
    this.pdfZoom.set(this.roundZoom(next));
  }

  zoomOut(): void {
    const next = Math.max(
      this.pdfZoom() - DashboardComponent.PDF_ZOOM_STEP,
      DashboardComponent.PDF_ZOOM_MIN
    );
    this.pdfZoom.set(this.roundZoom(next));
  }

  resetZoom(): void {
    this.pdfZoom.set(1);
    this.pdfFitMode.set('page-width');
  }

  toggleFitMode(): void {
    this.pdfFitMode.update((m) => (m === 'page-width' ? 'page-fit' : 'page-width'));
  }

  prevPage(): void {
    if (this.pdfCurrentPage() > 1) {
      this.pdfCurrentPage.update((p) => p - 1);
    }
  }

  nextPage(): void {
    if (this.pdfCurrentPage() < this.pdfTotalPages()) {
      this.pdfCurrentPage.update((p) => p + 1);
    }
  }

  goToPage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    const total = this.pdfTotalPages();
    if (!Number.isNaN(value) && value >= 1 && value <= total) {
      this.pdfCurrentPage.set(value);
    } else {
      input.value = String(this.pdfCurrentPage());
    }
  }

  /** Abre el PDF en una pestaña nueva y dispara la impresión nativa del navegador. */
  printPdf(viewer: 'payment' | 'portfolio'): void {
    const blob = viewer === 'payment' ? this.paymentBlob : this.portfolioBlob;
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');

    if (!win) {
      // bloqueado por popup blocker → caemos a descargar
      console.warn('[printPdf] Popup bloqueado, descargando como fallback.');
      const a = document.createElement('a');
      a.href = url;
      a.download =
        viewer === 'payment' ? this.paymentFileName() : this.portfolioFileName();
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5_000);
      return;
    }

    win.addEventListener('load', () => {
      try {
        win.focus();
        win.print();
      } catch (e) {
        console.error('[printPdf] No se pudo invocar print():', e);
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }

  /** Restablece zoom/página/modo. Se invoca al generar un nuevo PDF
   *  y al limpiar las vistas de payment/portfolio. */
  private resetPdfViewer(): void {
    this.pdfZoom.set(1);
    this.pdfCurrentPage.set(1);
    this.pdfTotalPages.set(0);
    this.pdfFitMode.set('page-width');
  }

  private roundZoom(value: number): number {
    return Math.round(value * 100) / 100;
  }
  // ──────────────────────────────────────────────────────────
  // ALERTAS
  // ──────────────────────────────────────────────────────────
  private showSuccess(message: string): void {
    this.actionSuccess.set(message);
    setTimeout(() => this.clearActionSuccess(), 5000);
  }

  private clearActionSuccess(): void {
    this.actionSuccess.set(null);
  }

  // ──────────────────────────────────────────────────────────
  // SESIÓN
  // ──────────────────────────────────────────────────────────
  logout(): void {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.clear();
      this.router.navigateByUrl('/auth/login', { replaceUrl: true });
    } catch (error) {
      console.error('Error durante logout:', error);
    }
  }

  // ──────────────────────────────────────────────────────────
  // UTILIDADES DE FORMATO
  // ──────────────────────────────────────────────────────────
  private formatDate(isoDate: string): string {
    if (!isoDate) return '';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      return d.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return isoDate;
    }
  }

  formatCurrency(amount: number, currency: string = 'COP'): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  getStatusBadge(status: string): string {
    const badges: Record<string, string> = {
      approved: 'badge--success',
      pending: 'badge--warning',
      overdue: 'badge--danger',
    };
    return badges[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      approved: 'Pagada',
      pending: 'Pendiente',
      overdue: 'Vencida',
    };
    return labels[status] || status;
  }
}

// ──────────────────────────────────────────────────────────
// INTERFACES
// ──────────────────────────────────────────────────────────
interface Invoice {
  id: string | number;
  number: string;
  date: string;
  currency: string;
  amount: number;
  status: 'approved' | 'pending' | 'overdue';
  accountingStatus: string;
}
