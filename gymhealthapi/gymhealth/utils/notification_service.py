from django.utils import timezone
from datetime import datetime, timedelta, date
from django.core.mail import send_mail
from django.conf import settings
from gymhealth.models import Notification, WorkoutSession, SubscriptionPackage
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """Service đơn giản để tự động tạo thông báo"""

    @staticmethod
    def create_session_reminder_notification(session):
        """Tạo thông báo nhắc nhở buổi tập"""
        try:
            if session.session_type == 'pt_session':
                title = "Nhắc nhở buổi tập PT"
                message = f"""Chào {session.member.get_full_name()},

Bạn có buổi tập PT với huấn luyện viên {session.trainer.get_full_name() if session.trainer else 'N/A'} 
vào {session.session_date.strftime('%d/%m/%Y')} lúc {session.start_time.strftime('%H:%M')}.

Vui lòng đến đúng giờ. Chúc bạn có buổi tập hiệu quả!"""
            else:
                title = "Nhắc nhở buổi tự tập"
                message = f"""Chào {session.member.get_full_name()},

Bạn có lịch tự tập vào {session.session_date.strftime('%d/%m/%Y')} 
từ {session.start_time.strftime('%H:%M')} đến {session.end_time.strftime('%H:%M')}.

Chúc bạn có buổi tập hiệu quả!"""

            # Tạo thông báo
            notification = Notification.objects.create(
                user=session.member,
                title=title,
                message=message,
                notification_type='session_reminder',
                related_object_id=session.id,
                sent=True
            )

            logger.info(f"Created session reminder for {session.member.username}")
            return notification

        except Exception as e:
            logger.error(f"Error creating session reminder: {str(e)}")
            return None

    @staticmethod
    def create_expiry_reminder_notification(subscription):
        """Tạo thông báo sắp hết hạn gói tập"""
        try:
            title = "Gói tập sắp hết hạn"
            message = f"""Chào {subscription.member.get_full_name()},

Gói tập "{subscription.package.name}" của bạn sẽ hết hạn vào ngày {subscription.end_date.strftime('%d/%m/%Y')}.
Còn lại: {subscription.days_until_expiry} ngày

Vui lòng liên hệ để gia hạn gói tập.
Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!"""

            # Tạo thông báo
            notification = Notification.objects.create(
                user=subscription.member,
                title=title,
                message=message,
                notification_type='subscription_expiry',
                related_object_id=subscription.id,
                sent=True
            )

            logger.info(f"Created expiry reminder for {subscription.member.username}")
            return notification

        except Exception as e:
            logger.error(f"Error creating expiry reminder: {str(e)}")
            return None

    @staticmethod
    def check_and_create_session_reminders():
        """Kiểm tra và tạo thông báo cho các buổi tập sắp tới (2 tiếng)"""
        try:
            # Tính thời gian 2 tiếng tới
            reminder_time = timezone.now() + timedelta(hours=2)

            # Tìm các buổi tập sắp diễn ra trong 2 tiếng tới
            upcoming_sessions = WorkoutSession.objects.filter(
                session_date=reminder_time.date(),
                start_time__gte=(reminder_time - timedelta(minutes=5)).time(),  # Khoảng gần 2 tiếng
                start_time__lte=(reminder_time + timedelta(minutes=5)).time(),  # Khoảng hơn 2 tiếng
                status='confirmed'
            )

            created_count = 0
            for session in upcoming_sessions:
                # Kiểm tra xem đã có thông báo chưa
                existing = Notification.objects.filter(
                    user=session.member,
                    notification_type='session_reminder',
                    related_object_id=session.id
                ).exists()

                if not existing:
                    if NotificationService.create_session_reminder_notification(session):
                        created_count += 1

            logger.info(f"Created {created_count} session reminders")
            return created_count

        except Exception as e:
            logger.error(f"Error checking session reminders: {str(e)}")
            return 0

    @staticmethod
    def check_and_create_expiry_reminders():
        """Kiểm tra và tạo thông báo cho gói tập sắp hết hạn"""
        try:
            # Gói tập hết hạn sau 7 ngày
            warning_date = date.today() + timedelta(days=7)

            expiring_subscriptions = SubscriptionPackage.objects.filter(
                end_date=warning_date,
                status='active'
            )

            created_count = 0
            for subscription in expiring_subscriptions:
                # Kiểm tra xem đã có thông báo trong ngày hôm nay chưa
                today = timezone.now().date()
                existing = Notification.objects.filter(
                    user=subscription.member,
                    notification_type='subscription_expiry',
                    related_object_id=subscription.id,
                    created_at__date=today
                ).exists()

                if not existing:
                    if NotificationService.create_expiry_reminder_notification(subscription):
                        created_count += 1

            logger.info(f"Created {created_count} expiry reminders")
            return created_count

        except Exception as e:
            logger.error(f"Error checking expiry reminders: {str(e)}")
            return 0