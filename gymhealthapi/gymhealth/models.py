from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE = (
        ('MANAGER', 'Quản lý phòng gym'),
        ('PT', 'Huấn luyện viên (PT)'),
        ('MEMBER', 'Hội viên'),
    )

    role = models.CharField(max_length=20, choices=ROLE, default='MEMBER')
    phone_number = models.CharField(max_length=15)
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)

    def __str__(self):
        return f"{self.username} - {self.get_role_display()}"

class MemberProfile(models.Model):
    GOAL_CHOICES = (
        ('weight_loss', 'Giảm cân'),
        ('muscle_gain', 'Tăng cơ'),
        ('endurance', 'Tăng sức bền'),
        ('flexibility', 'Tăng tính linh hoạt'),
        ('general_fitness', 'Thể lực tổng quát'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='health_profile')
    height = models.FloatField(help_text='Chiều cao (cm)')
    weight = models.FloatField(help_text='Cân nặng (kg)')
    goal = models.CharField(max_length=20, choices=GOAL_CHOICES)
    health_conditions = models.TextField(blank=True, help_text='Các vấn đề sức khỏe đặc biệt')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Hồ sơ sức khỏe của {self.user.username}"


class Gym(models.Model):
    name = models.CharField(max_length=100)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name



class Review(models.Model):
    RATING_CHOICES = [(i, i) for i in range(1, 6)]
    member = models.ForeignKey('User', on_delete=models.CASCADE)
    target_type = models.CharField(max_length=10, choices=[('GYM', 'Phòng gym'), ('PT', 'Huấn luyện viên')])
    target_id = models.PositiveIntegerField()  # Sử dụng GenericForeignKey nếu muốn nâng cao
    rating = models.IntegerField(choices=RATING_CHOICES)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


class Packages(models.Model):
    DURATION_CHOICES = (
        ('MONTHLY', 'Theo tháng'),
        ('QUARTERLY', 'Theo quý'),
        ('YEARLY', 'Theo năm'),
        ('CUSTOM', 'Tùy chỉnh'),
    )

    name = models.CharField(max_length=100)
    duration_type = models.CharField(max_length=20, choices=DURATION_CHOICES)
    duration_days = models.IntegerField(help_text='Số ngày có hiệu lực')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    pt_sessions = models.IntegerField(default=0, help_text='Số buổi tập với PT')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.get_duration_type_display()}"

class MemberPackage(models.Model):
    member = models.ForeignKey('User', on_delete=models.CASCADE)
    package = models.ForeignKey(Packages, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    active = models.BooleanField(default=True)

class WorkoutSchedule(models.Model):
    member = models.ForeignKey('User', related_name='member_schedule', on_delete=models.CASCADE)
    trainer = models.ForeignKey('User', related_name='trainer_schedule', on_delete=models.SET_NULL, null=True, blank=True)
    scheduled_time = models.DateTimeField()
    is_personal_training = models.BooleanField(default=True)
    status = models.CharField(max_length=10, choices=[('PENDING', 'Chờ duyệt'), ('APPROVED', 'Đã duyệt'), ('REJECTED', 'Từ chối')], default='PENDING')
    note = models.TextField(blank=True)

class WorkoutProgress(models.Model):
    member = models.ForeignKey('User', on_delete=models.CASCADE)
    date = models.DateField()
    weight = models.FloatField()
    body_fat = models.FloatField(null=True, blank=True)
    muscle_mass = models.FloatField(null=True, blank=True)
    comment = models.TextField(blank=True)

    class Meta:
        ordering = ['date']


class Notification(models.Model):
    user = models.ForeignKey('User', on_delete=models.CASCADE)
    message = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)

    def __str__(self):
        return f"To: {self.user.username} - {self.message[:30]}"