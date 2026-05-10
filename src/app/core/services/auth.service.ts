import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../models/auth.models';

const SESSION_KEY   = 'auth_session';
const SESSION_TTL   = 8 * 60 * 60 * 1000; // 8 horas

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _session   = signal<AuthSession | null>(this.hydrateSession());
  private readonly _isLoading = signal(false);
  private readonly _error     = signal<string | null>(null);

  readonly isLoading       = this._isLoading.asReadonly();
  readonly error           = this._error.asReadonly();
  readonly isAuthenticated = computed(() => {
    const s = this._session();
    return !!s && Date.now() < s.expiresAt;
  });
  readonly currentEmail    = computed(() => this._session()?.email ?? null);

  registerSupplier(data: { slug: string; supplierEmail: string; supplierId: string; supplierName: string }): Observable<unknown> {
    this._isLoading.set(true);
    this._error.set(null);

    const webhookUrl = 'd1xzjpbpskrznq.cloudfront.net/webhook/6cab4783-0b86-434f-94ef-702a30e4369a';

    // observe: 'response' nos permite leer el status HTTP (200) de n8n
    return this.http.post(webhookUrl, data, { observe: 'response' }).pipe(
      finalize(() => this._isLoading.set(false))
    );
  }

  // ── Validación de ID ───────────────────────────────────
 validateId(slug: string, supplierId: string): Observable<any> {
    this._isLoading.set(true);
    this._error.set(null);

    const body = { slug, supplierId };

    return this.http
      .post(environment.api.validateId, body, {
        observe: 'response'
      })
      .pipe(
        finalize(() => this._isLoading.set(false))
      );
  }

  // ── OTP ──────────────────────────────────────────────────
  sendOtp(supplierEmail: string, slug: string, supplierId: string, app: string): Observable<unknown> {
    this._isLoading.set(true);
    this._error.set(null);
    return this.http
      .post(environment.api.sendOtp, { slug, app, supplierEmail, supplierId }, { observe: 'response' })
      .pipe(tap({ finalize: () => this._isLoading.set(false) }));
  }

  validateOtp(slug: string, app: string, supplierEmail: string, supplierId: string, codeOTP: string): Observable<unknown> {
    this._isLoading.set(true);
    this._error.set(null);
    return this.http
        .post(environment.api.validateOtp, {
          slug: slug,
          app: app,
          supplierEmail: supplierEmail,
          supplierId: supplierId,
          codeOTP: codeOTP
        }, {
          observe: 'response',
          responseType: 'text'
      })
      .pipe(
         tap({
           next: (response: any) => {
             let body = response.body;
             if (typeof body === 'string') {
               try { body = JSON.parse(body); } catch(e) {}
             }
             const token = body?.jwt || response.headers.get('jwt') || response.headers.get('Authorization')?.replace('Bearer ', '');
             if (token) {
               localStorage.setItem('access_token', token);
             }
             this.createSession(supplierEmail);
           }
         }),
        finalize(() => this._isLoading.set(false))
      );
  }

  // ── Sesión ───────────────────────────────────────────────
  logout(): void {
    this._session.set(null);
    this._error.set(null);
    sessionStorage.clear();
  }

  setError(message: string): void { this._error.set(message); }
  clearError(): void              { this._error.set(null);    }

  // ── Privados ─────────────────────────────────────────────
  private createSession(email: string): void {
    const session: AuthSession = {
      email,
      authenticatedAt: Date.now(),
      expiresAt:       Date.now() + SESSION_TTL,
    };
    this._session.set(session);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  private hydrateSession(): AuthSession | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as AuthSession;
      if (Date.now() >= session.expiresAt) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }
}
