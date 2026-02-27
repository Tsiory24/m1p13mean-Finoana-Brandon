import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService, User } from '../../shared/service/auth.service';
import { filter } from 'rxjs';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar implements OnInit {
  @Output() toggleCollapse = new EventEmitter<boolean>();

  collapsed = signal(false);
  currentUser: User | null = null;
  activeRoute = '';

  readonly navItems: NavItem[] = [
    {
      label: 'Tableau de bord',
      path: '/dashboard',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>`,
      roles: ['admin', 'responsable_boutique', 'acheteur']
    },
    {
      label: 'Utilisateurs',
      path: '/utilisateurs',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
      roles: ['admin']
    },
    {
      label: 'Boutiques',
      path: '/boutiques',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4v2l8 5 8-5V4zm0 4.18L12 13 4 8.18V20h16V8.18z"/></svg>`,
      roles: ['admin']
    },
    {
      label: 'Ma Boutique',
      path: '/ma-boutique',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4v2l8 5 8-5V4zm0 4.18L12 13 4 8.18V20h16V8.18z"/></svg>`,
      roles: ['responsable_boutique']
    },
    {
      label: 'Locales',
      path: '/locales',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
      roles: ['admin']
    },
    {
      label: 'Produits',
      path: '/produits',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>`,
      roles: ['admin', 'responsable_boutique']
    },
    {
      label: 'Commandes',
      path: '/commandes',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h11v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H17c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 21.46 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>`,
      roles: ['admin', 'responsable_boutique', 'acheteur']
    },
    {
      label: 'Stocks',
      path: '/stocks',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM6 12h2v2H6zm0-3h2v2H6zm0-3h2v2H6zm4 6h4v2h-4zm0-3h6v2h-6zm0-3h6v2h-6z"/></svg>`,
      roles: ['admin', 'responsable_boutique']
    },
    {
      label: 'Catégories',
      path: '/categories',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l-5.5 9h11zm0 3.84L13.93 9h-3.87zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5S15.01 22 17.5 22s4.5-2.01 4.5-4.5S19.99 13 17.5 13zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z"/></svg>`,
      roles: ['admin']
    },
    {
      label: 'Journaux',
      path: '/logs',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>`,
      roles: ['admin']
    }
  ];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.authService.currentUser$.subscribe(u => this.currentUser = u);

    this.activeRoute = this.router.url;
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.activeRoute = e.urlAfterRedirects;
    });
  }

  get filteredNavItems(): NavItem[] {
    const role = this.currentUser?.role ?? '';
    return this.navItems.filter(item => item.roles.includes(role));
  }

  toggle(): void {
    this.collapsed.set(!this.collapsed());
    this.toggleCollapse.emit(this.collapsed());
  }

  isActive(path: string): boolean {
    return this.activeRoute.startsWith(path);
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'responsable_boutique': return 'Resp. Boutique';
      case 'acheteur': return 'Acheteur';
      default: return role;
    }
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin': return 'badge-admin';
      case 'responsable_boutique': return 'badge-manager';
      case 'acheteur': return 'badge-buyer';
      default: return '';
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
