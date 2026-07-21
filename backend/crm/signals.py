from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Company, Reclamation, Notification


@receiver(post_save, sender=Company)
def create_lead_notification(sender, instance, created, **kwargs):
    if created and instance.status == 'Lead':
        Notification.objects.create(
            type='lead',
            message=f"Nouveau Lead : {instance.name} ajouté au pipe.",
            company=instance
        )


@receiver(post_save, sender=Reclamation)
def create_reclamation_notification(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            type='reclamation',
            message=f"Réclamation : {instance.subject}.",
            company=instance.company
        )