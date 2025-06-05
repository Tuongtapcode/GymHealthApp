from django.apps import AppConfig


class GymhealthConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gymhealth'


    def ready(self):
        import gymhealth.signals