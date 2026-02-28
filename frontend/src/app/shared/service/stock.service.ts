import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface StockAgg {
  produitId: string;
  nom: string;
  prix_actuel: number;
  quantite_entree: number;
  quantite_sortie: number;
  quantite_disponible: number;
}

export interface StockMouvementItem {
  _id: string;
  produitId: { _id: string; nom: string } | null;
  boutiqueId: string;
  variantId: { _id: string; nom: string } | null;
  optionId: string | null;
  optionValeur: string | null;
  type: 'entree' | 'sortie';
  quantite: number;
  motif: string | null;
  commandeId: { _id: string; statut_commande: string } | null;
  createdAt: string;
}

export interface StockMouvementsResponse {
  mouvements: StockMouvementItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface AddMouvementPayload {
  produitId: string;
  boutiqueId: string;
  type: 'entree' | 'sortie';
  quantite: number;
  motif?: string;
  variantId?: string;
  optionId?: string;
  optionValeur?: string;
}

@Injectable({ providedIn: 'root' })
export class StockService {
  private readonly endpoint = 'api/stocks';

  constructor(private api: ApiService) {}

  getStockByBoutique(boutiqueId: string): Observable<StockAgg[]> {
    return this.api
      .getList<{ success: boolean; data: StockAgg[] }>(`${this.endpoint}/boutique/${boutiqueId}`)
      .pipe(map(res => res.data));
  }

  getMouvementsByBoutique(
    boutiqueId: string,
    params?: { page?: number; limit?: number; type?: string; produitId?: string }
  ): Observable<StockMouvementsResponse> {
    let url = `${this.endpoint}/mouvements/${boutiqueId}`;
    if (params) {
      const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
      if (qs) url += `?${qs}`;
    }
    return this.api
      .getList<{ success: boolean; data: StockMouvementsResponse }>(url)
      .pipe(map(res => res.data));
  }

  addMouvement(payload: AddMouvementPayload): Observable<StockMouvementItem> {
    return this.api
      .create<{ success: boolean; data: StockMouvementItem }>(`${this.endpoint}/mouvement`, payload)
      .pipe(map(res => res.data));
  }
}
