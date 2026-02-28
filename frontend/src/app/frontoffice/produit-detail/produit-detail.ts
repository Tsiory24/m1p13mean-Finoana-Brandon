import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ProduitService, ProduitItem } from '../../shared/service/produit.service';
import { VariantService, VariantItem, VariantOption } from '../../shared/service/variant.service';
import { PromotionService, Promotion } from '../../shared/service/promotion.service';
import { SeoService } from '../../shared/service/seo.service';
import { CartService, CartItem } from '../../shared/service/cart.service';
import { NotificationService } from '../../shared/service/notification.service';
import { environment } from '../../../environnements/environnement';

@Component({
  selector: 'app-produit-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './produit-detail.html',
  styleUrl: './produit-detail.scss'
})
export class ProduitDetailComponent implements OnInit {
  boutiqueSlug = '';
  produitSlug = '';
  produitId = '';

  produit: ProduitItem | null = null;
  variants: VariantItem[] = [];
  promotions: Promotion[] = [];

  loadingProduit = true;
  loadingVariants = true;
  errorProduit = false;

  // ── Image gallery ────────────────────────────────────────────
  allImages: string[] = [];
  currentImageIndex = 0;

  // ── Variant selection: variantId → option _id ────────────────
  selectedOptions: Record<string, string> = {};

  // ── Cart ─────────────────────────────────────────────────────
  quantite = 1;

  readonly apiBase = environment.apiBaseUrl;

  constructor(
    private route: ActivatedRoute,
    private produitService: ProduitService,
    private variantService: VariantService,
    private promotionService: PromotionService,
    private seo: SeoService,
    private cartService: CartService,
    private notif: NotificationService
  ) {}

  ngOnInit(): void {
    this.boutiqueSlug = this.route.snapshot.paramMap.get('boutiqueSlug') ?? '';
    this.produitSlug = this.route.snapshot.paramMap.get('slug') ?? '';

    this.produitService.getBySlug(this.produitSlug).subscribe({
      next: p => {
        this.produit = p;
        this.produitId = p._id;
        this.loadingProduit = false;
        this.buildImageList();
        const firstImage = p.images?.[0]
          ? this.resolveUrl(p.images[0])
          : undefined;
        const boutiqueNom = (p as any).boutiqueId?.nom ?? '';
        this.seo.setPage({
          title: boutiqueNom ? `${p.nom} — ${boutiqueNom}` : p.nom,
          description: p.description
            ? p.description.slice(0, 160)
            : `Découvrez ${p.nom}${boutiqueNom ? ' chez ' + boutiqueNom : ''} au centre commercial.`,
          image: firstImage
        });

        // FIX: use p._id (not this.produitId which was '' at ngOnInit call time)
        forkJoin({
          variants: this.variantService.getByProduit(p._id),
          promos: this.promotionService.getPromotionsActives(p._id)
        }).subscribe({
          next: ({ variants, promos }) => {
            this.variants = variants.filter(x => !x.deletedAt);
            this.promotions = promos;
            // Pre-select first in-stock option for each variant
            for (const variant of this.variants) {
              const firstAvail = variant.options.find(o => o.stock > 0) ?? variant.options[0];
              if (firstAvail?._id) {
                this.selectedOptions[variant._id] = firstAvail._id;
              }
            }
            this.loadingVariants = false;
            this.buildImageList(); // add variant option images
          },
          error: () => { this.loadingVariants = false; }
        });
      },
      error: () => { this.loadingProduit = false; this.errorProduit = true; }
    });
  }

  /** All images: product images + variant option images */
  buildImageList(): void {
    const imgs: string[] = [];
    for (const raw of this.produit?.images ?? []) {
      imgs.push(this.resolveUrl(raw));
    }
    for (const v of this.variants) {
      for (const opt of v.options) {
        if (opt.image) imgs.push(this.resolveUrl(opt.image));
      }
    }
    this.allImages = imgs;
    if (this.currentImageIndex >= imgs.length) this.currentImageIndex = 0;
  }

  resolveUrl(url: string): string {
    if (url.startsWith('http')) return url;
    const base = this.apiBase.replace(/\/$/, '');
    return base + (url.startsWith('/') ? url : '/' + url);
  }

  // ── Gallery navigation ───────────────────────────────────────
  nextImage(): void {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.allImages.length;
  }

  prevImage(): void {
    const len = this.allImages.length;
    this.currentImageIndex = (this.currentImageIndex - 1 + len) % len;
  }

  goToImage(i: number): void { this.currentImageIndex = i; }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (this.allImages.length > 1) {
      if (e.key === 'ArrowLeft') this.prevImage();
      if (e.key === 'ArrowRight') this.nextImage();
    }
  }

  // ── Variant selection ────────────────────────────────────────
  selectOption(variantId: string, optionId: string, stock: number): void {
    if (stock === 0) return;
    this.selectedOptions = { ...this.selectedOptions, [variantId]: optionId };
  }

  isOptionSelected(variantId: string, optionId: string | undefined): boolean {
    return !!optionId && this.selectedOptions[variantId] === optionId;
  }

  getSelectedOption(variant: VariantItem): VariantOption | undefined {
    return variant.options.find(o => o._id === this.selectedOptions[variant._id]);
  }

  getOptionStock(variant: VariantItem): number {
    return this.getSelectedOption(variant)?.stock ?? 0;
  }

  // ── Promotion helpers ────────────────────────────────────────
  get promotionProduit(): Promotion | null {
    return this.promotions.find(p => p.type === 'produit' && p.actif) ?? null;
  }

  promotionForOption(optionId: string | undefined): Promotion | null {
    if (!optionId) return null;
    return this.promotions.find(p => p.type === 'variant_option' && p.optionId === optionId && p.actif) ?? null;
  }

  // ── Price computation ────────────────────────────────────────
  /** Original supplement before any option-level promo (for product-level promo calculation) */
  private get totalSupplementOriginal(): number {
    let total = 0;
    for (const v of this.variants) {
      const opt = this.getSelectedOption(v);
      if (!opt) continue;
      const promo = this.promotionForOption(opt._id);
      total += promo ? promo.prixOriginal : opt.prix_supplement;
    }
    return total;
  }

  get totalSupplement(): number {
    const promo = this.promotionProduit;
    if (promo && this.totalSupplementOriginal > 0) {
      // Product-level promo also applies to supplement
      return Math.round(this.totalSupplementOriginal * (1 - promo.pourcentage / 100));
    }
    // No product promo: opt.prix_supplement already reduced if option promo
    let total = 0;
    for (const v of this.variants) {
      const opt = this.getSelectedOption(v);
      if (opt) total += opt.prix_supplement;
    }
    return total;
  }

  get totalPrice(): number {
    const promo = this.promotionProduit;
    if (promo) {
      // Rule: calculate variant price (base_original + supplement_original) THEN apply discount
      return Math.round((promo.prixOriginal + this.totalSupplementOriginal) * (1 - promo.pourcentage / 100));
    }
    return (this.produit?.prix_actuel ?? 0) + this.totalSupplement;
  }

  /** Original pre-promo total for crossed-out display */
  get originalTotalDisplay(): number {
    const promo = this.promotionProduit;
    if (!promo) return 0;
    return promo.prixOriginal + this.totalSupplementOriginal;
  }

  // ── Formatting ───────────────────────────────────────────────
  formatPrice(p: number): string {
    return new Intl.NumberFormat('fr-MG', { style: 'decimal', maximumFractionDigits: 0 }).format(p) + ' Ar';
  }

  formatSupplement(s: number): string {
    if (s === 0) return 'Inclus';
    const abs = new Intl.NumberFormat('fr-MG', { style: 'decimal', maximumFractionDigits: 0 }).format(Math.abs(s));
    return (s > 0 ? '+' : '−') + abs + ' Ar';
  }

  // ── Cart helpers ─────────────────────────────────────────────
  get stockDisponible(): number {
    if (this.variants.length === 0) return 999;
    // Return the minimum stock across all selected options
    let minStock = 999;
    for (const v of this.variants) {
      const opt = this.getSelectedOption(v);
      if (opt) minStock = Math.min(minStock, opt.stock);
    }
    return minStock;
  }

  get canAddToCart(): boolean {
    if (!this.produit) return false;
    if (this.quantite < 1) return false;
    if (this.variants.length > 0 && this.stockDisponible === 0) return false;
    return true;
  }

  private buildVariantPayload(): Partial<CartItem> {
    if (this.variants.length === 0) return {};
    // Use the first variant with a selected option for the cart item
    const firstVariant = this.variants[0];
    const opt = this.getSelectedOption(firstVariant);
    if (!firstVariant || !opt) return {};
    return {
      variantId: firstVariant._id,
      variantNom: firstVariant.nom,
      optionId: (opt as any)._id,
      optionValeur: opt.valeur
    };
  }

  addToCart(): void {
    if (!this.produit || !this.canAddToCart) return;
    const safeQty = Math.min(this.quantite, this.stockDisponible);
    // Prefer the selected variant option's image over the product's first image
    const variantImage = this.variants
      .map(v => this.getSelectedOption(v))
      .find(opt => opt?.image)?.image ?? null;
    const cartImage = variantImage
      ? this.resolveUrl(variantImage)
      : (this.allImages[0] ?? '');
    const item: CartItem = {
      produitId: this.produit._id,
      boutiqueId: this.produit.boutiqueId?._id ?? '',
      boutiqueNom: this.produit.boutiqueId?.nom ?? '',
      boutiqueSlug: this.produit.boutiqueId?.slug ?? '',
      nom: this.produit.nom,
      image: cartImage,
      prix_unitaire: this.produit.prix_actuel,
      prix_supplement: this.totalSupplement,
      prix_total_ligne: (this.produit.prix_actuel + this.totalSupplement) * safeQty,
      quantite: safeQty,
      stock: this.stockDisponible,
      ...this.buildVariantPayload()
    };
    this.cartService.addItem(item);
    this.notif.success(`${this.produit.nom} ajouté au panier`);
  }
}
