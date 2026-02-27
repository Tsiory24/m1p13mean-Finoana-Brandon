import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService, User } from '../../shared/service/auth.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header implements OnInit {
  @Input() sidebarCollapsed = false;

  currentUser: User | null = null;
  currentPageTitle = 'Tableau de bord';
  showUserMenu = false;

  private readonly pageTitles: Record<string, string> = {
    '/dashboard': 'Tableau de bord',
    '/utilisateurs': 'Gestion des utilisateurs',
    '/boutiques': 'Gestion des boutiques',
    '/ma-boutique': 'Ma boutique',
    '/locales': 'Gestion des locales',
    '/produits': 'Gestion des produits',
    '/commandes': 'Gestion des commandes',
    '/stocks': 'Gestion des stocks',
    '/categories': "Catégories & sous-catégories",
    '/logs': "Journaux d'activité"
  };

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.authService.currentUser$.subscribe(u => this.currentUser = u);

    this.updateTitle(this.router.url);
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.updateTitle(e.urlAfterRedirects);
    });
  }

  private updateTitle(url: string): void {
    const match = Object.keys(this.pageTitles).find(k => url.startsWith(k));
    this.currentPageTitle = match ? this.pageTitles[match] : 'Back Office';
  }

  get userInitial(): string {
    return this.currentUser?.nom?.charAt(0).toUpperCase() ?? '?';
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  closeMenu(): void {
    this.showUserMenu = false;
  }

  logout(): void {
    this.showUserMenu = false;
    this.authService.logout();
  }
}
