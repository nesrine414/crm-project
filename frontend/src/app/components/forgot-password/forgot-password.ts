import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {
  email = '';
  isLoading = signal(false);
  submitted = signal(false);
  errorMessage = signal('');

  constructor(private authService: AuthService) {}

  onSubmit() {
    this.errorMessage.set('');
    this.isLoading.set(true);
    this.authService.requestPasswordReset(this.email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.submitted.set(true);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set("Une erreur est survenue. Réessaie.");
      }
    });
  }
}