import { HttpClient } from '@angular/common/http';
import {
  Component,
  Inject,
  signal,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
  OnInit,
  AfterViewInit,
  computed,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { isPlatformBrowser, TitleCasePipe } from '@angular/common';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  // ──────────────────────────────────────────────────────────
  // ESTADO DE LA VISTA
  // ──────────────────────────────────────────────────────────
  currentView = signal<'home' | 'invoices' | 'payment' | 'portfolio'>('home');
  showHelp = signal(false);
  actionSuccess = signal<string | null>(null);
  companySlug = signal<string>('');

  @ViewChild('brandNameRef') brandNameElement!: ElementRef<HTMLSpanElement>;

  // Estados de loading
  isGeneratingInvoices = signal(false);
  isLoadingInvoices = signal(false);
  isGeneratingPayment = signal(false);
  isGeneratingPortfolio = signal(false);

  // Datos de facturas
  invoices = signal<Invoice[]>([]);
  startDate = signal<string>(this.getDefaultStartDate());
  endDate = signal<string>(this.getDefaultEndDate());
  dateError = signal<string | null>(null);

  // Indica si ya se hizo al menos una consulta (para no mostrar "vacío" antes)
  hasSearched = signal(false);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private HttpClient: HttpClient,
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

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.animateTextLetterByLetter();
    }
  }

  private animateTextLetterByLetter() {
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
  goHome() {
    this.currentView.set('home');
    this.clearActionSuccess();
  }

  showInvoicesGenerator() {
    this.currentView.set('invoices');
    this.clearActionSuccess();
    // NO se consulta automáticamente; el usuario escoge fechas y da clic en "Consultar"
  }

  showPaymentGenerator() {
    this.currentView.set('payment');
    this.clearActionSuccess();
  }

  showPortfolioGenerator() {
    this.currentView.set('portfolio');
    this.clearActionSuccess();
  }

  toggleHelp() {
    this.showHelp.update((val) => !val);
  }

  // ──────────────────────────────────────────────────────────
  // FECHAS (DATEPICKER)
  // ──────────────────────────────────────────────────────────
  private getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getDefaultStartDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  }

  // Máximo 31 días desde la fecha inicial (incluyendo el día inicial)
  // y nunca mayor a hoy.
  maxEndDate = computed(() => {
    const start = new Date(this.startDate());
    if (isNaN(start.getTime())) return this.getDefaultEndDate();

    start.setDate(start.getDate() + 30); // +30 = rango de 31 días contando el inicial

    const today = new Date();
    if (start > today) return today.toISOString().split('T')[0];

    return start.toISOString().split('T')[0];
  });

  // Hoy (para el atributo [max] del input de fecha inicial)
  todayDate = computed(() => new Date().toISOString().split('T')[0]);

  updateStartDate(event: Event) {
    const input = event.target as HTMLInputElement;
    this.startDate.set(input.value);

    // Si la fecha final queda fuera del nuevo rango, ajustarla
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
    this.validateDates();
  }

  updateEndDate(event: Event) {
    const input = event.target as HTMLInputElement;
    this.endDate.set(input.value);
    this.validateDates();
  }

  private validateDates() {
    this.dateError.set(null);
    const start = new Date(this.startDate());
    const end = new Date(this.endDate());

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      this.dateError.set('Selecciona fechas válidas.');
      return;
    }

    if (end < start) {
      this.dateError.set('La fecha inicial no puede ser mayor.');
      return;
    }

    const diffDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 30) {
      this.dateError.set('El rango máximo permitido es de 31 días.');
    }
  }

  // ──────────────────────────────────────────────────────────
  // CONSULTA A ORACLE (FACTURAS)
  // ──────────────────────────────────────────────────────────
  loadOracleInvoices() {
    this.validateDates();
    if (this.dateError()) return;

    this.isLoadingInvoices.set(true);
    this.invoices.set([]);
    this.hasSearched.set(true);

    const payload = {
      app: 'PORTAL-PROVEEDORES',
      request: 'getInvoiceSupplier',
      slug: this.companySlug(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      limit: 25,
      offset: 0,
    };

    console.log('[Oracle] 📤 Payload:', payload);

    this.HttpClient.post(environment.api.oracleUrl, payload).subscribe({
      next: (response: any) => {
        // Soporte por si n8n manda el JSON como string
        let data = response;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            data = {};
          }
        }

        const items = data?.results?.items ?? [];
        console.log('[Oracle] 📦 Items:', items.length);

        const facturasMapeadas: Invoice[] = items.map(
          (item: any, idx: number) => ({
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
      error: (err) => {
        console.error('[Oracle] ❌ Error:', err);
        this.invoices.set([]);
        this.isLoadingInvoices.set(false);
        this.dateError.set(
          'No se pudo cargar las facturas. Intenta de nuevo.'
        );
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // BOTONES "GENERAR REPORTE" (mocks por ahora)
  // ──────────────────────────────────────────────────────────
  generateInvoicesReport() {
    this.isGeneratingInvoices.set(true);
    this.clearActionSuccess();
    setTimeout(() => {
      this.isGeneratingInvoices.set(false);
      this.showSuccess('✨ Reporte de facturas generado exitosamente');
    }, 2000);
  }

  generatePaymentReport() {
    this.isGeneratingPayment.set(true);
    this.clearActionSuccess();
    setTimeout(() => {
      this.isGeneratingPayment.set(false);
      this.showSuccess('✨ Reporte de pagos generado exitosamente');
    }, 2000);
  }

  generatePortfolioReport() {
    this.isGeneratingPortfolio.set(true);
    this.clearActionSuccess();
    setTimeout(() => {
      this.isGeneratingPortfolio.set(false);
      this.showSuccess('✨ Análisis de cartera generado exitosamente');
    }, 2000);
  }

  private showSuccess(message: string) {
    this.actionSuccess.set(message);
    setTimeout(() => this.clearActionSuccess(), 5000);
  }

  private clearActionSuccess() {
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
