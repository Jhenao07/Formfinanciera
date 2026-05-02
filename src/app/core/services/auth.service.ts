import { HttpClient } from '@angular/common/http';
import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';

export interface User {
  id: string;
  email: string;
  name: string;
  lastName: string;
  phone?: string;
  createdAt: Date;
}

export interface LoginCredentials {
  email: string;
}

export interface RegisterData {
  name: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}



@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);

  private _currentUser = signal<User | null>(null);
  private _isLoading   = signal(false);
  private _error       = signal<string | null>(null);

  readonly currentUser     = this._currentUser.asReadonly();
  readonly isLoading       = this._isLoading.asReadonly();
  error = signal<string | null>(null);
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  constructor(private http: HttpClient){}


      // ── OTP: Crear y enviar código al correo ─────────────────────────────────
  sendTokenEmail(email: string): Observable<any> {
    const url = 'https://n8n-prd-hooks.ops-nvt.com/webhook/d95669f7-d936-4976-b091-a1a9e1989e44';
    return this.http.post(url, { email }, { observe: 'response' });
  }

  // ── OTP: Validar código ingresado por el proveedor ───────────────────────
  validateTokenEmail(email: string, otp: string): Observable<any> {
    const url = 'https://n8n-prd-hooks.ops-nvt.com/webhook/f00c3c63-8ea5-4513-82f4-aefb0ee5b6d6';
    return this.http.post(url, { email, OTP: otp }, { observe: 'response' });
  }


  async register(data: RegisterData): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await this.delay(1100);

      const users  = this.getStoredUsers();
      const exists = users.some(
        u => u.email.toLowerCase() === data.email.toLowerCase()
      );

      if (exists) {
        this._error.set('Ya existe una cuenta con ese correo electrónico.');
        return false;
      }

      const newUser: User = {
        id:        crypto.randomUUID(),
        email:     data.email,
        name:      data.name,
        lastName:  data.lastName,
        phone:     data.phone,
        createdAt: new Date(),
      };

      this.saveUser(newUser);
      this._currentUser.set(newUser);
      return true;

    } finally {
      this._isLoading.set(false);
    }
  }

  logout(): void {
    this._currentUser.set(null);
    this._error.set(null);
  }

  clearError(): void {
    this._error.set(null);
  }

  // ── Helpers privados ──────────────────────────────────────
  private delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }

  private getStoredUsers(): User[] {
    try {
      return JSON.parse(localStorage.getItem('auth_users') ?? '[]');
    } catch {
      return [];
    }
  }

  private saveUser(user: User): void {
    const users = this.getStoredUsers();
    users.push(user);
    localStorage.setItem('auth_users', JSON.stringify(users));
  }

}
