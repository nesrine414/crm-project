import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  password = '';
  showPassword = signal(false);
  errorMessage = signal('');
  isLoading = signal(false);

  constructor(private router: Router, private authService: AuthService) {}

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  onSubmit() {
    this.errorMessage.set('');
    this.isLoading.set(true);
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Email ou mot de passe incorrect.');
      }
    });
  }
}