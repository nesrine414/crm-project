import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword {
  private route = inject(ActivatedRoute);

  uid = '';
  token = '';
  newPassword = '';
  confirmPassword = '';
  isLoading = signal(false);
  success = signal(false);
  errorMessage = signal('');

  constructor(private router: Router, private authService: AuthService) {
    this.uid = this.route.snapshot.queryParamMap.get('uid') || '';
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  onSubmit() {
    this.errorMessage.set('');

    if (!this.uid || !this.token) {
      this.errorMessage.set('Lien invalide. Redemande une réinitialisation.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('Les mots de passe ne correspondent pas.');
      return;
    }
    if (this.newPassword.length < 8) {
      this.errorMessage.set('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    this.isLoading.set(true);
    this.authService.confirmPasswordReset(this.uid, this.token, this.newPassword).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Lien invalide ou expiré.');
      }
    });
  }
}