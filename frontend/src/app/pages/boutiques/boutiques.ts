import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { BoutiqueService, BoutiqueItem, ReservationActive } from '../../shared/service/boutique.service';
import { AuthService } from '../../shared/service/auth.service';
import { CategorieService, CategorieItem } from '../../shared/service/categorie.service';

@Component({
  selector: 'app-boutiques',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './boutiques.html',
  styleUrl: './boutiques.scss'
})
export class BoutiquesComponent implements OnInit, OnDestroy {

  get isAdmin(): boolean { return this.authService.isAdmin(); }
  get isResponsable(): boolean { return this.authService.isResponsableBoutique(); }

  /* ─── Admin state ─── */
  allBoutiques: BoutiqueItem[] = [];
  filteredBoutiques: BoutiqueItem[] = [];
  loading = false;
  error = '';

  searchText = '';
  filterType = '';
  filterActive = '';
  filterLocale = '';   // '' | 'actif' | 'expire' | 'aucun'
  sortField = 'nom';
  sortOrder: 'asc' | 'desc' = 'asc';
  page = 1;
  limit = 9;

  /* ─── Responsable state ─── */
  maBoutique: BoutiqueItem | null = null;
  reservationsActives: ReservationActive[] = [];
  loadingMaBoutique = false;
  maBoutiqueError = '';
  allCategories: CategorieItem[] = [];

  showCreateForm = false;
  createForm = { nom: '', type: 'kiosque' as 'kiosque' | 'stand' | 'magasin', image: null as string | null, categorieId: '' };
  creating = false;
  createError = '';
  createSuccess = '';
  uploadingImage = false;
  imagePreview: string | null = null;

  // Admin action modal (validate / cancel)
  adminModal: { open: boolean; type: 'valider' | 'annuler'; boutique: BoutiqueItem | null } = {
    open: false, type: 'valider', boutique: null
  };
  adminActionLoading = false;
  adminActionError = '';
  adminActionSuccess = '';

  // Cancel my boutique (responsable)
  showCancelConfirm = false;
  cancelling = false;
  cancelError = '';

  // Edit my boutique (responsable)
  editModal = {
    open: false,
    nom: '',
    type: 'kiosque' as 'kiosque' | 'stand' | 'magasin',
    image: null as string | null,
    description: '',
    categorieId: '',
    saving: false,
    error: ''
  };
  editUploadingImage = false;
  editImagePreview: string | null = null;

  /* ─── Highlight (from notification) ─── */
  highlightId: string | null = null;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private boutiqueService: BoutiqueService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private categorieService: CategorieService
  ) {}

  ngOnInit(): void {
    if (this.isAdmin) {
      this.loadAll();
    } else if (this.isResponsable) {
      this.loadMaBoutique();
      this.loadCategories();
    }

    this.searchSubject
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.applyFilters();
      });

    // Handle highlight from notification click
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.highlightId = params['highlight'] ?? null;
      if (this.highlightId) {
        this.searchText = '';
        this.filterType = '';
        this.filterActive = '';
        this.filterLocale = '';
        this.page = 1;
      }
      this.applyFilters();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ─── Admin: load all ─── */
  loadAll(): void {
    this.loading = true;
    this.error = '';
    this.boutiqueService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (boutiques) => {
        this.allBoutiques = boutiques;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Erreur lors du chargement des boutiques.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let list = [...this.allBoutiques];

    // Highlight filter — show only the targeted boutique
    if (this.highlightId) {
      const target = list.find(b => b._id === this.highlightId);
      this.filteredBoutiques = target ? [target] : [];
      this.page = Math.min(this.page, this.totalPages || 1);
      return;
    }

    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase();
      list = list.filter(b =>
        b.nom.toLowerCase().includes(q) ||
        (b.proprietaire?.nom?.toLowerCase().includes(q) ?? false) ||
        (b.localeId?.code?.toLowerCase().includes(q) ?? false)
      );
    }

    if (this.filterType) {
      list = list.filter(b => b.type === this.filterType);
    }

    if (this.filterActive !== '') {
      const active = this.filterActive === 'true';
      list = list.filter(b => b.active === active);
    }

    if (this.filterLocale !== '') {
      list = list.filter(b => {
        const s = this.getLocaleStatus(b);
        if (this.filterLocale === 'actif') return s === 'actif';
        if (this.filterLocale === 'aucun') return s === 'aucun' || s === 'expire';
        return true;
      });
    }

    list.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      if (this.sortField === 'nom') { valA = a.nom; valB = b.nom; }
      else if (this.sortField === 'type') { valA = a.type; valB = b.type; }
      else if (this.sortField === 'createdAt') { valA = a.createdAt; valB = b.createdAt; }
      else if (this.sortField === 'active') { valA = String(a.active); valB = String(b.active); }
      else if (this.sortField === 'localeStatus') { valA = this.getLocaleStatus(a); valB = this.getLocaleStatus(b); }

      if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredBoutiques = list;
    this.page = Math.min(this.page, this.totalPages || 1);
  }

  get pagedBoutiques(): BoutiqueItem[] {
    const start = (this.page - 1) * this.limit;
    return this.filteredBoutiques.slice(start, start + this.limit);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredBoutiques.length / this.limit));
  }

  get pages(): number[] {
    const arr: number[] = [];
    const start = Math.max(1, this.page - 2);
    const end = Math.min(this.totalPages, this.page + 2);
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }

  get firstItemIndex(): number {
    return this.filteredBoutiques.length === 0 ? 0 : (this.page - 1) * this.limit + 1;
  }

  get lastItemIndex(): number {
    return Math.min(this.page * this.limit, this.filteredBoutiques.length);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
  }

  onSearchChange(): void { this.searchSubject.next(this.searchText); }
  onFilterChange(): void { this.page = 1; this.applyFilters(); }
  onSortChange(): void { this.page = 1; this.applyFilters(); }

  /** Returns 'actif' | 'expire' | 'aucun' for a boutique based on its localesLouees */
  getLocaleStatus(b: BoutiqueItem): 'actif' | 'expire' | 'aucun' {
    if (!b.localesLouees || b.localesLouees.length === 0) return 'aucun';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hasActive = b.localesLouees.some(r => r.dateFin && new Date(r.dateFin) >= today);
    return hasActive ? 'actif' : 'expire';
  }

  getLocaleStatusLabel(b: BoutiqueItem): string {
    const s = this.getLocaleStatus(b);
    if (s === 'actif') return 'Local actif';
    if (s === 'expire') return 'Local expiré';
    return 'Aucun local';
  }

  getLocaleStatusClass(b: BoutiqueItem): string {
    const s = this.getLocaleStatus(b);
    if (s === 'actif') return 'locale-status-actif';
    if (s === 'expire') return 'locale-status-expire';
    return 'locale-status-aucun';
  }
  toggleSortDir(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  clearHighlight(): void {
    this.highlightId = null;
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
    this.applyFilters();
  }

  /* ─── Responsable: load ma boutique ─── */
  loadMaBoutique(): void {
    this.loadingMaBoutique = true;
    this.maBoutiqueError = '';
    this.boutiqueService.getMaBoutique().pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ boutique, reservationsActives }) => {
        this.maBoutique = boutique;
        this.reservationsActives = reservationsActives;
        this.loadingMaBoutique = false;
      },
      error: (err) => {
        this.maBoutiqueError = err?.error?.message ?? 'Erreur lors du chargement de votre boutique.';
        this.loadingMaBoutique = false;
      }
    });
  }

  loadCategories(): void {
    this.categorieService.getAllCategories().pipe(takeUntil(this.destroy$)).subscribe({
      next: (cats) => { this.allCategories = cats; },
      error: () => {}
    });
  }

  openCreateForm(): void {
    this.showCreateForm = true;
    this.createForm = { nom: '', type: 'kiosque', image: null, categorieId: '' };
    this.createError = '';
    this.createSuccess = '';
    this.imagePreview = null;
  }

  cancelCreate(): void {
    this.showCreateForm = false;
    this.createError = '';
    this.imagePreview = null;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => { this.imagePreview = e.target?.result as string; };
    reader.readAsDataURL(file);
    this.uploadingImage = true;
    this.boutiqueService.uploadImage(file).pipe(takeUntil(this.destroy$)).subscribe({
      next: (url) => { this.createForm.image = url; this.uploadingImage = false; },
      error: () => { this.createError = 'Erreur lors du téléchargement de l\'image.'; this.uploadingImage = false; }
    });
  }

  submitCreate(): void {
    if (!this.createForm.nom.trim()) {
      this.createError = 'Le nom est requis.';
      return;
    }
    this.creating = true;
    this.createError = '';
    this.boutiqueService.create({
      nom: this.createForm.nom.trim(),
      type: this.createForm.type,
      image: this.createForm.image ?? undefined,
      categorieId: this.createForm.categorieId || undefined
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (boutique) => {
        this.maBoutique = boutique;
        this.showCreateForm = false;
        this.creating = false;
        this.imagePreview = null;
        this.createSuccess = 'Boutique créée avec succès ! En attente de validation.';
        setTimeout(() => { this.createSuccess = ''; this.loadMaBoutique(); }, 3000);
      },
      error: (err) => {
        this.createError = err?.error?.message ?? 'Erreur lors de la création.';
        this.creating = false;
      }
    });
  }

  /* ─── Admin: validate / cancel modal ─── */
  openAdminModal(type: 'valider' | 'annuler', boutique: BoutiqueItem): void {
    this.adminModal = { open: true, type, boutique };
    this.adminActionError = '';
    this.adminActionSuccess = '';
  }

  closeAdminModal(): void {
    if (this.adminActionLoading) return;
    this.adminModal = { open: false, type: 'valider', boutique: null };
    this.adminActionError = '';
  }

  confirmAdminAction(): void {
    if (!this.adminModal.boutique) return;
    this.adminActionLoading = true;
    this.adminActionError = '';
    const id = this.adminModal.boutique._id;
    if (this.adminModal.type === 'valider') {
      this.boutiqueService.valider(id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.adminActionLoading = false;
          this.adminModal.open = false;
          this.adminActionSuccess = 'Boutique validée avec succès.';
          this.loadAll();
          setTimeout(() => { this.adminActionSuccess = ''; }, 3000);
        },
        error: (err) => {
          this.adminActionError = err?.error?.message ?? 'Erreur lors de la validation.';
          this.adminActionLoading = false;
        }
      });
    } else {
      this.boutiqueService.annuler(id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.adminActionLoading = false;
          this.adminModal.open = false;
          this.adminActionSuccess = 'Boutique annulée avec succès.';
          this.loadAll();
          setTimeout(() => { this.adminActionSuccess = ''; }, 3000);
        },
        error: (err) => {
          this.adminActionError = err?.error?.message ?? 'Erreur lors de l\'annulation.';
          this.adminActionLoading = false;
        }
      });
    }
  }

  /* ─── Responsable: cancel boutique ─── */
  openCancelConfirm(): void {
    this.showCancelConfirm = true;
    this.cancelError = '';
  }

  closeCancelConfirm(): void {
    if (this.cancelling) return;
    this.showCancelConfirm = false;
    this.cancelError = '';
  }

  submitCancel(): void {
    if (!this.maBoutique) return;
    this.cancelling = true;
    this.cancelError = '';
    this.boutiqueService.annuler(this.maBoutique._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.maBoutique = null;
        this.cancelling = false;
        this.showCancelConfirm = false;
        this.createSuccess = 'Votre demande de boutique a été annulée.';
        setTimeout(() => { this.createSuccess = ''; }, 3000);
      },
      error: (err) => {
        this.cancelError = err?.error?.message ?? 'Erreur lors de l\'annulation.';
        this.cancelling = false;
      }
    });
  }

  /* ─── Responsable: edit boutique ─── */
  openEditModal(): void {
    if (!this.maBoutique) return;
    this.editModal = {
      open: true,
      nom: this.maBoutique.nom,
      type: this.maBoutique.type,
      image: this.maBoutique.image,
      description: this.maBoutique.description ?? '',
      categorieId: this.maBoutique.categorieId?._id ?? '',
      saving: false,
      error: ''
    };
    this.editImagePreview = this.maBoutique.image;
  }

  closeEditModal(): void {
    if (this.editModal.saving) return;
    this.editModal.open = false;
    this.editImagePreview = null;
  }

  onEditImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => { this.editImagePreview = e.target?.result as string; };
    reader.readAsDataURL(file);
    this.editUploadingImage = true;
    this.boutiqueService.uploadImage(file).pipe(takeUntil(this.destroy$)).subscribe({
      next: (url) => { this.editModal.image = url; this.editUploadingImage = false; },
      error: () => { this.editModal.error = 'Erreur lors du téléchargement de l\'image.'; this.editUploadingImage = false; }
    });
  }

  submitEdit(): void {
    if (!this.maBoutique) return;
    if (!this.editModal.nom.trim()) { this.editModal.error = 'Le nom est requis.'; return; }
    this.editModal.saving = true;
    this.editModal.error = '';
    this.boutiqueService.update(this.maBoutique._id, {
      nom: this.editModal.nom.trim(),
      type: this.editModal.type,
      image: this.editModal.image,
      categorieId: this.editModal.categorieId || null
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        this.maBoutique = { ...this.maBoutique!, ...updated };
        this.editModal.saving = false;
        this.editModal.open = false;
        this.createSuccess = 'Boutique mise à jour avec succès.';
        setTimeout(() => { this.createSuccess = ''; this.loadMaBoutique(); }, 3000);
      },
      error: (err) => {
        this.editModal.error = err?.error?.message ?? 'Erreur lors de la mise à jour.';
        this.editModal.saving = false;
      }
    });
  }

  goToHoraires(): void {
    this.router.navigate(['/backoffice/horaires']);
  }

  typeBadgeClass(type: string): string {
    return type === 'magasin' ? 'badge-magasin' : type === 'stand' ? 'badge-stand' : 'badge-kiosque';
  }

  typeLabel(type: string): string {
    return type === 'magasin' ? 'Magasin' : type === 'stand' ? 'Stand' : 'Kiosque';
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatPrix(n: number): string {
    return n?.toLocaleString('fr-FR') + ' Ar';
  }

}

