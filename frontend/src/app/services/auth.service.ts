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
  rol: 'admin' | 'staf';
}

export interface LoginResponse {
  success: boolean;
  message: string;
  usuario: Usuario;
  token: string;
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
          if (response.success && response.token && this.isBrowser) {
            localStorage.setItem(this.tokenKey, response.token);
            localStorage.setItem(this.userKey, JSON.stringify(response.usuario));

            this.isAuthenticatedSubject.next(true);
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

  isStaff(): boolean {
    const user = this.currentUserSubject.value;
    return !!user && (user.rol === 'staf' || user.rol === 'admin');
  }

  /* ================== USERS ================== */

  registerUser(usuario: Usuario): Observable<any> {
    return this.http.post(`${this.apiUrl}`, usuario);
  }

  updateUser(id: number, userData: Partial<Usuario>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, userData);
  }

  changeUserRole(id: number, rol: 'admin' | 'staf'): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/rol`, { rol });
  }

  getUsers(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}`);
  }
}
