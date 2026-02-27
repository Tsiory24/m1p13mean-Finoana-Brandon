import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { NotificationComponent } from '../../shared/components/notification/notification.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, Header, NotificationComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout {
  sidebarCollapsed = false;

  onSidebarToggle(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }
}
