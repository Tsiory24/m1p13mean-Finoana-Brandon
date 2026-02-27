import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService, User } from '../../shared/service/auth.service';
import { BoutiqueNotificationService, BoutiqueNotification } from '../../shared/service/boutique-notification.service';
import { filter, Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header implements OnInit, OnDestroy {
  @Input() sidebarCollapsed = false;

  currentUser: User | null = null;
  currentPageTitle = 'Tableau de bord';
  showUserMenu = false;

  // Notifications
  notifications: BoutiqueNotification[] = [];
  unreadCount = 0;
  showNotifPanel = false;
  loadingNotifs = false;
  private pollSub: Subscription | null = null;

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

  constructor(private authService: AuthService, private router: Router, private notifService: BoutiqueNotificationService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      // Start polling when admin logs in
      if (this.isAdmin) this.startPolling();
      else this.stopPolling();
    });

    if (this.isAdmin) {
      this.fetchNotifications();
      this.startPolling();
    }

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

  get isAdmin(): boolean { return this.authService.isAdmin?.() ?? this.currentUser?.role === 'admin'; }

  fetchNotifications(): void {
    if (!this.isAdmin) return;
    this.loadingNotifs = true;
    this.notifService.getAll().subscribe({
      next: (data) => {
        this.notifications = data.notifications;
        this.unreadCount = data.unreadCount;
        this.loadingNotifs = false;
      },
      error: () => { this.loadingNotifs = false; }
    });
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollSub = interval(30000).subscribe(() => this.fetchNotifications());
  }

  private stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
    if (this.showNotifPanel) {
      this.showUserMenu = false;
      this.fetchNotifications();
    }
  }

  closeNotifPanel(): void { this.showNotifPanel = false; }

  onMarkAsRead(notif: BoutiqueNotification): void {
    if (notif.lu) return;
    this.notifService.markAsRead(notif._id).subscribe({
      next: () => {
        notif.lu = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    });
  }

  markAllAsRead(): void {
    if (this.unreadCount === 0) return;
    this.notifService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.lu = true);
        this.unreadCount = 0;
      }
    });
  }

  notifIcon(type: string): string {
    return type === 'boutique_creation' ? '🏪' : '📍';
  }

  formatTime(date: string): string {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'à l\'instant';
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString('fr-FR');
  }

  get userInitial(): string {
    return this.currentUser?.nom?.charAt(0).toUpperCase() ?? '?';
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    if (this.showUserMenu) this.showNotifPanel = false;
  }

  closeMenu(): void {
    this.showUserMenu = false;
  }

  logout(): void {
    this.showUserMenu = false;
    this.authService.logout();
  }
}
