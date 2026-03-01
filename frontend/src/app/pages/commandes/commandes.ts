import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommandeService, Commande, CommandePagination } from '../../shared/service/commande.service';
import { BoutiqueService, BoutiqueItem } from '../../shared/service/boutique.service';
import { CategorieService, CategorieItem } from '../../shared/service/categorie.service';
import { AuthService } from '../../shared/service/auth.service';
import { NotificationService } from '../../shared/service/notification.service';
import { environment } from '../../../environnements/environnement';

@Component({
  selector: 'app-commandes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './commandes.html',
  styleUrl: './commandes.scss'
})
export class CommandesComponent implements OnInit {
  commandes: Commande[] = [];
  pagination: CommandePagination | null = null;
  loading = true;
  error = false;
  page = 1;
  readonly limit = 5;
  filterStatut = '';
  expandedIds = new Set<string>();
  statutLoading = new Set<string>();
  paiementLoading = new Set<string>();
  paiementEdit: Record<string, number | null> = {};

  filterSearch = '';
  sortBy = 'createdAt';
  sortDir: 'asc' | 'desc' = 'desc';
  filterBoutiqueId = '';
  filterCategorieId = '';

  isAdmin = false;
  isResponsable = false;
  boutiqueId: string | null = null;
  allBoutiques: BoutiqueItem[] = [];
  categories: CategorieItem[] = [];
  readonly apiBase = environment.apiBaseUrl;

  constructor(
    private commandeService: CommandeService,
    private boutiqueService: BoutiqueService,
    private categorieService: CategorieService,
    private authService: AuthService,
    private notif: NotificationService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.isResponsable = this.authService.isResponsableBoutique();

    if (this.isAdmin) {
      this.boutiqueService.getAll().subscribe(b => this.allBoutiques = b);
      this.categorieService.getAllCategories().subscribe(c => this.categories = c);
      this.loadCommandes();
    } else if (this.isResponsable) {
      this.boutiqueService.getMaBoutique().subscribe({
        next: ({ boutique }) => {
          this.boutiqueId = boutique?._id ?? null;
          this.loadCommandes();
        },
        error: () => {
          this.error = true;
          this.loading = false;
        }
      });
    } else {
      this.loadCommandes();
    }
  }

  loadCommandes(): void {
    this.loading = true;
    this.error = false;
    this.commandeService.getAllCommandes({
      page: this.page,
      limit: this.limit,
      statut: this.filterStatut || undefined,
      boutiqueId: this.filterBoutiqueId || this.boutiqueId || undefined,
      categorieId: this.filterCategorieId || undefined,
      search: this.filterSearch.trim() || undefined,
      sortBy: this.sortBy,
      sortDir: this.sortDir
    }).subscribe({
      next: res => {
        this.commandes = res.commandes;
        this.pagination = res.pagination;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadCommandes();
  }

  onCategorieFilterChange(): void {
    this.filterBoutiqueId = '';
    this.page = 1;
    this.loadCommandes();
  }

  toggleSortDir(): void {
    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    this.onFilterChange();
  }

  goToPage(p: number): void {
    this.page = p;
    this.loadCommandes();
  }

  toggleExpand(id: string): void {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
    }
  }

  isExpanded(id: string): boolean {
    return this.expandedIds.has(id);
  }

  nextStatutLabel(c: Commande): string | null {
    if (c.statut_commande === 'en_attente') return 'Confirmer';
    if (c.statut_commande === 'confirmee') return 'Marquer livré';
    return null;
  }

  nextStatutValue(c: Commande): string | null {
    if (c.statut_commande === 'en_attente') return 'confirmee';
    if (c.statut_commande === 'confirmee') return 'livree';
    return null;
  }

  canCancel(c: Commande): boolean {
    return c.statut_commande === 'en_attente' || c.statut_commande === 'confirmee';
  }

  canPay(c: Commande): boolean {
    return c.reste_a_payer > 0 && c.statut_commande !== 'annulee';
  }

  updateStatut(c: Commande, newStatut: string): void {
    this.statutLoading.add(c._id);
    this.commandeService.updateStatut(c._id, newStatut).subscribe({
      next: updated => {
        const idx = this.commandes.findIndex(x => x._id === c._id);
        if (idx >= 0) this.commandes[idx] = updated;
        this.statutLoading.delete(c._id);
        this.notif.success(`Statut mis à jour : ${this.statutLabel(newStatut)}`);
      },
      error: (err: any) => {
        this.statutLoading.delete(c._id);
        this.notif.error(err?.error?.message ?? 'Erreur lors de la mise à jour du statut.');
      }
    });
  }

  openPaiement(c: Commande): void {
    this.paiementEdit[c._id] = null;
  }

  isPaiementOpen(c: Commande): boolean {
    return Object.prototype.hasOwnProperty.call(this.paiementEdit, c._id);
  }

  cancelPaiement(c: Commande): void {
    delete this.paiementEdit[c._id];
  }

  updatePaiement(c: Commande): void {
    const montant = this.paiementEdit[c._id];
    if (montant === null || montant === undefined || montant <= 0) {
      this.notif.error('Montant invalide.');
      return;
    }
    this.paiementLoading.add(c._id);
    this.commandeService.updatePaiement(c._id, montant).subscribe({
      next: updated => {
        const idx = this.commandes.findIndex(x => x._id === c._id);
        if (idx >= 0) this.commandes[idx] = updated;
        this.paiementLoading.delete(c._id);
        delete this.paiementEdit[c._id];
        this.notif.success('Paiement enregistré.');
      },
      error: (err: any) => {
        this.paiementLoading.delete(c._id);
        this.notif.error(err?.error?.message ?? 'Erreur lors de l\'enregistrement du paiement.');
      }
    });
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-MG', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' Ar';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-MG', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  statutLabel(s: string): string {
    const labels: Record<string, string> = {
      en_attente: 'En attente',
      confirmee: 'Confirmée',
      livree: 'Livrée',
      annulee: 'Annulée'
    };
    return labels[s] ?? s;
  }

  statutClass(s: string): string {
    const classes: Record<string, string> = {
      en_attente: 'statut-attente',
      confirmee: 'statut-confirmee',
      livree: 'statut-livree',
      annulee: 'statut-annulee'
    };
    return classes[s] ?? '';
  }

  boutiqueNom(c: Commande): string {
    if (typeof c.boutiqueId === 'object') return c.boutiqueId.nom;
    return '';
  }

  acheteurNom(c: Commande): string {
    if (typeof c.acheteurId === 'object') return c.acheteurId.nom;
    return '';
  }

  acheteurContact(c: Commande): string {
    if (typeof c.acheteurId === 'object') return c.acheteurId.contact ?? c.acheteurId.email ?? '';
    return '';
  }

  produitNom(ligne: any): string {
    if (typeof ligne.produitId === 'object') return ligne.produitId.nom;
    return ligne.produitId ?? '';
  }

  produitImage(ligne: any): string | null {
    if (typeof ligne.produitId === 'object' && ligne.produitId.images?.length) {
      const img = ligne.produitId.images[0];
      if (img.startsWith('http')) return img;
      const base = this.apiBase.replace(/\/$/, '');
      return base + (img.startsWith('/') ? img : '/' + img);
    }
    return null;
  }

  get filteredBoutiques(): BoutiqueItem[] {
    if (!this.filterCategorieId) return this.allBoutiques;
    return this.allBoutiques.filter(b => {
      if (!b.categorieId) return false;
      const catId = typeof b.categorieId === 'object' ? b.categorieId._id : b.categorieId;
      return catId === this.filterCategorieId;
    });
  }

  get pages(): number[] {
    if (!this.pagination) return [];
    const total = this.pagination.pages;
    const current = this.page;
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) range.push(i);
    return range;
  }

  get firstItemIndex(): number {
    if (!this.pagination || this.pagination.total === 0) return 0;
    return (this.page - 1) * this.limit + 1;
  }

  get lastItemIndex(): number {
    if (!this.pagination) return 0;
    return Math.min(this.page * this.limit, this.pagination.total);
  }
}
