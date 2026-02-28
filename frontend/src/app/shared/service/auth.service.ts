import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environnements/environnement';

export interface User {
  id: string;
  nom: string;
  email?: string;
  contact: string;
  role: 'admin' | 'responsable_boutique' | 'acheteur';
}

// Format exact retourné par le backend
interface LoginApiResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = environment.apiBaseUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  private getUserFromStorage(): User | null {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return localStorage.getItem('token');
  }

  get isAuthenticated(): boolean {
    return !!this.token && !!this.currentUser;
  }

  get userRole(): string {
    return this.currentUser?.role ?? '';
  }

  // Le backend attend { identifier, motDePasse }
  // identifier = nom ou email
  login(identifier: string, motDePasse: string): Observable<LoginApiResponse> {
    return this.http
      .post<LoginApiResponse>(`${this.baseUrl}api/auth/login`, { identifier, motDePasse })
      .pipe(
        tap(response => {
          if (response.success && response.data?.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('currentUser', JSON.stringify(response.data.user));
            this.currentUserSubject.next(response.data.user);
          }
        })
      );
  }

  /** Efface la session sans naviguer (utilisé après un login refusé) */
  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/backoffice']);
  }

  /** Déconnexion depuis le Front Office → retour à l'accueil public */
  logoutFo(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/']);
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  isResponsableBoutique(): boolean {
    return this.currentUser?.role === 'responsable_boutique';
  }

  isAcheteur(): boolean {
    return this.currentUser?.role === 'acheteur';
  }

  /** Vrai uniquement si l'utilisateur connecté est un acheteur (FO) */
  get isAcheteurLoggedIn(): boolean {
    return this.isAuthenticated && this.isAcheteur();
  }
}
