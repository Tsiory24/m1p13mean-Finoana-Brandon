import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface CommandeLigne {
  produitId: string | { _id: string; nom: string; images?: string[] };
  quantite: number;
  prix_unitaire: number;
  prix_supplement: number;
  sous_total: number;
  variantId?: string | null;
  optionId?: string | null;
  optionValeur?: string | null;
  variantNom?: string | null;
}

export interface Commande {
  _id: string;
  boutiqueId: string | { _id: string; nom: string; image?: string };
  acheteurId: string | { _id: string; nom: string; email: string; contact?: string };
  lignes: CommandeLigne[];
  statut_commande: 'en_attente' | 'confirmee' | 'livree' | 'annulee';
  montant_total: number;
  montant_paye: number;
  reste_a_payer: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommandePagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

@Injectable({ providedIn: 'root' })
export class CommandeService {
  private readonly endpoint = 'api/commandes';

  constructor(private api: ApiService) {}

  createCommande(payload: { boutiqueId: string; lignes: { produitId: string; quantite: number; variantId?: string; optionId?: string }[] }): Observable<Commande> {
    return this.api
      .create<{ success: boolean; data: Commande }>(this.endpoint, payload)
      .pipe(map(res => res.data));
  }

  getMesCommandes(page = 1, limit = 10): Observable<{ commandes: Commande[]; pagination: CommandePagination }> {
    return this.api
      .getList<{ success: boolean; data: { commandes: Commande[]; pagination: CommandePagination } }>(
        `${this.endpoint}/mes-commandes?page=${page}&limit=${limit}`
      )
      .pipe(map(res => res.data));
  }

  getCommandeById(id: string): Observable<Commande> {
    return this.api
      .getList<{ success: boolean; data: Commande }>(`${this.endpoint}/${id}`)
      .pipe(map(res => res.data));
  }

  getAllCommandes(params: { page?: number; limit?: number; statut?: string; boutiqueId?: string } = {}): Observable<{ commandes: Commande[]; pagination: CommandePagination }> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.statut) q.set('statut_commande', params.statut);
    if (params.boutiqueId) q.set('boutiqueId', params.boutiqueId);
    return this.api
      .getList<{ success: boolean; data: { commandes: Commande[]; pagination: CommandePagination } }>(
        `${this.endpoint}?${q.toString()}`
      )
      .pipe(map(res => res.data));
  }

  updateStatut(id: string, statut_commande: string): Observable<Commande> {
    return this.api
      .updates<{ success: boolean; data: Commande }>(`${this.endpoint}/${id}/statut`, { statut_commande })
      .pipe(map(res => res.data));
  }

  updatePaiement(id: string, montant_paye: number): Observable<Commande> {
    return this.api
      .updates<{ success: boolean; data: Commande }>(`${this.endpoint}/${id}/paiement`, { montant_paye })
      .pipe(map(res => res.data));
  }

  annulerCommande(id: string): Observable<Commande> {
    return this.api
      .updates<{ success: boolean; data: Commande }>(`${this.endpoint}/${id}/annuler`, {})
      .pipe(map(res => res.data));
  }
}
