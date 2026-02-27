import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface PrixLocaleItem {
  _id: string;
  prix_par_m2: number;
  valider_par: { _id: string; nom: string; prenom?: string; email: string } | null;
  created_at: string;
  deletedAt: string | null;
}

export interface PrixLocaleListResponse {
  success: boolean;
  data: { prix: PrixLocaleItem[] };
}

export interface PrixLocaleResponse {
  success: boolean;
  data: { prix: PrixLocaleItem | null };
}

@Injectable({ providedIn: 'root' })
export class PrixLocaleService {
  private readonly endpoint = 'api/prix-locales';

  constructor(private api: ApiService) {}

  getAll(): Observable<PrixLocaleItem[]> {
    return this.api.getList<PrixLocaleListResponse>(this.endpoint)
      .pipe(map(r => r.data.prix));
  }

  getCurrent(): Observable<PrixLocaleItem | null> {
    return this.api.getList<PrixLocaleResponse>(`${this.endpoint}/current`)
      .pipe(map(r => r.data.prix));
  }

  getById(id: string): Observable<PrixLocaleItem> {
    return this.api.getSingle<PrixLocaleResponse>(`${this.endpoint}/${id}`)
      .pipe(map(r => r.data.prix!));
  }

  create(prix_par_m2: number): Observable<PrixLocaleItem> {
    return this.api.create<PrixLocaleResponse>(this.endpoint, { prix_par_m2 })
      .pipe(map(r => r.data.prix!));
  }

  update(id: string, prix_par_m2: number): Observable<PrixLocaleItem> {
    return this.api.updates<PrixLocaleResponse>(`${this.endpoint}/${id}`, { prix_par_m2 })
      .pipe(map(r => r.data.prix!));
  }

  delete(id: string): Observable<void> {
    return this.api.deletes(`${this.endpoint}/${id}`);
  }
}
