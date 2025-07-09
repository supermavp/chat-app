import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { AuthService } from '../service/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.user$.pipe(
      take(1), // Toma el primer valor y luego completa
      map(user => {
        if (user) {
          return true; // Usuario logueado, permite acceso
        } else {
          console.log('Acceso denegado: usuario no autenticado.');
          return this.router.createUrlTree(['/login']); // Redirige al login
        }
      })
    );
  }
}
