# signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import Promotion, Notification, WorkoutSession
from .utils.notification_service import NotificationService

User = get_user_model()

@receiver(post_save, sender=Promotion)
def handle_promotion_save(sender, instance, created, **kwargs):
    """
    Xử lý khi có promotion được tạo mới hoặc cập nhật
    """
    if created and instance.is_active:  # Chỉ khi tạo mới và promotion đang active
        # Lấy tất cả user có role là MEMBER
        members = User.objects.filter(role='MEMBER')

        # Tạo thông báo cho từng hội viên
        notifications = []
        for member in members:
            notification = Notification(
                user=member,
                title=f"Ưu đãi mới: {instance.title}",
                message=f""" 
                <h3>Chúng tôi có ưu đãi mới dành cho bạn!</h3> 
                <p><strong>Tên ưu đãi:</strong> {instance.title}</p> 
                <p><strong>Mô tả:</strong> {instance.description}</p> 
                <p><strong>Mã giảm giá:</strong> <code>{instance.promo_code}</code></p> 
                <p><strong>Hiệu lực từ:</strong> {instance.valid_from.strftime('%d/%m/%Y %H:%M')}</p> 
                <p><strong>Hiệu lực đến:</strong> {instance.valid_to.strftime('%d/%m/%Y %H:%M')}</p> 
                <p>Hãy sử dụng ngay để không bỏ lỡ cơ hội này!</p> 
                """,
                notification_type='new_promotion',
                related_object_id=instance.id,
                sent=True  # Đánh dấu là đã gửi
            )
            notifications.append(notification)

            # Bulk create để tối ưu performance
        Notification.objects.bulk_create(notifications)

        print(f"Đã tạo {len(notifications)} thông báo cho promotion: {instance.title}")

    elif not created:  # Khi cập nhật promotion
        # Có thể thêm logic xử lý cập nhật ở đây nếu cần
        print(f"Promotion đã được cập nhật: {instance.title}")
        pass

