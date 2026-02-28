import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

export interface BoutiqueNotification {
  _id: string;
  type: 'boutique_creation' | 'reservation_locale' | 'reservation_validee' | 'reservation_annulee' | 'boutique_validee' | 'boutique_annulee' | string;
  message: string;
  targetRole?: string;
  targetUser?: string;
  lu: boolean;
  data: Record<string, any>;
  refId?: string;
  refModel?: 'Reservation' | 'Boutique' | string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class BoutiqueNotificationService {
  constructor(private api: ApiService) {}

  // Admin notifications
  getAll(): Observable<{ notifications: BoutiqueNotification[]; unreadCount: number }> {
    return this.api.getList<any>('api/notifications').pipe(
      map(res => res.data)
    );
  }

  markAllAsRead(): Observable<any> {
    return this.api.updates<any>('api/notifications/lire-tout', {});
  }

  // User (responsable_boutique) notifications
  getMes(): Observable<{ notifications: BoutiqueNotification[]; unreadCount: number }> {
    return this.api.getList<any>('api/notifications/mes').pipe(
      map(res => res.data)
    );
  }

  markAllMesAsRead(): Observable<any> {
    return this.api.updates<any>('api/notifications/mes/lire-tout', {});
  }

  // Shared — mark single notif as read
  markAsRead(id: string): Observable<BoutiqueNotification> {
    return this.api.updates<any>(`api/notifications/${id}/lire`, {}).pipe(
      map(res => res.data.notification)
    );
  }
}
