import { Component, signal, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

declare const google: any;

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements AfterViewInit {
  email = '';
  password = '';
  showPassword = signal(false);
  errorMessage = signal('');
  isLoading = signal(false);

  constructor(private router: Router, private authService: AuthService) { }

  ngAfterViewInit() {
    google.accounts.id.initialize({
      client_id: '1036941684440-pige9hc8a3umcmilh6dvvaouo4dc6frg.apps.googleusercontent.com',
      callback: (response: any) => this.handleGoogleResponse(response)
    });
    google.accounts.id.renderButton(
      document.getElementById('google-signin-button'),
      { theme: 'outline', size: 'large', width: 300, text: 'signin_with' }
    );
  }

  handleGoogleResponse(response: any) {
    this.errorMessage.set('');
    this.isLoading.set(true);
    this.authService.loginWithGoogle(response.credential).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Connexion Google impossible.');
      }
    });
  }

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