import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { ReservationService, ReservationItem } from '../../shared/service/reservation.service';
import { PaiementLoyerService, PaiementLoyerItem, CalendrierResponse, MoisCalendrier } from '../../shared/service/paiement-loyer.service';
import { AuthService } from '../../shared/service/auth.service';
import { NotificationService } from '../../shared/service/notification.service';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservations.html',
  styleUrl: './reservations.scss'
})
export class ReservationsComponent implements OnInit, OnDestroy {
  // ── Onglet actif
  activeTab: 'reservations' | 'paiements' = 'reservations';

  // ── Réservations
  allReservations: ReservationItem[] = [];
  filteredReservations: ReservationItem[] = [];
  loading = false;
  error = '';

  // Filters
  searchText = '';
  filterStatut = '';

  // Sorting
  sortField = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Pagination
  page = 1;
  limit = 8;

  // Action modal (valider / annuler réservation)
  showModal = false;
  modalAction: 'valider' | 'annuler' | null = null;
  modalTarget: ReservationItem | null = null;
  actionLoading = false;
  actionError = '';
  actionSuccess = '';

  // Highlight (from notification)
  highlightId: string | null = null;

  // ── Calendrier de paiements (responsable)
  showCalendrierModal = false;
  calendrierLoading = false;
  calendrierError = '';
  calendrierData: CalendrierResponse | null = null;
  selectedMois: Set<string> = new Set();
  paymentNote = '';
  paymentLoading = false;
  paymentError = '';
  paymentSuccess = '';

  // ── Demandes de paiement (admin)
  paiements: PaiementLoyerItem[] = [];
  paiementsLoading = false;
  paiementsError = '';
  paiementsPage = 1;
  paiementsLimit = 10;
  paiementsTotal = 0;
  paiementsFilter = '';
  paiementsSearch = '';
  paiementsSortBy = 'createdAt';
  paiementsSortOrder: 'asc' | 'desc' = 'desc';

  // ── Filtres côté responsable (liste réservations validées)
  loyerSearch = '';
  loyerSortBy = 'prixMensuel';
  loyerSortOrder: 'asc' | 'desc' = 'desc';

  showRefusModal = false;
  refusTarget: PaiementLoyerItem | null = null;
  motifRefus = '';
  refusLoading = false;
  refusError = '';

  showValiderConfirm = false;
  validerTarget: PaiementLoyerItem | null = null;
  validerLoading = false;
  validerError = '';

  // Annulation d'une demande (responsable)
  showAnnulerConfirm = false;
  annulerTarget: PaiementLoyerItem | null = null;
  annulerLoading = false;
  annulerError = '';

  // Surlignage depuis notification (admin)
  highlightPaiementId: string | null = null;
  // Ouverture automatique du calendrier depuis notification (responsable)
  private pendingOpenCalendrier: string | null = null;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  get isAdmin(): boolean { return this.authService.isAdmin(); }
  get isResponsable(): boolean { return this.authService.isResponsableBoutique(); }

  constructor(
    private reservationService: ReservationService,
    private paiementService: PaiementLoyerService,
    private authService: AuthService,
    private notifService: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadReservations();
    this.searchSubject
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => { this.page = 1; this.applyFilters(); });

    // Handle queryParams from notification click
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      // Onglet paiements
      if (params['tab'] === 'paiements') {
        this.activeTab = 'paiements';
        if (this.isAdmin) {
          this.loadPaiements();
          this.highlightPaiementId = params['highlightPaiement'] ?? null;
        } else if (params['openCalendrier']) {
          this.pendingOpenCalendrier = params['openCalendrier'];
        }
      }

      // Highlight réservation (depuis notif réservation classique)
      this.highlightId = params['highlight'] ?? null;
      if (this.highlightId) {
        this.activeTab = 'reservations';
        this.searchText = '';
        this.filterStatut = '';
        this.page = 1;
      }
      this.applyFilters();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReservations(): void {
    this.loading = true;
    this.error = '';
    const source$ = this.isAdmin
      ? this.reservationService.getAll()
      : this.reservationService.getMes();

    source$.subscribe({
      next: (data) => {
        this.allReservations = data;
        this.applyFilters();
        this.loading = false;
        // Ouvrir automatiquement le calendrier si déclenché par une notification
        if (this.pendingOpenCalendrier) {
          const resa = this.allReservations.find(r => r._id === this.pendingOpenCalendrier);
          if (resa) this.ouvrirCalendrier(resa);
          this.pendingOpenCalendrier = null;
        }
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors du chargement';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let data = [...this.allReservations];

    // Highlight filter — show only the targeted reservation
    if (this.highlightId) {
      const target = data.find(r => r._id === this.highlightId);
      this.filteredReservations = target ? [target] : [];
      return;
    }

    const q = this.searchText.trim().toLowerCase();
    if (q) {
      data = data.filter(r =>
        r.localeId?.code?.toLowerCase().includes(q) ||
        r.localeId?.zone?.toLowerCase().includes(q) ||
        r.boutiqueId?.nom?.toLowerCase().includes(q)
      );
    }

    if (this.filterStatut) {
      data = data.filter(r => r.statut === this.filterStatut);
    }

    data.sort((a, b) => {
      let valA: any = a[this.sortField as keyof ReservationItem];
      let valB: any = b[this.sortField as keyof ReservationItem];
      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';
      const cmp = typeof valA === 'string'
        ? valA.localeCompare(valB, 'fr', { sensitivity: 'base' })
        : valA - valB;
      return this.sortOrder === 'asc' ? cmp : -cmp;
    });

    this.filteredReservations = data;
  }

  onSearchChange(): void { this.searchSubject.next(this.searchText); }
  onFilterChange(): void { this.page = 1; this.applyFilters(); }
  onSortChange(): void { this.page = 1; this.applyFilters(); }
  toggleSortDir(): void { this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'; this.applyFilters(); }

  clearHighlight(): void {
    this.highlightId = null;
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
    this.applyFilters();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredReservations.length / this.limit)); }
  get pages(): number[] {
    const total = this.totalPages;
    const current = this.page;
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) range.push(i);
    return range;
  }
  get pagedReservations(): ReservationItem[] {
    const start = (this.page - 1) * this.limit;
    return this.filteredReservations.slice(start, start + this.limit);
  }
  get firstItemIndex(): number { return this.filteredReservations.length === 0 ? 0 : (this.page - 1) * this.limit + 1; }
  get lastItemIndex(): number { return Math.min(this.page * this.limit, this.filteredReservations.length); }

  // Modal
  openModal(action: 'valider' | 'annuler', reservation: ReservationItem): void {
    this.modalAction = action;
    this.modalTarget = reservation;
    this.actionError = '';
    this.actionSuccess = '';
    this.showModal = true;
  }

  closeModal(): void {
    if (this.actionLoading) return;
    this.showModal = false;
    this.modalTarget = null;
    this.modalAction = null;
  }

  confirmAction(): void {
    if (!this.modalTarget || !this.modalAction) return;
    this.actionLoading = true;
    this.actionError = '';

    const obs$ = this.modalAction === 'valider'
      ? this.reservationService.valider(this.modalTarget._id)
      : this.reservationService.annuler(this.modalTarget._id);

    obs$.subscribe({
      next: (updated) => {
        const idx = this.allReservations.findIndex(r => r._id === updated._id);
        if (idx !== -1) this.allReservations[idx] = updated;
        this.applyFilters();
        this.actionSuccess = this.modalAction === 'valider'
          ? 'Réservation validée avec succès !'
          : 'Réservation annulée avec succès.';
        this.actionLoading = false;
        setTimeout(() => { this.closeModal(); }, 1500);
      },
      error: (err) => {
        this.actionError = err?.error?.message || 'Erreur lors de l\'action';
        this.actionLoading = false;
      }
    });
  }

  getStatutLabel(s: string): string {
    switch (s) {
      case 'en_attente': return 'En attente';
      case 'validée': return 'Validée';
      case 'annulée': return 'Annulée';
      default: return s;
    }
  }

  getStatutClass(s: string): string {
    switch (s) {
      case 'en_attente': return 'statut-attente';
      case 'validée': return 'statut-validee';
      case 'annulée': return 'statut-annulee';
      default: return '';
    }
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Onglets ────────────────────────────────────────────────────────────────
  switchTab(tab: 'reservations' | 'paiements'): void {
    this.activeTab = tab;
    if (tab === 'paiements' && this.isAdmin && this.paiements.length === 0) {
      this.loadPaiements();
    }
  }

  // ── Calendrier de paiements (responsable) ─────────────────────────────────
  ouvrirCalendrier(reservation: ReservationItem): void {
    this.showCalendrierModal = true;
    this.selectedMois = new Set();
    this.paymentNote = '';
    this.paymentError = '';
    this.paymentSuccess = '';
    this.calendrierData = null;
    this.calendrierError = '';
    this.calendrierLoading = true;

    this.paiementService.getCalendrier(reservation._id).subscribe({
      next: (data) => {
        this.calendrierData = data;
        this.calendrierLoading = false;
      },
      error: (err) => {
        this.calendrierError = err?.error?.message || 'Erreur de chargement du calendrier.';
        this.calendrierLoading = false;
      }
    });
  }

  fermerCalendrier(): void {
    if (this.paymentLoading) return;
    this.showCalendrierModal = false;
    this.calendrierData = null;
    this.selectedMois = new Set();
  }

  /** Retourne les paiements 'en_attente' uniques présents dans le calendrier courant */
  get demandesEnAttente(): PaiementLoyerItem[] {
    if (!this.calendrierData?.paiements) return [];
    return this.calendrierData.paiements.filter(p => p.statut === 'en_attente');
  }

  openAnnulerConfirm(p: PaiementLoyerItem): void {
    this.annulerTarget = p;
    this.annulerError = '';
    this.showAnnulerConfirm = true;
  }

  confirmerAnnulerPaiement(): void {
    if (!this.annulerTarget) return;
    this.annulerLoading = true;
    this.annulerError = '';
    this.paiementService.annuler(this.annulerTarget._id).subscribe({
      next: () => {
        this.annulerLoading = false;
        this.showAnnulerConfirm = false;
        this.annulerTarget = null;
        // Recharger le calendrier
        if (this.calendrierData?.reservation) {
          this.paiementService.getCalendrier(this.calendrierData.reservation._id).subscribe({
            next: (data) => { this.calendrierData = data; }
          });
        }
        this.notifService.success('Demande de paiement annulée.');
      },
      error: (err) => {
        this.annulerError = err?.error?.message || 'Erreur lors de l\'annulation.';
        this.annulerLoading = false;
      }
    });
  }

  toggleMois(moisIso: string): void {
    // Un mois ne peut être sélectionné que s'il est non_paye (pas en_attente, pas paye)
    const mois = this.calendrierData?.calendrier.find(m => m.mois === moisIso);
    if (!mois || mois.statut !== 'non_paye') return;
    if (this.selectedMois.has(moisIso)) {
      this.selectedMois.delete(moisIso);
    } else {
      this.selectedMois.add(moisIso);
    }
  }

  get montantSelectionne(): number {
    const prixMensuel = this.calendrierData?.calendrier[0]?.montant ?? 0;
    return this.selectedMois.size * prixMensuel;
  }

  soumettrePaiement(): void {
    if (this.selectedMois.size === 0) return;
    this.paymentLoading = true;
    this.paymentError = '';
    this.paymentSuccess = '';

    const reservationId = this.calendrierData!.reservation._id;
    const moisConcernes = Array.from(this.selectedMois);

    this.paiementService.creer({ reservationId, moisConcernes, note: this.paymentNote || undefined }).subscribe({
      next: () => {
        this.paymentSuccess = `Demande de paiement soumise pour ${moisConcernes.length} mois. En attente de validation admin.`;
        this.paymentLoading = false;
        this.selectedMois = new Set();
        // Recharger le calendrier
        this.paiementService.getCalendrier(reservationId).subscribe({
          next: (data) => { this.calendrierData = data; }
        });
      },
      error: (err) => {
        this.paymentError = err?.error?.message || 'Erreur lors de la soumission.';
        this.paymentLoading = false;
      }
    });
  }

  formatMois(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  getStatutMoisClass(statut: string): string {
    switch (statut) {
      case 'paye': return 'mois-paye';
      case 'en_attente': return 'mois-attente';
      default: return 'mois-impaye';
    }
  }

  // ── Demandes de paiement (admin) ───────────────────────────────────────────
  loadPaiements(): void {
    this.paiementsLoading = true;
    this.paiementsError = '';
    this.paiementService.getAll({
      statut: this.paiementsFilter || undefined,
      search: this.paiementsSearch || undefined,
      sortBy: this.paiementsSortBy,
      sortOrder: this.paiementsSortOrder,
      page: this.paiementsPage,
      limit: this.paiementsLimit
    }).subscribe({
      next: (data) => {
        this.paiements = data.paiements;
        this.paiementsTotal = data.total;
        this.paiementsLoading = false;
        // Auto-scroll vers le paiement surligné (depuis notification)
        if (this.highlightPaiementId) {
          setTimeout(() => {
            document.getElementById('paiement-' + this.highlightPaiementId)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
        }
      },
      error: (err) => {
        this.paiementsError = err?.error?.message || 'Erreur de chargement.';
        this.paiementsLoading = false;
      }
    });
  }

  onPaiementsSearchChange(): void {
    this.paiementsPage = 1;
    this.loadPaiements();
  }

  onPaiementsFilterChange(): void {
    this.paiementsPage = 1;
    this.loadPaiements();
  }

  togglePaiementsSortDir(): void {
    this.paiementsSortOrder = this.paiementsSortOrder === 'asc' ? 'desc' : 'asc';
    this.paiementsPage = 1;
    this.loadPaiements();
  }

  get paiementsTotalPages(): number {
    return Math.max(1, Math.ceil(this.paiementsTotal / this.paiementsLimit));
  }

  goToPaiementsPage(p: number): void {
    if (p < 1 || p > this.paiementsTotalPages) return;
    this.paiementsPage = p;
    this.loadPaiements();
  }

  // ── Filtres côté responsable (liste réservations validées) ──────────────────
  get filteredLoyerResas() {
    let list = this.allReservations.filter(r => r.statut === 'validée');
    // Recherche locale/zone
    if (this.loyerSearch.trim()) {
      const q = this.loyerSearch.trim().toLowerCase();
      list = list.filter(r =>
        (r.localeId?.code ?? '').toLowerCase().includes(q) ||
        (r.localeId?.zone ?? '').toLowerCase().includes(q)
      );
    }
    // Tri
    list = [...list].sort((a, b) => {
      let va: number, vb: number;
      if (this.loyerSortBy === 'dateDebut') {
        va = new Date(a.dateDebut ?? 0).getTime();
        vb = new Date(b.dateDebut ?? 0).getTime();
      } else {
        va = a.prixMensuel ?? 0;
        vb = b.prixMensuel ?? 0;
      }
      return this.loyerSortOrder === 'asc' ? va - vb : vb - va;
    });
    return list;
  }

  toggleLoyerSortDir(): void {
    this.loyerSortOrder = this.loyerSortOrder === 'asc' ? 'desc' : 'asc';
  }

  // Valider un paiement admin
  openValiderConfirm(p: PaiementLoyerItem): void {
    this.validerTarget = p;
    this.validerError = '';
    this.showValiderConfirm = true;
  }

  confirmerValiderPaiement(): void {
    if (!this.validerTarget) return;
    this.validerLoading = true;
    this.validerError = '';
    this.paiementService.valider(this.validerTarget._id).subscribe({
      next: (updated) => {
        const idx = this.paiements.findIndex(p => p._id === updated._id);
        if (idx !== -1) this.paiements[idx] = updated;
        this.validerLoading = false;
        this.showValiderConfirm = false;
        this.validerTarget = null;
        this.notifService.success('Paiement validé avec succès.');
      },
      error: (err) => {
        this.validerError = err?.error?.message || 'Erreur lors de la validation.';
        this.validerLoading = false;
      }
    });
  }

  // Refuser un paiement admin
  openRefusModal(p: PaiementLoyerItem): void {
    this.refusTarget = p;
    this.motifRefus = '';
    this.refusError = '';
    this.showRefusModal = true;
  }

  confirmerRefusPaiement(): void {
    if (!this.refusTarget) return;
    this.refusLoading = true;
    this.refusError = '';
    this.paiementService.refuser(this.refusTarget._id, this.motifRefus || undefined).subscribe({
      next: (updated) => {
        const idx = this.paiements.findIndex(p => p._id === updated._id);
        if (idx !== -1) this.paiements[idx] = updated;
        this.refusLoading = false;
        this.showRefusModal = false;
        this.refusTarget = null;
        this.notifService.success('Paiement refusé.');
      },
      error: (err) => {
        this.refusError = err?.error?.message || 'Erreur lors du refus.';
        this.refusLoading = false;
      }
    });
  }

  getPaiementStatutLabel(s: string): string {
    if (s === 'en_attente') return 'En attente';
    if (s === 'validé') return 'Validé';
    if (s === 'refusé') return 'Refusé';
    if (s === 'annulé') return 'Annulé';
    return s;
  }

  getPaiementStatutClass(s: string): string {
    if (s === 'en_attente') return 'statut-attente';
    if (s === 'validé') return 'statut-validee';
    if (s === 'refusé') return 'statut-annulee';
    if (s === 'annulé') return 'statut-annulee';
    return '';
  }
}
