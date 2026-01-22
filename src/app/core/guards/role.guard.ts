import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/auth/login']);
    }

    if (authService.hasAnyRole(allowedRoles)) {
      return true;
    }

    // Redirect ke dashboard jika tidak punya akses
    return router.createUrlTree(['/dashboard']);
  };
};
