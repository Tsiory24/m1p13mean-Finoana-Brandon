import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';

/** Protège les pages back-office : doit être authentifié (non-acheteur) */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated && !authService.isAcheteur()) {
    return true;
  }

  // Acheteur connecté qui tente /backoffice → retour au FO
  if (authService.isAcheteurLoggedIn) {
    router.navigate(['/']);
    return false;
  }

  router.navigate(['/backoffice']);
  return false;
};

/** Page de login BO : accès libre seulement si non authentifié (ou acheteur → FO) */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    return true;
  }

  // Acheteur qui arrive sur /backoffice → renvoi FO
  if (authService.isAcheteur()) {
    router.navigate(['/']);
    return false;
  }

  router.navigate(['/backoffice/dashboard']);
  return false;
};

/** Page connexion FO : si déjà connecté → redirige selon le rôle */
export const foGuestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
    if (authService.isAcheteur()) {
      router.navigate(['/']);
    } else {
      router.navigate(['/backoffice/dashboard']);
    }
    return false;
  }

  return true;
};

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;
  }

  router.navigate(['/backoffice/locales']);
  return false;
};

/** Protège les pages FO réservées aux acheteurs connectés */
export const foAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAcheteurLoggedIn) {
    return true;
  }

  router.navigate(['/connexion']);
  return false;
};
