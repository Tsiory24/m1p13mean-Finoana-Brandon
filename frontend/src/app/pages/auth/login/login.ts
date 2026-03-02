import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/service/auth.service';
import { NotificationService } from '../../../shared/service/notification.service';
import { NotificationComponent } from '../../../shared/components/notification/notification.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, NotificationComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  identifier = '';
  motDePasse = '';
  loading = signal(false);
  showPassword = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router,
    private notifService: NotificationService
  ) {}

  fillAdmin(): void {
    this.identifier = 'Admin';
    this.motDePasse = 'admin123';
  }

  fillResponsable(): void {
    this.identifier = 'AkanjoNaka';
    this.motDePasse = 'boutique123';
  }

  togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  onSubmit(): void {
    if (!this.identifier.trim() || !this.motDePasse.trim()) {
      this.notifService.warning('Veuillez remplir tous les champs.');
      return;
    }

    this.loading.set(true);
    this.authService.login(this.identifier.trim(), this.motDePasse).subscribe({
      next: () => {
        this.loading.set(false);
        this.notifService.success('Connexion réussie. Bienvenue !');
        this.router.navigate(['/backoffice/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        const message = err.error?.message || 'Identifiants incorrects. Veuillez réessayer.';
        this.notifService.error(message);
      }
    });
  }
}
