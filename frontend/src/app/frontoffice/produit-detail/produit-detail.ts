import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ProduitService, ProduitItem } from '../../shared/service/produit.service';
import { VariantService, VariantItem, VariantOption } from '../../shared/service/variant.service';
import { environment } from '../../../environnements/environnement';

@Component({
  selector: 'app-produit-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './produit-detail.html',
  styleUrl: './produit-detail.scss'
})
export class ProduitDetailComponent implements OnInit {
  boutiqueId = '';
  produitId = '';

  produit: ProduitItem | null = null;
  variants: VariantItem[] = [];

  loadingProduit = true;
  loadingVariants = true;
  errorProduit = false;

  // ── Image gallery ────────────────────────────────────────────
  allImages: string[] = [];
  currentImageIndex = 0;

  // ── Variant selection: variantId → option _id ────────────────
  selectedOptions: Record<string, string> = {};

  readonly apiBase = environment.apiBaseUrl;

  constructor(
    private route: ActivatedRoute,
    private produitService: ProduitService,
    private variantService: VariantService
  ) {}

  ngOnInit(): void {
    this.boutiqueId = this.route.snapshot.paramMap.get('boutiqueId') ?? '';
    this.produitId = this.route.snapshot.paramMap.get('id') ?? '';

    this.produitService.getById(this.produitId).subscribe({
      next: p => {
        this.produit = p;
        this.loadingProduit = false;
        this.buildImageList();
      },
      error: () => { this.loadingProduit = false; this.errorProduit = true; }
    });

    this.variantService.getByProduit(this.produitId).subscribe({
      next: v => {
        this.variants = v.filter(x => !x.deletedAt);
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
    return url.startsWith('http') ? url : `${this.apiBase}${url}`;
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

  // ── Price computation ────────────────────────────────────────
  get totalSupplement(): number {
    let total = 0;
    for (const v of this.variants) {
      const opt = this.getSelectedOption(v);
      if (opt) total += opt.prix_supplement;
    }
    return total;
  }

  get totalPrice(): number {
    return (this.produit?.prix_actuel ?? 0) + this.totalSupplement;
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
}
