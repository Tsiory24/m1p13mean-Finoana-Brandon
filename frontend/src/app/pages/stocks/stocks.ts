import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { AuthService } from '../../shared/service/auth.service';
import { BoutiqueService, BoutiqueItem } from '../../shared/service/boutique.service';
import { ProduitService, ProduitItem } from '../../shared/service/produit.service';
import { VariantService, VariantItem } from '../../shared/service/variant.service';
import { StockService, StockAgg, StockMouvementItem, AddMouvementPayload } from '../../shared/service/stock.service';

type ActiveTab = 'inventaire' | 'historique';
type SortInvCol = 'nom' | 'prix' | 'stock';

interface BatchEntry {
  variantId: string;
  variantNom: string;
  optionId: string;
  optionValeur: string;
  stockActuel: number;
  quantite: number | null;
}

@Component({
  selector: 'app-stocks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stocks.html',
  styleUrl: './stocks.scss'
})
export class StocksComponent implements OnInit, OnDestroy {
  maBoutique: BoutiqueItem | null = null;
  loading = false;
  error = '';
  globalSuccess = '';
  activeTab: ActiveTab = 'inventaire';

  // ── Inventaire ────────────────────────────────────────────────
  allProduits: ProduitItem[] = [];
  stockAgg: StockAgg[] = [];
  searchProduit = '';
  sortInv: SortInvCol = 'nom';
  sortDirInv: 'asc' | 'desc' = 'asc';
  pageInv = 1;
  readonly limitInv = 10;
  expandedProduitId: string | null = null;
  variantsByProduit: Record<string, VariantItem[]> = {};
  loadingVariants: Record<string, boolean> = {};

  // ── Historique ────────────────────────────────────────────────
  mouvements: StockMouvementItem[] = [];
  loadingMouvements = false;
  pageMouv = 1;
  readonly limitMouv = 20;
  totalMouvements = 0;
  totalPagesMouv = 1;
  filterMouvType = '';
  filterMouvProduit = '';

  // ── Batch modal ───────────────────────────────────────────────
  batchModal: {
    open: boolean;
    loading: boolean;
    error: string;
    produitId: string;
    produitNom: string;
    motif: string;
    loadingVariants: boolean;
    hasVariants: boolean;
    directQuantite: number | null;
    entries: BatchEntry[];
  } = this.emptyBatchModal();

  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private boutiqueService: BoutiqueService,
    private produitService: ProduitService,
    private variantService: VariantService,
    private stockService: StockService
  ) {}

  ngOnInit(): void {
    if (this.auth.isResponsableBoutique()) {
      this.loadAll();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Load ──────────────────────────────────────────────────────
  loadAll(): void {
    this.loading = true;
    this.error = '';
    this.boutiqueService.getMaBoutique().pipe(takeUntil(this.destroy$)).subscribe({
      next: (boutiqueData) => {
        const boutique = boutiqueData.boutique;
        this.maBoutique = boutique;
        if (!boutique) { this.loading = false; return; }
        forkJoin({
          produits: this.produitService.getAll({ boutiqueId: boutique._id }),
          stock: this.stockService.getStockByBoutique(boutique._id)
        }).pipe(takeUntil(this.destroy$)).subscribe({
          next: ({ produits, stock }) => {
            this.allProduits = produits;
            this.stockAgg = stock;
            this.loading = false;
          },
          error: (err) => {
            this.error = err?.error?.message || 'Erreur lors du chargement';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors du chargement de la boutique';
        this.loading = false;
      }
    });
  }

  // ── Inventaire : filtrage, tri, pagination ────────────────────
  get sortedFilteredProduits(): ProduitItem[] {
    let list = [...this.allProduits];
    const q = this.searchProduit.trim().toLowerCase();
    if (q) list = list.filter(p => p.nom.toLowerCase().includes(q));
    list.sort((a, b) => {
      let va: string | number;
      let vb: string | number;
      if (this.sortInv === 'nom') {
        va = a.nom.toLowerCase(); vb = b.nom.toLowerCase();
      } else if (this.sortInv === 'prix') {
        va = a.prix_actuel; vb = b.prix_actuel;
      } else {
        va = this.getStock(a._id); vb = this.getStock(b._id);
      }
      if (va < vb) return this.sortDirInv === 'asc' ? -1 : 1;
      if (va > vb) return this.sortDirInv === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }

  get paginatedProduits(): ProduitItem[] {
    const start = (this.pageInv - 1) * this.limitInv;
    return this.sortedFilteredProduits.slice(start, start + this.limitInv);
  }

  get totalInventaire(): number {
    return this.sortedFilteredProduits.length;
  }

  get totalPagesInv(): number {
    return Math.ceil(this.totalInventaire / this.limitInv);
  }

  get pagesInv(): number[] {
    const d = 2, c = this.pageInv, t = this.totalPagesInv;
    const r: number[] = [];
    for (let i = Math.max(1, c - d); i <= Math.min(t, c + d); i++) r.push(i);
    return r;
  }

  get firstInv(): number {
    return this.totalInventaire === 0 ? 0 : (this.pageInv - 1) * this.limitInv + 1;
  }

  get lastInv(): number {
    return Math.min(this.pageInv * this.limitInv, this.totalInventaire);
  }

  setSortInv(col: SortInvCol): void {
    if (this.sortInv === col) {
      this.sortDirInv = this.sortDirInv === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortInv = col;
      this.sortDirInv = col === 'stock' ? 'desc' : 'asc';
    }
    this.pageInv = 1;
  }

  onSearchChange(): void {
    this.pageInv = 1;
  }

  goToPageInv(p: number): void {
    if (p < 1 || p > this.totalPagesInv || p === this.pageInv) return;
    this.pageInv = p;
    this.expandedProduitId = null;
  }

  // ── Stock aggregat helpers ────────────────────────────────────
  getStock(produitId: string): number {
    return this.stockAgg.find(a => a.produitId === produitId)?.quantite_disponible ?? 0;
  }

  getEntrees(produitId: string): number {
    return this.stockAgg.find(a => a.produitId === produitId)?.quantite_entree ?? 0;
  }

  stockBadgeClass(qty: number): string {
    if (qty <= 0) return 'badge-stock-zero';
    if (qty <= 5) return 'badge-stock-low';
    return 'badge-stock-ok';
  }

  getPrixTotal(produit: ProduitItem, supplement: number): number {
    return produit.prix_actuel + supplement;
  }

  // ── Variants panel ────────────────────────────────────────────
  toggleExpand(produitId: string): void {
    if (this.expandedProduitId === produitId) {
      this.expandedProduitId = null;
      return;
    }
    this.expandedProduitId = produitId;
    if (!this.variantsByProduit[produitId]) {
      this.loadVariantsForProduit(produitId);
    }
  }

  loadVariantsForProduit(produitId: string): void {
    this.loadingVariants[produitId] = true;
    this.variantService.getByProduit(produitId).pipe(takeUntil(this.destroy$)).subscribe({
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

  // ── Historique ────────────────────────────────────────────────
  setTab(tab: ActiveTab): void {
    this.activeTab = tab;
    if (tab === 'historique' && this.mouvements.length === 0) {
      this.loadMouvements();
    }
  }

  loadMouvements(): void {
    if (!this.maBoutique) return;
    this.loadingMouvements = true;
    const params: { page: number; limit: number; type?: string; produitId?: string } = {
      page: this.pageMouv,
      limit: this.limitMouv
    };
    if (this.filterMouvType) params.type = this.filterMouvType;
    if (this.filterMouvProduit) params.produitId = this.filterMouvProduit;

    this.stockService.getMouvementsByBoutique(this.maBoutique._id, params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.mouvements = res.mouvements;
          this.totalMouvements = res.pagination.total;
          this.totalPagesMouv = res.pagination.pages;
          this.loadingMouvements = false;
        },
        error: () => { this.loadingMouvements = false; }
      });
  }

  onFilterMouvChange(): void {
    this.pageMouv = 1;
    this.loadMouvements();
  }

  goToPageMouv(p: number): void {
    if (p < 1 || p > this.totalPagesMouv || p === this.pageMouv) return;
    this.pageMouv = p;
    this.loadMouvements();
  }

  get pagesMouv(): number[] {
    const d = 2, c = this.pageMouv, t = this.totalPagesMouv;
    const r: number[] = [];
    for (let i = Math.max(1, c - d); i <= Math.min(t, c + d); i++) r.push(i);
    return r;
  }

  get firstMouv(): number { return this.totalMouvements === 0 ? 0 : (this.pageMouv - 1) * this.limitMouv + 1; }
  get lastMouv(): number { return Math.min(this.pageMouv * this.limitMouv, this.totalMouvements); }

  // ── Batch modal ───────────────────────────────────────────────
  private emptyBatchModal() {
    return {
      open: false, loading: false, error: '',
      produitId: '', produitNom: '', motif: '',
      loadingVariants: false, hasVariants: false,
      directQuantite: null as number | null,
      entries: [] as BatchEntry[]
    };
  }

  openAddModal(produit?: ProduitItem): void {
    this.batchModal = this.emptyBatchModal();
    this.batchModal.open = true;
    if (produit) {
      this.batchModal.produitId = produit._id;
      this.batchModal.produitNom = produit.nom;
      this.loadModalVariants(produit._id);
    }
  }

  onModalProduitChange(): void {
    this.batchModal.entries = [];
    this.batchModal.hasVariants = false;
    this.batchModal.directQuantite = null;
    this.batchModal.error = '';
    const p = this.allProduits.find(x => x._id === this.batchModal.produitId);
    this.batchModal.produitNom = p?.nom ?? '';
    if (!this.batchModal.produitId) return;
    this.loadModalVariants(this.batchModal.produitId);
  }

  private loadModalVariants(produitId: string): void {
    if (this.variantsByProduit[produitId]) {
      this.buildBatchEntries(this.variantsByProduit[produitId]);
      return;
    }
    this.batchModal.loadingVariants = true;
    this.variantService.getByProduit(produitId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.variantsByProduit[produitId] = data;
        this.buildBatchEntries(data);
        this.batchModal.loadingVariants = false;
      },
      error: () => { this.batchModal.loadingVariants = false; }
    });
  }

  private buildBatchEntries(variants: VariantItem[]): void {
    if (variants.length === 0) {
      this.batchModal.hasVariants = false;
      this.batchModal.entries = [];
      return;
    }
    this.batchModal.hasVariants = true;
    this.batchModal.entries = variants.flatMap(v =>
      v.options.map(opt => ({
        variantId: v._id,
        variantNom: v.nom,
        optionId: opt._id ?? '',
        optionValeur: opt.valeur,
        stockActuel: opt.stock,
        quantite: null
      }))
    );
  }

  closeModal(): void {
    if (this.batchModal.loading) return;
    this.batchModal.open = false;
  }

  submitModal(): void {
    this.batchModal.error = '';
    if (!this.batchModal.produitId) { this.batchModal.error = 'Sélectionnez un produit'; return; }
    if (!this.maBoutique) return;

    if (!this.batchModal.hasVariants) {
      if (!this.batchModal.directQuantite || this.batchModal.directQuantite <= 0) {
        this.batchModal.error = 'La quantité doit être supérieure à 0';
        return;
      }
      this.executeBatchSubmit([{
        produitId: this.batchModal.produitId,
        boutiqueId: this.maBoutique._id,
        type: 'entree',
        quantite: this.batchModal.directQuantite!,
        motif: this.batchModal.motif.trim() || undefined
      }]);
    } else {
      const toSubmit = this.batchModal.entries.filter(e => e.quantite && e.quantite > 0);
      if (toSubmit.length === 0) {
        this.batchModal.error = 'Saisissez au moins une quantité pour continuer';
        return;
      }
      const payloads: AddMouvementPayload[] = toSubmit.map(e => ({
        produitId: this.batchModal.produitId,
        boutiqueId: this.maBoutique!._id,
        type: 'entree' as const,
        quantite: e.quantite!,
        motif: this.batchModal.motif.trim() || undefined,
        variantId: e.variantId,
        optionId: e.optionId,
        optionValeur: e.optionValeur
      }));
      this.executeBatchSubmit(payloads);
    }
  }

  private executeBatchSubmit(payloads: AddMouvementPayload[]): void {
    const savedProduitId = this.batchModal.produitId;
    this.batchModal.loading = true;

    forkJoin(payloads.map(p => this.stockService.addMouvement(p)))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const n = payloads.length;
          this.globalSuccess = n === 1
            ? 'Entrée en stock enregistrée'
            : `${n} entrées en stock enregistrées`;
          this.batchModal.open = false;
          this.batchModal.loading = false;
          this.reloadStockAgg();
          delete this.variantsByProduit[savedProduitId];
          if (this.expandedProduitId === savedProduitId) {
            this.loadVariantsForProduit(savedProduitId);
          }
          if (this.activeTab === 'historique') {
            this.loadMouvements();
          }
          this.clearSuccess();
        },
        error: (err) => {
          this.batchModal.error = err?.error?.message || "Erreur lors de l'enregistrement";
          this.batchModal.loading = false;
        }
      });
  }

  private reloadStockAgg(): void {
    if (!this.maBoutique) return;
    this.stockService.getStockByBoutique(this.maBoutique._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (data) => { this.stockAgg = data; } });
  }

  // ── Helpers ───────────────────────────────────────────────────
  private clearSuccess(): void {
    setTimeout(() => { this.globalSuccess = ''; }, 3500);
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatPrice(p: number): string {
    return new Intl.NumberFormat('fr-MG', { style: 'decimal', maximumFractionDigits: 0 }).format(p) + ' Ar';
  }

  formatSupplement(s: number): string {
    if (s === 0) return 'Inclus';
    const abs = new Intl.NumberFormat('fr-MG', { style: 'decimal', maximumFractionDigits: 0 }).format(Math.abs(s));
    return (s > 0 ? '+' : '−') + abs + ' Ar';
  }
}
