import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface CategorieItem {
  _id: string;
  nom: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface SousCategorieItem {
  _id: string;
  nom: string;
  categorieId: string | { _id: string; nom: string };
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class CategorieService {
  private readonly catEndpoint = 'api/categories';
  private readonly scEndpoint = 'api/sous-categories';

  constructor(private api: ApiService) {}

  // ── Catégories ──────────────────────────────────────────────
  getAllCategories(): Observable<CategorieItem[]> {
    return this.api
      .getList<{ success: boolean; data: CategorieItem[] }>(this.catEndpoint)
      .pipe(map(res => res.data));
  }

  createCategorie(nom: string): Observable<CategorieItem> {
    return this.api
      .create<{ success: boolean; data: CategorieItem }>(this.catEndpoint, { nom })
      .pipe(map(res => res.data));
  }

  updateCategorie(id: string, nom: string): Observable<CategorieItem> {
    return this.api
      .updates<{ success: boolean; data: CategorieItem }>(`${this.catEndpoint}/${id}`, { nom })
      .pipe(map(res => res.data));
  }

  deleteCategorie(id: string): Observable<void> {
    return this.api.deletes(`${this.catEndpoint}/${id}`);
  }

  // ── Sous-catégories ──────────────────────────────────────────
  getAllSousCategories(categorieId?: string): Observable<SousCategorieItem[]> {
    const url = categorieId
      ? `${this.scEndpoint}?categorieId=${categorieId}`
      : this.scEndpoint;
    return this.api
      .getList<{ success: boolean; data: SousCategorieItem[] }>(url)
      .pipe(map(res => res.data));
  }

  createSousCategorie(nom: string, categorieId: string): Observable<SousCategorieItem> {
    return this.api
      .create<{ success: boolean; data: SousCategorieItem }>(this.scEndpoint, { nom, categorieId })
      .pipe(map(res => res.data));
  }

  updateSousCategorie(id: string, nom: string, categorieId: string): Observable<SousCategorieItem> {
    return this.api
      .updates<{ success: boolean; data: SousCategorieItem }>(`${this.scEndpoint}/${id}`, { nom, categorieId })
      .pipe(map(res => res.data));
  }

  deleteSousCategorie(id: string): Observable<void> {
    return this.api.deletes(`${this.scEndpoint}/${id}`);
  }
}
