import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  // ══════════════════════════════════════════════════════════
  // SIGNALS PARA ESTADO REACTIVO
  // ══════════════════════════════════════════════════════════
  currentView = signal<'home' | 'invoices' | 'payment' | 'portfolio'>('home');
  showHelp = signal(false);
  uploadSuccess = signal<string | null>(null);

  // Estados de carga
  isUploadingPayment = signal(false);
  isUploadingPortfolio = signal(false);
  isLoadingInvoices = signal(false);

  // Estado de drag & drop
  isDragging = signal(false);

  // Datos
  invoices = signal<Invoice[]>([]);
  router: any;

  // ══════════════════════════════════════════════════════════
  // MÉTODOS DE NAVEGACIÓN
  // ══════════════════════════════════════════════════════════

  goHome() {
    this.currentView.set('home');
    this.clearUploadSuccess();
  }

  loadInvoices() {
    this.currentView.set('invoices');
    this.clearUploadSuccess();
    this.fetchInvoices();
  }

  showPaymentUpload() {
    this.currentView.set('payment');
    this.clearUploadSuccess();
  }

  showPortfolioUpload() {
    this.currentView.set('portfolio');
    this.clearUploadSuccess();
  }

  toggleHelp() {
    this.showHelp.update(val => !val);
  }

  logout() {
  // Limpia el storage
  localStorage.clear();
  sessionStorage.clear();

  // Redirige al login
  this.router.navigate(['/auth/login']);
}

  // ══════════════════════════════════════════════════════════
  // DRAG & DROP - EVENTOS CON ANIMACIONES
  // ══════════════════════════════════════════════════════════

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    // Solo desactivar si realmente salimos del contenedor
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      this.isDragging.set(false);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  // ══════════════════════════════════════════════════════════
  // MANEJO DE ARCHIVOS
  // ══════════════════════════════════════════════════════════

  onPaymentFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handlePaymentFile(input.files[0]);
    }
  }

  onPortfolioFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handlePortfolioFile(input.files[0]);
    }
  }

  private handleFile(file: File) {
    // Validación de tipo de archivo
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(file.type)) {
      this.showError('Formato de archivo no válido');
      return;
    }

    // Validación de tamaño (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showError('El archivo excede el tamaño máximo de 10MB');
      return;
    }

    // Determinar qué tipo de carga es según la vista actual
    if (this.currentView() === 'payment') {
      this.handlePaymentFile(file);
    } else if (this.currentView() === 'portfolio') {
      this.handlePortfolioFile(file);
    }
  }

  private handlePaymentFile(file: File) {
    this.isUploadingPayment.set(true);

    // Simular upload con animación
    this.uploadFile(file).then(() => {
      this.isUploadingPayment.set(false);
      this.showSuccess(`✨ Archivo "${file.name}" cargado exitosamente`);
    }).catch(error => {
      this.isUploadingPayment.set(false);
      this.showError('Error al cargar el archivo');
    });
  }

  private handlePortfolioFile(file: File) {
    this.isUploadingPortfolio.set(true);

    // Simular upload con animación
    this.uploadFile(file).then(() => {
      this.isUploadingPortfolio.set(false);
      this.showSuccess(`✨ Archivo "${file.name}" cargado exitosamente`);
    }).catch(error => {
      this.isUploadingPortfolio.set(false);
      this.showError('Error al cargar el archivo');
    });
  }

  private uploadFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      // Simular tiempo de carga basado en tamaño del archivo
      const uploadTime = Math.min(2000 + (file.size / 1024 / 1024) * 500, 5000);

      setTimeout(() => {
        // Simular éxito (90% de probabilidad)
        if (Math.random() > 0.1) {
          resolve();
        } else {
          reject(new Error('Upload failed'));
        }
      }, uploadTime);
    });
  }

  // ══════════════════════════════════════════════════════════
  // MENSAJES DE FEEDBACK CON ANIMACIONES
  // ══════════════════════════════════════════════════════════

  private showSuccess(message: string) {
    this.uploadSuccess.set(message);

    // Auto-ocultar después de 5 segundos con animación suave
    setTimeout(() => {
      this.clearUploadSuccess();
    }, 5000);
  }

  private showError(message: string) {
    console.error(message);
    alert(message); // TODO: Reemplazar con sistema de notificaciones toast
  }

  private clearUploadSuccess() {
    this.uploadSuccess.set(null);
  }

  // ══════════════════════════════════════════════════════════
  // CARGA DE FACTURAS
  // ══════════════════════════════════════════════════════════

  private fetchInvoices() {
    this.isLoadingInvoices.set(true);

    // Simular carga de datos
    setTimeout(() => {
      this.invoices.set([
        {
          id: 1,
          number: 'FAC-2024-001',
          date: '2024-01-15',
          client: 'Empresa ABC S.A.',
          amount: 5500000,
          status: 'approved',
          daysOverdue: null
        },
        {
          id: 2,
          number: 'FAC-2024-002',
          date: '2024-01-18',
          client: 'Corporación XYZ Ltda.',
          amount: 3200000,
          status: 'pending',
          daysOverdue: null
        },
        {
          id: 3,
          number: 'FAC-2024-003',
          date: '2023-12-20',
          client: 'Distribuidora DEF',
          amount: 8900000,
          status: 'overdue',
          daysOverdue: 42
        },
        {
          id: 4,
          number: 'FAC-2024-004',
          date: '2024-01-22',
          client: 'Comercial GHI S.A.S.',
          amount: 4750000,
          status: 'approved',
          daysOverdue: null
        },
        {
          id: 5,
          number: 'FAC-2024-005',
          date: '2023-12-28',
          client: 'Inversiones JKL',
          amount: 6300000,
          status: 'overdue',
          daysOverdue: 34
        }
      ]);

      this.isLoadingInvoices.set(false);
    }, 1200);
  }

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
