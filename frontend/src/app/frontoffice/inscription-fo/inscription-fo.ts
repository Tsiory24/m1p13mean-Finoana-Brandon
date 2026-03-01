import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../shared/service/auth.service';
import { NotificationService } from '../../shared/service/notification.service';
import { NotificationComponent } from '../../shared/components/notification/notification.component';
import { SeoService } from '../../shared/service/seo.service';

@Component({
  selector: 'app-inscription-fo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NotificationComponent],
  templateUrl: './inscription-fo.html',
  styleUrl: './inscription-fo.scss'
})
export class InscriptionFoComponent implements OnDestroy {
  // ── Étape 1 : données du formulaire
  nom = '';
  email = '';
  contact = '';
  motDePasse = '';
  confirmMotDePasse = '';

  // ── Étape 2 : code de vérification
  emailCode = '';
  step = signal<1 | 2>(1);

  // ── État
  loading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  // ── Timer (10 min = 600s)
  remaining = signal(600);
  private timerRef: ReturnType<typeof setInterval> | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notifService: NotificationService,
    private seo: SeoService
  ) {
    this.seo.setPage({
      title: 'Créer un compte',
      description: 'Inscrivez-vous pour profiter de toutes les offres du centre commercial.',
      noIndex: true
    });
  }

  // ── Helpers
  get timerLabel(): string {
    const m = Math.floor(this.remaining() / 60);
    const s = this.remaining() % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  get timerExpired(): boolean {
    return this.remaining() <= 0;
  }

  togglePassword(): void { this.showPassword.set(!this.showPassword()); }
  toggleConfirmPassword(): void { this.showConfirmPassword.set(!this.showConfirmPassword()); }

  // ── Étape 1 : envoyer le code
  onSendCode(): void {
    if (!this.nom.trim()) {
      this.notifService.warning("Veuillez saisir un nom d'utilisateur.");
      return;
    }
    if (!this.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      this.notifService.warning('Veuillez saisir une adresse email valide.');
      return;
    }
    if (!this.contact.trim()) {
      this.notifService.warning('Veuillez saisir un contact.');
      return;
    }
    if (this.motDePasse.length < 6) {
      this.notifService.warning('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (this.motDePasse !== this.confirmMotDePasse) {
      this.notifService.error('Les mots de passe ne correspondent pas.');
      return;
    }

    this.loading.set(true);
    this.authService.sendEmailCode(this.email.trim()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.notifService.success(res.message);
        this.emailCode = '';
        this.step.set(2);
        this.startTimer();
      },
      error: (err) => {
        this.loading.set(false);
        const message = err.error?.message || "Impossible d'envoyer le code. Vérifiez votre email.";
        this.notifService.error(message);
      }
    });
  }

  // ── Renvoyer le code
  onResendCode(): void {
    this.stopTimer();
    this.emailCode = '';
    this.onSendCode();
  }

  // ── Étape 2 : créer le compte
  onSubmit(): void {
    if (!this.emailCode.trim() || this.emailCode.trim().length !== 6) {
      this.notifService.warning('Veuillez saisir le code à 6 chiffres reçu par email.');
      return;
    }

    this.loading.set(true);
    this.authService.register({
      nom: this.nom.trim(),
      motDePasse: this.motDePasse,
      email: this.email.trim(),
      contact: this.contact.trim(),
      emailCode: this.emailCode.trim()
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.stopTimer();
        this.notifService.success('Compte créé avec succès. Bienvenue !');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading.set(false);
        const message = err.error?.message || "Une erreur est survenue lors de l'inscription.";
        this.notifService.error(message);
      }
    });
  }

  goBackToStep1(): void {
    this.stopTimer();
    this.step.set(1);
    this.emailCode = '';
  }

  // ── Timer
  private startTimer(): void {
    this.remaining.set(600);
    this.stopTimer();
    this.timerRef = setInterval(() => {
      const val = this.remaining() - 1;
      this.remaining.set(val < 0 ? 0 : val);
      if (val <= 0) this.stopTimer();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerRef !== null) {
      clearInterval(this.timerRef);
      this.timerRef = null;
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }
}
