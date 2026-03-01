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
    '/reservations': 'Réservations',
    '/affiches': 'Affiches',
    '/logs': "Journaux d'activité"
  };

  constructor(private authService: AuthService, private router: Router, private notifService: BoutiqueNotificationService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      if (this.isAdmin || this.isResponsable) this.startPolling();
      else this.stopPolling();
    });

    if (this.isAdmin || this.isResponsable) {
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
  get isResponsable(): boolean { return this.currentUser?.role === 'responsable_boutique'; }

  fetchNotifications(): void {
    if (!this.isAdmin && !this.isResponsable) return;
    this.loadingNotifs = true;
    const source$ = this.isAdmin ? this.notifService.getAll() : this.notifService.getMes();
    source$.subscribe({
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
    this.showNotifPanel = false;
    if (!notif.lu) {
      this.notifService.markAsRead(notif._id).subscribe({
        next: () => {
          notif.lu = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      });
    }
    this.navigateForNotif(notif);
  }

  private navigateForNotif(notif: BoutiqueNotification): void {
    const refId = notif.refId;
    const boutiqueId = notif.data?.['boutiqueId'];
    const reservationId = notif.data?.['reservationId'];

    switch (notif.type) {
      case 'boutique_creation':
        this.router.navigate(['/backoffice/boutiques'], { queryParams: { highlight: refId || boutiqueId } });
        break;
      case 'reservation_locale':
        this.router.navigate(['/backoffice/reservations'], { queryParams: { highlight: refId || reservationId } });
        break;
      case 'reservation_validee':
      case 'reservation_annulee':
        this.router.navigate(['/backoffice/reservations'], { queryParams: { highlight: refId || reservationId } });
        break;
      case 'boutique_validee':
        this.router.navigate(['/backoffice/ma-boutique']);
        break;
      case 'boutique_annulee':
        this.router.navigate(['/backoffice/dashboard']);
        break;
      case 'affiche_demande':
        this.router.navigate(['/backoffice/affiches']);
        break;
      case 'affiche_acceptee':
      case 'affiche_refusee':
        this.router.navigate(['/backoffice/produits']);
        break;
      case 'paiement_loyer_soumis':
        // Admin : ouvrir onglet paiements, surligner le paiement
        this.router.navigate(['/backoffice/reservations'], {
          queryParams: { tab: 'paiements', highlightPaiement: notif.data?.['paiementId'] }
        });
        break;
      case 'paiement_loyer_valide':
      case 'paiement_loyer_refuse':
        // Responsable : ouvrir onglet paiements et le calendrier de la réservation concernée
        this.router.navigate(['/backoffice/reservations'], {
          queryParams: { tab: 'paiements', openCalendrier: notif.data?.['reservationId'] }
        });
        break;
      default:
        break;
    }
  }

  markAllAsRead(): void {
    if (this.unreadCount === 0) return;
    const source$ = this.isAdmin ? this.notifService.markAllAsRead() : this.notifService.markAllMesAsRead();
    source$.subscribe({
      next: () => {
        this.notifications.forEach(n => n.lu = true);
        this.unreadCount = 0;
      }
    });
  }

  notifIcon(type: string): string {
    switch (type) {
      case 'boutique_creation':  return '\uD83C\uDFE0';
      case 'boutique_validee':   return '\u2705';
      case 'boutique_annulee':   return '\u274C';
      case 'reservation_locale': return '\uD83D\uDCCD';
      case 'reservation_validee': return '\uD83C\uDF89';
      case 'reservation_annulee': return '\u26A0\uFE0F';
      case 'affiche_demande':    return '\uD83D\uDCE2';
      case 'affiche_acceptee':   return '\u2B50';
      case 'affiche_refusee':    return '\uD83D\uDEAB';
      case 'paiement_loyer_soumis': return '\uD83D\uDCB3';
      case 'paiement_loyer_valide': return '\u2705';
      case 'paiement_loyer_refuse': return '\u274C';
      default: return '\uD83D\uDD14';
    }
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
