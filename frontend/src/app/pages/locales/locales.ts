import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { LocaleService, LocaleItem } from '../../shared/service/locale.service';
import { AuthService } from '../../shared/service/auth.service';
import { ReservationService } from '../../shared/service/reservation.service';
import { ApiService } from '../../shared/service/api.service';
import { BoutiqueService, BoutiqueItem } from '../../shared/service/boutique.service';

@Component({
  selector: 'app-locales',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './locales.html',
  styleUrl: './locales.scss'
})
export class LocalesComponent implements OnInit, OnDestroy {
  allLocales: LocaleItem[] = [];
  filteredLocales: LocaleItem[] = [];
  loading = false;
  error = '';

  // Filters
  searchText = '';
  filterEtat = '';
  filterDispo = '';

  // Sorting
  sortField = 'code';
  sortOrder: 'asc' | 'desc' = 'asc';

  // Pagination
  page = 1;
  limit = 6;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  get isAdmin(): boolean { return this.authService.isAdmin(); }
  get isResponsable(): boolean { return this.authService.isResponsableBoutique(); }

  maBoutique: BoutiqueItem | null = null;
  get boutiqueActive(): boolean { return this.maBoutique?.active === true; }

  // Reservation modal
  showReserveModal = false;
  reserveTarget: LocaleItem | null = null;
  reserving = false;
  reserveError = '';
  reserveSuccess = '';
  dureeContrat: number | null = null;
  loadingDureeContrat = false;

  constructor(
    private localeService: LocaleService,
    private authService: AuthService,
    private reservationService: ReservationService,
    private apiService: ApiService,
    private boutiqueService: BoutiqueService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Pré-filtrage depuis les query params (ex: ?dispo=true depuis le dashboard)
    const etatParam = this.route.snapshot.queryParamMap.get('etat');
    const dispoParam = this.route.snapshot.queryParamMap.get('dispo');
    if (etatParam) this.filterEtat = etatParam;
    if (dispoParam !== null) this.filterDispo = dispoParam; // 'true' | 'false'
    this.loadLocales();
    if (this.isResponsable) {
      this.boutiqueService.getMaBoutique().subscribe({
        next: ({ boutique }) => { this.maBoutique = boutique; },
        error: () => { this.maBoutique = null; }
      });
    }
    this.searchSubject
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.applyFilters();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openReserveModal(locale: LocaleItem): void {
    this.reserveTarget = locale;
    this.reserveError = '';
    this.reserveSuccess = '';
    this.dureeContrat = null;
    this.showReserveModal = true;
    this.loadingDureeContrat = true;
    this.apiService.getList<{ success: boolean; data: { durees: { duree: number }[] } }>('api/duree-contrats')
      .subscribe({
        next: (res) => {
          this.dureeContrat = res.data.durees?.[0]?.duree ?? null;
          this.loadingDureeContrat = false;
        },
        error: () => { this.loadingDureeContrat = false; }
      });
  }

  closeReserveModal(): void {
    if (this.reserving) return;
    this.showReserveModal = false;
    this.reserveTarget = null;
  }

  confirmReservation(): void {
    if (!this.reserveTarget) return;
    this.reserving = true;
    this.reserveError = '';
    this.reservationService.reserverLocale(this.reserveTarget._id).subscribe({
      next: () => {
        this.reserving = false;
        this.reserveSuccess = 'Réservation envoyée avec succès. En attente de validation par l\'admin.';
        setTimeout(() => {
          this.showReserveModal = false;
          this.reserveTarget = null;
          this.reserveSuccess = '';
          this.loadLocales();
        }, 2000);
      },
      error: (err) => {
        this.reserveError = err?.error?.message || 'Erreur lors de la réservation';
        this.reserving = false;
      }
    });
  }

  loadLocales(): void {
    this.loading = true;
    this.error = '';
    this.localeService.getLocalesAvecDisponibilite().subscribe({
      next: (locales) => {
        this.allLocales = locales;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors du chargement des locales';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let data = [...this.allLocales];

    // Search on code or zone
    if (this.searchText.trim()) {
      const q = this.searchText.trim().toLowerCase();
      data = data.filter(
        l => l.code.toLowerCase().includes(q) || l.zone.toLowerCase().includes(q)
      );
    }

    // Filter by état
    if (this.filterEtat) {
      data = data.filter(l => l.etat === this.filterEtat);
    }

    // Filter by disponibilité
    if (this.filterDispo !== '') {
      const dispo = this.filterDispo === 'true';
      data = data.filter(l => l.disponibilite === dispo);
    }

    // Sort
    data.sort((a, b) => {
      const field = this.sortField as keyof LocaleItem;
      let valA = a[field] as string | number | boolean | null;
      let valB = b[field] as string | number | boolean | null;

      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      let cmp = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB;
      } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        cmp = valA === valB ? 0 : valA ? -1 : 1;
      } else {
        cmp = String(valA).localeCompare(String(valB), 'fr', { sensitivity: 'base' });
      }

      return this.sortOrder === 'asc' ? cmp : -cmp;
    });

    this.filteredLocales = data;
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchText);
  }

  onFilterChange(): void {
    this.page = 1;
    this.applyFilters();
  }

  onSortChange(): void {
    this.page = 1;
    this.applyFilters();
  }

  toggleSortDir(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLocales.length / this.limit));
  }

  get pages(): number[] {
    const arr: number[] = [];
    const start = Math.max(1, this.page - 2);
    const end = Math.min(this.totalPages, this.page + 2);
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }

  get pagedLocales(): LocaleItem[] {
    const start = (this.page - 1) * this.limit;
    return this.filteredLocales.slice(start, start + this.limit);
  }

  get firstItemIndex(): number {
    return this.filteredLocales.length === 0 ? 0 : (this.page - 1) * this.limit + 1;
  }

  get lastItemIndex(): number {
    return Math.min(this.page * this.limit, this.filteredLocales.length);
  }

  getEtatLabel(etat: string): string {
    switch (etat) {
      case 'libre': return 'Libre';
      case 'occupé': return 'Occupé';
      case 'maintenance': return 'Maintenance';
      default: return etat;
    }
  }

  getEtatClass(etat: string): string {
    switch (etat) {
      case 'libre': return 'etat-libre';
      case 'occupé': return 'etat-occupe';
      case 'maintenance': return 'etat-maintenance';
      default: return '';
    }
  }

  formatDate(date: string | null): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
