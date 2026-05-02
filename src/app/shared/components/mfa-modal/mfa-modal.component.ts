import {
  Component, Input, Output, EventEmitter, signal,
  ViewChildren, QueryList, ElementRef,
  AfterViewInit, OnDestroy, OnChanges, SimpleChanges,
  HostListener, ChangeDetectionStrategy,
} from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

@Component({
  selector:          'app-mfa-modal',
  standalone:        true,
  templateUrl:       './mfa-modal.component.html',
  styleUrl:          './mfa-modal.component.scss',
  changeDetection:   ChangeDetectionStrategy.OnPush,  // ← evita re-renders innecesarios
})
export class MfaModalComponent implements AfterViewInit, OnChanges, OnDestroy {

  // ── Inputs / Outputs ─────────────────────────────────────
  @Input() email        = '';
  @Input() loading      = false;
  @Input() errorMessage: string | null = null;

  @Output() codeSubmitted = new EventEmitter<string>();
  @Output() cancelled     = new EventEmitter<void>();

  // ── Referencias a los inputs ─────────────────────────────
  @ViewChildren('d0,d1,d2,d3,d4,d5')
  private readonly inputs!: QueryList<ElementRef<HTMLInputElement>>;

  // ── Estado interno ───────────────────────────────────────
  readonly hasError  = signal(false);
  readonly countdown = signal(300);

  // Signal separada — solo cambia UNA VEZ (cuando countdown llega a 0)
  // Así [disabled] NO se re-evalúa cada segundo
  readonly isExpired = signal(false);

  private countdownSub?: Subscription;

  // ── Ciclo de vida ─────────────────────────────────────────
  ngAfterViewInit(): void {
    this.startCountdown();
    setTimeout(() => this.focus(0), 100);
  }

  // ngOnChanges es predecible — solo corre cuando un @Input cambia
  // Reemplaza el effect() que causaba reactividad inesperada
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['errorMessage'] && this.errorMessage) {
      this.hasError.set(true);
      setTimeout(() => {
        this.hasError.set(false);
        this.clearAll();
        this.focus(0);
      }, 800);
    }
  }

  ngOnDestroy(): void {
    this.countdownSub?.unsubscribe();
  }

  // ── Getter solo para mostrar el tiempo — NO lo leas en [disabled] ──
  get formattedTime(): string {
    const s = this.countdown();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  // ── Helpers DOM ──────────────────────────────────────────
  private getInput(i: number): HTMLInputElement | null {
    return this.inputs?.get(i)?.nativeElement ?? null;
  }

  private focus(i: number): void {
    const el = this.getInput(i);
    el?.focus();
    el?.select();
  }

  private clearAll(): void {
    this.inputs?.forEach(ref => (ref.nativeElement.value = ''));
  }

  private getCode(): string {
    return Array.from({ length: 6 }, (_, i) => this.getInput(i)?.value ?? '').join('');
  }

  // ── Eventos ──────────────────────────────────────────────
  onInput(event: Event, index: number): void {
    const el    = event.target as HTMLInputElement;
    const clean = el.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-1);
    el.value    = clean;
    if (clean && index < 5) this.focus(index + 1);
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
      .replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);

    digits.split('').forEach((d, i) => {
      const el = this.getInput(i);
      if (el) el.value = d;
    });

    this.focus(Math.min(digits.length - 1, 5));
  }

  submit(): void {
    if (this.loading || this.isExpired()) return;
    const code = this.getCode();
    if (code.length !== 6) {
      this.hasError.set(true);
      setTimeout(() => this.hasError.set(false), 600);
      return;
    }
    this.codeSubmitted.emit(code);
  }

  cancel(): void { this.cancelled.emit(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.cancel(); }

  // ── Countdown ────────────────────────────────────────────
  private startCountdown(): void {
    this.countdownSub?.unsubscribe();
    this.countdownSub = interval(1000)
      .pipe(takeWhile(() => this.countdown() > 0))
      .subscribe(() => {
        this.countdown.update(v => v - 1);
        // isExpired solo se setea una vez — no contamina el [disabled] cada segundo
        if (this.countdown() === 0) this.isExpired.set(true);
      });
  }
}
