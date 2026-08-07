from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Company, Notification


@receiver(post_save, sender=Company)
def create_lead_notification(sender, instance, created, **kwargs):
    if created and instance.status == 'Lead':
        Notification.objects.create(
            type='lead',
            message=f"Nouveau Lead : {instance.name} ajouté au pipe.",
            company=instance
        )