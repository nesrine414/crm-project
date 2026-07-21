from django.db import models
from django.contrib.auth.models import User


class Company(models.Model):
    STATUS_CHOICES = [
        ('Lead', 'Lead'),
        ('Client', 'Client'),
        ('Partenaire', 'Partenaire'),
    ]

    name = models.CharField(max_length=200)
    sector = models.CharField(max_length=100, blank=True)
    activity_domain = models.CharField(max_length=150, blank=True)
    address = models.CharField(max_length=255, blank=True)
    country = models.CharField(max_length=100, blank=True)
    acquisition_channel = models.CharField(max_length=100, blank=True)  # Canal d'acquisition
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Lead')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Contact(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='contacts')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    role = models.CharField(max_length=100, blank=True)  # Fonction
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Interaction(models.Model):
    TYPE_CHOICES = [
        ('Email', 'Email'),
        ('Appel', 'Appel'),
        ('Réunion', 'Réunion'),
        ('Entretien', 'Entretien'),
        ('Visite', 'Visite sur site'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='interactions')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    date = models.DateField()
    note = models.TextField(blank=True)

    def __str__(self):
        return f"{self.type} - {self.date}"


class Opportunity(models.Model):
    STAGE_CHOICES = [
        ('Qualification', 'Qualification'),
        ('Chiffrage', 'Chiffrage / Analyse (Rédaction)'),
        ('Offre Soumise', 'Offre Soumise (Attente)'),
        ('Négociation', 'Négociation (Ajustement)'),
        ('Clôturé', 'Clôturé (Fin de cycle)'),
    ]
    RESULT_CHOICES = [
        ('En cours', 'En cours'),
        ('Gagné', 'Gagné'),
        ('Perdu', 'Perdu'),
    ]

    offer_id = models.CharField(max_length=30, blank=True)  # Ex: MDC-26-001
    year = models.IntegerField(null=True, blank=True)
    entry_date = models.DateField(auto_now_add=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='opportunities')
    project_subject = models.CharField(max_length=255, blank=True)
    pilot = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='opportunities')
    stage = models.CharField(max_length=30, choices=STAGE_CHOICES, default='Qualification')
    result = models.CharField(max_length=20, choices=RESULT_CHOICES, default='En cours')
    estimated_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    probability = models.IntegerField(default=0)  # en %
    expected_close_date = models.DateField(null=True, blank=True)
    lost_reason = models.TextField(blank=True)
    action_plan = models.TextField(blank=True)

    @property
    def weighted_revenue(self):
        """CA Pondéré = Montant Estimé × Probabilité"""
        return round(float(self.estimated_amount) * (self.probability / 100), 2)

    def __str__(self):
        return f"{self.company.name} - {self.project_subject}"


class Reclamation(models.Model):
    PRIORITY_CHOICES = [('Faible', 'Faible'), ('Moyenne', 'Moyenne'), ('Élevée', 'Élevée')]
    CHANNEL_CHOICES = [
        ('Téléphone', 'Téléphone'), ('Email', 'Email'), ('Réunion', 'Réunion'),
        ('Formulaire web', 'Formulaire web'), ('Portail client', 'Portail client'),
    ]
    STATUS_CHOICES = [('Ouverte', 'Ouverte'), ('En cours', 'En cours'), ('Résolue', 'Résolue')]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='reclamations')
    subject = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Ouverte')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Moyenne')
    channel = models.CharField(max_length=30, choices=CHANNEL_CHOICES, default='Téléphone')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reclamations')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.subject} - {self.company.name}"


class ReclamationNote(models.Model):
    reclamation = models.ForeignKey(Reclamation, on_delete=models.CASCADE, related_name='notes')
    date = models.DateField(auto_now_add=True)
    note = models.TextField()


class Feedback(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='feedbacks')
    rating = models.IntegerField()  # 1 à 5
    comment = models.TextField(blank=True)
    date = models.DateField(auto_now_add=True)


class Campaign(models.Model):
    TYPE_CHOICES = [('Email', 'Email'), ('SMS', 'SMS'), ('Social', 'Social')]
    STATUS_CHOICES = [('Planifiée', 'Planifiée'), ('Active', 'Active'), ('Terminée', 'Terminée')]

    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Planifiée')
    sent_count = models.IntegerField(default=0)
    opens_count = models.IntegerField(default=0)
    conversions_count = models.IntegerField(default=0)
    budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    start_date = models.DateField()

class Notification(models.Model):
    TYPE_CHOICES = [
        ('lead', 'Nouveau Lead'),
        ('reclamation', 'Réclamation'),
    ]

    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    message = models.CharField(max_length=255)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type} - {self.message}"