from celery import shared_task
from gymhealth.utils.notification_service import NotificationService


@shared_task
def check_session_reminders():
    """Task kiểm tra và tạo thông báo nhắc nhở buổi tập"""
    count = NotificationService.check_and_create_session_reminders()
    return f"Created {count} session reminder notifications"


@shared_task
def check_expiry_reminders():
    """Task kiểm tra và tạo thông báo sắp hết hạn gói tập"""
    count = NotificationService.check_and_create_expiry_reminders()
    return f"Created {count} expiry reminder notifications"