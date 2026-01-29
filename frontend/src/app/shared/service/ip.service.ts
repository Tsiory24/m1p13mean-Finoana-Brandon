import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject, from } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

interface IpifyResponse {
  ip: string;
}

@Injectable({
  providedIn: 'root'
})
export class IpService {
  private readonly IPIFY_URL = 'https://api.ipify.org?format=json';
  private readonly IP_STORAGE_KEY = 'client_public_ip';
  private readonly IP_CACHE_DURATION = 3600000; // 1 heure en ms
  
  private clientIp$ = new BehaviorSubject<string | null>(null);

  constructor() {
    this.initializeIp();
  }

  /**
   * Initialise l'IP depuis le cache ou la récupère
   */
  private initializeIp(): void {
    const cached = this.getCachedIp();
    if (cached) {
      this.clientIp$.next(cached);
    } else {
      this.fetchAndCacheIp().subscribe();
    }
  }

  /**
   * Récupère l'IP publique du client via fetch() pour éviter la dépendance circulaire
   */
  fetchAndCacheIp(): Observable<string | null> {
    return from(
      fetch(this.IPIFY_URL)
        .then(response => response.json())
        .then((data: IpifyResponse) => {
          if (data && data.ip) {
            this.cacheIp(data.ip);
            this.clientIp$.next(data.ip);
            return data.ip;
          }
          return null;
        })
        .catch(error => {
          console.error('Erreur lors de la récupération de l\'IP:', error);
          return null;
        })
    );
  }

  /**
   * Retourne l'IP actuelle (depuis le cache ou le subject)
   */
  getClientIp(): string | null {
    return this.clientIp$.value || this.getCachedIp();
  }

  /**
   * Observable de l'IP client
   */
  getClientIp$(): Observable<string | null> {
    return this.clientIp$.asObservable();
  }

  /**
   * Cache l'IP avec un timestamp
   */
  private cacheIp(ip: string): void {
    const cacheData = {
      ip: ip,
      timestamp: Date.now()
    };
    localStorage.setItem(this.IP_STORAGE_KEY, JSON.stringify(cacheData));
  }

  /**
   * Récupère l'IP depuis le cache si elle n'est pas expirée
   */
  private getCachedIp(): string | null {
    try {
      const cached = localStorage.getItem(this.IP_STORAGE_KEY);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const isExpired = (Date.now() - cacheData.timestamp) > this.IP_CACHE_DURATION;

      if (isExpired) {
        localStorage.removeItem(this.IP_STORAGE_KEY);
        return null;
      }

      return cacheData.ip;
    } catch (error) {
      console.error('Erreur lors de la lecture du cache IP:', error);
      return null;
    }
  }

  /**
   * Force le rafraîchissement de l'IP
   */
  refreshIp(): Observable<string | null> {
    localStorage.removeItem(this.IP_STORAGE_KEY);
    return this.fetchAndCacheIp();
  }
}
