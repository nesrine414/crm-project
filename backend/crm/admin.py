from django.contrib import admin
from .models import Company, Contact, Interaction, Opportunity, Reclamation, ReclamationNote, Feedback, Campaign, NonConformite, SatisfactionSurveyPDF

admin.site.register(Company)
admin.site.register(Contact)
admin.site.register(Interaction)
admin.site.register(Opportunity)
admin.site.register(Reclamation)
admin.site.register(ReclamationNote)
admin.site.register(Feedback)
admin.site.register(Campaign)
admin.site.register(NonConformite)
admin.site.register(SatisfactionSurveyPDF)