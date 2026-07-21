import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = signal(false);
  acceptedPrivacy = false;
  errorMessage = signal('');
  isLoading = signal(false);

  constructor(private router: Router, private authService: AuthService) {}

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  onSubmit() {
    this.errorMessage.set('');

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Les mots de passe ne correspondent pas.');
      return;
    }
    if (this.password.length < 8) {
      this.errorMessage.set('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    this.isLoading.set(true);
    this.authService.register(this.fullName, this.email, this.password).subscribe({
      next: () => {
        // Inscription réussie -> connexion automatique
        this.authService.login(this.email, this.password).subscribe({
          next: () => {
            this.isLoading.set(false);
            this.router.navigate(['/dashboard']);
          },
          error: () => {
            this.isLoading.set(false);
            // Le compte est créé mais l'auto-login a échoué -> on renvoie vers login
            this.router.navigate(['/login']);
          }
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 400 && err.error?.email) {
          this.errorMessage.set('Un compte existe déjà avec cet email.');
        } else {
          this.errorMessage.set("Erreur lors de l'inscription. Réessaie.");
        }
      }
    });
  }
}