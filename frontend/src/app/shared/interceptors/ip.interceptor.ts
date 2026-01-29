import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { IpService } from '../service/ip.service';

/**
 * Intercepteur HTTP qui ajoute l'adresse IP publique du client dans les headers
 * de toutes les requêtes sortantes vers l'API backend
 */
export const ipInterceptor: HttpInterceptorFn = (req, next) => {
  const ipService = inject(IpService);
  
  // Récupérer l'IP du client
  const clientIp = ipService.getClientIp();
  
  // Ne pas ajouter le header si on appelle l'API ipify elle-même
  if (req.url.includes('api.ipify.org')) {
    return next(req);
  }
  
  // Ajouter l'IP dans le header personnalisé si disponible
  if (clientIp) {
    const clonedReq = req.clone({
      setHeaders: {
        'X-Client-IP': clientIp
      }
    });
    return next(clonedReq);
  }
  
  // Si pas d'IP disponible, continuer sans modifier la requête
  return next(req);
};
