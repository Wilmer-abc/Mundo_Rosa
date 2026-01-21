import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    return this.checkAuth(route);
  }
  
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    return this.checkAuth(childRoute);
  }
  
  private checkAuth(route: ActivatedRouteSnapshot): Observable<boolean> | boolean {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        // Si no está autenticado, redirigir al login
        if (!isAuthenticated) {
          this.router.navigate(['/login']);
          return false;
        }
        
        // Si la ruta requiere rol de admin
        if (route.data['roles'] && route.data['roles'].includes('admin')) {
          const isAdmin = this.authService.isAdmin();
          if (!isAdmin) {
            this.router.navigate(['/acceso-denegado']);
            return false;
          }
        }
        
        // Si la ruta requiere rol de staff
        if (route.data['roles'] && route.data['roles'].includes('staf')) {
          const isStaff = this.authService.isCliente();          if (!isStaff) {
            this.router.navigate(['/acceso-denegado']);
            return false;
          }
        }
        
        return true;
      })
    );
  }
}