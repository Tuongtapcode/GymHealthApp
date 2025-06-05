import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gymhealthapi.settings')

app = Celery('gymhealth')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()

app.conf.beat_schedule = {
    'check-session-reminders': {
        'task': 'gymhealth.tasks.check_session_reminders',
        'schedule': crontab(minute=0),
    },
    'check-expiry-reminders': {
        'task': 'gymhealth.tasks.check_expiry_reminders',
        'schedule': crontab(hour=9, minute=0),
    },
}

app.conf.timezone = 'Asia/Ho_Chi_Minh'
