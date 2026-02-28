import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface VariantOption {
  _id?: string;
  valeur: string;
  prix_supplement: number;
  stock: number;
  image?: string | null;
}

export interface VariantItem {
  _id: string;
  produitId: string;
  nom: string;
  options: VariantOption[];
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface VariantCreatePayload {
  produitId: string;
  nom: string;
  options: Omit<VariantOption, '_id'>[];
}

export interface VariantUpdatePayload {
  nom?: string;
  options?: Omit<VariantOption, '_id'>[];
}

@Injectable({ providedIn: 'root' })
export class VariantService {
  private readonly endpoint = 'api/variants';

  constructor(private api: ApiService) {}

  getByProduit(produitId: string): Observable<VariantItem[]> {
    return this.api
      .getList<{ success: boolean; data: VariantItem[] }>(`${this.endpoint}?produitId=${produitId}`)
      .pipe(map(res => res.data));
  }

  create(payload: VariantCreatePayload): Observable<VariantItem> {
    return this.api
      .create<{ success: boolean; data: VariantItem }>(this.endpoint, payload)
      .pipe(map(res => res.data));
  }

  update(id: string, payload: VariantUpdatePayload): Observable<VariantItem> {
    return this.api
      .updates<{ success: boolean; data: VariantItem }>(`${this.endpoint}/${id}`, payload)
      .pipe(map(res => res.data));
  }

  delete(id: string): Observable<void> {
    return this.api.deletes(`${this.endpoint}/${id}`);
  }
}
