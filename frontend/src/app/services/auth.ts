import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

interface TokenResponse {
  access: string;
  refresh: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = 'http://127.0.0.1:8000/api';
  isLoggedIn = signal<boolean>(this.hasToken());

  constructor(private http: HttpClient, private router: Router) { }

  private hasToken(): boolean {
    return !!localStorage.getItem('access_token');
  }

  login(username: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/token/`, { username, password }).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);
        this.isLoggedIn.set(true);
      })
    );
  }
  loginWithGoogle(credential: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/auth/google/`, { credential }).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);
        this.isLoggedIn.set(true);
      })
    );
  }

  register(fullName: string, email: string, password: string): Observable<any> {
    const [firstName, ...rest] = fullName.trim().split(' ');
    const lastName = rest.join(' ');

    return this.http.post(`${this.baseUrl}/register/`, {
      username: email,
      email: email,
      password: password,
      first_name: firstName || '',
      last_name: lastName || ''
    });
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/password-reset/request/`, { email });
  }

  confirmPasswordReset(uid: string, token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/password-reset/confirm/`, {
      uid,
      token,
      new_password: newPassword
    });
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.isLoggedIn.set(false);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }
}