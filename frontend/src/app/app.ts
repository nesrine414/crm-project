import { Component, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
  showSidebar = signal(true);

  constructor(private router: Router) {
    this.updateSidebar(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateSidebar(event.urlAfterRedirects || event.url);
    });
  }

  private updateSidebar(url: string) {
    const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
    this.showSidebar.set(!authRoutes.some(route => url.includes(route)));
  }
}