import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const authGuard = () => {
  const router = inject(Router);

  // Verifica el flag que seteamos después de validar OTP
  const isAuthenticated = localStorage.getItem('auth_token') === 'true';

  if (isAuthenticated) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
 