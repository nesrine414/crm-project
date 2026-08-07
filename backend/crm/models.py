from django.db import models
from django.contrib.auth.models import User


class Company(models.Model):
    STATUS_CHOICES = [
        ('Lead', 'Lead'),
        ('Client', 'Client'),
        ('Partenaire', 'Partenaire'),
        ('Prestataire', 'Prestataire'),
    ]
    SERVICE_CHOICES = [
        ('Recrutement', 'Recrutement'),
        ('Formation', 'Formation'),
        ('Consulting', 'Consulting'),
        ('Comptable', 'Comptable'),
        ('Fourniture', 'Fourniture'),
        ('Fourniture bureautique', 'Fourniture bureautique'),
        ('Informatique', 'Informatique'),
        ('Autre', 'Autre'),
    ]

    name = models.CharField(max_length=200)
    sector = models.CharField(max_length=100, blank=True)
    activity_domain = models.CharField(max_length=150, blank=True)
    address = models.CharField(max_length=255, blank=True)
    country = models.CharField(max_length=100, blank=True)
    acquisition_channel = models.CharField(max_length=100, blank=True)  # Canal d'acquisition
    service_provided = models.CharField(max_length=100, choices=SERVICE_CHOICES, blank=True)
    collaboration_type = models.CharField(max_length=150, blank=True, default='')  
    is_retained = models.BooleanField(default=False)  
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Lead')

    # Champs spécifiques aux Prestataires (conforme Excel ENR-GFS-03)
    patente = models.CharField(max_length=20, default='Oui', blank=True)
    convention_contrat = models.CharField(max_length=20, default='Non', blank=True)
    date_debut_contrat = models.DateField(null=True, blank=True)
    date_fin_contrat = models.DateField(null=True, blank=True)
    interlocuteur_principal = models.CharField(max_length=150, blank=True)
    fonction_interlocuteur = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True, default='')
    phone = models.CharField(max_length=30, blank=True, default='')
    cv_document = models.FileField(upload_to='prestataire_cvs/%Y/', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Prestataire(Company):
    class Meta:
        proxy = True
        verbose_name = "Prestataire"
        verbose_name_plural = "Prestataires"


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

    offer_id = models.CharField(max_length=30, blank=True)
    year = models.IntegerField(null=True, blank=True)
    entry_date = models.DateField(auto_now_add=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='opportunities')
    project_subject = models.CharField(max_length=255, blank=True)
    pilot = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='opportunities')
    stage = models.CharField(max_length=30, choices=STAGE_CHOICES, default='Qualification')
    result = models.CharField(max_length=20, choices=RESULT_CHOICES, default='En cours')
    estimated_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    probability = models.IntegerField(default=0)
    expected_close_date = models.DateField(null=True, blank=True)
    lost_reason = models.TextField(blank=True)
    action_plan = models.TextField(blank=True)

    @property
    def weighted_revenue(self):
        return round(float(self.estimated_amount) * (self.probability / 100), 2)

    def __str__(self):
        return f"{self.company.name} - {self.project_subject}"



class Feedback(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='feedbacks')
    rating = models.IntegerField()
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


class NonConformite(models.Model):
    PROCESSUS_CHOICES = [
        ('PMS', 'Pilotage et Management Stratégique'),
        ('PCS', 'Prestation de Consulting'),
        ('PRT', 'Prestation de Recrutement'),
        ('PFR', 'Prestation de Formation'),
        ('GFS', 'Gestion des Fonctions Support'),
    ]
    GRAVITE_CHOICES = [(1, 'Faible'), (2, 'Moyenne'), (3, 'Élevée / Majeure')]
    EFFICACITE_CHOICES = [
        ('Efficace', 'Efficace'), ('Non efficace', 'Non efficace'),
        ('Insuffisant', 'Insuffisant'), ('A vérifier', 'À vérifier'),
    ]
    AVANCEMENT_CHOICES = [('P', 'Planifier'), ('D', 'Réaliser'), ('C', 'Contrôler'), ('A', 'Acter (clôturer)')]
    STATUT_CHOICES = [('Ouvert', 'Ouvert'), ('Fermé', 'Fermé')]

    numero = models.IntegerField(unique=True)
    date = models.DateField()
    probleme = models.TextField()
    origine = models.CharField(max_length=150, blank=True)
    processus = models.CharField(max_length=10, choices=PROCESSUS_CHOICES)
    gravite = models.IntegerField(choices=GRAVITE_CHOICES)
    action_immediate = models.TextField(blank=True)
    analyse_causes = models.TextField(blank=True)
    recurrence = models.BooleanField(default=False)
    action_corrective = models.TextField(blank=True)
    date_prevue = models.CharField(max_length=50, blank=True)
    responsable = models.CharField(max_length=150, blank=True)
    date_realisation = models.CharField(max_length=50, blank=True)
    delais = models.CharField(max_length=100, blank=True)
    efficacite = models.CharField(max_length=20, choices=EFFICACITE_CHOICES, blank=True)
    commentaire = models.TextField(blank=True)
    avancement = models.CharField(max_length=1, choices=AVANCEMENT_CHOICES, default='P')
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='Ouvert')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-numero']

    def __str__(self):
        return f"NC-{self.numero} — {self.probleme[:50]}"


class SatisfactionSurveyPDF(models.Model):
    SERVICE_CHOICES = [
        ('Consulting', 'Consulting'),
        ('Formation', 'Formation'),
        ('Recrutement', 'Recrutement'),
    ]
    INTENT_CHOICES = [
        ('Oui', 'Oui'),
        ('Non', 'Non'),
        ('Peut-être', 'Peut-être'),
    ]

    # 👇 Grilles de critères officielles LCA, par service (source : fichier Excel de l'encadrante)
    CRITERES_PAR_SERVICE = {
        'Consulting': [
            'Diagnostic & Analyse',
            'Expertise Technique',
            'Qualité des Livrables',
            'Respect du Planning',
            'Pédagogie & Transfert de compétences',
            'Réactivité',
            'Professionnalisme',
            'Valeur Ajoutée',
        ],
        'Formation': [
            'Ingénierie pédagogique',
            'Expertise du formateur',
            'Supports de cours',
            'Logistique',
            'Impact opérationnel',
            'Réactivité',
            'Professionnalisme',
            'Image de marque',
            'Rapport Qualité/Prix',
        ],
        'Recrutement': [
            'Analyse du besoin',
            'Qualité des profils',
            'Pertinence des évaluations',
            'Délai de traitement',
            'Accompagnement',
            'Communication',
            'Professionnalisme',
            'Rapport Qualité/Prix',
        ],
    }

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='satisfaction_pdfs')
    year = models.IntegerField()
    service_type = models.CharField(max_length=20, choices=SERVICE_CHOICES, default='Consulting')

    # 👇 NOUVEAU : détail des notes par critère (rempli par le formulaire dynamique)
    # ex: {"Diagnostic & Analyse": 5, "Expertise Technique": 5, ...}
    detailed_scores = models.JSONField(default=dict, blank=True)

    score_global = models.FloatField(default=5.0)  # calculé automatiquement si detailed_scores est rempli
    score_recommendation = models.IntegerField(default=10)  # NPS /10, reste séparé du calcul de score_global
    future_intent = models.CharField(max_length=15, choices=INTENT_CHOICES, default='Oui')
    point_fort = models.TextField(blank=True)
    amelioration = models.TextField(blank=True)
    pdf_file = models.FileField(upload_to='satisfaction_pdfs/%Y/', null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-year', '-uploaded_at']

    def save(self, *args, **kwargs):
        # Si des critères détaillés sont fournis, on recalcule score_global automatiquement
        # (évite les erreurs de calcul manuel)
        if self.detailed_scores:
            valeurs = [v for v in self.detailed_scores.values() if isinstance(v, (int, float))]
            if valeurs:
                self.score_global = round(sum(valeurs) / len(valeurs), 2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} ({self.service_type}) - {self.year}"


class PrestataireEvaluation(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='prestataire_evaluations')
    year = models.IntegerField()

    # Critères d'évaluation officiels LCA (notés sur 4)
    prix = models.FloatField(null=True, blank=True)
    qualite = models.FloatField(null=True, blank=True)
    prestation_service = models.FloatField(null=True, blank=True)
    respect_delais = models.FloatField(null=True, blank=True)

    score_percent = models.FloatField(null=True, blank=True)
    decision = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', 'company__name']
        unique_together = ('company', 'year')

    def save(self, *args, **kwargs):
        scores = [s for s in [self.prix, self.qualite, self.prestation_service, self.respect_delais] if s is not None]
        if scores:
            avg_note = sum(scores) / len(scores)
            self.score_percent = round((avg_note / 4.0) * 100, 2)
            if self.score_percent > 80:
                self.decision = "Maintenir le fournisseur et le privilégier"
            elif self.score_percent >= 60:
                self.decision = "Maintenir le fournisseur"
            elif self.score_percent >= 40:
                self.decision = "Maintenir le fournisseur sous surveillance"
            else:
                self.decision = "Fournisseurs douteux"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - Evaluation {self.year}"
