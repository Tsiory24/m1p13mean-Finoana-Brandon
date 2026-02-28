import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { BoutiqueService, BoutiqueItem } from '../../shared/service/boutique.service';
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
  sortField = 'nom';
  sortOrder: 'asc' | 'desc' = 'asc';
  page = 1;
  limit = 9;

  /* ─── Responsable state ─── */
  maBoutique: BoutiqueItem | null = null;
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

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private boutiqueService: BoutiqueService,
    private authService: AuthService,
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

    list.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      if (this.sortField === 'nom') { valA = a.nom; valB = b.nom; }
      else if (this.sortField === 'type') { valA = a.type; valB = b.type; }
      else if (this.sortField === 'createdAt') { valA = a.createdAt; valB = b.createdAt; }
      else if (this.sortField === 'active') { valA = String(a.active); valB = String(b.active); }

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
  toggleSortDir(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  /* ─── Responsable: load ma boutique ─── */
  loadMaBoutique(): void {
    this.loadingMaBoutique = true;
    this.maBoutiqueError = '';
    this.boutiqueService.getMaBoutique().pipe(takeUntil(this.destroy$)).subscribe({
      next: (boutique) => {
        this.maBoutique = boutique;
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
}
