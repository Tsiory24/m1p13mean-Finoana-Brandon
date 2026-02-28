import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../shared/service/auth.service';
import { NotificationService } from '../../shared/service/notification.service';
import { NotificationComponent } from '../../shared/components/notification/notification.component';
import { SeoService } from '../../shared/service/seo.service';

@Component({
  selector: 'app-login-fo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NotificationComponent],
  templateUrl: './login-fo.html',
  styleUrl: './login-fo.scss'
})
export class LoginFoComponent {
  identifier = '';
  motDePasse = '';
  loading = signal(false);
  showPassword = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router,
    private notifService: NotificationService,
    private seo: SeoService
  ) {
    this.seo.setPage({
      title: 'Connexion',
      description: 'Connectez-vous à votre espace acheteur pour gérer vos commandes.',
      noIndex: true
    });
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
      next: (res) => {
        this.loading.set(false);
        const role = res.data?.user?.role;
        if (role === 'acheteur') {
          this.notifService.success('Connexion réussie. Bienvenue !');
          this.router.navigate(['/']);
        } else {
          // Admin / responsable : on efface la session et on affiche une erreur
          this.authService.clearSession();
          this.notifService.error('Cet espace est réservé aux acheteurs. Utilisez l\'espace back-office pour vous connecter.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        const message = err.error?.message || 'Identifiants incorrects. Veuillez réessayer.';
        this.notifService.error(message);
      }
    });
  }
}
