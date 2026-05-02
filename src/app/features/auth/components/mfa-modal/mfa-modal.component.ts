import {
  Component, Output, EventEmitter, signal,
  ViewChildren, QueryList, ElementRef,
  AfterViewInit, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mfa-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mfa-modal.component.html',
  styleUrl: './mfa-modal.component.scss'
})
export class MfaModalComponent implements AfterViewInit {
  @Output() codeSubmitted = new EventEmitter<string>();
  @Output() cancelled     = new EventEmitter<void>();

  // Referencias directas a los 6 inputs estáticos
  @ViewChildren('d0,d1,d2,d3,d4,d5')
  inputs!: QueryList<ElementRef<HTMLInputElement>>;

  email        = signal('');
  hasError     = signal(false);
  isSubmitting = signal(false);

  ngAfterViewInit(): void {
    setTimeout(() => this.focus(0), 150);
  }

  open(email: string): void {
    this.email.set(email);
    this.clearAll();
    setTimeout(() => this.focus(0), 150);
  }

  // ── Helpers ──────────────────────────────────────────
  private getInput(i: number): HTMLInputElement | null {
    return this.inputs.get(i)?.nativeElement ?? null;
  }

  private focus(i: number): void {
    const el = this.getInput(i);
    el?.focus();
    el?.select();
  }

  private clearAll(): void {
    this.inputs?.forEach(ref => ref.nativeElement.value = '');
    this.hasError.set(false);
  }

  private getCode(): string {
    return Array.from({ length: 6 }, (_, i) => this.getInput(i)?.value ?? '').join('');
  }

  // ── Eventos ──────────────────────────────────────────
  onInput(event: Event, index: number): void {
    const el = event.target as HTMLInputElement;

    // Solo números, máximo 1 carácter
    const clean = el.value.replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(-1);
    el.value = clean;

    if (clean && index < 5) {
      this.focus(index + 1);
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    const el = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (!el.value && index > 0) {
        event.preventDefault();
        const prev = this.getInput(index - 1);
        if (prev) { prev.value = ''; prev.focus(); }
      }
      return;
    }

    if (event.key === 'ArrowLeft'  && index > 0) { event.preventDefault(); this.focus(index - 1); }
    if (event.key === 'ArrowRight' && index < 5) { event.preventDefault(); this.focus(index + 1); }
    if (event.key === 'Enter')                   { event.preventDefault(); this.submit(); }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const digits = (event.clipboardData?.getData('text') ?? '')
      .replace(/[^0-9]/g, '').slice(0, 6);

    digits.split('').forEach((d, i) => {
      const el = this.getInput(i);
      if (el) el.value = d;
    });

    const last = Math.min(digits.length - 1, 5);
    this.focus(last);
  }

  submit(): void {
    const code = this.getCode();
    if (code.length !== 6) {
      this.showError();
      return;
    }
    this.isSubmitting.set(true);
    this.codeSubmitted.emit(code);
  }

  showError(): void {
    this.hasError.set(true);
    setTimeout(() => { this.hasError.set(false); this.clearAll(); this.focus(0); }, 600);
  }

  cancel(): void { this.cancelled.emit(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.cancel(); }
}
