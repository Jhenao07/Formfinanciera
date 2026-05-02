import { Component, Output, EventEmitter, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="file-upload"
         [class.file-upload--dragover]="isDragOver()"
         [class.file-upload--disabled]="disabled()"
         (drop)="onDrop($event)"
         (dragover)="onDragOver($event)"
         (dragleave)="onDragLeave()"
         (click)="fileInput.click()">

      <input
        #fileInput
        type="file"
        [accept]="accept"
        [disabled]="disabled()"
        (change)="onFileSelected($event)"
        hidden
      />

      <div class="file-upload__content">
        @if (selectedFile()) {
          <!-- File selected state -->
          <div class="file-upload__file">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
            </svg>
            <div class="file-upload__file-info">
              <p class="file-upload__file-name">{{ selectedFile()?.name }}</p>
              <p class="file-upload__file-size">{{ formatFileSize(selectedFile()?.size || 0) }}</p>
            </div>
            <button
              type="button"
              class="file-upload__remove"
              (click)="removeFile($event)"
              [disabled]="disabled()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        } @else {
          <!-- Empty state -->
          <div class="file-upload__icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p class="file-upload__label">
            <strong>Arrastra tu archivo aquí</strong> o haz clic para seleccionar
          </p>
          <p class="file-upload__hint">{{ hint }}</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .file-upload {
      border: 2px dashed #e2e8f0;
      border-radius: 16px;
      background: #f8fafc;
      padding: 32px 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(&--disabled) {
        border-color: #2563eb;
        background: #f0f6ff;
      }

      &--dragover {
        border-color: #2563eb;
        background: #eff6ff;
        transform: scale(1.02);
      }

      &--disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .file-upload__content {
      pointer-events: none;
    }

    .file-upload__icon {
      color: #64748b;
      margin-bottom: 16px;

      svg { display: inline-block; }
    }

    .file-upload__label {
      font-size: 14px;
      color: #334155;
      margin: 0 0 6px;

      strong { color: #2563eb; }
    }

    .file-upload__hint {
      font-size: 12px;
      color: #94a3b8;
      margin: 0;
    }

    /* File selected state */
    .file-upload__file {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #fff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;

      svg:first-child {
        color: #2563eb;
        flex-shrink: 0;
      }
    }

    .file-upload__file-info {
      flex: 1;
      text-align: left;
    }

    .file-upload__file-name {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      margin: 0 0 4px;
      word-break: break-word;
    }

    .file-upload__file-size {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }

    .file-upload__remove {
      pointer-events: all;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #64748b;
      transition: all 0.15s;
      flex-shrink: 0;

      &:hover:not(:disabled) {
        background: #fef2f2;
        border-color: #fca5a5;
        color: #dc2626;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  `]
})
export class FileUploadComponent {
  @Input() accept = '.pdf,.xlsx,.xls,.csv'; // Tipos de archivo permitidos
  @Input() hint = 'PDF, Excel o CSV (máx. 10MB)';
  @Input() maxSize = 10 * 1024 * 1024; // 10MB default

  @Output() fileSelected = new EventEmitter<File>();

  selectedFile = signal<File | null>(null);
  isDragOver = signal(false);
  disabled = signal(false);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);

    const file = event.dataTransfer?.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  private processFile(file: File): void {
    // Validar tamaño
    if (file.size > this.maxSize) {
      alert(`El archivo excede el tamaño máximo de ${this.formatFileSize(this.maxSize)}`);
      return;
    }

    // Validar tipo (opcional, el accept ya lo maneja)
    this.selectedFile.set(file);
    this.fileSelected.emit(file);
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile.set(null);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  setDisabled(disabled: boolean): void {
    this.disabled.set(disabled);
  }
}
