import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-placeholder">
      <div class="placeholder-card">
        <div class="placeholder-icon">🏗️</div>
        <h2>Catégories & Sous-catégories</h2>
        <p>Cette page est en cours de développement.</p>
      </div>
    </div>
  `,
  styles: [`
    .page-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 400px;
    }
    .placeholder-card {
      text-align: center;
      background: white;
      border-radius: 16px;
      padding: 3rem 4rem;
      border: 2px dashed #e2e6f0;
    }
    .placeholder-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    h2 {
      font-size: 1.3rem;
      font-weight: 700;
      color: #1a2744;
      margin: 0 0 0.5rem;
    }
    p {
      color: #6b7280;
      font-size: 0.9rem;
      margin: 0;
    }
  `]
})
export class CategoriesComponent {}
