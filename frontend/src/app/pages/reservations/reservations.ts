import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { ReservationService, ReservationItem } from '../../shared/service/reservation.service';
import { AuthService } from '../../shared/service/auth.service';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservations.html',
  styleUrl: './reservations.scss'
})
export class ReservationsComponent implements OnInit, OnDestroy {
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

  // Action modal
  showModal = false;
  modalAction: 'valider' | 'annuler' | null = null;
  modalTarget: ReservationItem | null = null;
  actionLoading = false;
  actionError = '';
  actionSuccess = '';

  // Highlight (from notification)
  highlightId: string | null = null;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  get isAdmin(): boolean { return this.authService.isAdmin(); }
  get isResponsable(): boolean { return this.authService.isResponsableBoutique(); }

  constructor(
    private reservationService: ReservationService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadReservations();
    this.searchSubject
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => { this.page = 1; this.applyFilters(); });

    // Handle highlight from notification click
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.highlightId = params['highlight'] ?? null;
      if (this.highlightId) {
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
}
