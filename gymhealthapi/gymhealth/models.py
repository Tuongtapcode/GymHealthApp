from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from cloudinary.models import CloudinaryField
from django.core.exceptions import ValidationError


class User(AbstractUser):
    ROLE = (
        ('MANAGER', 'Quản lý phòng gym'),
        ('TRAINER', 'Huấn luyện viên (PT)'),
        ('MEMBER', 'Hội viên'),
    )

    role = models.CharField(max_length=20, choices=ROLE, default='MEMBER')
    phone_number = models.CharField(max_length=15)
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    avatar = CloudinaryField()

    @property
    def is_manager(self):
        return self.role == 'MANAGER'

    @property
    def is_trainer(self):
        return self.role == 'TRAINER'

    @property
    def is_member(self):
        return self.role == 'MEMBER'

    def __str__(self):
        return f"{self.username} - {self.get_role_display()}"


class HealthInfo(models.Model):
    GOAL_CHOICES = (
        ('weight_loss', 'Giảm cân'),
        ('muscle_gain', 'Tăng cơ'),
        ('endurance', 'Tăng sức bền'),
        ('flexibility', 'Tăng tính linh hoạt'),
        ('general_fitness', 'Thể lực tổng quát'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='health_info')
    height = models.FloatField(help_text='Chiều cao (cm)')
    weight = models.FloatField(help_text='Cân nặng (kg)')
    training_goal = models.CharField(max_length=20, choices=GOAL_CHOICES)
    health_conditions = models.TextField(blank=True, help_text='Các vấn đề sức khỏe đặc biệt')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True, null=True, help_text="Ghi chú về tình trạng sức khỏe")
    # Thông tin sức khỏe bổ sung (có thể mở rộng thêm)
    body_fat_percentage = models.FloatField(blank=True, null=True,
                                            validators=[MinValueValidator(3), MaxValueValidator(70)])
    blood_pressure = models.CharField(max_length=20, blank=True, null=True, help_text="Định dạng: 120/80")
    medical_conditions = models.TextField(blank=True, null=True, help_text="Các vấn đề sức khỏe cần lưu ý")

    def __str__(self):
        return f"Thông tin sức khỏe của {self.user.username}"

    @property
    def bmi(self):
        return round(self.weight / ((self.height / 100) ** 2), 1)


class MemberProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='member_profile')
    membership_start_date = models.DateField(auto_now_add=True)
    membership_end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True, null=True)

    class Meta:
        verbose_name = "Hồ sơ hội viên"
        verbose_name_plural = "Hồ sơ hội viên"

    def __str__(self):
        return f"Hồ sơ của {self.user.username}"

    @property
    def is_membership_valid(self):
        """Kiểm tra tư cách hội viên còn hiệu lực hay không"""
        from datetime import date
        if not self.membership_end_date:
            return False
        return self.is_active and self.membership_end_date >= date.today()


class TrainerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='trainer_profile')
    bio = models.TextField(blank=True, null=True)
    specialization = models.CharField(max_length=255, blank=True, null=True, help_text="Chuyên môn huấn luyện")
    certification = models.CharField(max_length=255, blank=True, null=True, help_text="Chứng chỉ huấn luyện")
    experience_years = models.PositiveIntegerField(default=0)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        verbose_name = "Hồ sơ huấn luyện viên"
        verbose_name_plural = "Hồ sơ huấn luyện viên"

    def __str__(self):
        return f"PT {self.user.username}"


class BaseModel(models.Model):
    active = models.BooleanField(default=True)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class PackageType(BaseModel):
    name = models.CharField(max_length=100, verbose_name="Tên loại gói")
    duration_months = models.PositiveIntegerField(default=1, verbose_name="Số tháng")
    description = models.TextField(blank=True, null=True, verbose_name="Mô tả")

    def __str__(self):
        return f"{self.name} ({self.duration_months} tháng)"


class Benefit(BaseModel):
    name = models.CharField(max_length=100, verbose_name="Tên quyền lợi")
    description = models.TextField(blank=True, null=True, verbose_name="Mô tả chi tiết")
    icon = models.CharField(max_length=50, blank=True, null=True, verbose_name="Icon")

    def __str__(self):
        return self.name


class Packages(BaseModel):
    name = models.CharField(max_length=100)
    package_type = models.ForeignKey(PackageType, on_delete=models.CASCADE, related_name="packages",
                                     verbose_name="Loại gói")
    description = models.TextField(verbose_name="Mô tả gói tập")
    price = models.DecimalField(max_digits=10, decimal_places=2,
                                validators=[MinValueValidator(Decimal('0.00'))],
                                verbose_name="Giá gói tập")
    image = CloudinaryField()
    pt_sessions = models.PositiveIntegerField(
        default=0,
        verbose_name="Số buổi tập với PT"
    )

    benefits = models.ManyToManyField(
        Benefit,
        related_name="packages",
        blank=True,
        verbose_name="Quyền lợi"
    )

    class Meta:
        verbose_name = "Gói tập"
        verbose_name_plural = "Gói tập"
        ordering = ['package_type__duration_months', 'price']

    def __str__(self):
        return f"{self.name} - {self.price} VNĐ - {self.pt_sessions} buổi PT"

    @property
    def price_per_month(self):
        """Tính giá trung bình mỗi tháng"""
        if self.package_type and self.package_type.duration_months > 0:
            return self.price / self.package_type.duration_months
        return self.price


class SubscriptionPackage(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Chờ thanh toán'),
        ('active', 'Đang hoạt động'),
        ('expired', 'Hết hạn'),
        ('cancelled', 'Đã hủy'),
    )
    member = models.ForeignKey(
        'User',  # Tham chiếu đến model User đã tạo trước đó
        on_delete=models.CASCADE,
        related_name="subscriptions",
        verbose_name="Hội viên"
    )
    package = models.ForeignKey(
        Packages,
        on_delete=models.CASCADE,
        related_name="subscriptions",
        verbose_name="Gói tập"
    )
    start_date = models.DateField(verbose_name="Ngày bắt đầu")
    end_date = models.DateField(verbose_name="Ngày kết thúc")
    remaining_pt_sessions = models.PositiveIntegerField(verbose_name="Số buổi PT còn lại")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Trạng thái"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # Thông tin khuyến mãi nếu có
    applied_promotion = models.ForeignKey('Promotion', on_delete=models.SET_NULL, null=True, blank=True,
                                          related_name='applied_subscriptions')
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discounted_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        verbose_name = "Đăng ký gói tập"
        verbose_name_plural = "Đăng ký gói tập"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.member.username} - {self.package.name} ({self.get_status_display()})"

    @property
    def is_active(self):
        """Kiểm tra xem gói tập có còn hiệu lực không"""
        from datetime import date
        return self.status == 'active' and self.end_date >= date.today()

    @property
    def days_until_expiry(self):
        """Tính số ngày còn lại trước khi hết hạn"""
        from datetime import date
        if self.end_date:
            delta = self.end_date - date.today()
            return max(0, delta.days)
        return 0

    def save(self, *args, **kwargs):
        """Override save method để tự động cập nhật số buổi PT còn lại"""
        if not self.id and not self.remaining_pt_sessions:  # Nếu là tạo mới
            self.remaining_pt_sessions = self.package.pt_sessions

        # Lưu giá gốc nếu chưa có
        if not self.original_price:
            self.original_price = self.package.price

        # Tính giá sau khuyến mãi nếu có
        if self.applied_promotion and not self.discounted_price:
            if self.applied_promotion.discount_percentage:
                discount = self.original_price * (self.applied_promotion.discount_percentage / 100)
                self.discounted_price = self.original_price - discount
            elif self.applied_promotion.discount_amount:
                self.discounted_price = self.original_price - self.applied_promotion.discount_amount
            else:
                self.discounted_price = self.original_price
        elif not self.discounted_price:
            self.discounted_price = self.original_price

        super().save(*args, **kwargs)


class WorkoutSession(models.Model):
    SESSION_STATUS = (
        ('pending', 'Chờ duyệt'),
        ('confirmed', 'Đã xác nhận'),
        ('completed', 'Đã hoàn thành'),
        ('cancelled', 'Đã hủy'),
        ('rescheduled', 'Đã đổi lịch'),
    )

    SESSION_TYPE = (
        ('pt_session', 'Buổi tập với PT'),
        ('self_training', 'Tự tập'),
    )

    member = models.ForeignKey(User, on_delete=models.CASCADE, related_name='training_sessions')
    trainer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trainer_sessions', null=True, blank=True)
    subscription = models.ForeignKey(SubscriptionPackage, on_delete=models.CASCADE, related_name='training_sessions',
                                     null=True, blank=True)
    session_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    session_type = models.CharField(max_length=20, choices=SESSION_TYPE)
    status = models.CharField(max_length=20, choices=SESSION_STATUS, default='pending')
    notes = models.TextField(blank=True, null=True)
    trainer_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Lịch tập"
        verbose_name_plural = "Lịch tập"
        ordering = ['-session_date', 'start_time']

    def __str__(self):
        if self.session_type == 'pt_session':
            return f"{self.member.username} - Buổi tập PT với {self.trainer.username if self.trainer else 'N/A'} - {self.session_date}"
        return f"{self.member.username} - Buổi tự tập - {self.session_date}"

    def save(self, *args, **kwargs):
        # Nếu là buổi PT được hoàn thành, giảm số buổi PT còn lại trong gói
        if self.status == 'completed' and self.session_type == 'pt_session' and self.subscription:
            if self.subscription.remaining_pt_sessions > 0:
                self.subscription.remaining_pt_sessions -= 1
                self.subscription.save()
        super().save(*args, **kwargs)


class TrainingProgress(models.Model):
    health_info = models.ForeignKey(HealthInfo, on_delete=models.CASCADE, related_name='progress_records')
    date = models.DateField()
    weight = models.FloatField(help_text='Cân nặng (kg)')
    body_fat_percentage = models.FloatField(blank=True, null=True)
    muscle_mass = models.FloatField(blank=True, null=True, help_text='Khối lượng cơ (kg)')
    chest = models.FloatField(blank=True, null=True, help_text='Số đo ngực (cm)')
    waist = models.FloatField(blank=True, null=True, help_text='Số đo vòng eo (cm)')
    hips = models.FloatField(blank=True, null=True, help_text='Số đo vòng hông (cm)')
    thighs = models.FloatField(blank=True, null=True, help_text='Số đo đùi (cm)')
    arms = models.FloatField(blank=True, null=True, help_text='Số đo cánh tay (cm)')
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_progress_records')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Bản ghi tiến độ"
        verbose_name_plural = "Bản ghi tiến độ"
        ordering = ['-date']

    def __str__(self):
        return f"Tiến độ của {self.health_info.user.username} ngày {self.date}"


# Mô hình theo dõi các bài tập và thành tích
class Exercise(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    target_muscles = models.CharField(max_length=255, blank=True, null=True)
    equipment_needed = models.CharField(max_length=255, blank=True, null=True)
    difficulty_level = models.IntegerField(choices=[(1, 'Dễ'), (2, 'Trung bình'), (3, 'Khó')], default=1)

    class Meta:
        verbose_name = "Bài tập"
        verbose_name_plural = "Bài tập"

    def __str__(self):
        return self.name


class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('session_reminder', 'Nhắc nhở buổi tập'),
        ('subscription_expiry', 'Sắp hết hạn gói tập'),
        ('new_promotion', 'Ưu đãi mới'),
        ('payment_confirmation', 'Xác nhận thanh toán'),
        ('feedback_request', 'Yêu cầu đánh giá'),
        ('feedback_response', 'Phản hồi đánh giá'),
        ('system', 'Thông báo hệ thống'),
    )
    user = models.ForeignKey('User', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    related_object_id = models.IntegerField(blank=True, null=True)  # ID của đối tượng liên quan
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    scheduled_time = models.DateTimeField(null=True, blank=True)  # Thời gian lên lịch gửi
    sent = models.BooleanField(default=False)  # Đã gửi hay chưa

    class Meta:
        verbose_name = "Thông báo"
        verbose_name_plural = "Thông báo"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.username}"


# Mô hình Ưu đãi/Khuyến mãi
class Promotion(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    applicable_packages = models.ManyToManyField(Packages, blank=True, related_name='promotions')
    promo_code = models.CharField(max_length=50, unique=True)
    is_active = models.BooleanField(default=True)
    max_uses = models.IntegerField(default=0, help_text="0 để không giới hạn")
    times_used = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Khuyến mãi"
        verbose_name_plural = "Khuyến mãi"
        ordering = ['-valid_from']

    def __str__(self):
        return self.title

    @property
    def is_valid(self):
        from django.utils import timezone
        now = timezone.now()
        return (
                self.is_active and
                self.valid_from <= now <= self.valid_to and
                (self.max_uses == 0 or self.times_used < self.max_uses)
        )


class Payment(models.Model):
    PAYMENT_STATUS = (
        ('pending', 'Chờ xác nhận'),
        ('completed', 'Đã thanh toán'),
        ('failed', 'Thất bại'),
        ('refunded', 'Đã hoàn tiền'),
    )

    PAYMENT_METHOD = (
        ('momo', 'MoMo'),
        ('vnpay', 'VNPAY'),
        ('bank_transfer', 'Chuyển khoản ngân hàng'),
        ('cash', 'Tiền mặt'),
        ('other', 'Khác'),
    )

    subscription = models.ForeignKey(SubscriptionPackage, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    transaction_id = models.CharField(max_length=255, blank=True, null=True)
    payment_date = models.DateTimeField(auto_now_add=True)
    confirmed_date = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    # Thông tin bổ sung cho từng phương thức thanh toán
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_name = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Thanh toán"
        verbose_name_plural = "Thanh toán"
        ordering = ['-payment_date']

    def __str__(self):
        return f"Thanh toán {self.amount} - {self.get_payment_method_display()} - {self.get_status_display()}"


class PaymentReceipt(models.Model):
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='receipt')
    receipt_image = models.ImageField(upload_to='receipts/', verbose_name="Ảnh biên lai")
    upload_date = models.DateTimeField(auto_now_add=True)
    verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='verified_receipts')
    verification_date = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Biên lai thanh toán"
        verbose_name_plural = "Biên lai thanh toán"

    def __str__(self):
        return f"Biên lai cho {self.payment}"


class Rating(models.Model):
    RATING_TYPES = (
        ('trainer', 'Huấn luyện viên'),
        ('facility', 'Cơ sở vật chất'),
        ('service', 'Dịch vụ'),
        ('class', 'Lớp tập'),
        ('overall', 'Tổng thể'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ratings_given')
    rating_type = models.CharField(max_length=20, choices=RATING_TYPES)
    # Object ID sẽ là ID của đối tượng được đánh giá (PT, cơ sở, dịch vụ...)
    object_id = models.IntegerField(null=True, blank=True)
    score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True, null=True)
    anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Đánh giá"
        verbose_name_plural = "Đánh giá"
        ordering = ['-created_at']
        # Đảm bảo mỗi người dùng chỉ đánh giá một lần cho mỗi đối tượng
        unique_together = ['user', 'rating_type', 'object_id']

    def __str__(self):
        if self.rating_type == 'trainer':
            try:
                rated_object = User.objects.get(id=self.object_id)
                return f"Đánh giá PT {rated_object.username} bởi {self.user.username}"
            except User.DoesNotExist:
                pass
        return f"Đánh giá {self.get_rating_type_display()} bởi {self.user.username}"


class TrainerRating(models.Model):
    trainer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_ratings')
    member = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trainer_ratings')
    knowledge_score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)],
                                          verbose_name="Kiến thức chuyên môn")
    communication_score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)],
                                              verbose_name="Kỹ năng giao tiếp")
    punctuality_score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)],
                                            verbose_name="Đúng giờ")
    overall_score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)],
                                        verbose_name="Đánh giá tổng thể")
    comment = models.TextField(blank=True, null=True)
    anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Đánh giá huấn luyện viên"
        verbose_name_plural = "Đánh giá huấn luyện viên"
        ordering = ['-created_at']
        unique_together = ['trainer', 'member']

    def __str__(self):
        if self.anonymous:
            return f"Đánh giá ẩn danh cho PT {self.trainer.username}"
        return f"Đánh giá PT {self.trainer.username} bởi {self.member.username}"

    @property
    def average_score(self):
        """Tính điểm trung bình từ các điểm thành phần"""
        scores = [self.knowledge_score, self.communication_score, self.punctuality_score, self.overall_score]
        return sum(scores) / len(scores)


class FeedbackResponse(models.Model):
    rating = models.ForeignKey(Rating, on_delete=models.CASCADE, related_name='responses', null=True, blank=True)
    trainer_rating = models.ForeignKey(TrainerRating, on_delete=models.CASCADE, related_name='responses', null=True,
                                       blank=True)
    responder = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedback_responses')
    response_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Phản hồi đánh giá"
        verbose_name_plural = "Phản hồi đánh giá"
        ordering = ['-created_at']

    def __str__(self):
        if self.rating:
            return f"Phản hồi cho đánh giá ID:{self.rating.id}"
        return f"Phản hồi cho đánh giá PT ID:{self.trainer_rating.id}"


class Gym(models.Model):
    name = models.CharField(max_length=100)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


# member

class MemberProxy(User):
    class Meta:
        proxy = True
        verbose_name = 'Hội viên'
        verbose_name_plural = 'Hội viên'


class TrainerProxy(User):
    class Meta:
        proxy = True
        verbose_name = 'Huấn luyện viên'
        verbose_name_plural = 'Huấn luyện viên'


class ManagerProxy(User):
    class Meta:
        proxy = True
        verbose_name = 'Quản lý'
        verbose_name_plural = 'Quản lý'
