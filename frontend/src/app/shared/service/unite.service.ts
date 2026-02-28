import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface UniteItem {
  _id: string;
  nom: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class UniteService {
  private readonly endpoint = 'api/unites';
  constructor(private api: ApiService) {}

  getAll(): Observable<UniteItem[]> {
    return this.api
      .getList<{ success: boolean; data: UniteItem[] }>(this.endpoint)
      .pipe(map(res => res.data));
  }

  create(nom: string): Observable<UniteItem> {
    return this.api
      .create<{ success: boolean; data: UniteItem }>(this.endpoint, { nom })
      .pipe(map(res => res.data));
  }

  update(id: string, nom: string): Observable<UniteItem> {
    return this.api
      .updates<{ success: boolean; data: UniteItem }>(`${this.endpoint}/${id}`, { nom })
      .pipe(map(res => res.data));
  }

  delete(id: string): Observable<void> {
    return this.api.deletes(`${this.endpoint}/${id}`);
  }
}
