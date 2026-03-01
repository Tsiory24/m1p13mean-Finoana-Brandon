import { Injectable, signal, computed } from '@angular/core';

export interface CartItem {
  produitId: string;
  boutiqueId: string;
  boutiqueNom: string;
  boutiqueSlug: string;
  nom: string;
  image: string;
  prix_unitaire: number;
  prix_supplement: number;
  prix_total_ligne: number;
  quantite: number;
  variantId?: string;
  variantNom?: string;
  optionId?: string;
  optionValeur?: string;
  stock: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly STORAGE_KEY = 'mall_cart';
  private itemsSignal = signal<CartItem[]>(this.loadFromStorage());

  readonly items = computed(() => this.itemsSignal());
  readonly totalQuantity = computed(() => this.itemsSignal().reduce((s, i) => s + i.quantite, 0));
  readonly totalPrice = computed(() => this.itemsSignal().reduce((s, i) => s + i.prix_total_ligne, 0));
  readonly boutiquesInCart = computed(() => {
    const map = new Map<string, { nom: string; slug: string }>();
    for (const item of this.itemsSignal()) {
      map.set(item.boutiqueId, { nom: item.boutiqueNom, slug: item.boutiqueSlug });
    }
    return map;
  });

  addItem(item: CartItem): void {
    const items = [...this.itemsSignal()];
    const idx = items.findIndex(
      i => i.produitId === item.produitId && i.optionId === item.optionId
    );
    if (idx >= 0) {
      const existing = items[idx];
      const newQty = Math.min(existing.quantite + item.quantite, item.stock);
      items[idx] = {
        ...existing,
        quantite: newQty,
        prix_total_ligne: (existing.prix_unitaire + existing.prix_supplement) * newQty
      };
    } else {
      items.push(item);
    }
    this.itemsSignal.set(items);
    this.save();
  }

  removeItem(produitId: string, optionId?: string): void {
    const items = this.itemsSignal().filter(
      i => !(i.produitId === produitId && i.optionId === optionId)
    );
    this.itemsSignal.set(items);
    this.save();
  }

  updateQuantity(produitId: string, optionId: string | undefined, qty: number): void {
    if (qty < 1) {
      this.removeItem(produitId, optionId);
      return;
    }
    const items = this.itemsSignal().map(i => {
      if (i.produitId === produitId && i.optionId === optionId) {
        const safeQty = Math.min(qty, i.stock);
        return { ...i, quantite: safeQty, prix_total_ligne: (i.prix_unitaire + i.prix_supplement) * safeQty };
      }
      return i;
    });
    this.itemsSignal.set(items);
    this.save();
  }

  clearCart(): void {
    this.itemsSignal.set([]);
    this.save();
  }

  getItemsByBoutique(boutiqueId: string): CartItem[] {
    return this.itemsSignal().filter(i => i.boutiqueId === boutiqueId);
  }

  private loadFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.itemsSignal()));
    } catch {
      // localStorage peut être désactivé (mode privé strict)
    }
  }
}
