import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CrmDataService, NotificationItem, CurrentUser } from '../../services/crm-data';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class Navbar implements OnInit {
  private router = inject(Router);
  private crmData = inject(CrmDataService);

  showNotifications = signal(false);
  showProfileMenu = signal(false);
  mobileMenuOpen = signal(false);

  notifications = signal<NotificationItem[]>([]);
  currentUser = signal<CurrentUser | null>(null);

  ngOnInit() {
    this.crmData.getNotifications().subscribe({
      next: (data) => this.notifications.set(data),
      error: (err) => console.error(err)
    });

    this.crmData.getCurrentUser().subscribe({
      next: (data) => this.currentUser.set(data),
      error: (err) => console.error(err)
    });
  }

  get userDisplayName(): string {
    const u = this.currentUser();
    if (!u) return '';
    return (u.first_name || u.last_name) ? `${u.first_name} ${u.last_name}`.trim() : u.username;
  }

  get userInitial(): string {
    const name = this.userDisplayName;
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  get unreadCount(): number {
    return this.notifications().filter(n => !n.is_read).length;
  }

  isInSection(routes: string[]): boolean {
    return routes.some(route => this.router.url.includes(route));
  }

  toggleNotifications() {
    this.showNotifications.set(!this.showNotifications());
    this.showProfileMenu.set(false);
  }

  toggleProfileMenu() {
    this.showProfileMenu.set(!this.showProfileMenu());
    this.showNotifications.set(false);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  onSearch(event: any) {
    if (event.key === 'Enter') {
      alert(`🔍 Recherche lancée pour : "${event.target.value}"`);
    }
  }

  logout() {
    this.showProfileMenu.set(false);
    this.router.navigate(['/login']);
  }
}