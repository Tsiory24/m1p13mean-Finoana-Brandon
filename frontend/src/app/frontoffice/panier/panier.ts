import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CartService, CartItem } from '../../shared/service/cart.service';
import { CommandeService } from '../../shared/service/commande.service';
import { AuthService } from '../../shared/service/auth.service';
import { NotificationService } from '../../shared/service/notification.service';

@Component({
  selector: 'app-panier',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './panier.html',
  styleUrl: './panier.scss'
})
export class PanierComponent {
  checkoutLoading = false;

  constructor(
    public cartService: CartService,
    private commandeService: CommandeService,
    public authService: AuthService,
    private router: Router,
    private notif: NotificationService
  ) {}

  get isEmpty(): boolean {
    return this.cartService.items().length === 0;
  }

  boutiqueIds(): string[] {
    return [...this.cartService.boutiquesInCart().keys()];
  }

  getBoutiqueName(boutiqueId: string): string {
    return this.cartService.boutiquesInCart().get(boutiqueId)?.nom ?? '';
  }

  getBoutiqueSlug(boutiqueId: string): string {
    return this.cartService.boutiquesInCart().get(boutiqueId)?.slug ?? '';
  }

  getItemsPourBoutique(boutiqueId: string): CartItem[] {
    return this.cartService.getItemsByBoutique(boutiqueId);
  }

  sousTotalBoutique(boutiqueId: string): number {
    return this.getItemsPourBoutique(boutiqueId).reduce((s, i) => s + i.prix_total_ligne, 0);
  }

  updateQty(item: CartItem, delta: number): void {
    const newQty = item.quantite + delta;
    this.cartService.updateQuantity(item.produitId, item.optionId, newQty);
  }

  removeItem(item: CartItem): void {
    this.cartService.removeItem(item.produitId, item.optionId);
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-MG', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' Ar';
  }

  checkout(): void {
    if (!this.authService.isAcheteurLoggedIn) {
      this.router.navigate(['/connexion']);
      return;
    }
    this.checkoutLoading = true;
    const boutiquesIds = this.boutiqueIds();
    const requests = boutiquesIds.map(bid => {
      const lignes = this.getItemsPourBoutique(bid).map(i => ({
        produitId: i.produitId,
        quantite: i.quantite,
        ...(i.variantId ? { variantId: i.variantId } : {}),
        ...(i.optionId ? { optionId: i.optionId } : {})
      }));
      return this.commandeService.createCommande({ boutiqueId: bid, lignes });
    });
    forkJoin(requests).subscribe({
      next: () => {
        this.cartService.clearCart();
        this.notif.success('Commandes créées avec succès !');
        this.router.navigate(['/mes-commandes']);
      },
      error: (err: any) => {
        this.checkoutLoading = false;
        this.notif.error(err?.error?.message || 'Erreur lors de la commande');
      }
    });
  }
}
