import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategorieService, CategorieItem, SousCategorieItem } from '../../shared/service/categorie.service';
import { UniteService, UniteItem } from '../../shared/service/unite.service';

type TabType = 'categories' | 'sous-categories' | 'unites';
type ModalMode = 'create' | 'edit';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.html',
  styleUrl: './categories.scss'
})
export class CategoriesComponent implements OnInit {
  activeTab: TabType = 'categories';

  // ── Catégories ──────────────────────────────────────────────
  allCategories: CategorieItem[] = [];
  filteredCategories: CategorieItem[] = [];
  loadingCat = false;
  errorCat = '';
  searchCat = '';
  sortCat: 'nom' | 'createdAt' = 'nom';
  sortCatDir: 'asc' | 'desc' = 'asc';
  pageCat = 1;
  limitCat = 5;

  // ── Sous-catégories ──────────────────────────────────────────
  allSousCategories: SousCategorieItem[] = [];
  filteredSousCategories: SousCategorieItem[] = [];
  loadingSC = false;
  errorSC = '';
  searchSC = '';
  filterSCCategorie = '';
  sortSC: 'nom' | 'createdAt' = 'nom';
  sortSCDir: 'asc' | 'desc' = 'asc';
  pageSC = 1;
  limitSC = 5;

  // ── Unités ───────────────────────────────────────────────────
  allUnites: UniteItem[] = [];
  filteredUnites: UniteItem[] = [];
  loadingUnites = false;
  errorUnites = '';
  searchUnites = '';
  sortUnites: 'nom' | 'createdAt' = 'nom';
  sortUnitesDir: 'asc' | 'desc' = 'asc';
  pageUnites = 1;
  limitUnites = 5;

  // ── Modal shared ──────────────────────────────────────────────
  modal = {
    open: false,
    mode: 'create' as ModalMode,
    type: 'categories' as TabType,
    nom: '',
    categorieId: '',
    editId: '',
    loading: false,
    error: ''
  };

  // ── Delete confirmation ──────────────────────────────────────
  deleteModal = {
    open: false,
    type: 'categories' as TabType,
    id: '',
    nom: '',
    loading: false,
    error: ''
  };

  globalSuccess = '';

  // ── Expand catégorie → sous-catégories ───────────────────────
  expandedCatId: string | null = null;

  toggleCatExpand(catId: string): void {
    this.expandedCatId = this.expandedCatId === catId ? null : catId;
  }

  getSousCategoriesForCat(catId: string): SousCategorieItem[] {
    return this.allSousCategories.filter(sc => this.getCatIdFromSC(sc) === catId);
  }

  viewSousCategoriesInTab(catId: string): void {
    this.filterSCCategorie = catId;
    this.activeTab = 'sous-categories';
    this.applyFilterSC();
  }

  constructor(
    private catService: CategorieService,
    private uniteService: UniteService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadSousCategories();
    this.loadUnites();
  }

  // ── Tabs ──────────────────────────────────────────────────────
  setTab(tab: TabType): void {
    this.activeTab = tab;
  }

  // ── Load data ─────────────────────────────────────────────────
  loadCategories(): void {
    this.loadingCat = true;
    this.errorCat = '';
    this.catService.getAllCategories().subscribe({
      next: (data) => { this.allCategories = data; this.applyFilterCat(); this.loadingCat = false; },
      error: (err) => { this.errorCat = err?.error?.message || 'Erreur lors du chargement des catégories'; this.loadingCat = false; }
    });
  }

  loadSousCategories(): void {
    this.loadingSC = true;
    this.errorSC = '';
    this.catService.getAllSousCategories().subscribe({
      next: (data) => { this.allSousCategories = data; this.applyFilterSC(); this.loadingSC = false; },
      error: (err) => { this.errorSC = err?.error?.message || 'Erreur lors du chargement des sous-catégories'; this.loadingSC = false; }
    });
  }

  loadUnites(): void {
    this.loadingUnites = true;
    this.errorUnites = '';
    this.uniteService.getAll().subscribe({
      next: (data) => { this.allUnites = data; this.applyFilterUnites(); this.loadingUnites = false; },
      error: (err) => { this.errorUnites = err?.error?.message || 'Erreur lors du chargement des unités'; this.loadingUnites = false; }
    });
  }

  // ── Filter & sort: Catégories ─────────────────────────────────
  applyFilterCat(): void {
    let list = [...this.allCategories];
    if (this.searchCat.trim()) {
      const q = this.searchCat.toLowerCase();
      list = list.filter(c => c.nom.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const va = this.sortCat === 'nom' ? a.nom : a.createdAt;
      const vb = this.sortCat === 'nom' ? b.nom : b.createdAt;
      const cmp = va.localeCompare(vb);
      return this.sortCatDir === 'asc' ? cmp : -cmp;
    });
    this.filteredCategories = list;
    this.pageCat = 1;
  }

  onSearchCatChange(): void { this.applyFilterCat(); }
  onSortCatChange(): void { this.applyFilterCat(); }
  toggleSortCatDir(): void { this.sortCatDir = this.sortCatDir === 'asc' ? 'desc' : 'asc'; this.applyFilterCat(); }

  // ── Filter & sort: Sous-catégories ───────────────────────────
  applyFilterSC(): void {
    let list = [...this.allSousCategories];
    if (this.filterSCCategorie) {
      list = list.filter(sc => {
        const catId = typeof sc.categorieId === 'string' ? sc.categorieId : (sc.categorieId as any)._id;
        return catId === this.filterSCCategorie;
      });
    }
    if (this.searchSC.trim()) {
      const q = this.searchSC.toLowerCase();
      list = list.filter(sc => sc.nom.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const va = this.sortSC === 'nom' ? a.nom : a.createdAt;
      const vb = this.sortSC === 'nom' ? b.nom : b.createdAt;
      const cmp = va.localeCompare(vb);
      return this.sortSCDir === 'asc' ? cmp : -cmp;
    });
    this.filteredSousCategories = list;
    this.pageSC = 1;
  }

  onSearchSCChange(): void { this.applyFilterSC(); }
  onFilterSCChange(): void { this.applyFilterSC(); }
  onSortSCChange(): void { this.applyFilterSC(); }
  toggleSortSCDir(): void { this.sortSCDir = this.sortSCDir === 'asc' ? 'desc' : 'asc'; this.applyFilterSC(); }

  // ── Filter & sort: Unités ─────────────────────────────────────
  applyFilterUnites(): void {
    let list = [...this.allUnites];
    if (this.searchUnites.trim()) {
      const q = this.searchUnites.toLowerCase();
      list = list.filter(u => u.nom.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const va = this.sortUnites === 'nom' ? a.nom : a.createdAt;
      const vb = this.sortUnites === 'nom' ? b.nom : b.createdAt;
      const cmp = va.localeCompare(vb);
      return this.sortUnitesDir === 'asc' ? cmp : -cmp;
    });
    this.filteredUnites = list;
    this.pageUnites = 1;
  }

  onSearchUnitesChange(): void { this.applyFilterUnites(); }
  onSortUnitesChange(): void { this.applyFilterUnites(); }
  toggleSortUnitesDir(): void { this.sortUnitesDir = this.sortUnitesDir === 'asc' ? 'desc' : 'asc'; this.applyFilterUnites(); }

  getCategorieNomForSC(sc: SousCategorieItem): string {
    if (!sc.categorieId) return '—';
    if (typeof sc.categorieId === 'object' && sc.categorieId !== null) return (sc.categorieId as any).nom || '—';
    const cat = this.allCategories.find(c => c._id === sc.categorieId);
    return cat ? cat.nom : '—';
  }

  getCatIdFromSC(sc: SousCategorieItem): string {
    if (!sc.categorieId) return '';
    if (typeof sc.categorieId === 'object') return (sc.categorieId as any)._id || '';
    return sc.categorieId as string;
  }

  countSCForCategorie(catId: string): number {
    return this.allSousCategories.filter(sc => this.getCatIdFromSC(sc) === catId).length;
  }

  // ── Pagination: Catégories ────────────────────────────────────
  get totalPagesCat(): number { return Math.max(1, Math.ceil(this.filteredCategories.length / this.limitCat)); }
  get pagesCat(): number[] {
    const d = 2, c = this.pageCat, t = this.totalPagesCat;
    const r: number[] = [];
    for (let i = Math.max(1, c - d); i <= Math.min(t, c + d); i++) r.push(i);
    return r;
  }
  get pagedCategories(): CategorieItem[] { const s = (this.pageCat - 1) * this.limitCat; return this.filteredCategories.slice(s, s + this.limitCat); }
  get firstCat(): number { return this.filteredCategories.length === 0 ? 0 : (this.pageCat - 1) * this.limitCat + 1; }
  get lastCat(): number { return Math.min(this.pageCat * this.limitCat, this.filteredCategories.length); }
  goToPageCat(p: number): void { if (p < 1 || p > this.totalPagesCat || p === this.pageCat) return; this.pageCat = p; }

  // ── Pagination: Sous-catégories ───────────────────────────────
  get totalPagesSC(): number { return Math.max(1, Math.ceil(this.filteredSousCategories.length / this.limitSC)); }
  get pagesSC(): number[] {
    const d = 2, c = this.pageSC, t = this.totalPagesSC;
    const r: number[] = [];
    for (let i = Math.max(1, c - d); i <= Math.min(t, c + d); i++) r.push(i);
    return r;
  }
  get pagedSousCategories(): SousCategorieItem[] { const s = (this.pageSC - 1) * this.limitSC; return this.filteredSousCategories.slice(s, s + this.limitSC); }
  get firstSC(): number { return this.filteredSousCategories.length === 0 ? 0 : (this.pageSC - 1) * this.limitSC + 1; }
  get lastSC(): number { return Math.min(this.pageSC * this.limitSC, this.filteredSousCategories.length); }
  goToPageSC(p: number): void { if (p < 1 || p > this.totalPagesSC || p === this.pageSC) return; this.pageSC = p; }

  // ── Pagination: Unités ────────────────────────────────────────
  get totalPagesUnites(): number { return Math.max(1, Math.ceil(this.filteredUnites.length / this.limitUnites)); }
  get pagesUnites(): number[] {
    const d = 2, c = this.pageUnites, t = this.totalPagesUnites;
    const r: number[] = [];
    for (let i = Math.max(1, c - d); i <= Math.min(t, c + d); i++) r.push(i);
    return r;
  }
  get pagedUnites(): UniteItem[] { const s = (this.pageUnites - 1) * this.limitUnites; return this.filteredUnites.slice(s, s + this.limitUnites); }
  get firstUnites(): number { return this.filteredUnites.length === 0 ? 0 : (this.pageUnites - 1) * this.limitUnites + 1; }
  get lastUnites(): number { return Math.min(this.pageUnites * this.limitUnites, this.filteredUnites.length); }
  goToPageUnites(p: number): void { if (p < 1 || p > this.totalPagesUnites || p === this.pageUnites) return; this.pageUnites = p; }

  // ── Modal: open ───────────────────────────────────────────────
  openCreateModal(type: TabType): void {
    this.modal = { open: true, mode: 'create', type, nom: '', categorieId: '', editId: '', loading: false, error: '' };
  }

  openEditModal(type: TabType, item: CategorieItem | SousCategorieItem | UniteItem): void {
    let categorieId = '';
    if (type === 'sous-categories') {
      const sc = item as SousCategorieItem;
      categorieId = typeof sc.categorieId === 'string' ? sc.categorieId : (sc.categorieId as any)._id || '';
    }
    this.modal = { open: true, mode: 'edit', type, nom: item.nom, categorieId, editId: item._id, loading: false, error: '' };
  }

  closeModal(): void {
    if (this.modal.loading) return;
    this.modal.open = false;
  }

  submitModal(): void {
    this.modal.error = '';
    if (!this.modal.nom.trim()) { this.modal.error = 'Le nom est obligatoire'; return; }
    if (this.modal.type === 'sous-categories' && !this.modal.categorieId) {
      this.modal.error = 'La catégorie parente est obligatoire'; return;
    }

    this.modal.loading = true;

    if (this.modal.type === 'categories') {
      const obs = this.modal.mode === 'create'
        ? this.catService.createCategorie(this.modal.nom.trim())
        : this.catService.updateCategorie(this.modal.editId, this.modal.nom.trim());
      obs.subscribe({
        next: () => {
          this.globalSuccess = this.modal.mode === 'create' ? 'Catégorie créée avec succès' : 'Catégorie mise à jour';
          this.modal.open = false; this.modal.loading = false;
          this.loadCategories(); this.clearGlobalSuccess();
        },
        error: (err) => { this.modal.error = err?.error?.message || 'Erreur'; this.modal.loading = false; }
      });

    } else if (this.modal.type === 'sous-categories') {
      const obs = this.modal.mode === 'create'
        ? this.catService.createSousCategorie(this.modal.nom.trim(), this.modal.categorieId)
        : this.catService.updateSousCategorie(this.modal.editId, this.modal.nom.trim(), this.modal.categorieId);
      obs.subscribe({
        next: () => {
          this.globalSuccess = this.modal.mode === 'create' ? 'Sous-catégorie créée avec succès' : 'Sous-catégorie mise à jour';
          this.modal.open = false; this.modal.loading = false;
          this.loadSousCategories(); this.clearGlobalSuccess();
        },
        error: (err) => { this.modal.error = err?.error?.message || 'Erreur'; this.modal.loading = false; }
      });

    } else {
      // unites
      const obs = this.modal.mode === 'create'
        ? this.uniteService.create(this.modal.nom.trim())
        : this.uniteService.update(this.modal.editId, this.modal.nom.trim());
      obs.subscribe({
        next: () => {
          this.globalSuccess = this.modal.mode === 'create' ? 'Unité créée avec succès' : 'Unité mise à jour';
          this.modal.open = false; this.modal.loading = false;
          this.loadUnites(); this.clearGlobalSuccess();
        },
        error: (err) => { this.modal.error = err?.error?.message || 'Erreur'; this.modal.loading = false; }
      });
    }
  }

  // ── Delete ─────────────────────────────────────────────────────
  openDeleteModal(type: TabType, id: string, nom: string): void {
    this.deleteModal = { open: true, type, id, nom, loading: false, error: '' };
  }

  closeDeleteModal(): void {
    if (this.deleteModal.loading) return;
    this.deleteModal.open = false;
  }

  confirmDelete(): void {
    this.deleteModal.loading = true;
    this.deleteModal.error = '';

    let obs;
    if (this.deleteModal.type === 'categories') {
      obs = this.catService.deleteCategorie(this.deleteModal.id);
    } else if (this.deleteModal.type === 'sous-categories') {
      obs = this.catService.deleteSousCategorie(this.deleteModal.id);
    } else {
      obs = this.uniteService.delete(this.deleteModal.id);
    }

    obs.subscribe({
      next: () => {
        this.globalSuccess = `"${this.deleteModal.nom}" supprimé avec succès`;
        this.deleteModal.open = false; this.deleteModal.loading = false;
        if (this.deleteModal.type === 'categories') { this.loadCategories(); this.loadSousCategories(); }
        else if (this.deleteModal.type === 'sous-categories') { this.loadSousCategories(); }
        else { this.loadUnites(); }
        this.clearGlobalSuccess();
      },
      error: (err) => {
        this.deleteModal.error = err?.error?.message || 'Erreur lors de la suppression';
        this.deleteModal.loading = false;
      }
    });
  }

  private clearGlobalSuccess(): void {
    setTimeout(() => { this.globalSuccess = ''; }, 3000);
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
