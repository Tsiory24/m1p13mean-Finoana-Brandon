import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FoHeaderComponent } from '../fo-header/fo-header';
import { FooterComponent } from '../../layout/footer/footer';

@Component({
  selector: 'app-fo-layout',
  standalone: true,
  imports: [RouterOutlet, FoHeaderComponent, FooterComponent],
  templateUrl: './fo-layout.html',
  styleUrl: './fo-layout.scss'
})
export class FoLayoutComponent {}
