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

      if (!isAuthenticated) {
        this.router.navigate(['/login']);
        return false;
      }

      const roles = route.data['roles'];

      // Si no hay restricción de roles, permitir acceso
      if (!roles || roles.length === 0) {
        return true;
      }

      const user = this.authService['currentUserSubject'].value;

      if (!user) {
        this.router.navigate(['/login']);
        return false;
      }

      // ✔ verificar si el rol del usuario está permitido
      if (roles.includes(user.rol)) {
        return true;
      }

      this.router.navigate(['/acceso-denegado']);
      return false;
    })
  );
}

}