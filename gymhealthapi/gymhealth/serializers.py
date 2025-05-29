from django.contrib.auth.password_validation import validate_password
from django.db.models import FloatField
from rest_framework.fields import ChoiceField, FloatField, ImageField, BooleanField, SerializerMethodField, DateField, \
    IntegerField, TimeField, ReadOnlyField

from rest_framework.serializers import ModelSerializer, CharField, ValidationError, Serializer
from datetime import date, timedelta, datetime
from gymhealth.models import User, HealthInfo, MemberProfile, TrainerProfile, Packages, PackageType, Benefit, \
    WorkoutSession, SubscriptionPackage, Promotion, Notification, TrainingProgress, TrainerRating, GymRating, Gym, \
    FeedbackResponse


class UserSerializer(ModelSerializer):
    height = FloatField(required=False)
    weight = FloatField(required=False)
    training_goal = ChoiceField(choices=HealthInfo.GOAL_CHOICES, required=False)
    health_conditions = CharField(required=False, allow_blank=True)
    # avatar = ImageField(required=False)
    password = CharField(write_only=True)  # , validators=[validate_password]
    password2 = CharField(write_only=True)  # Thêm trường xác nhận mật khẩu

    # Thêm field tùy chỉnh (avatar và role ) nên cần xử lý định dạng
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Xử lý cẩn thận trường hợp avatar là None
        data['avatar'] = instance.avatar.url if instance.avatar and hasattr(instance.avatar, 'url') else ''
        data['role'] = instance.role
        return data

    class Meta:
        model = User
        fields = [
            'username', 'password', 'password2', 'first_name', 'last_name', 'avatar',
            'role', 'phone_number', 'email', 'date_of_birth', 'address',
            'height', 'weight', 'training_goal', 'health_conditions'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True}
        }

    def validate(self, data):
        if data.get('password') != data.pop('password2', None):
            raise ValidationError({"password": "Mật khẩu không khớp"})

        role = data.get('role', 'MEMBER')  # default MEMBER
        if role == 'MEMBER':
            if not all([data.get('height'), data.get('weight'), data.get('training_goal')]):
                raise ValidationError(
                    "Hội viên phải cung cấp chiều cao, cân nặng và mục tiêu tập luyện.")

        if data.get('height') and data.get('height') <= 0:
            raise ValidationError({"height": "Chiều cao phải lớn hơn 0"})
        if data.get('weight') and data.get('weight') <= 0:
            raise ValidationError({"weight": "Cân nặng phải lớn hơn 0"})

        return data

    def validate_email(self, value):
        # Kiểm tra email đã tồn tại chưa
        if User.objects.filter(email=value).exists():
            raise ValidationError("Email này đã được sử dụng.")
        return value

    def create(self, validated_data):
        role = validated_data.get('role')
        if role not in ['MEMBER', 'TRAINER']:
            raise ValidationError("Role phải là 'MEMBER' hoặc 'TRAINER'. Bạn không thể tạo user khác role này.")
        data = validated_data.copy()
        # Tách các field liên quan đến sức khỏe ra
        height = data.pop('height', None)
        weight = data.pop('weight', None)
        training_goal = data.pop('training_goal', None)
        health_conditions = data.pop('health_conditions', '')

        # Tạo User
        password = data.pop('password')
        user = User(**data)
        user.set_password(password)
        user.save()

        # Sau khi user tạo xong, tùy theo role sẽ tạo thêm bảng phụ
        if user.role == 'MEMBER':
            HealthInfo.objects.create(
                user=user,
                height=height,
                weight=weight,
                training_goal=training_goal,
                health_conditions=health_conditions
            )
            MemberProfile.objects.create(user=user)

        elif user.role == 'TRAINER':
            TrainerProfile.objects.create(user=user)

        # Nếu MANAGER thì không cần thêm gì

        return user


class HealthInfoSerializer(ModelSerializer):
    class Meta:
        model = HealthInfo
        fields = '__all__'
        # Các trường chỉ đọc
        # Người dùng không được phép cung cấp hoặc chỉnh sửa giá trị của các trường này thông qua API.
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def validate(self, data):
        # Kiểm tra chiều cao và cân nặng hợp lý
        if data.get('height') is not None and data['height'] <= 0:
            raise ValidationError({"height": "Chiều cao phải lớn hơn 0"})
        if data.get('weight') is not None and data['weight'] <= 0:
            raise ValidationError({"weight": "Cân nặng phải lớn hơn 0"})
        # Kiểm tra body_fat_percentage nếu được cung cấp
        if data.get('body_fat_percentage') is not None:
            if data['body_fat_percentage'] < 3 or data['body_fat_percentage'] > 70:
                raise ValidationError({"body_fat_percentage": "Phần trăm mỡ cơ thể phải từ 3% đến 70%"})
        return data


class MemberProfileSerializer(ModelSerializer):
    is_membership_valid = BooleanField(read_only=True)
    username = CharField(source='user.username', read_only=True)
    email = CharField(source='user.email', read_only=True)
    avatar = CharField(source='user.avatar.url', read_only=True)

    class Meta:
        model = MemberProfile
        fields = ('id', 'username', 'email', 'avatar','membership_start_date', 'membership_end_date',
                  'is_active', 'emergency_contact_name', 'emergency_contact_phone',
                  'is_membership_valid')
        read_only_fields = ['id', 'user', 'membership_start_date']

class TrainerProfileSerializer(ModelSerializer):
    username = CharField(source='user.username', read_only=True)
    email = CharField(source='user.email', read_only=True)

    class Meta:
        model = TrainerProfile
        fields = ('id', 'username', 'email', 'bio', 'specialization',
                  'certification', 'experience_years', 'hourly_rate')
        read_only_fields = ['id', 'user']

    def validate_hourly_rate(self, value):
        if value < 0:
            raise ValidationError("Giá theo giờ không thể là số âm")
        return value

    def validate_experience_years(self, value):
        if value < 0:
            raise ValidationError("Số năm kinh nghiệm không thể là số âm")
        return value


class PackageTypeSerializer(ModelSerializer):
    class Meta:
        model = PackageType
        fields = '__all__'


class BenefitSerializer(ModelSerializer):
    class Meta:
        model = Benefit
        fields = '__all__'


class PackageSerializer(ModelSerializer):
    price_per_month = SerializerMethodField()

    class Meta:
        model = Packages
        fields = '__all__'

    def get_price_per_month(self, obj):
        return obj.price_per_month


class PackageDetailSerializer(PackageSerializer):
    package_type = PackageTypeSerializer(read_only=True)
    benefits = BenefitSerializer(many=True, read_only=True)


class SubscriptionPackageSerializer(ModelSerializer):
    promo_code = CharField(required=False, write_only=True)
    member_username = CharField(source='member.username', read_only=True)
    package_name = CharField(source='package.name', read_only=True)
    remaining_days = SerializerMethodField()

    class Meta:
        model = SubscriptionPackage
        fields = [
            'id', 'member', 'member_username', 'package', 'package_name',
            'start_date', 'end_date', 'remaining_pt_sessions', 'status',
            'original_price', 'discounted_price', 'applied_promotion',
            'promo_code', 'remaining_days', 'created_at'
        ]
        read_only_fields = [
            'id', 'remaining_pt_sessions', 'original_price',
            'discounted_price', 'applied_promotion', 'created_at'
        ]

    def get_remaining_days(self, obj):
        return obj.days_until_expiry

    def validate(self, data):
        # Kiểm tra người dùng có phải là hội viên không
        member = data.get('member')
        if not member or not member.is_member:
            raise ValidationError({"member": "Người dùng phải là hội viên để đăng ký gói tập."})

        # Kiểm tra người dùng có hồ sơ hội viên không
        try:
            member.member_profile
        except MemberProfile.DoesNotExist:
            raise ValidationError({"member": "Người dùng chưa có hồ sơ hội viên."})

        # Kiểm tra và xử lý mã khuyến mãi nếu có
        promo_code = data.pop('promo_code', None)
        if promo_code:
            try:
                promotion = Promotion.objects.get(promo_code=promo_code, is_active=True)

                # Kiểm tra tính hợp lệ của khuyến mãi
                from django.utils import timezone
                now = timezone.now()

                if promotion.valid_from > now or promotion.valid_to < now:
                    raise ValidationError({"promo_code": "Mã khuyến mãi đã hết hạn hoặc chưa có hiệu lực."})

                if promotion.max_uses > 0 and promotion.times_used >= promotion.max_uses:
                    raise ValidationError({"promo_code": "Mã khuyến mãi đã hết lượt sử dụng."})

                # Kiểm tra khuyến mãi có áp dụng cho gói này không
                package = data.get('package')
                if promotion.applicable_packages.exists() and not promotion.applicable_packages.filter(
                        id=package.id).exists():
                    raise ValidationError({"promo_code": "Mã khuyến mãi không áp dụng cho gói tập này."})

                # Lưu thông tin khuyến mãi để sử dụng trong create
                self.context['promotion'] = promotion

            except Promotion.DoesNotExist:
                raise ValidationError({"promo_code": "Mã khuyến mãi không hợp lệ."})

        # Kiểm tra ngày bắt đầu và kết thúc
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if start_date and end_date and start_date > end_date:
            raise ValidationError({"end_date": "Ngày kết thúc phải sau ngày bắt đầu."})

        from datetime import date
        if start_date and start_date < date.today():
            raise ValidationError({"start_date": "Ngày bắt đầu không thể là ngày trong quá khứ."})

        return data

    def create(self, validated_data):
        package = validated_data.get('package')

        # Tính ngày kết thúc nếu không được cung cấp
        if not validated_data.get('end_date'):
            from datetime import timedelta
            duration_months = package.package_type.duration_months
            start_date = validated_data.get('start_date')
            # Tính ngày kết thúc dựa trên số tháng của gói
            # Đơn giản hóa bằng cách thêm số ngày (30 ngày * số tháng)
            end_date = start_date + timedelta(days=30 * duration_months)
            validated_data['end_date'] = end_date

        # Áp dụng khuyến mãi nếu có
        promotion = self.context.get('promotion')
        if promotion:
            validated_data['applied_promotion'] = promotion
            # Tăng số lần sử dụng của mã
            promotion.times_used += 1
            promotion.save()

        # Tạo đăng ký gói
        subscription = SubscriptionPackage.objects.create(**validated_data)

        # Cập nhật thông tin hội viên
        member_profile = subscription.member.member_profile
        member_profile.membership_end_date = subscription.end_date
        member_profile.is_active = True
        member_profile.save()

        # Gửi thông báo đăng ký thành công
        Notification.objects.create(
            user=subscription.member,
            title="Đăng ký gói tập thành công",
            message=f"Bạn đã đăng ký thành công gói {subscription.package.name}. "
                    f"Gói tập có hiệu lực từ {subscription.start_date} đến {subscription.end_date}.",
            notification_type="payment_confirmation",
            related_object_id=subscription.id
        )

        return subscription


class SubscriptionPackageDetailSerializer(SubscriptionPackageSerializer):
    """Serializer chi tiết cho đăng ký gói tập, bao gồm thông tin đầy đủ về gói và khuyến mãi"""
    package = PackageDetailSerializer(read_only=True)
    applied_promotion = SerializerMethodField()

    def get_applied_promotion(self, obj):
        if obj.applied_promotion:
            return {
                'id': obj.applied_promotion.id,
                'title': obj.applied_promotion.title,
                'discount_percentage': obj.applied_promotion.discount_percentage,
                'discount_amount': obj.applied_promotion.discount_amount,
                'promo_code': obj.applied_promotion.promo_code
            }
        return None


class WorkoutSessionScheduleSerializer(ModelSerializer):
    """Serializer cho lịch làm việc của PT"""
    status_display = CharField(source='get_status_display', read_only=True)
    member_name = CharField(source='member.get_full_name', read_only=True)
    session_type_display = CharField(source='get_session_type_display', read_only=True)

    class Meta:
        model = WorkoutSession
        fields = ['id', 'session_date', 'start_time', 'end_time',
                  'status', 'status_display', 'session_type',
                  'session_type_display', 'member_name']


class TrainerListSerializer(ModelSerializer):
    """Serializer để hiển thị danh sách PT với thông tin cơ bản và lịch làm việc"""
    trainer_profile = TrainerProfileSerializer(read_only=True)
    full_name = SerializerMethodField()
    avatar_url = SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'avatar_url', 'trainer_profile']

    def get_full_name(self, obj):
        return obj.get_full_name() if obj.get_full_name() else obj.username

    def get_avatar_url(self, obj):
        if hasattr(obj, 'avatar') and obj.avatar:
            return obj.avatar.url
        return None


class SubscriptionPackageSerializer(ModelSerializer):
    class Meta:
        model = SubscriptionPackage
        fields = '__all__'


class TrainerDetailSerializer(ModelSerializer):
    """Serializer cho thông tin chi tiết của một PT"""
    trainer_profile = TrainerProfileSerializer(read_only=True)
    full_name = SerializerMethodField()
    avatar_url = SerializerMethodField()
    date_of_birth = DateField(format="%d-%m-%Y", read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'full_name',
            'email', 'phone_number', 'date_of_birth', 'address',
            'avatar_url', 'trainer_profile'
        ]

    def get_full_name(self, obj):
        return obj.get_full_name() if obj.get_full_name() else obj.username

    def get_avatar_url(self, obj):
        if hasattr(obj, 'avatar') and obj.avatar:
            return obj.avatar.url
        return None


class WorkoutSessionCreateSerializer(ModelSerializer):
    """Serializer để tạo buổi tập mới"""

    class Meta:
        model = WorkoutSession
        fields = ['session_date', 'start_time', 'end_time', 'session_type', 'trainer', 'notes']
        extra_kwargs = {
            'trainer': {'required': False},
            'notes': {'required': False},
        }

    def validate(self, data):
        """Kiểm tra tính hợp lệ của dữ liệu đầu vào"""
        # Kiểm tra ngày tập phải là ngày trong tương lai
        if data['session_date'] < date.today():
            raise ValidationError({"session_date": "Ngày tập phải là ngày trong tương lai."})

        # Kiểm tra thời gian kết thúc phải sau thời gian bắt đầu
        if data['end_time'] <= data['start_time']:
            raise ValidationError({"end_time": "Thời gian kết thúc phải sau thời gian bắt đầu."})

        # Nếu là buổi tập với PT, phải chọn PT
        if data['session_type'] == 'pt_session' and not data.get('trainer'):
            raise ValidationError({"trainer": "Phải chọn huấn luyện viên cho buổi tập PT."})

        # Nếu là buổi tự tập, không được chọn PT
        if data['session_type'] == 'self_training' and data.get('trainer'):
            raise ValidationError({"trainer": "Không cần chọn huấn luyện viên cho buổi tự tập."})

        # Kiểm tra xem PT đã có lịch vào thời gian này chưa
        if data.get('trainer'):
            conflicting_sessions = WorkoutSession.objects.filter(
                trainer=data['trainer'],
                session_date=data['session_date'],
                status__in=['pending', 'confirmed'],
                start_time__lt=data['end_time'],
                end_time__gt=data['start_time']
            )
            if conflicting_sessions.exists():
                raise ValidationError({"trainer": "Huấn luyện viên đã có lịch tập vào thời gian này."})

        # Kiểm tra xem người dùng đã có lịch vào thời gian này chưa
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            conflicting_sessions = WorkoutSession.objects.filter(
                member=user,
                session_date=data['session_date'],
                status__in=['pending', 'confirmed'],
                start_time__lt=data['end_time'],
                end_time__gt=data['start_time']
            )
            if conflicting_sessions.exists():
                raise ValidationError({"member": "Bạn đã có lịch tập vào thời gian này."})

        return data

    def validate_session_date(self, value):
        """Kiểm tra ngày tập không quá xa trong tương lai (tối đa 30 ngày)"""
        max_days = 30
        if value > date.today() + timedelta(days=max_days):
            raise ValidationError(f"Không thể đặt lịch tập quá {max_days} ngày từ hiện tại.")
        return value

    def validate_trainer(self, value):
        """Kiểm tra người được chọn có phải là PT không"""
        if value and not value.is_trainer:
            raise ValidationError("Người được chọn không phải là huấn luyện viên.")
        return value

    def create(self, validated_data):
        """Tạo buổi tập mới"""
        request = self.context.get('request')

        # Gán người đặt lịch là người dùng hiện tại
        validated_data['member'] = request.user

        # Kiểm tra xem người dùng có gói tập hợp lệ không
        if validated_data['session_type'] == 'pt_session':
            # Tìm gói tập đang hoạt động có buổi PT còn lại
            active_subscription = SubscriptionPackage.objects.filter(
                member=request.user,
                status='active',
                end_date__gte=date.today(),
                remaining_pt_sessions__gt=0
            ).first()

            if not active_subscription:
                raise ValidationError(
                    {"subscription": "Bạn không có gói tập nào đang hoạt động có buổi PT còn lại."}
                )

            validated_data['subscription'] = active_subscription

        # Đặt trạng thái mặc định là 'pending'
        validated_data['status'] = 'pending'

        # Tạo buổi tập mới
        workout_session = WorkoutSession.objects.create(**validated_data)
        return workout_session


class WorkoutSessionListScheduleSerializer(ModelSerializer):
    member_name = SerializerMethodField()

    class Meta:
        model = WorkoutSession
        fields = ['id', 'member_name', 'session_date', 'start_time', 'end_time',
                  'session_type', 'status', 'notes', 'created_at']

    def get_member_name(self, obj):
        return f"{obj.member.first_name} {obj.member.last_name}"


# Thêm vào serializers.py

class TrainerAllSessionsSerializer(ModelSerializer):
    """Serializer chi tiết cho trainer xem tất cả lịch tập"""
    member_name = SerializerMethodField()
    member_username = SerializerMethodField()
    member_phone = SerializerMethodField()
    session_duration = SerializerMethodField()
    time_until_session = SerializerMethodField()
    subscription_info = SerializerMethodField()

    class Meta:
        model = WorkoutSession
        fields = [
            'id', 'member_id','member_name', 'member_username', 'member_phone',
            'session_date', 'start_time', 'end_time', 'session_duration',
            'session_type', 'status', 'notes', 'trainer_notes',
            'time_until_session', 'subscription_info',
            'created_at', 'updated_at'
        ]


    def get_member_name(self, obj):
        return f"{obj.member.first_name} {obj.member.last_name}"

    def get_member_username(self, obj):
        return obj.member.username

    def get_member_phone(self, obj):
        # Assuming member has a profile with phone number
        try:
            return obj.member.member_profile.phone_number if hasattr(obj.member, 'member_profile') else None
        except:
            return None

    def get_session_duration(self, obj):
        """Tính thời lượng buổi tập (phút)"""
        if obj.start_time and obj.end_time:
            start_datetime = datetime.combine(obj.session_date, obj.start_time)
            end_datetime = datetime.combine(obj.session_date, obj.end_time)
            duration = end_datetime - start_datetime
            return int(duration.total_seconds() / 60)  # Trả về số phút
        return None

    def get_time_until_session(self, obj):
        """Tính thời gian còn lại đến buổi tập"""
        now = datetime.now()
        session_datetime = datetime.combine(obj.session_date, obj.start_time)

        if session_datetime > now:
            time_diff = session_datetime - now
            days = time_diff.days
            hours = time_diff.seconds // 3600
            minutes = (time_diff.seconds % 3600) // 60

            if days > 0:
                return f"{days} ngày {hours} giờ"
            elif hours > 0:
                return f"{hours} giờ {minutes} phút"
            else:
                return f"{minutes} phút"
        elif session_datetime.date() == now.date():
            return "Hôm nay"
        else:
            return "Đã qua"

    def get_subscription_info(self, obj):
        """Thông tin gói tập của member"""
        if obj.subscription:
            return {
                'id': obj.subscription.id,
                'package_name': obj.subscription.package.name if obj.subscription.package else None,
                'remaining_pt_sessions': obj.subscription.remaining_pt_sessions,
                'end_date': obj.subscription.end_date
            }
        return None


class TrainerSessionStatsSerializer(Serializer):
    """Serializer cho thống kê buổi tập của trainer"""
    total_sessions = IntegerField()
    completed_sessions = IntegerField()
    pending_sessions = IntegerField()
    confirmed_sessions = IntegerField()
    cancelled_sessions = IntegerField()
    this_month_sessions = IntegerField()
    this_week_sessions = IntegerField()
    today_sessions = IntegerField()


class CompactSessionSerializer(ModelSerializer):
    """Serializer đơn giản cho danh sách buổi tập"""
    member_name = SerializerMethodField()
    status_display = SerializerMethodField()

    class Meta:
        model = WorkoutSession
        fields = [
            'id', 'member_name', 'session_date', 'start_time', 'end_time',
            'session_type', 'status', 'status_display'
        ]

    def get_member_name(self, obj):
        return f"{obj.member.first_name} {obj.member.last_name}"

    def get_status_display(self, obj):
        return obj.get_status_display()





class WorkoutSessionUpdateSerializer(ModelSerializer):
    class Meta:
        model = WorkoutSession
        fields = ['status', 'trainer_notes']

    def validate_status(self, value):
        # Chỉ chấp nhận một số trạng thái nhất định cho PT
        valid_statuses = ['confirmed', 'cancelled', 'rescheduled', 'completed']
        if value not in valid_statuses:
            raise ValidationError(f"Trạng thái không hợp lệ. Chọn một trong: {', '.join(valid_statuses)}")
        return value


class RescheduleSessionSerializer(Serializer):
    # Bỏ session_id vì sẽ lấy từ URL
    new_date = DateField()
    new_start_time = TimeField()
    new_end_time = TimeField()
    reason = CharField(required=False, allow_blank=True)

    def validate(self, data):
        # Kiểm tra thời gian hợp lệ
        if data['new_start_time'] >= data['new_end_time']:
            raise ValidationError("Thời gian kết thúc phải sau thời gian bắt đầu.")

        # Kiểm tra xung đột lịch - lấy session từ context thay vì dùng session_id
        trainer = self.context['request'].user
        session = self.context['session']

        conflicting_sessions = WorkoutSession.objects.filter(
            trainer=trainer,
            session_date=data['new_date'],
            start_time__lt=data['new_end_time'],
            end_time__gt=data['new_start_time'],
            status__in=['pending', 'confirmed']
        ).exclude(id=session.id)

        if conflicting_sessions.exists():
            raise ValidationError("Thời gian này đã có lịch tập khác. Vui lòng chọn thời gian khác.")

        return data


class WeeklyScheduleSerializer(ModelSerializer):
    member_name = SerializerMethodField()
    trainer_name = SerializerMethodField()

    class Meta:
        model = WorkoutSession
        fields = ['id', 'session_date', 'start_time', 'end_time', 'session_type',
                  'status', 'notes', 'member_name', 'trainer_name']

    def get_member_name(self, obj):
        return f"{obj.member.first_name} {obj.member.last_name}" if obj.member else ""

    def get_trainer_name(self, obj):
        if obj.trainer:
            return f"{obj.trainer.first_name} {obj.trainer.last_name}"
        return None


class TrainingProgressSerializer(ModelSerializer):
    member_username = SerializerMethodField()
    trainer_username = SerializerMethodField()
    date = SerializerMethodField()  # Thêm field ảo để lấy date từ workout_session

    class Meta:
        model = TrainingProgress
        fields = [
            'id', 'health_info', 'date', 'weight', 'body_fat_percentage',
            'muscle_mass', 'chest', 'waist', 'hips', 'thighs', 'arms',
            'cardio_endurance', 'strength_bench', 'strength_squat',
            'strength_deadlift', 'notes', 'created_by', 'created_at',
            'member_username', 'trainer_username', 'workout_session'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'date']

    def get_member_username(self, obj):
        return obj.health_info.user.username

    def get_trainer_username(self, obj):
        return obj.created_by.username

    def get_date(self, obj):
        return obj.workout_session.session_date

    def validate(self, data):
        # Kiểm tra cân nặng hợp lý
        if data.get('weight') is not None and data['weight'] <= 0:
            raise ValidationError({"weight": "Cân nặng phải lớn hơn 0"})

        # Kiểm tra phần trăm mỡ cơ thể nếu được cung cấp
        if data.get('body_fat_percentage') is not None:
            if data['body_fat_percentage'] < 3 or data['body_fat_percentage'] > 70:
                raise ValidationError({"body_fat_percentage": "Phần trăm mỡ cơ thể phải từ 3% đến 70%"})

        # Kiểm tra các giá trị số đo nếu được cung cấp
        for field in ['muscle_mass', 'chest', 'waist', 'hips', 'thighs', 'arms']:
            if data.get(field) is not None and data[field] <= 0:
                raise ValidationError({field: f"{field.capitalize()} phải lớn hơn 0"})

        # Kiểm tra các giá trị hiệu suất nếu được cung cấp
        for field in ['cardio_endurance', 'strength_bench', 'strength_squat', 'strength_deadlift']:
            if data.get(field) is not None and data[field] < 0:
                raise ValidationError({field: f"{field.capitalize()} không thể âm"})

        # Kiểm tra workout_session
        workout_session = data.get('workout_session')
        health_info = data.get('health_info')

        if workout_session:
            # Kiểm tra status của workout_session
            if workout_session.status != 'completed':
                raise ValidationError({
                    "workout_session": "Chỉ buổi tập có trạng thái 'Đã hoàn thành' mới có thể liên kết với bản ghi tiến độ."
                })

            # Lấy ID của bản ghi hiện tại (nếu đang cập nhật)
            instance_id = self.instance.id if self.instance else None

            # Kiểm tra xem đã có bản ghi nào cho workout_session này chưa
            existing = TrainingProgress.objects.filter(
                workout_session=workout_session
            )

            # Nếu đang cập nhật, loại trừ bản ghi hiện tại khỏi việc kiểm tra
            if instance_id:
                existing = existing.exclude(id=instance_id)

            if existing.exists():
                raise ValidationError({
                    "workout_session": "Buổi tập này đã được liên kết với một bản ghi tiến độ khác."
                })

            # Kiểm tra xem workout_session có thuộc về cùng hội viên không
            if health_info and workout_session.member != health_info.user:
                raise ValidationError({
                    "workout_session": "Buổi tập này không thuộc về hội viên được chọn."
                })

        return data


class TrainingProgressListSerializer(ModelSerializer):
    """Serializer ngắn gọn hơn để hiển thị trong danh sách"""
    member_username = SerializerMethodField()
    trainer_username = SerializerMethodField()
    date = SerializerMethodField()  # Thêm field ảo

    class Meta:
        model = TrainingProgress
        fields = [
            'id', 'health_info', 'date', 'weight', 'body_fat_percentage',
            'muscle_mass', 'chest', 'waist', 'hips', 'thighs', 'arms',
            'cardio_endurance', 'strength_bench', 'strength_squat',
            'strength_deadlift', 'notes', 'created_by', 'created_at',
            'member_username', 'trainer_username', 'workout_session'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'date']

    def get_member_username(self, obj):
        return obj.health_info.user.username

    def get_trainer_username(self, obj):
        return obj.created_by.username

    def get_date(self, obj):
        return obj.workout_session.session_date


class TrainingProgressChartDataSerializer(ModelSerializer):
    """Serializer để trả về dữ liệu biểu đồ theo thời gian"""
    date = SerializerMethodField()  # Thêm field ảo

    class Meta:
        model = TrainingProgress
        fields = ['date', 'weight', 'body_fat_percentage', 'muscle_mass',
                  'chest', 'waist', 'hips', 'thighs', 'arms',
                  'cardio_endurance', 'strength_bench', 'strength_squat',
                  'strength_deadlift', 'workout_session']

    def get_date(self, obj):
        return obj.workout_session.session_date


#
# Rating
#

class UserBasicSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'avatar']


class TrainerRatingSerializer(ModelSerializer):
    user_details = UserBasicSerializer(source='user', read_only=True)
    trainer_details = UserBasicSerializer(source='trainer', read_only=True)
    average_score = FloatField(read_only=True)

    class Meta:
        model = TrainerRating
        fields = [
            'id', 'user', 'user_details', 'trainer', 'trainer_details', 'score',
            'knowledge_score', 'communication_score', 'punctuality_score',
            'average_score', 'comment', 'anonymous', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'user_details', 'trainer_details', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Gán user hiện tại là người tạo đánh giá
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class GymRatingSerializer(ModelSerializer):
    user_details = UserBasicSerializer(source='user', read_only=True)
    gym_name = CharField(source='gym.name', read_only=True)
    average_score = FloatField(read_only=True)

    class Meta:
        model = GymRating
        fields = [
            'id', 'user', 'user_details', 'gym', 'gym_name', 'score',
            'facility_score', 'service_score', 'average_score',
            'comment', 'anonymous', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'user_details', 'gym_name', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Gán user hiện tại là người tạo đánh giá
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class FeedbackResponseSerializer(ModelSerializer):
    responder_details = UserBasicSerializer(source='responder', read_only=True)

    class Meta:
        model = FeedbackResponse
        fields = [
            'id', 'trainer_rating', 'gym_rating', 'responder',
            'responder_details', 'response_text', 'created_at', 'updated_at'
        ]
        read_only_fields = ['responder', 'responder_details', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Gán user hiện tại là người tạo phản hồi
        validated_data['responder'] = self.context['request'].user
        return super().create(validated_data)

    def validate(self, attrs):
        # Kiểm tra xem đã cung cấp đúng loại đánh giá chưa
        if not attrs.get('trainer_rating') and not attrs.get('gym_rating'):
            raise ValidationError("Phải chỉ định một đánh giá để phản hồi")
        if attrs.get('trainer_rating') and attrs.get('gym_rating'):
            raise ValidationError("Chỉ có thể phản hồi cho một loại đánh giá")
        return attrs


class TrainerAverageRatingSerializer(ModelSerializer):
    average_overall = SerializerMethodField()
    average_knowledge = SerializerMethodField()
    average_communication = SerializerMethodField()
    average_punctuality = SerializerMethodField()
    total_ratings = SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'average_overall', 'average_knowledge', 'average_communication',
            'average_punctuality', 'total_ratings'
        ]

    def get_average_overall(self, obj):
        ratings = obj.ratings.all()
        if not ratings:
            return 0
        return round(sum(rating.score for rating in ratings) / len(ratings), 1)

    def get_average_knowledge(self, obj):
        ratings = obj.ratings.all()
        if not ratings:
            return 0
        return round(sum(rating.knowledge_score for rating in ratings) / len(ratings), 1)

    def get_average_communication(self, obj):
        ratings = obj.ratings.all()
        if not ratings:
            return 0
        return round(sum(rating.communication_score for rating in ratings) / len(ratings), 1)

    def get_average_punctuality(self, obj):
        ratings = obj.ratings.all()
        if not ratings:
            return 0
        return round(sum(rating.punctuality_score for rating in ratings) / len(ratings), 1)

    def get_total_ratings(self, obj):
        return obj.ratings.count()


class GymAverageRatingSerializer(ModelSerializer):
    average_overall = SerializerMethodField()
    average_facility = SerializerMethodField()
    average_service = SerializerMethodField()
    total_ratings = SerializerMethodField()

    class Meta:
        model = Gym
        fields = [
            'id', 'name', 'address',
            'average_overall', 'average_facility', 'average_service', 'total_ratings'
        ]

    def get_average_overall(self, obj):
        ratings = obj.ratings.all()
        if not ratings:
            return 0
        return round(sum(rating.score for rating in ratings) / len(ratings), 1)

    def get_average_facility(self, obj):
        ratings = obj.ratings.all()
        if not ratings:
            return 0
        return round(sum(rating.facility_score for rating in ratings) / len(ratings), 1)

    def get_average_service(self, obj):
        ratings = obj.ratings.all()
        if not ratings:
            return 0
        return round(sum(rating.service_score for rating in ratings) / len(ratings), 1)

    def get_total_ratings(self, obj):
        return obj.ratings.count()
