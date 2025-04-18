from django.contrib.auth.password_validation import validate_password
from django.db.models import FloatField
from rest_framework.fields import ChoiceField, FloatField, ImageField, BooleanField, SerializerMethodField
from rest_framework.relations import PrimaryKeyRelatedField
from rest_framework.serializers import ModelSerializer, CharField, ValidationError

from gymhealth.models import User, HealthInfo, MemberProfile, TrainerProfile, Packages, PackageType, Benefit


class UserSerializer(ModelSerializer):
    height = FloatField(required=False)
    weight = FloatField(required=False)
    training_goal = ChoiceField(choices=HealthInfo.GOAL_CHOICES, required=False)
    health_conditions = CharField(required=False, allow_blank=True)
    avatar = ImageField(required=False)
    password = CharField(write_only=True, validators=[validate_password])
    password2 = CharField(write_only=True)  # Thêm trường xác nhận mật khẩu

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
        # Tách các field liên quan đến sức khỏe ra
        height = validated_data.pop('height', None)
        weight = validated_data.pop('weight', None)
        training_goal = validated_data.pop('training_goal', None)
        health_conditions = validated_data.pop('health_conditions', '')

        # Tạo User
        password = validated_data.pop('password')
        user = User(**validated_data)
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
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def validate(self, data):
        # Kiểm tra chiều cao và cân nặng hợp lý
        if data.get('height') is not None and data['height'] <= 0:
            raise data.ValidationError({"height": "Chiều cao phải lớn hơn 0"})
        if data.get('weight') is not None and data['weight'] <= 0:
            raise data.ValidationError({"weight": "Cân nặng phải lớn hơn 0"})
        # Kiểm tra body_fat_percentage nếu được cung cấp
        if data.get('body_fat_percentage') is not None:
            if data['body_fat_percentage'] < 3 or data['body_fat_percentage'] > 70:
                raise ValidationError({"body_fat_percentage": "Phần trăm mỡ cơ thể phải từ 3% đến 70%"})
        return data


class MemberProfileSerializer(ModelSerializer):
    is_membership_valid = BooleanField(read_only=True)
    username = CharField(source='user.username', read_only=True)
    email = CharField(source='user.email', read_only=True)

    class Meta:
        model = MemberProfile
        fields = ('id', 'username', 'email', 'membership_start_date', 'membership_end_date',
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

