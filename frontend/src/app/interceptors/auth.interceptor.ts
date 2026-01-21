import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Get token
    const token = this.authService.getToken();
    
    // If token exists, clone the request and add the authorization header
    if (token) {
      const authReq = request.clone({
        headers: request.headers.set('Authorization', `Bearer ${token}`)
      });
      
      // Return the cloned request with the token
      return next.handle(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          // If 401 Unauthorized or 403 Forbidden, redirect to login
          if (error.status === 401 || error.status === 403) {
            this.authService.logoutLocal();
            this.router.navigate(['/login']);
          }
          return throwError(() => error);
        })
      );
    }
    
    // If no token exists, just pass the request
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // If 401 Unauthorized or 403 Forbidden, redirect to login
        if (error.status === 401 || error.status === 403) {
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}