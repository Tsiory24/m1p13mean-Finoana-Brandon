import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../service/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notifications-wrap">
      @for (n of notifications; track n.id) {
        <div class="notif notif-{{ n.type }}">
          <span class="notif-icon">{{ getIcon(n.type) }}</span>
          <span class="notif-msg">{{ n.message }}</span>
          <button class="notif-close" (click)="close(n.id)">&#x2715;</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .notifications-wrap {
      position: fixed;
      top: 1.25rem;
      right: 1.25rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 360px;
      width: 100%;
      pointer-events: none;
    }
    .notif {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      padding: 0.85rem 1rem;
      border-radius: 12px;
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      border-left: 4px solid transparent;
      font-size: 0.875rem;
      font-weight: 500;
      animation: notifSlide 0.25s ease;
      pointer-events: auto;
    }
    .notif-success { border-color: #22c55e; color: #166534; }
    .notif-error   { border-color: #ef4444; color: #991b1b; }
    .notif-warning { border-color: #f59e0b; color: #92400e; }
    .notif-info    { border-color: #3b82f6; color: #1e40af; }
    .notif-icon { font-size: 1rem; flex-shrink: 0; }
    .notif-msg  { flex: 1; line-height: 1.4; }
    .notif-close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.9rem;
      opacity: 0.5;
      padding: 0;
      line-height: 1;
      flex-shrink: 0;
      color: inherit;
    }
    .notif-close:hover { opacity: 1; }
    @keyframes notifSlide {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
  `]
})
export class NotificationComponent implements OnInit {
  notifications: Notification[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.getNotifications().subscribe(n => this.notifications = n);
  }

  close(id: number): void {
    this.notificationService.remove(id);
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '';
    }
  }
}
