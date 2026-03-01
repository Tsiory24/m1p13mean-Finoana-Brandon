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
import { PrixService, PrixProduitEntry, PrixVariantOptionEntry } from '../../shared/service/prix.service';
import { AfficheService, DemandeAffiche, AfficheConfig } from '../../shared/service/affiche.service';
import { PromotionService, Promotion } from '../../shared/service/promotion.service';
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
  filterLocaleStatus = '';   // '' | 'actif' | 'aucun'
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

  // ── Price Change Modals ───────────────────────────────────────
  productPriceModal: {
    open: boolean;
    produitId: string;
    produitNom: string;
    prixActuel: number;
    nouveauPrix: number | null;
    loading: boolean;
    error: string;
    historique: PrixProduitEntry[];
    loadingHistorique: boolean;
  } = this.emptyProductPriceModal();

  variantOptPriceModal: {
    open: boolean;
    variantId: string;
    variantNom: string;
    optionId: string;
    optionValeur: string;
    supplementActuel: number;
    nouveauSupplement: number | null;
    loading: boolean;
    error: string;
    historique: PrixVariantOptionEntry[];
    loadingHistorique: boolean;
  } = this.emptyVariantOptPriceModal();

  // ── Affiche (responsable) ─────────────────────────────────────
  demandesAffiche: DemandeAffiche[] = [];
  afficheConfig: AfficheConfig | null = null;
  afficheActionLoading: Record<string, boolean> = {};
  retirerLoading: Record<string, boolean> = {};

  // ── Promotions (responsable) ──────────────────────────────────
  promoMapProduit: Record<string, Promotion> = {};
  promoMapOption: Record<string, Promotion> = {};
  promoModal: {
    open: boolean;
    type: 'produit' | 'variant_option';
    produitId: string;
    produitNom: string;
    prixActuel: number;
    variantId: string;
    variantNom: string;
    optionId: string;
    optionValeur: string;
    prixSupplementActuel: number;
    pourcentage: number | null;
    dateDebut: string;
    dateFin: string;
    loading: boolean;
    error: string;
  } = {
    open: false, type: 'produit',
    produitId: '', produitNom: '', prixActuel: 0,
    variantId: '', variantNom: '', optionId: '', optionValeur: '',
    prixSupplementActuel: 0,
    pourcentage: null, dateDebut: '', dateFin: '',
    loading: false, error: ''
  };
  promoTerminerLoading: Record<string, boolean> = {};

  // ── Card Carousel ─────────────────────────────────────────────
  cardImgIndex: Record<string, number> = {};

  constructor(
    private auth: AuthService,
    private boutiqueService: BoutiqueService,
    private produitService: ProduitService,
    private catService: CategorieService,
    private variantService: VariantService,
    private uniteService: UniteService,
    private uploadService: UploadService,
    private prixService: PrixService,
    private afficheService: AfficheService,
    private promotionService: PromotionService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.auth.isAdmin();
    this.isResponsable = this.auth.isResponsableBoutique();
    this.loadInitialData();
    if (this.isResponsable) {
      this.loadDemandesAffiche();
      this.loadAfficheConfig();
      this.loadPromotions();
    }
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
        boutiqueRes: this.boutiqueService.getMaBoutique(),
        unites: this.uniteService.getAll(),
        sousCategories: this.catService.getAllSousCategories()
      }).subscribe({
        next: ({ boutiqueRes: maBoutiqueData, unites, sousCategories }) => {
          const maBoutique = maBoutiqueData.boutique;
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
    if (this.filterLocaleStatus) {
      list = list.filter(p => {
        const s = this.getProduitLocaleStatus(p);
        if (this.filterLocaleStatus === 'actif') return s === 'actif';
        if (this.filterLocaleStatus === 'aucun') return s === 'aucun' || s === 'expire';
        return true;
      });
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

  /** Returns 'actif' | 'expire' | 'aucun' for a product based on its boutique's localesLouees */
  getProduitLocaleStatus(p: ProduitItem): 'actif' | 'expire' | 'aucun' {
    const boutiqueId = p.boutiqueId?._id;
    if (!boutiqueId) return 'aucun';
    const boutique = this.allBoutiques.find(b => b._id === boutiqueId);
    if (!boutique || !boutique.localesLouees || boutique.localesLouees.length === 0) return 'aucun';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hasActive = boutique.localesLouees.some(r => r.dateFin && new Date(r.dateFin) >= today);
    return hasActive ? 'actif' : 'expire';
  }

  getProduitLocaleStatusLabel(p: ProduitItem): string {
    const s = this.getProduitLocaleStatus(p);
    if (s === 'actif') return 'En vente';
    if (s === 'expire') return 'Local expiré';
    return 'Hors boutique';
  }

  getProduitLocaleStatusClass(p: ProduitItem): string {
    const s = this.getProduitLocaleStatus(p);
    if (s === 'actif') return 'locale-status-actif';
    if (s === 'expire') return 'locale-status-expire';
    return 'locale-status-aucun';
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

  // ── Product Price Modal ───────────────────────────────────────
  private emptyProductPriceModal() {
    return {
      open: false, produitId: '', produitNom: '', prixActuel: 0,
      nouveauPrix: null as number | null, loading: false, error: '',
      historique: [] as PrixProduitEntry[], loadingHistorique: false
    };
  }

  openProductPriceModal(produit: ProduitItem): void {
    this.productPriceModal = {
      ...this.emptyProductPriceModal(),
      open: true, produitId: produit._id, produitNom: produit.nom,
      prixActuel: produit.prix_actuel, loadingHistorique: true
    };
    this.prixService.getPrixHistorique(produit._id).subscribe({
      next: (data) => {
        this.productPriceModal.historique = data;
        this.productPriceModal.loadingHistorique = false;
      },
      error: () => { this.productPriceModal.loadingHistorique = false; }
    });
  }

  closeProductPriceModal(): void {
    if (this.productPriceModal.loading) return;
    this.productPriceModal.open = false;
  }

  submitProductPriceChange(): void {
    this.productPriceModal.error = '';
    const { nouveauPrix, produitId } = this.productPriceModal;
    if (nouveauPrix === null || nouveauPrix === undefined) {
      this.productPriceModal.error = 'Veuillez saisir un nouveau prix';
      return;
    }
    if (nouveauPrix < 0) {
      this.productPriceModal.error = 'Le prix ne peut pas être négatif';
      return;
    }
    this.productPriceModal.loading = true;
    this.prixService.changePrixProduit(produitId, nouveauPrix).subscribe({
      next: () => {
        this.productPriceModal.open = false;
        this.productPriceModal.loading = false;
        this.globalSuccess = 'Prix du produit mis à jour';
        this.refreshProduits();
        this.clearSuccess();
      },
      error: (err) => {
        this.productPriceModal.error = err?.error?.message || 'Erreur lors du changement de prix';
        this.productPriceModal.loading = false;
      }
    });
  }

  // ── Variant Option Price Modal ────────────────────────────────
  private emptyVariantOptPriceModal() {
    return {
      open: false, variantId: '', variantNom: '', optionId: '', optionValeur: '',
      supplementActuel: 0, nouveauSupplement: null as number | null,
      loading: false, error: '',
      historique: [] as PrixVariantOptionEntry[], loadingHistorique: false
    };
  }

  openVariantOptPriceModal(variant: VariantItem, opt: VariantOption): void {
    this.variantOptPriceModal = {
      ...this.emptyVariantOptPriceModal(),
      open: true, variantId: variant._id, variantNom: variant.nom,
      optionId: (opt as any)._id, optionValeur: opt.valeur,
      supplementActuel: opt.prix_supplement, loadingHistorique: true
    };
    this.prixService.getPrixVariantHistorique(variant._id).subscribe({
      next: (data) => {
        this.variantOptPriceModal.historique = data.filter(
          h => h.optionId === (opt as any)._id
        );
        this.variantOptPriceModal.loadingHistorique = false;
      },
      error: () => { this.variantOptPriceModal.loadingHistorique = false; }
    });
  }

  closeVariantOptPriceModal(): void {
    if (this.variantOptPriceModal.loading) return;
    this.variantOptPriceModal.open = false;
  }

  submitVariantOptPriceChange(): void {
    this.variantOptPriceModal.error = '';
    const { nouveauSupplement, variantId, optionId } = this.variantOptPriceModal;
    if (nouveauSupplement === null || nouveauSupplement === undefined) {
      this.variantOptPriceModal.error = 'Veuillez saisir un ajustement de prix';
      return;
    }
    this.variantOptPriceModal.loading = true;
    this.prixService.changePrixVariantOption(variantId, optionId, nouveauSupplement).subscribe({
      next: () => {
        const produitId = this.variantsPanelModal.produit?._id;
        this.variantOptPriceModal.open = false;
        this.variantOptPriceModal.loading = false;
        this.globalSuccess = `Prix de l'option "${this.variantOptPriceModal.optionValeur}" mis à jour`;
        if (produitId) this.loadVariants(produitId);
        this.clearSuccess();
      },
      error: (err) => {
        this.variantOptPriceModal.error = err?.error?.message || 'Erreur lors du changement de prix';
        this.variantOptPriceModal.loading = false;
      }
    });
  }

  // ── Affiche helpers (responsable) ─────────────────────────────
  loadDemandesAffiche(): void {
    this.afficheService.getDemandesByBoutique().subscribe({
      next: (data) => { this.demandesAffiche = data; },
      error: () => {}
    });
  }

  loadAfficheConfig(): void {
    this.afficheService.getConfig().subscribe({
      next: (config) => { this.afficheConfig = config; },
      error: () => {}
    });
  }

  getDemandeForProduit(produitId: string): DemandeAffiche | undefined {
    return this.demandesAffiche.find(d => {
      const id = typeof d.produitId === 'object' ? d.produitId._id : d.produitId;
      return id === produitId;
    });
  }

  canRedemander(d: DemandeAffiche): boolean {
    if (d.statut !== 'refuse') return false;
    if (!d.dateRefus) return true;
    const delai = this.afficheConfig?.delaiResoumissionAffiche ?? 7;
    const dateDisponible = new Date(d.dateRefus);
    dateDisponible.setDate(dateDisponible.getDate() + delai);
    return new Date() >= dateDisponible;
  }

  joursRestants(d: DemandeAffiche): number {
    if (!d.dateRefus) return 0;
    const delai = this.afficheConfig?.delaiResoumissionAffiche ?? 7;
    const dateDisponible = new Date(d.dateRefus);
    dateDisponible.setDate(dateDisponible.getDate() + delai);
    return Math.max(1, Math.ceil((dateDisponible.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  demanderAffiche(produitId: string): void {
    this.afficheActionLoading[produitId] = true;
    this.afficheService.demanderAffiche(produitId).subscribe({
      next: (d) => {
        this.demandesAffiche = [
          ...this.demandesAffiche.filter(x => {
            const id = typeof x.produitId === 'object' ? x.produitId._id : x.produitId;
            return id !== produitId;
          }),
          d
        ];
        this.afficheActionLoading[produitId] = false;
        this.globalSuccess = 'Demande de mise à l\'affiche envoyée avec succès.';
        this.clearSuccess();
      },
      error: (err) => {
        this.afficheActionLoading[produitId] = false;
        this.error = err?.error?.message || 'Erreur lors de la demande.';
        setTimeout(() => { this.error = ''; }, 4000);
      }
    });
  }

  retirerAfficheResponsable(demandeId: string, produitId: string): void {
    this.retirerLoading[produitId] = true;
    this.afficheService.retirerAfficheResponsable(demandeId).subscribe({
      next: () => {
        this.demandesAffiche = this.demandesAffiche.filter(d => d._id !== demandeId);
        this.retirerLoading[produitId] = false;
        this.globalSuccess = 'Produit retiré de l\'affiche.';
        this.clearSuccess();
      },
      error: (err) => {
        this.retirerLoading[produitId] = false;
        this.error = err?.error?.message || 'Erreur lors du retrait.';
        setTimeout(() => { this.error = ''; }, 4000);
      }
    });
  }

  // ── Promotions ────────────────────────────────────────────────
  loadPromotions(): void {
    const boutiqueId = this.maBoutique?._id;
    this.promotionService.getPromotionsActives(undefined, boutiqueId).subscribe({
      next: (promos) => {
        const mapProduit: Record<string, Promotion> = {};
        const mapOption: Record<string, Promotion> = {};
        for (const p of promos) {
          if (p.type === 'produit' && p.produitId) {
            mapProduit[p.produitId] = p;
          } else if (p.type === 'variant_option' && p.variantId && p.optionId) {
            mapOption[`${p.variantId}_${p.optionId}`] = p;
          }
        }
        this.promoMapProduit = mapProduit;
        this.promoMapOption = mapOption;
      },
      error: () => {}
    });
  }

  getPromoForProduit(produitId: string): Promotion | undefined {
    return this.promoMapProduit[produitId];
  }

  getPromoForOption(variantId: string, optionId: string): Promotion | undefined {
    return this.promoMapOption[`${variantId}_${optionId}`];
  }

  calculerPrixReduit(): number | null {
    if (this.promoModal.pourcentage === null || this.promoModal.pourcentage === undefined) return null;
    const base = this.promoModal.type === 'produit' ? this.promoModal.prixActuel : this.promoModal.prixSupplementActuel;
    return Math.round(base * (1 - this.promoModal.pourcentage / 100));
  }

  todayString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  openPromoModal(produit: ProduitItem): void {
    this.promoModal = {
      open: true, type: 'produit',
      produitId: produit._id, produitNom: produit.nom,
      prixActuel: produit.prix_actuel,
      variantId: '', variantNom: '', optionId: '', optionValeur: '',
      prixSupplementActuel: 0,
      pourcentage: null,
      dateDebut: this.todayString(), dateFin: '',
      loading: false, error: ''
    };
  }

  openVariantOptPromoModal(produit: ProduitItem, variant: VariantItem, opt: VariantOption): void {
    this.promoModal = {
      open: true, type: 'variant_option',
      produitId: produit._id, produitNom: produit.nom,
      prixActuel: produit.prix_actuel,
      variantId: variant._id, variantNom: variant.nom,
      optionId: (opt as any)._id, optionValeur: opt.valeur,
      prixSupplementActuel: opt.prix_supplement,
      pourcentage: null,
      dateDebut: this.todayString(), dateFin: '',
      loading: false, error: ''
    };
  }

  closePromoModal(): void {
    if (this.promoModal.loading) return;
    this.promoModal.open = false;
  }

  submitPromo(): void {
    this.promoModal.error = '';
    const { pourcentage, dateDebut, dateFin, produitId, type, variantId, optionId, optionValeur } = this.promoModal;
    if (pourcentage === null || pourcentage === undefined) { this.promoModal.error = 'Le pourcentage est obligatoire'; return; }
    if (pourcentage < 1 || pourcentage > 99) { this.promoModal.error = 'Le pourcentage doit être entre 1 et 99'; return; }
    if (!dateDebut) { this.promoModal.error = 'La date de début est obligatoire'; return; }
    if (!dateFin) { this.promoModal.error = 'La date de fin est obligatoire'; return; }
    if (dateFin <= dateDebut) { this.promoModal.error = 'La date de fin doit être après la date de début'; return; }

    this.promoModal.loading = true;
    const payload: any = { type, produitId, pourcentage, dateDebut, dateFin };
    if (type === 'variant_option') {
      payload.variantId = variantId;
      payload.optionId = optionId;
      payload.optionValeur = optionValeur;
    }
    this.promotionService.creerPromotion(payload).subscribe({
      next: () => {
        this.promoModal.open = false;
        this.promoModal.loading = false;
        this.globalSuccess = 'Promotion créée avec succès';
        this.loadPromotions();
        this.refreshProduits();
        if (type === 'variant_option' && this.variantsPanelModal.produit) {
          this.loadVariants(this.variantsPanelModal.produit._id);
        }
        this.clearSuccess();
      },
      error: (err) => {
        this.promoModal.error = err?.error?.message || 'Erreur lors de la création de la promotion';
        this.promoModal.loading = false;
      }
    });
  }

  terminerPromo(promoId: string, key: string): void {
    this.promoTerminerLoading[key] = true;
    this.promotionService.terminerPromotion(promoId).subscribe({
      next: () => {
        this.promoTerminerLoading[key] = false;
        this.globalSuccess = 'Promotion terminée';
        this.loadPromotions();
        this.refreshProduits();
        if (this.variantsPanelModal.produit) {
          this.loadVariants(this.variantsPanelModal.produit._id);
        }
        this.clearSuccess();
      },
      error: (err) => {
        this.promoTerminerLoading[key] = false;
        this.error = err?.error?.message || 'Erreur lors de la terminaison de la promotion';
        setTimeout(() => { this.error = ''; }, 4000);
      }
    });
  }

  formatDateShort(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
}
