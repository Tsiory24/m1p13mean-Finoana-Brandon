import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/service/auth.service';
import { BoutiqueService, BoutiqueItem } from '../../shared/service/boutique.service';
import { ProduitService, ProduitItem, AttributProduit } from '../../shared/service/produit.service';
import { CategorieService, SousCategorieItem, CategorieItem } from '../../shared/service/categorie.service';
import { VariantService, VariantItem, VariantOption } from '../../shared/service/variant.service';
import { UniteService, UniteItem } from '../../shared/service/unite.service';
import { UploadService } from '../../shared/service/upload.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-produits',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './produits.html',
  styleUrl: './produits.scss'
})
export class ProduitsComponent implements OnInit {
  isAdmin = false;
  isResponsable = false;

  // ── Data ──────────────────────────────────────────────────────
  allProduits: ProduitItem[] = [];
  filteredProduits: ProduitItem[] = [];
  maBoutique: BoutiqueItem | null = null;
  allUnites: UniteItem[] = [];
  allSousCategories: SousCategorieItem[] = [];
  allBoutiques: BoutiqueItem[] = [];
  allCategories: CategorieItem[] = [];
  loading = false;
  error = '';
  globalSuccess = '';

  // ── Filters ───────────────────────────────────────────────────
  searchText = '';
  filterSousCat = '';
  filterBoutique = '';
  filterCategorie = '';
  sortField: 'nom' | 'prix_actuel' = 'nom';
  sortOrder: 'asc' | 'desc' = 'asc';
  page = 1;
  readonly limit = 12;

  // ── Product CRUD Modal ────────────────────────────────────────
  productModal: {
    open: boolean;
    mode: 'create' | 'edit';
    loading: boolean;
    error: string;
    editId: string;
    nom: string;
    description: string;
    prix_actuel: number | null;
    uniteId: string;
    boutiqueId: string;
    sousCategorieIds: string[];
    attributs: AttributProduit[];
    boutiqueSousCategories: SousCategorieItem[];
    images: string[];
    uploadingImage: boolean;
  } = this.emptyProductModal();

  deleteProductModal = { open: false, id: '', nom: '', loading: false, error: '' };

  // ── Variants Panel Modal ──────────────────────────────────────
  variantsPanelModal: { open: boolean; produit: ProduitItem | null } = { open: false, produit: null };
  variantsByProduit: Record<string, VariantItem[]> = {};
  loadingVariants: Record<string, boolean> = {};

  // ── Variant CRUD Modal ────────────────────────────────────────
  variantModal: {
    open: boolean;
    mode: 'create' | 'edit';
    produitId: string;
    editId: string;
    nom: string;
    options: { valeur: string; prix_supplement: number; stock: number; image: string | null }[];
    loading: boolean;
    error: string;
  } = this.emptyVariantModal();

  deleteVariantModal = { open: false, id: '', nom: '', produitId: '', loading: false, error: '' };

  // ── Card Carousel ─────────────────────────────────────────────
  cardImgIndex: Record<string, number> = {};

  constructor(
    private auth: AuthService,
    private boutiqueService: BoutiqueService,
    private produitService: ProduitService,
    private catService: CategorieService,
    private variantService: VariantService,
    private uniteService: UniteService,
    private uploadService: UploadService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.auth.isAdmin();
    this.isResponsable = this.auth.isResponsableBoutique();
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loading = true;
    this.error = '';

    if (this.isAdmin) {
      forkJoin({
        produits: this.produitService.getAll(),
        unites: this.uniteService.getAll(),
        sousCategories: this.catService.getAllSousCategories(),
        boutiques: this.boutiqueService.getAll(),
        categories: this.catService.getAllCategories()
      }).subscribe({
        next: ({ produits, unites, sousCategories, boutiques, categories }) => {
          this.allProduits = produits;
          this.allUnites = unites;
          this.allSousCategories = sousCategories;
          this.allBoutiques = boutiques;
          this.allCategories = categories;
          this.applyFilter();
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.message || 'Erreur lors du chargement';
          this.loading = false;
        }
      });
    } else {
      forkJoin({
        maBoutique: this.boutiqueService.getMaBoutique(),
        unites: this.uniteService.getAll(),
        sousCategories: this.catService.getAllSousCategories()
      }).subscribe({
        next: ({ maBoutique, unites, sousCategories }) => {
          this.maBoutique = maBoutique;
          this.allUnites = unites;
          const catId = maBoutique?.categorieId?._id;
          this.allSousCategories = catId
            ? sousCategories.filter(sc => {
                const scCatId = typeof sc.categorieId === 'object' ? (sc.categorieId as any)._id : sc.categorieId;
                return scCatId === catId;
              })
            : sousCategories;

          if (maBoutique) {
            this.produitService.getAll({ boutiqueId: maBoutique._id }).subscribe({
              next: (produits) => {
                this.allProduits = produits;
                this.applyFilter();
                this.loading = false;
              },
              error: (err) => {
                this.error = err?.error?.message || 'Erreur lors du chargement des produits';
                this.loading = false;
              }
            });
          } else {
            this.loading = false;
          }
        },
        error: (err) => {
          this.error = err?.error?.message || 'Erreur lors du chargement';
          this.loading = false;
        }
      });
    }
  }

  // ── Filters ───────────────────────────────────────────────────
  applyFilter(): void {
    let list = [...this.allProduits];
    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase();
      list = list.filter(p => p.nom.toLowerCase().includes(q));
    }
    if (this.filterSousCat) {
      list = list.filter(p => p.sousCategorieIds.some(sc => sc._id === this.filterSousCat));
    }
    if (this.filterBoutique) {
      list = list.filter(p => p.boutiqueId?._id === this.filterBoutique);
    }
    if (this.filterCategorie) {
      list = list.filter(p => p.boutiqueId?.categorieId?._id === this.filterCategorie);
    }
    list.sort((a, b) => {
      if (this.sortField === 'prix_actuel') {
        const diff = a.prix_actuel - b.prix_actuel;
        return this.sortOrder === 'asc' ? diff : -diff;
      }
      const cmp = a.nom.localeCompare(b.nom);
      return this.sortOrder === 'asc' ? cmp : -cmp;
    });
    this.filteredProduits = list;
    this.page = 1;
  }

  onSearchChange(): void { this.applyFilter(); }
  onFilterChange(): void { this.applyFilter(); }
  toggleSortDir(): void { this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'; this.applyFilter(); }
  setSortField(f: 'nom' | 'prix_actuel'): void {
    if (this.sortField === f) { this.toggleSortDir(); } else { this.sortField = f; this.sortOrder = 'asc'; this.applyFilter(); }
  }

  // ── Pagination ────────────────────────────────────────────────
  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredProduits.length / this.limit)); }
  get pages(): number[] {
    const d = 2, c = this.page, t = this.totalPages;
    const r: number[] = [];
    for (let i = Math.max(1, c - d); i <= Math.min(t, c + d); i++) r.push(i);
    return r;
  }
  get pagedProduits(): ProduitItem[] {
    const s = (this.page - 1) * this.limit; return this.filteredProduits.slice(s, s + this.limit);
  }
  get firstItem(): number { return this.filteredProduits.length === 0 ? 0 : (this.page - 1) * this.limit + 1; }
  get lastItem(): number { return Math.min(this.page * this.limit, this.filteredProduits.length); }
  goToPage(p: number): void { if (p < 1 || p > this.totalPages || p === this.page) return; this.page = p; }

  // ── Product Modal ─────────────────────────────────────────────
  private emptyProductModal() {
    return {
      open: false, mode: 'create' as 'create' | 'edit', loading: false, error: '',
      editId: '', nom: '', description: '', prix_actuel: null as number | null,
      uniteId: '', boutiqueId: '', sousCategorieIds: [] as string[],
      attributs: [] as AttributProduit[], boutiqueSousCategories: [] as SousCategorieItem[],
      images: [] as string[], uploadingImage: false
    };
  }

  openCreateModal(): void {
    const boutiqueId = this.maBoutique?._id || '';
    const boutiqueSousCategories = this.isAdmin ? [] : this.allSousCategories;
    this.productModal = { ...this.emptyProductModal(), open: true, mode: 'create', boutiqueId, boutiqueSousCategories };
  }

  openEditModal(produit: ProduitItem): void {
    const boutiqueId = produit.boutiqueId?._id || '';
    const boutiqueSousCategories = this.getSousCategForBoutique(boutiqueId);
    this.productModal = {
      open: true, mode: 'edit', loading: false, error: '', editId: produit._id,
      nom: produit.nom,
      description: produit.description || '',
      prix_actuel: produit.prix_actuel,
      uniteId: produit.uniteId?._id || '',
      boutiqueId,
      sousCategorieIds: produit.sousCategorieIds.map(sc => sc._id),
      attributs: produit.attributs ? [...produit.attributs] : [],
      boutiqueSousCategories,
      images: produit.images ? [...produit.images] : [],
      uploadingImage: false
    };
  }

  private getSousCategForBoutique(boutiqueId: string): SousCategorieItem[] {
    if (!boutiqueId) return this.allSousCategories;
    const boutique = this.isAdmin
      ? this.allBoutiques.find(b => b._id === boutiqueId)
      : this.maBoutique;
    const catId = boutique?.categorieId?._id;
    if (!catId) return [];
    return this.allSousCategories.filter(sc => {
      const scCatId = typeof sc.categorieId === 'object' ? (sc.categorieId as any)._id : sc.categorieId;
      return scCatId === catId;
    });
  }

  onBoutiqueChange(): void {
    this.productModal.sousCategorieIds = [];
    this.productModal.boutiqueSousCategories = this.getSousCategForBoutique(this.productModal.boutiqueId);
  }

  toggleSousCat(id: string): void {
    const idx = this.productModal.sousCategorieIds.indexOf(id);
    if (idx === -1) this.productModal.sousCategorieIds.push(id);
    else this.productModal.sousCategorieIds.splice(idx, 1);
  }

  isSousCatSelected(id: string): boolean {
    return this.productModal.sousCategorieIds.includes(id);
  }

  addAttribut(): void { this.productModal.attributs.push({ cle: '', valeur: '' }); }
  removeAttribut(i: number): void { this.productModal.attributs.splice(i, 1); }

  // ── Product Image Upload ──────────────────────────────────────
  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    (event.target as HTMLInputElement).value = '';
    this.productModal.uploadingImage = true;
    this.uploadService.upload(file).subscribe({
      next: (res) => {
        this.productModal.images.push(res.url);
        this.productModal.uploadingImage = false;
      },
      error: () => { this.productModal.uploadingImage = false; }
    });
  }

  removeProductImage(idx: number): void {
    this.productModal.images.splice(idx, 1);
  }

  closeProductModal(): void {
    if (this.productModal.loading || this.productModal.uploadingImage) return;
    this.productModal.open = false;
  }

  submitProductModal(): void {
    this.productModal.error = '';
    const { nom, prix_actuel, uniteId, boutiqueId } = this.productModal;
    if (!nom.trim()) { this.productModal.error = 'Le nom est obligatoire'; return; }
    if (prix_actuel === null || prix_actuel === undefined) { this.productModal.error = 'Le prix est obligatoire'; return; }
    if (!uniteId) { this.productModal.error = "L'unité est obligatoire"; return; }
    if (!boutiqueId) { this.productModal.error = 'La boutique est obligatoire'; return; }

    const attributs = this.productModal.attributs.filter(a => a.cle.trim() && a.valeur.trim());
    this.productModal.loading = true;

    if (this.productModal.mode === 'create') {
      this.produitService.create({
        nom: nom.trim(),
        description: this.productModal.description || undefined,
        prix_actuel: prix_actuel!,
        uniteId, boutiqueId,
        sousCategorieIds: this.productModal.sousCategorieIds,
        attributs,
        images: this.productModal.images
      }).subscribe({
        next: () => {
          this.globalSuccess = 'Produit créé avec succès';
          this.productModal.open = false;
          this.productModal.loading = false;
          this.refreshProduits();
          this.clearSuccess();
        },
        error: (err) => { this.productModal.error = err?.error?.message || 'Erreur'; this.productModal.loading = false; }
      });
    } else {
      this.produitService.update(this.productModal.editId, {
        nom: nom.trim(),
        description: this.productModal.description || undefined,
        prix_actuel: prix_actuel!,
        uniteId,
        sousCategorieIds: this.productModal.sousCategorieIds,
        attributs,
        images: this.productModal.images
      }).subscribe({
        next: () => {
          this.globalSuccess = 'Produit mis à jour';
          this.productModal.open = false;
          this.productModal.loading = false;
          this.refreshProduits();
          this.clearSuccess();
        },
        error: (err) => { this.productModal.error = err?.error?.message || 'Erreur'; this.productModal.loading = false; }
      });
    }
  }

  // ── Delete product ────────────────────────────────────────────
  openDeleteProductModal(produit: ProduitItem): void {
    this.deleteProductModal = { open: true, id: produit._id, nom: produit.nom, loading: false, error: '' };
  }

  closeDeleteProductModal(): void {
    if (this.deleteProductModal.loading) return;
    this.deleteProductModal.open = false;
  }

  confirmDeleteProduct(): void {
    this.deleteProductModal.loading = true;
    this.deleteProductModal.error = '';
    this.produitService.delete(this.deleteProductModal.id).subscribe({
      next: () => {
        this.globalSuccess = `"${this.deleteProductModal.nom}" supprimé`;
        this.deleteProductModal.open = false;
        this.deleteProductModal.loading = false;
        this.refreshProduits();
        this.clearSuccess();
      },
      error: (err) => {
        this.deleteProductModal.error = err?.error?.message || 'Erreur';
        this.deleteProductModal.loading = false;
      }
    });
  }

  private refreshProduits(): void {
    const boutiqueId = this.isResponsable && this.maBoutique ? this.maBoutique._id : undefined;
    this.produitService.getAll(boutiqueId ? { boutiqueId } : {}).subscribe({
      next: (data) => { this.allProduits = data; this.applyFilter(); }
    });
  }

  // ── Variants Panel Modal ──────────────────────────────────────
  openVariantsPanel(produit: ProduitItem): void {
    this.variantsPanelModal = { open: true, produit };
    if (!this.variantsByProduit[produit._id]) {
      this.loadVariants(produit._id);
    }
  }

  closeVariantsPanel(): void {
    this.variantsPanelModal = { open: false, produit: null };
  }

  loadVariants(produitId: string): void {
    this.loadingVariants[produitId] = true;
    this.variantService.getByProduit(produitId).subscribe({
      next: (data) => {
        this.variantsByProduit[produitId] = data;
        this.loadingVariants[produitId] = false;
      },
      error: () => { this.loadingVariants[produitId] = false; }
    });
  }

  getVariants(produitId: string): VariantItem[] {
    return this.variantsByProduit[produitId] || [];
  }

  isLoadingVariants(produitId: string): boolean {
    return !!this.loadingVariants[produitId];
  }

  // ── Variant CRUD Modal ────────────────────────────────────────
  private emptyVariantModal() {
    return {
      open: false, mode: 'create' as 'create' | 'edit', produitId: '', editId: '',
      nom: '', options: [{ valeur: '', prix_supplement: 0, stock: 0, image: null as string | null }],
      loading: false, error: ''
    };
  }

  openCreateVariantModal(produitId: string): void {
    this.variantModal = { ...this.emptyVariantModal(), open: true, mode: 'create', produitId };
  }

  openEditVariantModal(variant: VariantItem): void {
    this.variantModal = {
      open: true, mode: 'edit', produitId: variant.produitId, editId: variant._id,
      nom: variant.nom,
      options: variant.options.map(o => ({
        valeur: o.valeur, prix_supplement: o.prix_supplement,
        stock: o.stock, image: o.image ?? null
      })),
      loading: false, error: ''
    };
  }

  closeVariantModal(): void {
    if (this.variantModal.loading) return;
    this.variantModal.open = false;
  }

  addVariantOption(): void {
    this.variantModal.options.push({ valeur: '', prix_supplement: 0, stock: 0, image: null });
  }

  removeVariantOption(i: number): void {
    if (this.variantModal.options.length > 1) this.variantModal.options.splice(i, 1);
  }

  // ── Variant Option Image Upload ───────────────────────────────
  onVariantOptionImageSelected(event: Event, optionIdx: number): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    (event.target as HTMLInputElement).value = '';
    this.uploadService.upload(file).subscribe({
      next: (res) => { this.variantModal.options[optionIdx].image = res.url; },
      error: () => {}
    });
  }

  removeVariantOptionImage(optionIdx: number): void {
    this.variantModal.options[optionIdx].image = null;
  }

  submitVariantModal(): void {
    this.variantModal.error = '';
    if (!this.variantModal.nom.trim()) { this.variantModal.error = 'Le nom du variant est obligatoire'; return; }
    const validOptions = this.variantModal.options.filter(o => o.valeur.trim());
    if (validOptions.length === 0) { this.variantModal.error = 'Au moins une option est requise'; return; }

    this.variantModal.loading = true;

    if (this.variantModal.mode === 'create') {
      this.variantService.create({
        produitId: this.variantModal.produitId,
        nom: this.variantModal.nom.trim(),
        options: validOptions
      }).subscribe({
        next: () => {
          const pid = this.variantModal.produitId;
          this.variantModal.open = false;
          this.variantModal.loading = false;
          this.loadVariants(pid);
          this.globalSuccess = 'Variant créé';
          this.clearSuccess();
        },
        error: (err) => { this.variantModal.error = err?.error?.message || 'Erreur'; this.variantModal.loading = false; }
      });
    } else {
      this.variantService.update(this.variantModal.editId, {
        nom: this.variantModal.nom.trim(),
        options: validOptions
      }).subscribe({
        next: () => {
          const pid = this.variantModal.produitId;
          this.variantModal.open = false;
          this.variantModal.loading = false;
          this.loadVariants(pid);
          this.globalSuccess = 'Variant mis à jour';
          this.clearSuccess();
        },
        error: (err) => { this.variantModal.error = err?.error?.message || 'Erreur'; this.variantModal.loading = false; }
      });
    }
  }

  openDeleteVariantModal(variant: VariantItem): void {
    this.deleteVariantModal = { open: true, id: variant._id, nom: variant.nom, produitId: variant.produitId, loading: false, error: '' };
  }

  closeDeleteVariantModal(): void {
    if (this.deleteVariantModal.loading) return;
    this.deleteVariantModal.open = false;
  }

  confirmDeleteVariant(): void {
    this.deleteVariantModal.loading = true;
    this.variantService.delete(this.deleteVariantModal.id).subscribe({
      next: () => {
        const pid = this.deleteVariantModal.produitId;
        this.deleteVariantModal.open = false;
        this.deleteVariantModal.loading = false;
        this.loadVariants(pid);
      },
      error: (err) => {
        this.deleteVariantModal.error = err?.error?.message || 'Erreur';
        this.deleteVariantModal.loading = false;
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────
  private clearSuccess(): void {
    setTimeout(() => { this.globalSuccess = ''; }, 3000);
  }

  formatPrice(p: number): string {
    return new Intl.NumberFormat('fr-MG', { style: 'decimal', maximumFractionDigits: 0 }).format(p) + ' Ar';
  }

  formatSupplement(s: number): string {
    if (s === 0) return 'Inclus';
    const abs = new Intl.NumberFormat('fr-MG', { style: 'decimal', maximumFractionDigits: 0 }).format(Math.abs(s));
    return (s > 0 ? '+' : '−') + abs + ' Ar';
  }

  getSousCatNames(produit: ProduitItem): string {
    if (!produit.sousCategorieIds?.length) return '—';
    return produit.sousCategorieIds.map(sc => sc.nom).join(', ');
  }

  getFirstImage(produit: ProduitItem): string | null {
    return produit.images?.length ? produit.images[0] : null;
  }

  // ── Carousel helpers ──────────────────────────────────────────
  /** All images for a card: product images + variant option images (if loaded) */
  getCardImages(produit: ProduitItem): string[] {
    const imgs: string[] = [...(produit.images || [])];
    const variants = this.variantsByProduit[produit._id] || [];
    for (const v of variants) {
      for (const opt of v.options) {
        if (opt.image) imgs.push(opt.image);
      }
    }
    return imgs;
  }

  getCardImgIndex(id: string): number {
    return this.cardImgIndex[id] ?? 0;
  }

  nextCardImg(id: string, total: number, e: Event): void {
    e.stopPropagation();
    this.cardImgIndex[id] = ((this.cardImgIndex[id] ?? 0) + 1) % total;
  }

  prevCardImg(id: string, total: number, e: Event): void {
    e.stopPropagation();
    const cur = this.cardImgIndex[id] ?? 0;
    this.cardImgIndex[id] = (cur - 1 + total) % total;
  }
}
