import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CommandeService, Commande, CommandePagination } from '../../shared/service/commande.service';
import { NotificationService } from '../../shared/service/notification.service';
import { environment } from '../../../environnements/environnement';

@Component({
  selector: 'app-mes-commandes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mes-commandes.html',
  styleUrl: './mes-commandes.scss'
})
export class MesCommandesComponent implements OnInit {
  commandes: Commande[] = [];
  pagination: CommandePagination | null = null;
  loading = true;
  error = false;
  page = 1;
  limit = 10;
  expandedIds = new Set<string>();
  annulationInProgress = new Set<string>();
  readonly apiBase = environment.apiBaseUrl;

  constructor(
    private commandeService: CommandeService,
    private notif: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadCommandes();
  }

  loadCommandes(): void {
    this.loading = true;
    this.error = false;
    this.commandeService.getMesCommandes(this.page, this.limit).subscribe({
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

  boutiqueNom(commande: Commande): string {
    if (typeof commande.boutiqueId === 'object') return commande.boutiqueId.nom;
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

  get pages(): number[] {
    if (!this.pagination) return [];
    return Array.from({ length: this.pagination.pages }, (_, i) => i + 1);
  }

  isCancellable(commande: Commande): boolean {
    return commande.statut_commande === 'en_attente';
  }

  annulerCommande(commande: Commande): void {
    if (!this.isCancellable(commande)) return;
    this.annulationInProgress.add(commande._id);
    this.commandeService.annulerCommande(commande._id).subscribe({
      next: updated => {
        const idx = this.commandes.findIndex(c => c._id === commande._id);
        if (idx >= 0) this.commandes[idx] = updated;
        this.annulationInProgress.delete(commande._id);
        this.notif.success('Commande annulée avec succès.');
      },
      error: (err: any) => {
        this.annulationInProgress.delete(commande._id);
        this.notif.error(err?.error?.message ?? 'Erreur lors de l\'annulation.');
      }
    });
  }
}
