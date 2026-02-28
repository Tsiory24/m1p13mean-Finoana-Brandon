import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environnements/environnement';

export interface PrixProduitEntry {
  _id: string;
  produitId: string;
  prix_par_unite: number;
  createdAt: string;
}

export interface PrixVariantOptionEntry {
  _id: string;
  variantId: string;
  optionId: string;
  optionValeur: string;
  prix_supplement: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class PrixService {
  private readonly base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  /** GET /api/produits/:produitId/prix — historique des prix d'un produit */
  getPrixHistorique(produitId: string): Observable<PrixProduitEntry[]> {
    return this.http
      .get<{ success: boolean; data: PrixProduitEntry[] }>(`${this.base}api/produits/${produitId}/prix`)
      .pipe(map(r => r.data));
  }

  /** GET /api/variants/:variantId/prix — historique des prix des options d'un variant */
  getPrixVariantHistorique(variantId: string): Observable<PrixVariantOptionEntry[]> {
    return this.http
      .get<{ success: boolean; data: PrixVariantOptionEntry[] }>(`${this.base}api/variants/${variantId}/prix`)
      .pipe(map(r => r.data));
  }

  /** PUT /api/produits/:id — change le prix actuel (crée automatiquement une entrée historique) */
  changePrixProduit(produitId: string, prix_actuel: number): Observable<void> {
    return this.http
      .put<{ success: boolean }>(`${this.base}api/produits/${produitId}`, { prix_actuel })
      .pipe(map(() => undefined));
  }

  /** PATCH /api/variants/:variantId/options/:optionId/prix — change le supplément d'une option */
  changePrixVariantOption(variantId: string, optionId: string, prix_supplement: number): Observable<void> {
    return this.http
      .patch<{ success: boolean }>(
        `${this.base}api/variants/${variantId}/options/${optionId}/prix`,
        { prix_supplement }
      )
      .pipe(map(() => undefined));
  }
}
