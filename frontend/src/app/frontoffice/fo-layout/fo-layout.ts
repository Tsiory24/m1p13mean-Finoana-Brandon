import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FoHeaderComponent } from '../fo-header/fo-header';
import { FooterComponent } from '../../layout/footer/footer';
import { NotificationComponent } from '../../shared/components/notification/notification.component';

@Component({
  selector: 'app-fo-layout',
  standalone: true,
  imports: [RouterOutlet, FoHeaderComponent, FooterComponent, NotificationComponent],
  templateUrl: './fo-layout.html',
  styleUrl: './fo-layout.scss'
})
export class FoLayoutComponent {}
