import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface Usuario {
  id?: number;
  nombre: string;
  email: string;
  password?: string;
  rol: 'admin' | 'cliente';
}

export interface LoginResponse {
  mensaje: string;
  usuario: Usuario;
  token: string;
}

export interface RecoverPasswordResponse {
  mensaje: string;
}

export interface ResetPasswordResponse {
  mensaje: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/usuarios';
  private tokenKey = 'auth-token';
  private userKey = 'user-info';

  private isBrowser: boolean;

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<Usuario | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // ⚠️ Solo en navegador se accede a localStorage
    if (this.isBrowser) {
      this.isAuthenticatedSubject.next(this.hasToken());
      this.currentUserSubject.next(this.getUserFromStorage());
    }
  }

  /* ================== AUTH ================== */

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap(response => {
          if (response.token && this.isBrowser) {
            localStorage.setItem(this.tokenKey, response.token);
            localStorage.setItem(this.userKey, JSON.stringify(response.usuario));

            this.isAuthenticatedSubject.next(true);
            response.usuario.rol = response.usuario.rol.trim().toLowerCase() as 'admin' | 'cliente';   
            this.currentUserSubject.next(response.usuario);
          }
        })
      );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {})
      .pipe(
        tap({
          next: () => this.clearSession(),
          error: () => this.clearSession()
        })
      );
  }

  logoutLocal(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  private clearSession(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
  }

  /* ================== RECUPERACIÓN DE CONTRASEÑA ================== */

  /**
   * Solicita recuperación de contraseña enviando un email
   * @param email Correo electrónico del usuario
   * @returns Observable con mensaje de confirmación
   */
  recoverPassword(email: string): Observable<RecoverPasswordResponse> {
    return this.http.post<RecoverPasswordResponse>(`${this.apiUrl}/recuperar-password`, { email });
  }

  /**
   * Restablece la contraseña usando un token
   * @param token Token de recuperación
   * @param newPassword Nueva contraseña
   * @returns Observable con mensaje de confirmación
   */
  resetPassword(token: string, newPassword: string): Observable<ResetPasswordResponse> {
    return this.http.post<ResetPasswordResponse>(`${this.apiUrl}/reset-password`, { token, newPassword });
  }

  /**
   * Verifica si un token de recuperación es válido
   * @param token Token a verificar
   * @returns Observable con resultado de la verificación
   */
  verifyResetToken(token: string): Observable<{ valido: boolean }> {
    return this.http.post<{ valido: boolean }>(`${this.apiUrl}/verify-reset-token`, { token });
  }

  /* ================== HELPERS ================== */

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.tokenKey);
  }

  private hasToken(): boolean {
    return !!this.getToken();
  }

  private getUserFromStorage(): Usuario | null {
    if (!this.isBrowser) return null;

    const userStr = localStorage.getItem(this.userKey);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return !!user && user.rol === 'admin';
  }

  isCliente(): boolean {
    const user = this.currentUserSubject.value;
    return !!user && user.rol === 'cliente';
  }

  /* ================== USERS ================== */

  registerUser(usuario: Usuario): Observable<any> {
    return this.http.post(`${this.apiUrl}`, usuario);
  }

  updateUser(id: number, userData: Partial<Usuario>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, userData);
  }

  changeUserRole(id: number, rol: 'admin' | 'cliente'): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/rol`, { rol });
  }

  getUsers(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}`);
  }
}