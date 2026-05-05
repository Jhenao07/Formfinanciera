import { Component, Inject, signal, PLATFORM_ID, ViewChild, ElementRef, OnInit, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { isPlatformBrowser, TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  // ══════════════════════════════════════════════════════════
  // SIGNALS PARA ESTADO REACTIVO
  // ══════════════════════════════════════════════════════════
  currentView = signal<'home' | 'invoices' | 'payment' | 'portfolio'>('home');
  showHelp = signal(false);
  actionSuccess = signal<string | null>(null);

  /** Empresa actual */
  companySlug = signal<string>('');

  @ViewChild('brandNameRef') brandNameElement!: ElementRef<HTMLSpanElement>;

  // Estados de carga
  isGeneratingInvoices = signal(false);
  isLoadingInvoices = signal(false);
  isGeneratingPayment = signal(false);
  isGeneratingPortfolio = signal(false);

  // Datos
  invoices = signal<Invoice[]>([]);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) { }

  // ══════════════════════════════════════════════════════════
  // LECTURA DE SLUG Y PERSISTENCIA (SOLUCIÓN AL BUG DE RECARGA)
  // ══════════════════════════════════════════════════════════
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // 1. Buscamos si ya teníamos un slug guardado de antes
      const savedSlug = sessionStorage.getItem('nuvant_slug');

      this.route.queryParamMap.subscribe(params => {
        const urlSlug = (params.get('slug') ?? '').trim().toLowerCase();

        if (urlSlug) {
          // Si el slug viene en la URL, lo usamos y lo guardamos para que sobreviva recargas
          this.companySlug.set(urlSlug);
          sessionStorage.setItem('nuvant_slug', urlSlug);
        } else if (savedSlug) {
          // Si recargamos la página y se perdió de la URL, usamos el que teníamos guardado
          this.companySlug.set(savedSlug);

          // Reescribir la URL silenciosamente para volver a poner el parámetro
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { slug: savedSlug },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
        } else {
          // Si no hay slug en URL ni guardado, ahí sí lo mandamos al login
          this.router.navigateByUrl('/auth/login', { replaceUrl: true });
        }
      });
    }
  }

  // ══════════════════════════════════════════════════════════
  // ANIMACIONES
  // ══════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════
  // MÉTODOS DE NAVEGACIÓN
  // ══════════════════════════════════════════════════════════
  goHome() {
    this.currentView.set('home');
    this.clearActionSuccess();
  }
  showInvoicesGenerator() {
    this.currentView.set('invoices');
    this.clearActionSuccess();
  }
  loadInvoices() {
    this.currentView.set('invoices');
    this.clearActionSuccess();
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
    this.showHelp.update(val => !val);
  }

  logout(): void {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.clear(); // Esto borrará también el nuvant_slug guardado
      this.router.navigateByUrl('/auth/login', { replaceUrl: true });
    } catch (error) {
      console.error('Error durante logout:', error);
    }
  }

  // ══════════════════════════════════════════════════════════
  // GENERACIÓN DE REPORTES (Reemplazo de Drag & Drop)
  // ══════════════════════════════════════════════════════════

  generateInvoicesReport() {
    this.isGeneratingInvoices.set(true);
    this.clearActionSuccess();

    // Simular llamada al backend
    setTimeout(() => {
      this.isGeneratingInvoices.set(false);
      this.showSuccess('✨ Reporte de facturas generado exitosamente');
    }, 2000);
  }

  generatePaymentReport() {
    this.isGeneratingPayment.set(true);
    this.clearActionSuccess();

    // Simular llamada al backend
    setTimeout(() => {
      this.isGeneratingPayment.set(false);
      this.showSuccess('✨ Reporte de pagos generado exitosamente');
    }, 2000);
  }

  generatePortfolioReport() {
    this.isGeneratingPortfolio.set(true);
    this.clearActionSuccess();

    // Simular llamada al backend
    setTimeout(() => {
      this.isGeneratingPortfolio.set(false);
      this.showSuccess('✨ Análisis de cartera generado exitosamente');
    }, 2000);
  }

  private showSuccess(message: string) {
    this.actionSuccess.set(message);
    setTimeout(() => {
      this.clearActionSuccess();
    }, 5000);
  }

  private clearActionSuccess() {
    this.actionSuccess.set(null);
  }

  // ══════════════════════════════════════════════════════════
  // CARGA DE FACTURAS
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // UTILIDADES DE FORMATO
  // ══════════════════════════════════════════════════════════
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getStatusBadge(status: string): string {
    const badges: Record<string, string> = {
      'approved': 'badge--success',
      'pending': 'badge--warning',
      'overdue': 'badge--danger'
    };
    return badges[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'approved': 'Aprobada',
      'pending': 'Pendiente',
      'overdue': 'Vencida'
    };
    return labels[status] || status;
  }
}

// ══════════════════════════════════════════════════════════
// INTERFACES
// ══════════════════════════════════════════════════════════
interface Invoice {
  id: number;
  number: string;
  date: string;
  client: string;
  amount: number;
  status: 'approved' | 'pending' | 'overdue';
  daysOverdue: number | null;
}
