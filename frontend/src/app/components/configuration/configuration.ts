import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CrmDataService, UserItem } from '../../services/crm-data';

export type ConfigTab = 'profile' | 'users' | 'organization' | 'notifications';

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './configuration.html',
  styleUrl: './configuration.css'
})
export class Configuration implements OnInit {
  private crmData = inject(CrmDataService);

  activeTab = signal<ConfigTab>('profile');
  users = signal<UserItem[]>([]);
  userSearchTerm = signal<string>('');

  // --- Mon profil ---
  profileFirstName = '';
  profileLastName = '';
  profileEmail = '';
  profileUsername = '';
  profileMessage = signal<string | null>(null);
  profileError = signal<string | null>(null);

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordMessage = signal<string | null>(null);
  passwordError = signal<string | null>(null);

  // --- Gestion utilisateurs ---
  showUserModal = signal(false);
  editingUser: UserItem | null = null;
  userForm = {
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'Administrateur'
  };
  userFormError = signal<string | null>(null);

  // --- Organisation / Cabinet LCA ---
  orgForm = {
    name: 'LCA Consulting & Formation',
    activity: 'Consulting, Formation & Recrutement',
    email: 'contact@lca-consulting.tn',
    phone: '+216 71 000 000',
    address: 'Tunis, Tunisie',
    currency: 'DT (Dinar Tunisien)',
    timezone: 'Africa/Tunis (GMT+1)',
    taxId: '1234567/A/M/000'
  };
  orgMessage = signal<string | null>(null);

  // --- Notifications & Workflow ---
  notifSettings = {
    emailReclamation: true,
    emailNC: true,
    stagnantOppAlert: true,
    weeklyReport: false,
    inAppNotifs: true
  };
  notifMessage = signal<string | null>(null);

  filteredUsers = computed(() => {
    const term = this.userSearchTerm().toLowerCase().trim();
    if (!term) return this.users();
    return this.users().filter(u =>
      (u.first_name || '').toLowerCase().includes(term) ||
      (u.last_name || '').toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  ngOnInit() {
    this.loadUsers();
    this.loadProfile();
    this.loadSavedOrgSettings();
    this.loadSavedNotifSettings();
  }

  loadUsers() {
    this.crmData.getUsers().subscribe({
      next: (data) => this.users.set(data.filter(u => u.username !== 'admin')),
      error: (err) => console.error('Erreur chargement utilisateurs', err)
    });
  }

  loadProfile() {
    this.crmData.getCurrentUser().subscribe({
      next: (u) => {
        this.profileFirstName = u.first_name || '';
        this.profileLastName = u.last_name || '';
        this.profileEmail = u.email || '';
        this.profileUsername = u.username || '';
      },
      error: (err) => console.error('Erreur chargement profil', err)
    });
  }

  get initials(): string {
    const first = (this.profileFirstName || '').trim()[0] || '';
    const last = (this.profileLastName || '').trim()[0] || '';
    if (first || last) return (first + last).toUpperCase();
    return (this.profileUsername || 'U').substring(0, 2).toUpperCase();
  }

  getUserInitials(u: UserItem): string {
    const first = (u.first_name || '').trim()[0] || '';
    const last = (u.last_name || '').trim()[0] || '';
    if (first || last) return (first + last).toUpperCase();
    return u.username.substring(0, 2).toUpperCase();
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Jamais connectée';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  saveProfile() {
    this.profileMessage.set(null);
    this.profileError.set(null);
    this.crmData.updateProfile({
      first_name: this.profileFirstName,
      last_name: this.profileLastName,
      email: this.profileEmail
    }).subscribe({
      next: () => {
        this.profileMessage.set('Profil mis à jour avec succès.');
        setTimeout(() => this.profileMessage.set(null), 3500);
      },
      error: () => this.profileError.set('Impossible de mettre à jour le profil.')
    });
  }

  changePassword() {
    this.passwordMessage.set(null);
    this.passwordError.set(null);

    if (!this.oldPassword) {
      this.passwordError.set('Veuillez saisir votre mot de passe actuel.');
      return;
    }
    if (this.newPassword.length < 8) {
      this.passwordError.set('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    this.crmData.changePassword(this.oldPassword, this.newPassword).subscribe({
      next: () => {
        this.passwordMessage.set('Mot de passe mis à jour avec succès.');
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        setTimeout(() => this.passwordMessage.set(null), 3500);
      },
      error: (err) => {
        this.passwordError.set(err?.error?.detail || 'Mot de passe actuel incorrect.');
      }
    });
  }

  // --- Modal Utilisateurs ---
  openAddUser() {
    this.editingUser = null;
    this.userForm = { username: '', email: '', first_name: '', last_name: '', password: '', role: 'Administrateur' };
    this.userFormError.set(null);
    this.showUserModal.set(true);
  }

  openEditUser(u: UserItem) {
    this.editingUser = u;
    this.userForm = {
      username: u.username,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      password: '',
      role: 'Administrateur'
    };
    this.userFormError.set(null);
    this.showUserModal.set(true);
  }

  closeUserModal() {
    this.showUserModal.set(false);
  }

  submitUserForm() {
    this.userFormError.set(null);

    if (this.editingUser) {
      const { username, email, first_name, last_name } = this.userForm;
      this.crmData.updateUser(this.editingUser.id, { username, email, first_name, last_name }).subscribe({
        next: () => {
          this.closeUserModal();
          this.loadUsers();
        },
        error: () => this.userFormError.set("Impossible de modifier cet utilisateur.")
      });
    } else {
      if (!this.userForm.username || !this.userForm.email || !this.userForm.password) {
        this.userFormError.set("Veuillez remplir tous les champs obligatoires (*).");
        return;
      }
      this.crmData.createUser(this.userForm).subscribe({
        next: () => {
          this.closeUserModal();
          this.loadUsers();
        },
        error: (err) => this.userFormError.set(
          err?.error?.username?.[0] || err?.error?.email?.[0] || "Impossible de créer cet utilisateur."
        )
      });
    }
  }

  deactivateUser(u: UserItem) {
    if (!confirm(`Désactiver le compte de ${u.username} ?`)) return;
    this.crmData.deactivateUser(u.id).subscribe({
      next: () => this.loadUsers(),
      error: (err) => console.error(err)
    });
  }

  reactivateUser(u: UserItem) {
    this.crmData.reactivateUser(u.id).subscribe({
      next: () => this.loadUsers(),
      error: (err) => console.error(err)
    });
  }

  // --- Organisation Settings persistence ---
  loadSavedOrgSettings() {
    const saved = localStorage.getItem('lca_crm_org_settings');
    if (saved) {
      try {
        this.orgForm = { ...this.orgForm, ...JSON.parse(saved) };
      } catch (e) { }
    }
  }

  saveOrgSettings() {
    localStorage.setItem('lca_crm_org_settings', JSON.stringify(this.orgForm));
    this.orgMessage.set('Paramètres de l\'organisation enregistrés.');
    setTimeout(() => this.orgMessage.set(null), 3500);
  }

  // --- Notification Settings persistence ---
  loadSavedNotifSettings() {
    const saved = localStorage.getItem('lca_crm_notif_settings');
    if (saved) {
      try {
        this.notifSettings = { ...this.notifSettings, ...JSON.parse(saved) };
      } catch (e) { }
    }
  }

  saveNotifSettings() {
    localStorage.setItem('lca_crm_notif_settings', JSON.stringify(this.notifSettings));
    this.notifMessage.set('Préférences de notifications enregistrées.');
    setTimeout(() => this.notifMessage.set(null), 3500);
  }
}