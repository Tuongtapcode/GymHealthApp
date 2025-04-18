# Generated by Django 5.2 on 2025-04-18 03:24

import cloudinary.models
import django.contrib.auth.models
import django.contrib.auth.validators
import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='Benefit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('active', models.BooleanField(default=True)),
                ('created_date', models.DateTimeField(auto_now_add=True)),
                ('updated_date', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=100, verbose_name='Tên quyền lợi')),
                ('description', models.TextField(blank=True, null=True, verbose_name='Mô tả chi tiết')),
                ('icon', models.CharField(blank=True, max_length=50, null=True, verbose_name='Icon')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Exercise',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, null=True)),
                ('target_muscles', models.CharField(blank=True, max_length=255, null=True)),
                ('equipment_needed', models.CharField(blank=True, max_length=255, null=True)),
                ('difficulty_level', models.IntegerField(choices=[(1, 'Dễ'), (2, 'Trung bình'), (3, 'Khó')], default=1)),
            ],
            options={
                'verbose_name': 'Bài tập',
                'verbose_name_plural': 'Bài tập',
            },
        ),
        migrations.CreateModel(
            name='Gym',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('address', models.TextField()),
                ('phone', models.CharField(max_length=20)),
                ('description', models.TextField(blank=True)),
            ],
        ),
        migrations.CreateModel(
            name='PackageType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('active', models.BooleanField(default=True)),
                ('created_date', models.DateTimeField(auto_now_add=True)),
                ('updated_date', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=100, verbose_name='Tên loại gói')),
                ('duration_months', models.PositiveIntegerField(default=1, verbose_name='Số tháng')),
                ('description', models.TextField(blank=True, null=True, verbose_name='Mô tả')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('payment_method', models.CharField(choices=[('momo', 'MoMo'), ('vnpay', 'VNPAY'), ('bank_transfer', 'Chuyển khoản ngân hàng'), ('cash', 'Tiền mặt'), ('other', 'Khác')], max_length=20)),
                ('status', models.CharField(choices=[('pending', 'Chờ xác nhận'), ('completed', 'Đã thanh toán'), ('failed', 'Thất bại'), ('refunded', 'Đã hoàn tiền')], default='pending', max_length=20)),
                ('transaction_id', models.CharField(blank=True, max_length=255, null=True)),
                ('payment_date', models.DateTimeField(auto_now_add=True)),
                ('confirmed_date', models.DateTimeField(blank=True, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('bank_name', models.CharField(blank=True, max_length=100, null=True)),
                ('account_name', models.CharField(blank=True, max_length=100, null=True)),
                ('account_number', models.CharField(blank=True, max_length=50, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Thanh toán',
                'verbose_name_plural': 'Thanh toán',
                'ordering': ['-payment_date'],
            },
        ),
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('username', models.CharField(error_messages={'unique': 'A user with that username already exists.'}, help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.', max_length=150, unique=True, validators=[django.contrib.auth.validators.UnicodeUsernameValidator()], verbose_name='username')),
                ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                ('email', models.EmailField(blank=True, max_length=254, verbose_name='email address')),
                ('is_staff', models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.', verbose_name='staff status')),
                ('is_active', models.BooleanField(default=True, help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.', verbose_name='active')),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('role', models.CharField(choices=[('MANAGER', 'Quản lý phòng gym'), ('TRAINER', 'Huấn luyện viên (PT)'), ('MEMBER', 'Hội viên')], default='MEMBER', max_length=20)),
                ('phone_number', models.CharField(max_length=15)),
                ('date_of_birth', models.DateField(blank=True, null=True)),
                ('address', models.TextField(blank=True)),
                ('avatar', cloudinary.models.CloudinaryField(max_length=255)),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'verbose_name': 'user',
                'verbose_name_plural': 'users',
                'abstract': False,
            },
            managers=[
                ('objects', django.contrib.auth.models.UserManager()),
            ],
        ),
        migrations.CreateModel(
            name='ManagerProxy',
            fields=[
            ],
            options={
                'verbose_name': 'Quản lý',
                'verbose_name_plural': 'Quản lý',
                'proxy': True,
                'indexes': [],
                'constraints': [],
            },
            bases=('gymhealth.user',),
            managers=[
                ('objects', django.contrib.auth.models.UserManager()),
            ],
        ),
        migrations.CreateModel(
            name='MemberProxy',
            fields=[
            ],
            options={
                'verbose_name': 'Hội viên',
                'verbose_name_plural': 'Hội viên',
                'proxy': True,
                'indexes': [],
                'constraints': [],
            },
            bases=('gymhealth.user',),
            managers=[
                ('objects', django.contrib.auth.models.UserManager()),
            ],
        ),
        migrations.CreateModel(
            name='TrainerProxy',
            fields=[
            ],
            options={
                'verbose_name': 'Huấn luyện viên',
                'verbose_name_plural': 'Huấn luyện viên',
                'proxy': True,
                'indexes': [],
                'constraints': [],
            },
            bases=('gymhealth.user',),
            managers=[
                ('objects', django.contrib.auth.models.UserManager()),
            ],
        ),
        migrations.CreateModel(
            name='HealthInfo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('height', models.FloatField(help_text='Chiều cao (cm)')),
                ('weight', models.FloatField(help_text='Cân nặng (kg)')),
                ('training_goal', models.CharField(choices=[('weight_loss', 'Giảm cân'), ('muscle_gain', 'Tăng cơ'), ('endurance', 'Tăng sức bền'), ('flexibility', 'Tăng tính linh hoạt'), ('general_fitness', 'Thể lực tổng quát')], max_length=20)),
                ('health_conditions', models.TextField(blank=True, help_text='Các vấn đề sức khỏe đặc biệt')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('notes', models.TextField(blank=True, help_text='Ghi chú về tình trạng sức khỏe', null=True)),
                ('body_fat_percentage', models.FloatField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(3), django.core.validators.MaxValueValidator(70)])),
                ('blood_pressure', models.CharField(blank=True, help_text='Định dạng: 120/80', max_length=20, null=True)),
                ('medical_conditions', models.TextField(blank=True, help_text='Các vấn đề sức khỏe cần lưu ý', null=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='health_info', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='MemberProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('membership_start_date', models.DateField(auto_now_add=True)),
                ('membership_end_date', models.DateField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('emergency_contact_name', models.CharField(blank=True, max_length=100, null=True)),
                ('emergency_contact_phone', models.CharField(blank=True, max_length=15, null=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='member_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Hồ sơ hội viên',
                'verbose_name_plural': 'Hồ sơ hội viên',
            },
        ),
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('notification_type', models.CharField(choices=[('session_reminder', 'Nhắc nhở buổi tập'), ('subscription_expiry', 'Sắp hết hạn gói tập'), ('new_promotion', 'Ưu đãi mới'), ('payment_confirmation', 'Xác nhận thanh toán'), ('feedback_request', 'Yêu cầu đánh giá'), ('feedback_response', 'Phản hồi đánh giá'), ('system', 'Thông báo hệ thống')], max_length=30)),
                ('related_object_id', models.IntegerField(blank=True, null=True)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('scheduled_time', models.DateTimeField(blank=True, null=True)),
                ('sent', models.BooleanField(default=False)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Thông báo',
                'verbose_name_plural': 'Thông báo',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Packages',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('active', models.BooleanField(default=True)),
                ('created_date', models.DateTimeField(auto_now_add=True)),
                ('updated_date', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(verbose_name='Mô tả gói tập')),
                ('price', models.DecimalField(decimal_places=2, max_digits=10, validators=[django.core.validators.MinValueValidator(Decimal('0.00'))], verbose_name='Giá gói tập')),
                ('image', cloudinary.models.CloudinaryField(max_length=255)),
                ('pt_sessions', models.PositiveIntegerField(default=0, verbose_name='Số buổi tập với PT')),
                ('benefits', models.ManyToManyField(blank=True, related_name='packages', to='gymhealth.benefit', verbose_name='Quyền lợi')),
                ('package_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='packages', to='gymhealth.packagetype', verbose_name='Loại gói')),
            ],
            options={
                'verbose_name': 'Gói tập',
                'verbose_name_plural': 'Gói tập',
                'ordering': ['package_type__duration_months', 'price'],
            },
        ),
        migrations.CreateModel(
            name='PaymentReceipt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('receipt_image', models.ImageField(upload_to='receipts/', verbose_name='Ảnh biên lai')),
                ('upload_date', models.DateTimeField(auto_now_add=True)),
                ('verified', models.BooleanField(default=False)),
                ('verification_date', models.DateTimeField(blank=True, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('payment', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='receipt', to='gymhealth.payment')),
                ('verified_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='verified_receipts', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Biên lai thanh toán',
                'verbose_name_plural': 'Biên lai thanh toán',
            },
        ),
        migrations.CreateModel(
            name='Promotion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('discount_percentage', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('discount_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('valid_from', models.DateTimeField()),
                ('valid_to', models.DateTimeField()),
                ('promo_code', models.CharField(max_length=50, unique=True)),
                ('is_active', models.BooleanField(default=True)),
                ('max_uses', models.IntegerField(default=0, help_text='0 để không giới hạn')),
                ('times_used', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('applicable_packages', models.ManyToManyField(blank=True, related_name='promotions', to='gymhealth.packages')),
            ],
            options={
                'verbose_name': 'Khuyến mãi',
                'verbose_name_plural': 'Khuyến mãi',
                'ordering': ['-valid_from'],
            },
        ),
        migrations.CreateModel(
            name='Rating',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rating_type', models.CharField(choices=[('trainer', 'Huấn luyện viên'), ('facility', 'Cơ sở vật chất'), ('service', 'Dịch vụ'), ('class', 'Lớp tập'), ('overall', 'Tổng thể')], max_length=20)),
                ('object_id', models.IntegerField(blank=True, null=True)),
                ('score', models.IntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('comment', models.TextField(blank=True, null=True)),
                ('anonymous', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ratings_given', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Đánh giá',
                'verbose_name_plural': 'Đánh giá',
                'ordering': ['-created_at'],
                'unique_together': {('user', 'rating_type', 'object_id')},
            },
        ),
        migrations.CreateModel(
            name='SubscriptionPackage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_date', models.DateField(verbose_name='Ngày bắt đầu')),
                ('end_date', models.DateField(verbose_name='Ngày kết thúc')),
                ('remaining_pt_sessions', models.PositiveIntegerField(verbose_name='Số buổi PT còn lại')),
                ('status', models.CharField(choices=[('pending', 'Chờ thanh toán'), ('active', 'Đang hoạt động'), ('expired', 'Hết hạn'), ('cancelled', 'Đã hủy')], default='pending', max_length=20, verbose_name='Trạng thái')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('original_price', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('discounted_price', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('applied_promotion', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='applied_subscriptions', to='gymhealth.promotion')),
                ('member', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subscriptions', to=settings.AUTH_USER_MODEL, verbose_name='Hội viên')),
                ('package', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subscriptions', to='gymhealth.packages', verbose_name='Gói tập')),
            ],
            options={
                'verbose_name': 'Đăng ký gói tập',
                'verbose_name_plural': 'Đăng ký gói tập',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddField(
            model_name='payment',
            name='subscription',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='gymhealth.subscriptionpackage'),
        ),
        migrations.CreateModel(
            name='TrainerProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('bio', models.TextField(blank=True, null=True)),
                ('specialization', models.CharField(blank=True, help_text='Chuyên môn huấn luyện', max_length=255, null=True)),
                ('certification', models.CharField(blank=True, help_text='Chứng chỉ huấn luyện', max_length=255, null=True)),
                ('experience_years', models.PositiveIntegerField(default=0)),
                ('hourly_rate', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='trainer_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Hồ sơ huấn luyện viên',
                'verbose_name_plural': 'Hồ sơ huấn luyện viên',
            },
        ),
        migrations.CreateModel(
            name='TrainerRating',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('knowledge_score', models.IntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)], verbose_name='Kiến thức chuyên môn')),
                ('communication_score', models.IntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)], verbose_name='Kỹ năng giao tiếp')),
                ('punctuality_score', models.IntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)], verbose_name='Đúng giờ')),
                ('overall_score', models.IntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)], verbose_name='Đánh giá tổng thể')),
                ('comment', models.TextField(blank=True, null=True)),
                ('anonymous', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('member', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='trainer_ratings', to=settings.AUTH_USER_MODEL)),
                ('trainer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='received_ratings', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Đánh giá huấn luyện viên',
                'verbose_name_plural': 'Đánh giá huấn luyện viên',
                'ordering': ['-created_at'],
                'unique_together': {('trainer', 'member')},
            },
        ),
        migrations.CreateModel(
            name='FeedbackResponse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('response_text', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('responder', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='feedback_responses', to=settings.AUTH_USER_MODEL)),
                ('rating', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='responses', to='gymhealth.rating')),
                ('trainer_rating', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='responses', to='gymhealth.trainerrating')),
            ],
            options={
                'verbose_name': 'Phản hồi đánh giá',
                'verbose_name_plural': 'Phản hồi đánh giá',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='TrainingProgress',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('weight', models.FloatField(help_text='Cân nặng (kg)')),
                ('body_fat_percentage', models.FloatField(blank=True, null=True)),
                ('muscle_mass', models.FloatField(blank=True, help_text='Khối lượng cơ (kg)', null=True)),
                ('chest', models.FloatField(blank=True, help_text='Số đo ngực (cm)', null=True)),
                ('waist', models.FloatField(blank=True, help_text='Số đo vòng eo (cm)', null=True)),
                ('hips', models.FloatField(blank=True, help_text='Số đo vòng hông (cm)', null=True)),
                ('thighs', models.FloatField(blank=True, help_text='Số đo đùi (cm)', null=True)),
                ('arms', models.FloatField(blank=True, help_text='Số đo cánh tay (cm)', null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_progress_records', to=settings.AUTH_USER_MODEL)),
                ('health_info', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='progress_records', to='gymhealth.healthinfo')),
            ],
            options={
                'verbose_name': 'Bản ghi tiến độ',
                'verbose_name_plural': 'Bản ghi tiến độ',
                'ordering': ['-date'],
            },
        ),
        migrations.CreateModel(
            name='WorkoutSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_date', models.DateField()),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('session_type', models.CharField(choices=[('pt_session', 'Buổi tập với PT'), ('self_training', 'Tự tập')], max_length=20)),
                ('status', models.CharField(choices=[('pending', 'Chờ duyệt'), ('confirmed', 'Đã xác nhận'), ('completed', 'Đã hoàn thành'), ('cancelled', 'Đã hủy'), ('rescheduled', 'Đã đổi lịch')], default='pending', max_length=20)),
                ('notes', models.TextField(blank=True, null=True)),
                ('trainer_notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('member', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='training_sessions', to=settings.AUTH_USER_MODEL)),
                ('subscription', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='training_sessions', to='gymhealth.subscriptionpackage')),
                ('trainer', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='trainer_sessions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Lịch tập',
                'verbose_name_plural': 'Lịch tập',
                'ordering': ['-session_date', 'start_time'],
            },
        ),
    ]
