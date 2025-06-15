from datetime import date, timedelta, datetime
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView

from gymhealth import serializers, perms, paginators
from rest_framework import viewsets, generics, permissions, status, request, parsers, permissions, filters, mixins
from gymhealth.models import User, HealthInfo, Packages, Benefit, PackageType, WorkoutSession, MemberProfile, \
    TrainerProfile, Promotion, Notification, TrainingProgress, TrainerRating, GymRating, Gym, \
    FeedbackResponse, Payment, PaymentReceipt
from gymhealth.perms import IsOwner, IsProfileOwnerOrManager
from gymhealth.serializers import TrainerProfileSerializer, MemberProfileSerializer, BenefitSerializer, \
    PackageTypeSerializer, PackageSerializer, PackageDetailSerializer, TrainerListSerializer, SubscriptionPackage
from django.db.models import Min, Max, Q, Count

from gymhealth.utils.vnpay_payment import VNPayUtils



class PackageTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PackageType.objects.filter(active=True)
    serializer_class = PackageTypeSerializer
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'duration_months']
    pagination_class = paginators.ItemPaginator

    def get_permissions(self):
        return [permissions.AllowAny()]

class BenefitViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Benefit.objects.filter(active=True)
    serializer_class = BenefitSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['name', 'description']
    ordering_fields = ['name']
    pagination_class = paginators.ItemPaginator


class PackageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Packages.objects.filter(active=True)
    permission_classes =[permissions.AllowAny]
    serializer_class = PackageSerializer
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'package_type__duration_months', 'pt_sessions']
    filterset_fields = ['package_type', 'pt_sessions', 'price']
    filter_backends = [DjangoFilterBackend]
    pagination_class = paginators.ItemPaginator

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PackageDetailSerializer
        return PackageSerializer

    def list(self, request, *args, **kwargs):
        # Apply the default filtering, ordering, etc. by calling super().filter_queryset()
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path="with_pt")
    def with_pt(self, request):
        # Danh sách gói có buổi PT
        queryset = self.filter_queryset(self.get_queryset())
        packages = queryset.filter(pt_sessions__gt=0) #pt_sessions > 0
        serializer = self.get_serializer(packages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def benefits(self, request, pk=None):
        # Danh sách quyền lợi của 1 gói
        package = self.get_object()
        benefits = package.benefits.filter(active=True)
        serializer = BenefitSerializer(benefits, many=True)
        return Response(serializer.data)


class UserViewSet(viewsets.GenericViewSet):
    queryset = User.objects.filter(is_active=True)
    serializer_class = serializers.UserSerializer
    # Định nghĩa gửi form
    parser_classes = [parsers.MultiPartParser]
    ordering_fields = ['id', 'first_name', 'last_name', 'date_joined']  # Các trường để sắp xếp
    ordering = ['id']  # Sắp xếp mặc định
    pagination_class = paginators.ItemPaginator

    @action(methods=['get', 'patch'], url_path="current-user", detail=False,
            permission_classes=[permissions.IsAuthenticated])
    # API cập nhật mật khẩu, lấy thông tin người dùng
    def get_current_user(self, request):
        if request.method.__eq__("PATCH"):
            u = request.user

            for key in request.data:
                if key in ['first_name', 'last_name']:
                    setattr(u, key, request.data[key])
                elif key.__eq__('password'):
                    u.set_password(request.data[key])

            u.save()
            return Response(serializers.UserSerializer(u).data)
        else:
            return Response(serializers.UserSerializer(request.user).data)

    @action(methods=['post'], detail=False, url_path='register',
            permission_classes=[permissions.AllowAny])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        message = "Đăng ký thành công."
        if getattr(user, 'role', None) == 'MEMBER':
            message += " Thông tin sức khỏe của bạn đã được lưu lại."
        return Response({
            "user": serializer.data,
            "message": message
        }, status=status.HTTP_201_CREATED)


class HealthInfoViewSet(viewsets.ViewSet):
    serializer_class = serializers.HealthInfoSerializer
    # Quyền đã đăng nhập và chủ sở hữu mới được sử dụng API
    permission_classes = [permissions.IsAuthenticated, perms.IsOwner]
    # Phân trang
    pagination_class = paginators.ItemPaginator

    # Cài đặt bộ lọc
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['blood_type', 'gender', 'height', 'weight', 'user__is_active']
    search_fields = ['user__username', 'user__email', 'user__first_name', 'user__last_name', 'note']
    ordering_fields = ['created_date', 'updated_date', 'height', 'weight', 'user__date_joined']
    ordering = ['id']  # Mặc định sắp xếp theo ngày cập nhật, mới nhất trước

    def get_object(self):
        try:
            return HealthInfo.objects.get(user=self.request.user)
        except HealthInfo.DoesNotExist:
            return None

    @action(methods=['get'], detail=False, url_path='my', url_name='my-healthinfo')
    def get_health_info(self, request):
        #Lấy thông tin sức khỏe của chính user (từ get_object ở trên)
        health_info = self.get_object()
        if not health_info:
            return Response({"error": "Bạn chưa có thông tin sức khỏe"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(health_info)
        return Response(serializer.data)

    @action(methods=['put'], detail=False, url_path='update-all', url_name='update-all')
    def put_health_info(self, request):
        health_info = self.get_object()
        if not health_info:
            return Response({"error": "Bạn chưa có thông tin sức khỏe"}, status=status.HTTP_404_NOT_FOUND)

        serializer = serializers.HealthInfoSerializer(health_info, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(methods=['patch'], detail=False, url_path='update', url_name='update')
    def patch_health_info(self, request):
        # API PATCH: Cập nhật một phần thông tin sức khỏe (sử dụng partial=True)
        health_info = self.get_object()
        if not health_info:
            return Response({"error": "Bạn chưa có thông tin sức khỏe"}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.serializer_class(health_info, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class UserProfileView(generics.GenericAPIView):
    # Quyền đã đăng nhập, và sở hữu
    permission_classes = [permissions.IsAuthenticated, perms.IsOwner]
    # pagination_class = paginators.ItemPaginator

    def get_serializer_class(self):
        user = self.request.user
        if user.is_trainer:
            return TrainerProfileSerializer
        elif user.is_member:
            return MemberProfileSerializer
        else:
            raise PermissionDenied("Chỉ huấn luyện viên và hội viên mới có hồ sơ.")

    def get_object(self):
        user = self.request.user
        if user.is_trainer:
            # kiểm tra xem đối tượng user có thuộc tính trainer_profile hay không.
            if hasattr(user, 'trainer_profile'):
                return user.trainer_profile
            else:
                raise NotFound("Hồ sơ huấn luyện viên chưa được tạo.")
        elif user.is_member:
            # kiểm tra xem đối tượng user có thuộc tính member_profile hay không.
            if hasattr(user, 'member_profile'):
                return user.member_profile
            else:
                raise NotFound("Hồ sơ hội viên chưa được tạo.")
        else:
            raise PermissionDenied("Bạn không có quyền truy cập hồ sơ.")

    def get(self, request, *args, **kwargs):
        p = self.get_object()
        serializer = self.get_serializer(p)
        return Response(serializer.data)

    def patch(self, request, *args, **kwargs):  # sử dụng partial=True cập nhật một phần
        p = self.get_object()
        serializer = self.get_serializer(p, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request, *args, **kwargs):
        p = self.get_object()
        serializer = self.get_serializer(p, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
class TrainerListView(generics.ListAPIView):
    #API để lấy danh sách PT với thông tin cơ bản và lịch làm việc
    serializer_class = TrainerListSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['username', 'first_name', 'last_name', 'trainer_profile__specialization']
    ordering_fields = ['trainer_profile__experience_years', 'trainer_profile__hourly_rate']
    pagination_class = paginators.ItemPaginator

    def get_queryset(self):
        # Lấy tất cả user là TRAINER
        queryset = User.objects.filter(role='TRAINER', is_active=True)

        # Lọc PT theo chuyên môn nếu có
        specialization = self.request.query_params.get('specialization')
        if specialization:
            queryset = queryset.filter(trainer_profile__specialization__icontains=specialization)

        # Lọc PT theo kinh nghiệm nếu có
        min_experience = self.request.query_params.get('min_experience')
        if min_experience and min_experience.isdigit():
            queryset = queryset.filter(trainer_profile__experience_years__gte=int(min_experience))

        # Lọc PT theo mức giá nếu có
        max_price = self.request.query_params.get('max_price')
        if max_price and max_price.replace('.', '', 1).isdigit():
            queryset = queryset.filter(trainer_profile__hourly_rate__lte=float(max_price))

        # Lọc PT theo ngày có lịch trống nếu có
        available_date = self.request.query_params.get('available_date')
        if available_date:
            try:
                # Chuyển đổi chuỗi ngày thành đối tượng date
                available_date = date.fromisoformat(available_date)

                # Lấy danh sách ID của các PT đã có lịch cả ngày (không còn slot trống)

                fully_booked_trainers = WorkoutSession.objects.filter(
                    trainer__isnull=False,
                    session_date=available_date,
                    status__in=['confirmed', 'pending'],
                ).values_list('trainer__id', flat=True).distinct()

                # Loại bỏ các PT đã kín lịch
                queryset = queryset.exclude(id__in=fully_booked_trainers)
            except ValueError:
                # Xử lý khi định dạng ngày không hợp lệ
                pass

        return queryset.prefetch_related('trainer_profile')


class TrainerDetailView(generics.RetrieveAPIView):
    #API để lấy thông tin chi tiết của một PT cụ thể
    serializer_class = serializers.TrainerDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = paginators.ItemPaginator

    def get_object(self):
        trainer_id = self.kwargs.get('trainer_id')
        trainer = User.objects.filter(id=trainer_id, role='TRAINER', is_active=True).first()

        if trainer is None:
            return Response({'detail': 'Trainer not found'}, status=status.HTTP_404_NOT_FOUND)

        return trainer


class TrainerUpcomingSessionsView(generics.ListAPIView):
    #API để lấy danh sách các buổi tập sắp tới của một PT cụ thể
    serializer_class = serializers.WorkoutSessionScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = paginators.ItemPaginator

    def get_queryset(self):
        trainer_id = self.kwargs.get('trainer_id')
        # Kiểm tra xem trainer có tồn tại không

        trainer = User.objects.filter(id=trainer_id, role='TRAINER', is_active=True).first()

        if trainer is None:
            raise NotFound(detail="Trainer not found")

        # Lấy các buổi tập trong 7 ngày tới hoặc số ngày được chỉ định
        days = self.request.query_params.get('days', 7)
        try:
            days = int(days)
            if days < 1:
                days = 7
            elif days > 30:  # Giới hạn tối đa 30 ngày
                days = 30
        except (ValueError, TypeError):
            days = 7

        today = date.today()
        end_date = today + timedelta(days=days)

        # Lọc theo ngày cụ thể nếu có
        specific_date = self.request.query_params.get('date')
        if specific_date:
            try:
                specific_date = date.fromisoformat(specific_date)
                sessions = WorkoutSession.objects.filter(
                    trainer=trainer,
                    session_date=specific_date,
                    status__in=['confirmed', 'pending']
                ).order_by('start_time')
                return sessions
            except ValueError:
                pass

        # Mặc định lấy lịch trong khoảng ngày
        return WorkoutSession.objects.filter(
            trainer=trainer,
            session_date__gte=today,
            session_date__lte=end_date,
            status__in=['confirmed', 'pending']
        ).order_by('session_date', 'start_time')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        # Nhóm buổi tập theo ngày để trả về cấu trúc dễ hiểu hơn
        sessions_by_date = {}
        for session in serializer.data:
            session_date = session['session_date']
            if session_date not in sessions_by_date:
                sessions_by_date[session_date] = []
            sessions_by_date[session_date].append(session)

        return Response({
            'trainer_id': self.kwargs.get('trainer_id'),
            'sessions_by_date': sessions_by_date
        })


class SubscriptionPackageViewSet(viewsets.GenericViewSet):
    serializer_class = serializers.SubscriptionPackageSerializer
    search_fields = ['member__username', 'package__name', 'status']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    filterset_fields = ['status', 'member', 'package']
    queryset = SubscriptionPackage.objects.none()
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = paginators.ItemPaginator

    def get_queryset(self):
        if self.request.user.is_manager:
            # Manager xem được tất cả đăng ký
            return SubscriptionPackage.objects.all()
        # Hội viên chỉ xem được đăng ký của mình
        return SubscriptionPackage.objects.filter(member=self.request.user)

    def get_serializer_class(self):
        if self.action in ['retrieve', 'my_subscriptions', 'active_subscription']:
            return serializers.SubscriptionPackageDetailSerializer
        return serializers.SubscriptionPackageSerializer

    def get_object(self):
        obj = super().get_object()
        # Kiểm tra quyền truy cập
        self.check_object_permissions(self.request, obj)
        return obj
    @action(detail=False, methods=['post'], url_path='register',
            permission_classes=[permissions.IsAuthenticated, perms.IsMember])
    def register_package(self, request):
        # API cho người dùng đăng ký gói tập

        # Thêm thông tin member vào data
        data = request.data.copy()
        data['member'] = request.user.id

        # Kiểm tra gói tập
        package_id = data.get('package')
        if not package_id:
            return Response({"error": "Vui lòng chọn gói tập"},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            package = Packages.objects.get(id=package_id, active=True)
        except Packages.DoesNotExist:
            return Response({"error": "Gói tập không tồn tại hoặc không còn hiệu lực"},
                            status=status.HTTP_400_BAD_REQUEST)

        # Xử lý remaining_pt_sessions
        data['remaining_pt_sessions'] = package.pt_sessions

        # Xử lý start_date
        start_date_str = data.get('start_date')
        if not start_date_str:
            start_date = date.today()
            data['start_date'] = start_date.isoformat()
        else:
            try:
                start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response({"error": "Định dạng start_date không hợp lệ, phải là YYYY-MM-DD"},
                                status=status.HTTP_400_BAD_REQUEST)

        # Lấy số tháng từ package_type
        duration_months = package.package_type.duration_months
        if duration_months:
            # Tính end_date
            year = start_date.year + (start_date.month - 1 + duration_months) // 12
            month = (start_date.month - 1 + duration_months) % 12 + 1
            day = start_date.day

            # Xử lý ngày không hợp lệ
            try:
                end_date = date(year, month, day)
            except ValueError:
                next_month = date(year, month, 1) + timedelta(days=31)
                last_day_of_month = (next_month.replace(day=1) - timedelta(days=1)).day
                end_date = date(year, month, last_day_of_month)

            data['end_date'] = end_date.isoformat()
        else:
            return Response({"error": "Gói tập không có thời hạn (duration_months)"},
                            status=status.HTTP_400_BAD_REQUEST)

        # Tạo và xác thực serializer
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        # Lưu đăng ký gói với trạng thái pending
        subscription = serializer.save()

        return Response(
            {"message": f"Đăng ký gói tập {package.name} thành công. Vui lòng thanh toán để kích hoạt gói.",
             "subscription": serializer.data},
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='verify-payment',
            permission_classes=[permissions.IsAuthenticated, perms.IsMember])#perms.IsManager
    def verify_payment(self, request, pk=None):
        subscription = self.get_object()

        if subscription.status != 'pending':
            return Response({"error": "Chỉ có thể xác nhận thanh toán cho gói đăng ký đang chờ xử lý"},
                            status=status.HTTP_400_BAD_REQUEST)

        # Cập nhật trạng thái
        subscription.status = 'active'
        subscription.save()

        # Cập nhật hồ sơ thành viên với logic xử lý nhiều gói tập
        try:
            member_profile = subscription.member.member_profile

            # So sánh và cập nhật ngày kết thúc nếu gói hiện tại có thời hạn lâu hơn
            if (not member_profile.membership_end_date or
                    subscription.end_date > member_profile.membership_end_date):
                member_profile.membership_end_date = subscription.end_date

            member_profile.is_active = True
            member_profile.save()

        except MemberProfile.DoesNotExist:
            # Tạo mới MemberProfile nếu chưa tồn tại
            MemberProfile.objects.create(
                user=subscription.member,
                membership_end_date=subscription.end_date,
                is_active=True
            )

        # Thông báo cho hội viên
        Notification.objects.create(
            user=subscription.member,
            title="Thanh toán đã được xác nhận",
            message=f"Gói tập {subscription.package.name} của bạn đã được kích hoạt và có thể sử dụng.",
            notification_type="payment_confirmation",
            related_object_id=subscription.id
        )

        return Response({"message": "Đã xác nhận thanh toán và kích hoạt gói thành công"})
    @action(detail=False, methods=['get'], url_path='my', url_name='my-subscriptions',
            permission_classes=[permissions.IsAuthenticated, perms.IsSubscriptionOwnerOrManager])
    def my_subscriptions(self, request):
        """Lấy danh sách gói đăng ký của người dùng hiện tại"""
        if not request.user.is_member:
            return Response({"error": "Chỉ hội viên mới có thể xem gói đăng ký"},
                            status=status.HTTP_403_FORBIDDEN)

        subscriptions = SubscriptionPackage.objects.filter(member=request.user).order_by('-created_at')

        # Lọc theo trạng thái nếu có
        status_filter = request.query_params.get('status')
        if status_filter:
            subscriptions = subscriptions.filter(status=status_filter)
        # phân trang
        page = self.paginate_queryset(subscriptions)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(subscriptions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='active', url_name='active-subscription',
            permission_classes=[permissions.IsAuthenticated, perms.IsSubscriptionOwnerOrManager])
    def active_subscription(self, request):
        # Lấy gói đăng ký đang hoạt động của người dùng hiện tại
        if not request.user.is_member:
            return Response({"error": "Chỉ hội viên mới có thể xem gói đăng ký"},
                            status=status.HTTP_403_FORBIDDEN)

        subscription = SubscriptionPackage.objects.filter(
            member=request.user,
            status='active',
            start_date__lte=date.today(),
            end_date__gte=date.today()
        ).order_by('-remaining_pt_sessions', '-created_at').first()

        if not subscription:
            return Response({"error": "Không tìm thấy gói đăng ký đang hoạt động"},
                            status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(subscription)
        return Response(serializer.data)


    @action(detail=True, methods=['post'], url_path='cancel',
            permission_classes=[permissions.IsAuthenticated, perms.IsSubscriptionOwnerOrManager])
    def cancel_subscription(self, request, pk=None):
        # Hủy gói đăng kí
        if not request.user.is_authenticated:
            return Response({"error": "Bạn chưa đăng nhập."}, status=status.HTTP_401_UNAUTHORIZED)
        subscription = self.get_object()

        if subscription.status != 'active':
            return Response({"error": "Chỉ có thể hủy gói đăng ký đang hoạt động"},
                            status=status.HTTP_400_BAD_REQUEST)

        # Cập nhật trạng thái
        subscription.status = 'cancelled'
        subscription.save()

        # Thông báo cho hội viên
        Notification.objects.create(
            user=subscription.member,
            title="Gói tập đã bị hủy",
            message=f"Gói tập {subscription.package.name} của bạn đã bị hủy.",
            notification_type="system",
            related_object_id=subscription.id
        )
        return Response({"message": "Đã hủy gói đăng ký thành công"})




class WorkoutSessionViewSet(viewsets.ViewSet):
    #ViewSet để quản lý các buổi tập
    queryset = WorkoutSession.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = paginators.ItemPaginator

    def get_serializer_class(self):
        #Trả về serializer tương ứng dựa trên action
        if self.action == 'register':
            return serializers.WorkoutSessionCreateSerializer
        elif self.action == 'trainer_sessions':
            return serializers.WorkoutSessionListScheduleSerializer
        elif self.action == 'registered_sessions':
            return serializers.WorkoutSessionListScheduleSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return serializers.WorkoutSessionUpdateSerializer
        elif self.action == 'reschedule':
            return serializers.RescheduleSessionSerializer
        elif self.action == 'weekly_schedule':
            return serializers.WeeklyScheduleSerializer
        else:
            return None

    @action(detail=False, methods=['post'], url_path='member/register', url_name='member-register',
            permission_classes=[permissions.IsAuthenticated, perms.IsMember])
    def register(self, request):
        # Kiểm tra người dùng phải có hồ sơ hội viên hợp lệ
        try:
            member_profile = request.user.member_profile
            if not member_profile.is_membership_valid:
                raise PermissionDenied("Tư cách hội viên của bạn đã hết hạn hoặc không hợp lệ.")
        except MemberProfile.DoesNotExist:
            raise PermissionDenied("Bạn chưa có hồ sơ hội viên.")

        # Lấy gói tập đang hoạt động (sử dụng logic tương tự active_subscription)
        active_subscription = SubscriptionPackage.objects.filter(
            member=request.user,  # Thuộc về user hiện tại
            status='active',  # Trạng thái đang hoạt động
            start_date__lte=date.today(),  # Đã bắt đầu (ngày bắt đầu <= hôm nay)
            end_date__gte=date.today(),  # Chưa hết hạn (ngày kết thúc >= hôm nay)
            remaining_pt_sessions__gt=0  # Còn buổi PT (> 0)
        ).order_by('end_date').first()  # Sắp xếp theo ngày kết thúc, lấy gói sắp hết hạn nhất

        if not active_subscription:
            return Response(
                {"error": "Bạn chưa có gói tập nào đang hoạt động. Vui lòng đăng ký gói tập trước khi đặt lịch."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Kiểm tra loại buổi tập và số buổi PT còn lại
        session_type = request.data.get('session_type')
        if session_type == 'pt_session':
            if active_subscription.remaining_pt_sessions <= 0:
                return Response(
                    {
                        "error": "Bạn đã hết số buổi tập với PT trong gói hiện tại. "
                                 f"Số buổi PT còn lại: {active_subscription.remaining_pt_sessions}. "
                                 "Vui lòng gia hạn gói tập hoặc mua thêm buổi PT."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Lấy serializer class và khởi tạo nó
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(data=request.data, context={'request': request})

        # Xác thực dữ liệu
        serializer.is_valid(raise_exception=True)

        # Xác định status dựa trên loại buổi tập
        initial_status = 'confirmed' if session_type == 'self_training' else 'pending'

        # Lưu dữ liệu với member, subscription và status phù hợp
        workout_session = serializer.save(
            member=request.user,
            subscription=active_subscription,
            status=initial_status
        )

        return Response(serializer.data, status=status.HTTP_201_CREATED)
    @action(detail=False, methods=['get'], url_path='trainer/pending-session', url_name='trainer_sessions',
            permission_classes=[permissions.IsAuthenticated, perms.IsTrainer])
    def trainer_sessions(self, request):
        #API để PT xem danh sách lịch tập được yêu cầu

        # Mặc định hiển thị các buổi tập đang chờ duyệt
        status_filter = request.query_params.get('status', 'pending')

        queryset = WorkoutSession.objects.filter(
            trainer=request.user,
            session_type='pt_session'
        )

        # Lọc theo trạng thái nếu có
        if status_filter != 'all':
            queryset = queryset.filter(status=status_filter)

        queryset = queryset.order_by('session_date', 'start_time')

        serializer = self.get_serializer_class()(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='me/registered-sessions', url_name='member_sessions',
            permission_classes=[permissions.IsAuthenticated, perms.IsMember])
    def registered_sessions(self, request):
        # Lấy các tham số lọc từ request
        status_filter = request.query_params.get('status', 'all')
        date_from = request.query_params.get('date_from', None)
        date_to = request.query_params.get('date_to', None)
        session_type = request.query_params.get('type', None)

        # Tạo queryset cơ bản
        queryset = WorkoutSession.objects.filter(member=request.user)

        # Áp dụng các bộ lọc
        if status_filter != 'all':
            queryset = queryset.filter(status=status_filter)

        if date_from:
            queryset = queryset.filter(session_date__gte=date_from)

        if date_to:
            queryset = queryset.filter(session_date__lte=date_to)

        if session_type:
            queryset = queryset.filter(session_type=session_type)

        # Sắp xếp kết quả
        queryset = queryset.order_by('session_date', 'start_time')

        # Phân trang kết quả

        serializer = self.get_serializer_class()(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['PATCH'], url_path='confirm-session', url_name='confirm_session',
            permission_classes=[permissions.IsAuthenticated])
    def confirm_session(self, request, pk=None):
        """Xử lý khi PT cập nhật trạng thái buổi tập"""
        # Lấy buổi tập theo pk
        try:
            session = WorkoutSession.objects.get(pk=pk)
        except WorkoutSession.DoesNotExist:
            raise NotFound("Không tìm thấy buổi tập.")

        if request.user.is_trainer:
            # Nếu là PT, kiểm tra xem PT có phải là người phụ trách buổi tập không
            if session.trainer != request.user:
                raise PermissionDenied("Bạn không có quyền cập nhật buổi tập này.")
            # elif session.member != request.user:
            #     raise PermissionDenied("Bạn không có quyền cập nhật buổi tập này.")

        if session.session_type != 'pt_session':
            raise PermissionDenied("Bạn chỉ có thể cập nhật buổi tập PT.")

        # Kiểm tra request có chứa status hay không
        if 'status' not in request.data:
            return Response(
                {
                    "status": "Trạng thái là trường bắt buộc. Vui lòng chọn một trạng thái (confirmed, cancelled, hoặc rescheduled)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Lấy trạng thái mới từ request - DI CHUYỂN LÊN ĐÂY
        new_status = request.data.get('status')

        # Giới hạn quyền cập nhật trạng thái dựa trên vai trò
        if request.user.is_trainer:
            # PT có thể cập nhật tất cả các trạng thái
            valid_statuses = ['confirmed', 'cancelled', 'rescheduled', 'completed']
        else:
            # Hội viên chỉ có thể xác nhận hoặc hủy
            valid_statuses = ['confirmed', 'cancelled']

        if new_status not in valid_statuses:
            return Response(
                {
                    "status": f"Bạn không có quyền cập nhật trạng thái này. Các trạng thái hợp lệ: {', '.join(valid_statuses)}"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Kiểm tra số buổi PT còn lại nếu muốn confirm (áp dụng cho cả PT và member)
        if new_status == 'confirmed':
            # Lấy subscription của buổi tập này
            subscription = session.subscription
            if subscription:
                # Kiểm tra nếu remaining_pt_sessions = 0 thì không cho phép confirm
                if subscription.remaining_pt_sessions == 0:
                    return Response(
                        {
                            "error": "Không thể xác nhận buổi tập này. "
                                     f"Hội viên đã hết số buổi PT trong gói hiện tại. "
                                     f"Số buổi PT còn lại: {subscription.remaining_pt_sessions}. "
                                     "Vui lòng yêu cầu hội viên gia hạn gói tập hoặc mua thêm buổi PT."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Kiểm tra nếu remaining_pt_sessions < 0 (trường hợp bất thường)
                elif subscription.remaining_pt_sessions < 0:
                    return Response(
                        {
                            "error": "Số buổi PT trong gói đã âm. Vui lòng liên hệ quản trị viên để kiểm tra."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                # Trường hợp không có subscription
                return Response(
                    {
                        "error": "Không tìm thấy gói tập của hội viên. Vui lòng kiểm tra lại."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Xử lý cập nhật trạng thái
        serializer = serializers.WorkoutSessionUpdateSerializer(session, data=request.data, partial=True)
        if serializer.is_valid():
            # Lấy dữ liệu từ serializer (new_status đã được khai báo ở trên)
            new_status = serializer.validated_data.get('status')

            # Xử lý notes tùy theo vai trò người dùng
            if request.user.is_trainer:
                notes = serializer.validated_data.get('trainer_notes', '')
                notes_field = 'trainer_notes'
            else:
                notes = serializer.validated_data.get('member_notes', '')
                notes_field = 'member_notes'

            # Lưu thông tin cập nhật
            serializer.save()

            # Xác định người nhận thông báo (người còn lại)
            notification_recipient = session.member if request.user.is_trainer else session.trainer

            # Tạo tiêu đề và nội dung thông báo
            user_type = "PT" if request.user.is_trainer else "Hội viên"

            if new_status == 'confirmed':
                title = f"Buổi tập đã được xác nhận"
                message = f"{user_type} đã xác nhận buổi tập vào ngày {session.session_date} lúc {session.start_time}."
            elif new_status == 'cancelled':
                title = f"Buổi tập đã bị hủy"
                message = f"{user_type} đã hủy buổi tập vào ngày {session.session_date} lúc {session.start_time}."
            elif new_status == 'rescheduled':
                title = f"Đề xuất đổi lịch buổi tập"
                message = f"{user_type} đề xuất đổi lịch cho buổi tập vào ngày {session.session_date}."
            elif new_status == 'completed':
                title = f"Buổi tập hoàn thành"
                message = f"{user_type} đã hoàn thành buổi tập vào ngày {session.session_date} lúc {session.start_time}."

            if notes:
                message += f" Ghi chú: {notes}"

            # Tạo thông báo cho người còn lại
            Notification.objects.create(
                user=notification_recipient,
                title=title,
                message=message,
                notification_type='session_status_update',
                related_object_id=session.id
            )

            return Response(serializer.data)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='reschedule', url_name='reschedule-session')
    def reschedule(self, request, pk=None):
        """API để PT đề xuất thời gian mới cho buổi tập"""
        if not request.user.is_trainer:
            return Response(
                {"detail": "Chỉ huấn luyện viên mới có thể đề xuất lịch tập mới."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Lấy buổi tập từ ID trong URL
        try:
            session = WorkoutSession.objects.get(pk=pk)
            if session.trainer != request.user:
                return Response(
                    {"detail": "Bạn không phải PT của buổi tập này."},
                    status=status.HTTP_403_FORBIDDEN
                )
        except WorkoutSession.DoesNotExist:
            return Response(
                {"detail": "Buổi tập không tồn tại."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer_class = self.get_serializer_class()
        serializer = serializer_class(
            data=request.data,
            context={'request': request, 'session': session}
        )
        serializer.is_valid(raise_exception=True)

        # Tạo bản ghi lịch sử về việc đổi lịch
        old_date = session.session_date
        old_start = session.start_time

        # Cập nhật trạng thái và tạo ghi chú
        reason = serializer.validated_data.get('reason', '')
        note = f"Đề xuất đổi lịch từ {old_date} {old_start} sang {serializer.validated_data['new_date']} {serializer.validated_data['new_start_time']}. "
        if reason:
            note += f"Lý do: {reason}"

        # Cập nhật session
        session.session_date = serializer.validated_data['new_date']
        session.start_time = serializer.validated_data['new_start_time']
        session.end_time = serializer.validated_data['new_end_time']
        session.status = 'rescheduled'
        session.trainer_notes = note
        session.save()

        # Tạo thông báo cho hội viên
        Notification.objects.create(
            user=session.member,
            title="Đề xuất thay đổi lịch tập",
            message=f"PT {request.user.get_full_name()} đã đề xuất đổi lịch tập của bạn sang ngày {serializer.validated_data['new_date']} lúc {serializer.validated_data['new_start_time']}. {reason}",
            notification_type='session_reminder',
            related_object_id=session.id
        )

        return Response({
            "detail": "Đã đề xuất lịch tập mới thành công.",
            "session": {
                "id": session.id,
                "member": session.member.get_full_name(),
                "new_date": session.session_date,
                "new_start_time": session.start_time,
                "new_end_time": session.end_time,
                "status": session.status
            }
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='weekly-schedule', url_name='weekly_schedule')
    def weekly_schedule(self, request):
        """API để xem lịch tập từ thứ 2 đến thứ 7 của tuần chỉ định"""

        # Lấy tham số tuần (mặc định là tuần hiện tại)
        week_offset = int(request.query_params.get('week_offset', 0))

        # Lấy thời gian hiện tại
        today = datetime.now().date()

        # Tính thứ mấy trong tuần (isoweekday: Monday=1, Sunday=7)
        weekday = today.isoweekday()

        # Tìm ngày thứ 2 (đầu tuần hiện tại)
        current_monday = today - timedelta(days=weekday - 1)

        # Tính ngày đầu tuần dựa trên offset
        monday = current_monday + timedelta(weeks=week_offset)

        # Tìm ngày thứ 7 (cuối tuần)
        saturday = monday + timedelta(days=5)

        # Query lịch tập trong khoảng từ thứ 2 đến thứ 7
        queryset = WorkoutSession.objects.filter(
            session_date__gte=monday,
            session_date__lte=saturday
        )

        # Lọc theo người dùng
        user_role = request.query_params.get('role', None)
        if user_role == 'trainer' and request.user.is_trainer:
            queryset = queryset.filter(trainer=request.user)
        elif user_role == 'member' and request.user.is_member:
            queryset = queryset.filter(member=request.user)
        elif not user_role:
            # Mặc định sẽ lọc theo vai trò hiện tại của người dùng
            if request.user.is_trainer:
                queryset = queryset.filter(trainer=request.user)
            elif request.user.is_member:
                queryset = queryset.filter(member=request.user)

        # Lọc theo trạng thái nếu có
        status_filter = request.query_params.get('status', None)
        if status_filter and status_filter != 'all':
            queryset = queryset.filter(status=status_filter)

        # Sắp xếp kết quả
        queryset = queryset.order_by('session_date', 'start_time')

        # Grouped by date
        schedule_by_date = {}
        for day_offset in range(6):  # Từ thứ 2 đến thứ 7
            current_date = monday + timedelta(days=day_offset)
            schedule_by_date[current_date.strftime('%Y-%m-%d')] = {
                'day_of_week': current_date.isoweekday(),
                'date': current_date,
                'sessions': []
            }

        # Serialize và nhóm phiên tập theo ngày
        serializer = self.get_serializer_class()(queryset, many=True)
        for session in serializer.data:
            date_key = session['session_date']
            if date_key in schedule_by_date:
                schedule_by_date[date_key]['sessions'].append(session)

        return Response({
            "week_info": {
                "start_date": monday,
                "end_date": saturday,
                "week_offset": week_offset,
                "current_week": week_offset == 0
            },
            "schedule": schedule_by_date
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='trainer/all-sessions', url_name='trainer_all_sessions',
            permission_classes=[permissions.IsAuthenticated, perms.IsTrainer])
    def trainer_all_sessions(self, request):
        """API để PT xem tất cả lịch tập của mình với các bộ lọc"""

        # Lấy các tham số lọc từ request
        status_filter = request.query_params.get('status', 'all')
        date_from = request.query_params.get('date_from', None)
        date_to = request.query_params.get('date_to', None)
        session_type = request.query_params.get('type', None)
        member_name = request.query_params.get('member_name', None)

        # Tạo queryset cơ bản - lấy tất cả buổi tập của trainer
        queryset = WorkoutSession.objects.filter(trainer=request.user)

        # Áp dụng các bộ lọc
        if status_filter != 'all':
            queryset = queryset.filter(status=status_filter)

        if date_from:
            try:
                date_from_parsed = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(session_date__gte=date_from_parsed)
            except ValueError:
                return Response(
                    {"error": "Định dạng date_from không hợp lệ. Sử dụng YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if date_to:
            try:
                date_to_parsed = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(session_date__lte=date_to_parsed)
            except ValueError:
                return Response(
                    {"error": "Định dạng date_to không hợp lệ. Sử dụng YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if session_type:
            queryset = queryset.filter(session_type=session_type)

        if member_name:
            queryset = queryset.filter(
                Q(member__first_name__icontains=member_name) |
                Q(member__last_name__icontains=member_name) |
                Q(member__username__icontains=member_name)
            )

        # Sắp xếp kết quả theo ngày gần nhất trước
        queryset = queryset.order_by('-session_date', 'start_time')

        # Đếm tổng số bản ghi trước khi phân trang
        total_count = queryset.count()

        # Sử dụng DRF pagination
        paginator = paginators.ItemPaginator()
        page = paginator.paginate_queryset(queryset, request)

        if page is not None:
            # Serialize dữ liệu
            serializer = serializers.TrainerAllSessionsSerializer(page, many=True)

            # Thống kê theo trạng thái (trên toàn bộ queryset, không chỉ trang hiện tại)
            status_stats = queryset.values('status').annotate(count=Count('status'))
            stats = {stat['status']: stat['count'] for stat in status_stats}

            # Tạo response với pagination data
            paginated_response = paginator.get_paginated_response(serializer.data)

            # Thêm thống kê vào response
            paginated_response.data.update({
                "statistics": {
                    "total_sessions": total_count,
                    "status_breakdown": stats,
                    "filters_applied": {
                        "status": status_filter,
                        "date_from": date_from,
                        "date_to": date_to,
                        "session_type": session_type,
                        "member_name": member_name
                    }
                }
            })

            return paginated_response

        # Fallback nếu pagination không hoạt động (không nên xảy ra)
        serializer = serializers.TrainerAllSessionsSerializer(queryset, many=True)
        return Response({
            "sessions": serializer.data,
            "statistics": {
                "total_sessions": total_count,
                "status_breakdown": {},
                "filters_applied": {
                    "status": status_filter,
                    "date_from": date_from,
                    "date_to": date_to,
                    "session_type": session_type,
                    "member_name": member_name
                }
            }
        })
    @action(detail=False, methods=['get'], url_path='trainer/dashboard-stats', url_name='trainer_dashboard_stats',
            permission_classes=[permissions.IsAuthenticated, perms.IsTrainer])
    def trainer_dashboard_stats(self, request):
        """API để PT xem thống kê tổng quan về lịch tập của mình"""

        # Lấy tháng hiện tại nếu không có tham số
        month = request.query_params.get('month', datetime.now().month)
        year = request.query_params.get('year', datetime.now().year)

        try:
            month = int(month)
            year = int(year)
        except ValueError:
            return Response(
                {"error": "Tháng và năm phải là số nguyên"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Query cơ bản cho trainer
        base_query = WorkoutSession.objects.filter(trainer=request.user)

        # Thống kê tổng thể
        total_sessions = base_query.count()

        # Thống kê theo trạng thái
        status_stats = base_query.values('status').annotate(count=Count('status'))
        status_breakdown = {stat['status']: stat['count'] for stat in status_stats}

        # Thống kê tháng hiện tại
        monthly_query = base_query.filter(
            session_date__month=month,
            session_date__year=year
        )

        monthly_stats = {
            'total': monthly_query.count(),
            'completed': monthly_query.filter(status='completed').count(),
            'pending': monthly_query.filter(status='pending').count(),
            'confirmed': monthly_query.filter(status='confirmed').count(),
            'cancelled': monthly_query.filter(status='cancelled').count(),
        }

        # Thống kê 7 ngày gần nhất
        seven_days_ago = datetime.now().date() - timedelta(days=7)
        recent_query = base_query.filter(session_date__gte=seven_days_ago)

        recent_stats = {
            'total': recent_query.count(),
            'completed': recent_query.filter(status='completed').count(),
            'upcoming': recent_query.filter(
                session_date__gte=datetime.now().date(),
                status__in=['pending', 'confirmed']
            ).count()
        }

        # Top members (khách hàng tập nhiều nhất)
        top_members = base_query.filter(status='completed').values(
            'member__first_name', 'member__last_name', 'member__username'
        ).annotate(
            session_count=Count('id')
        ).order_by('-session_count')[:5]

        # Lịch sắp tới (3 ngày tới)
        upcoming_sessions = base_query.filter(
            session_date__gte=datetime.now().date(),
            session_date__lte=datetime.now().date() + timedelta(days=3),
            status__in=['pending', 'confirmed']
        ).order_by('session_date', 'start_time')[:10]

        upcoming_serializer = serializers.WorkoutSessionListScheduleSerializer(upcoming_sessions, many=True)

        return Response({
            "overview": {
                "total_sessions": total_sessions,
                "status_breakdown": status_breakdown,
            },
            "monthly_stats": {
                "month": month,
                "year": year,
                "stats": monthly_stats
            },
            "recent_week_stats": recent_stats,
            "top_members": [
                {
                    "name": f"{member['member__first_name']} {member['member__last_name']}",
                    "username": member['member__username'],
                    "completed_sessions": member['session_count']
                }
                for member in top_members
            ],
            "upcoming_sessions": upcoming_serializer.data
        })

    @action(detail=False, methods=['get'], url_path='trainer/today-schedule', url_name='trainer_today_schedule',
            permission_classes=[permissions.IsAuthenticated, perms.IsTrainer])
    def trainer_today_schedule(self, request):
        """API để PT xem lịch tập hôm nay"""

        today = datetime.now().date()

        # Lấy tất cả buổi tập hôm nay
        today_sessions = WorkoutSession.objects.filter(
            trainer=request.user,
            session_date=today
        ).order_by('start_time')

        # Thống kê nhanh
        total_today = today_sessions.count()
        completed_today = today_sessions.filter(status='completed').count()
        pending_today = today_sessions.filter(status='pending').count()
        confirmed_today = today_sessions.filter(status='confirmed').count()
        cancelled_today = today_sessions.filter(status='cancelled').count()

        serializer = serializers.WorkoutSessionListScheduleSerializer(today_sessions, many=True)

        return Response({
            "date": today,
            "summary": {
                "total": total_today,
                "completed": completed_today,
                "pending": pending_today,
                "confirmed": confirmed_today,
                "cancelled": cancelled_today
            },
            "sessions": serializer.data
        })

class TrainingProgressViewSet(viewsets.ViewSet):
    serializer_class = serializers.TrainingProgressSerializer
    permission_classes = [permissions.IsAuthenticated, perms.IsTrainerOrMemberOwner]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['health_info', 'workout_session', 'created_by']
    search_fields = ['notes', 'health_info__user__username']
    ordering_fields = ['workout_session__session_date', 'weight', 'created_at']
    ordering = ['-workout_session__session_date']  # Mặc định sắp xếp theo ngày mới nhất
    pagination_class = paginators.ItemPaginator

    def get_queryset(self):
        # PT có thể thấy tất cả bản ghi
        if self.request.user.is_trainer:
            return TrainingProgress.objects.all()

        # Hội viên chỉ thấy bản ghi của mình
        try:
            health_info = HealthInfo.objects.get(user=self.request.user)
            return TrainingProgress.objects.filter(health_info=health_info)
        except HealthInfo.DoesNotExist:
            return TrainingProgress.objects.none()

    def get_serializer_class(self):
        if self.action == 'list':
            return serializers.TrainingProgressListSerializer
        elif self.action == 'chart_data':
            return serializers.TrainingProgressChartDataSerializer
        return serializers.TrainingProgressSerializer

    def get_object(self):
        queryset = self.get_queryset()
        pk = self.kwargs.get('pk')
        obj = queryset.filter(pk=pk).first()
        if obj is None:
            raise NotFound(detail="Không tìm thấy đối tượng.")
        self.check_object_permissions(self.request, obj)
        return obj

    def validate_health_info_workout_session_unique(self, health_info, workout_session, instance_id=None):
        """Kiểm tra trùng lặp health_info và workout_session"""
        existing_query = TrainingProgress.objects.filter(
            health_info=health_info,
            workout_session=workout_session
        )

        # Nếu đang cập nhật, loại trừ bản ghi hiện tại
        if instance_id:
            existing_query = existing_query.exclude(pk=instance_id)

        if existing_query.exists():
            raise ValidationError({
                "workout_session": f"Đã tồn tại bản ghi tiến độ cho buổi tập này của hội viên này."
            })

    def create(self, request):
        """Phương thức POST để tạo bản ghi tiến độ mới"""
        workout_session_id = request.data.get('workout_session')

        try:
            workout_session = WorkoutSession.objects.get(id=workout_session_id)

            # Kiểm tra xem người dùng hiện tại có phải là trainer của buổi tập không
            if request.user != workout_session.trainer:
                raise PermissionDenied(detail="Chỉ trainer của buổi tập mới được phép tạo bản ghi tiến độ.")

            # Kiểm tra trạng thái buổi tập
            if workout_session.status != 'completed':
                raise ValidationError({"workout_session": "Chỉ buổi tập đã hoàn thành mới có thể tạo bản ghi tiến độ."})

            # Kiểm tra đã có bản ghi tiến độ cho buổi tập này chưa
            if TrainingProgress.objects.filter(workout_session=workout_session).exists():
                raise ValidationError({"workout_session": "Buổi tập này đã có bản ghi tiến độ."})

            # Tự động lấy health_info của hội viên
            try:
                health_info = HealthInfo.objects.get(user=workout_session.member)
            except HealthInfo.DoesNotExist:
                raise ValidationError({"error": "Hội viên chưa có thông tin sức khỏe."})

            # Chuẩn bị dữ liệu
            data = request.data.copy()
            data['health_info'] = health_info.id

            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            instance = serializer.save(created_by=request.user)

            return Response(
                self.get_serializer(instance).data,
                status=status.HTTP_201_CREATED
            )

        except WorkoutSession.DoesNotExist:
            return Response({"error": "Không tìm thấy buổi tập."}, status=status.HTTP_404_NOT_FOUND)

    def partial_update(self, request, pk=None):
        """Phương thức PATCH để cập nhật một phần bản ghi tiến độ"""

        instance = self.get_object()

        # Chỉ PT của buổi tập mới được phép sửa
        if request.user != instance.workout_session.trainer:
            raise PermissionDenied(detail="Chỉ trainer của buổi tập mới được phép cập nhật bản ghi tiến độ.")

        # Chỉ cho phép cập nhật nếu buổi tập đã hoàn thành
        if instance.workout_session.status != 'completed':
            raise ValidationError({"workout_session": "Chỉ buổi tập đã hoàn thành mới được cập nhật bản ghi tiến độ."})

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Kiểm tra trùng lặp nếu health_info hoặc workout_session thay đổi
        health_info = serializer.validated_data.get('health_info', instance.health_info)
        workout_session = serializer.validated_data.get('workout_session', instance.workout_session)

        if health_info != instance.health_info or workout_session != instance.workout_session:
            self.validate_health_info_workout_session_unique(health_info, workout_session, instance_id=instance.id)

        # Cập nhật bản ghi
        instance = serializer.save()

        return Response(serializer.data)

    def filter_queryset(self, queryset):
        """Áp dụng bộ lọc cho queryset"""
        for backend in list(self.filter_backends):
            queryset = backend().filter_queryset(self.request, queryset, self)
        return queryset

    def get_serializer(self, *args, **kwargs):
        """Lấy serializer với context chứa request"""
        serializer_class = self.get_serializer_class()
        kwargs.setdefault('context', {
            'request': self.request,
            'format': self.format_kwarg,
            'view': self
        })
        return serializer_class(*args, **kwargs)

    @action(detail=False, methods=['get'], url_path='member/(?P<member_id>\d+)')
    def member_progress(self, request, member_id=None):
        """Lấy tất cả bản ghi tiến độ của một hội viên cụ thể"""
        # Kiểm tra quyền - chỉ PT hoặc chính hội viên đó mới xem được
        user = request.user
        if not user.is_trainer and user.id != member_id:
            return Response(
                {"error": "Bạn không có quyền xem tiến độ của hội viên này"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            member = User.objects.get(id=member_id, role='MEMBER')
            health_info = HealthInfo.objects.get(user=member)
            progress = self.filter_queryset(
                TrainingProgress.objects.filter(health_info=health_info)
            )

            serializer = self.get_serializer(progress, many=True)
            return Response(serializer.data)

        except User.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy hội viên"},
                status=status.HTTP_404_NOT_FOUND
            )
        except HealthInfo.DoesNotExist:
            return Response(
                {"error": "Hội viên chưa có thông tin sức khỏe"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], url_path='chart/(?P<member_id>\d+)')
    def chart_data(self, request, member_id=None):
        """API để lấy dữ liệu biểu đồ theo thời gian của hội viên"""
        # Kiểm tra quyền - chỉ PT hoặc chính hội viên đó mới xem được
        user = request.user
        if not user.is_trainer and user.id != member_id:
            return Response(
                {"error": "Bạn không có quyền xem tiến độ của hội viên này"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            member = User.objects.get(id=member_id, role='MEMBER')
            health_info = HealthInfo.objects.get(user=member)

            # Lấy khoảng thời gian nếu có
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')

            queryset = TrainingProgress.objects.filter(health_info=health_info)

            if start_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d').date()
                    queryset = queryset.filter(workout_session__session_date__gte=start)
                except ValueError:
                    pass

            if end_date:
                try:
                    end = datetime.strptime(end_date, '%Y-%m-%d').date()
                    queryset = queryset.filter(workout_session__session_date__lte=end)
                except ValueError:
                    pass

            # Sắp xếp theo ngày tăng dần để biểu đồ dễ đọc
            progress_records = queryset.order_by('workout_session__session_date')

            if not progress_records.exists():
                return Response(
                    {"error": "Không có dữ liệu tiến độ trong khoảng thời gian này"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Lấy thông tin cơ bản của hội viên
            basic_info = {
                'member_id': member.id,
                'username': member.username,
                'height': health_info.height,
                'training_goal': health_info.get_training_goal_display(),
                'bmi': health_info.bmi,
                'age': health_info.age,
                'bmr': health_info.bmr
            }

            # Lấy các chỉ số thay đổi qua thời gian
            serializer = serializers.TrainingProgressChartDataSerializer(progress_records, many=True)

            # Tìm min/max để biểu đồ có thể set scale
            stats = {
                'weight': {
                    'min': progress_records.aggregate(Min('weight'))['weight__min'],
                    'max': progress_records.aggregate(Max('weight'))['weight__max'],
                }
            }
            if progress_records.filter(body_fat_percentage__isnull=False).exists():
                stats['body_fat'] = {
                    'min': progress_records.filter(body_fat_percentage__isnull=False).aggregate(
                        Min('body_fat_percentage'))['body_fat_percentage__min'],
                    'max': progress_records.filter(body_fat_percentage__isnull=False).aggregate(
                        Max('body_fat_percentage'))['body_fat_percentage__max'],
                }

            # Tính toán tiến bộ (so sánh giữa bản ghi mới nhất và cũ nhất)
            if progress_records.count() >= 2:
                first_record = progress_records.order_by('workout_session__session_date').first()
                last_record = progress_records.order_by('workout_session__session_date').last()

                progress_stats = {
                    'date_range': {
                        'first': first_record.workout_session.session_date,
                        'last': last_record.workout_session.session_date
                    },
                    'weight_change': last_record.weight - first_record.weight
                }

                # Thêm các chỉ số có sẵn
                if first_record.body_fat_percentage and last_record.body_fat_percentage:
                    progress_stats[
                        'body_fat_change'] = last_record.body_fat_percentage - first_record.body_fat_percentage

                # Thêm các chỉ số khác tương tự

                stats['progress'] = progress_stats

            response_data = {
                'basic_info': basic_info,
                'chart_data': serializer.data,
                'stats': stats
            }

            return Response(response_data)

        except User.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy hội viên"},
                status=status.HTTP_404_NOT_FOUND
            )
        except HealthInfo.DoesNotExist:
            return Response(
                {"error": "Hội viên chưa có thông tin sức khỏe"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], url_path='my-progress')
    def my_progress(self, request):
        """Lấy tiến độ của người dùng hiện tại"""
        if not request.user.is_member:
            return Response(
                {"error": "Chỉ hội viên mới có thể sử dụng API này"},
                status=status.HTTP_403_FORBIDDEN
            )

        return self.member_progress(request, member_id=request.user.id)

    @action(detail=False, methods=['get'], url_path='my-chart',
            permission_classes=[permissions.IsAuthenticated, perms.IsOwner])
    def my_chart_data(self, request):
        """Lấy dữ liệu biểu đồ của người dùng hiện tại"""
        if not request.user.is_member:
            return Response(
                {"error": "Chỉ hội viên mới có thể sử dụng API này"},
                status=status.HTTP_403_FORBIDDEN
            )

        return self.chart_data(request, member_id=request.user.id)

    @action(detail=False, methods=['get'], url_path='latest/(?P<member_id>\d+)')
    def latest_progress(self, request, member_id=None):
        """Lấy bản ghi tiến độ mới nhất của hội viên"""
        # Kiểm tra quyền
        user = request.user
        if not user.is_trainer and str(user.id) != member_id:
            return Response(
                {"error": "Bạn không có quyền xem tiến độ của hội viên này"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            member = User.objects.get(id=member_id, role='MEMBER')
            health_info = HealthInfo.objects.get(user=member)
            latest = TrainingProgress.objects.filter(health_info=health_info).order_by(
                '-workout_session__session_date').first()

            if not latest:
                return Response(
                    {"error": "Chưa có bản ghi tiến độ nào cho hội viên này"},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = self.get_serializer(latest)
            return Response(serializer.data)

        except (User.DoesNotExist, HealthInfo.DoesNotExist):
            return Response(
                {"error": "Không tìm thấy hội viên hoặc thông tin sức khỏe"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], url_path='session/(?P<session_id>\d+)')
    def session_progress(self, request, session_id=None):
        """Lấy bản ghi tiến độ của một session cụ thể"""
        try:
            # Lấy thông tin workout session
            workout_session = WorkoutSession.objects.get(id=session_id)

            # Kiểm tra quyền - chỉ trainer của session hoặc member của session mới xem được
            user = request.user
            if not user.is_trainer and user != workout_session.member:
                return Response(
                    {"error": "Bạn không có quyền xem tiến độ của phiên tập này"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Nếu là trainer, kiểm tra có phải trainer của session này không
            if user.is_trainer and user != workout_session.trainer:
                return Response(
                    {"error": "Bạn không có quyền xem tiến độ của phiên tập này"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Tìm bản ghi tiến độ cho session này
            try:
                progress = TrainingProgress.objects.get(workout_session=workout_session)
                serializer = self.get_serializer(progress)
                return Response(serializer.data)

            except TrainingProgress.DoesNotExist:
                return Response(
                    {"error": "Chưa có bản ghi tiến độ cho phiên tập này"},
                    status=status.HTTP_404_NOT_FOUND
                )

        except WorkoutSession.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy phiên tập"},
                status=status.HTTP_404_NOT_FOUND
            )
### API ratiing:
class TrainerRatingViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.TrainerRatingSerializer
    permission_classes = [permissions.IsAuthenticated, perms.IsOwnerOrReadOnly]
    pagination_class = paginators.ItemPaginator

    @action(detail=False, methods=['get'], url_path='trainer/my_rating  ')
    def trainer_my_rating(self, request):
        # Kiểm tra user hiện tại có phải là trainer không
        if request.user.role != 'TRAINER':
            return Response(
                {"error": "Chỉ trainer mới có thể xem đánh giá của mình"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Lấy tất cả đánh giá cho trainer hiện tại
        ratings = TrainerRating.objects.filter(trainer=request.user).order_by('-created_at')

        # Áp dụng pagination
        page = self.paginate_queryset(ratings)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(ratings, many=True)

        # Tính toán thống kê tổng quan
        if ratings.exists():
            avg_knowledge = sum(r.knowledge_score for r in ratings) / ratings.count()
            avg_communication = sum(r.communication_score for r in ratings) / ratings.count()
            avg_punctuality = sum(r.punctuality_score for r in ratings) / ratings.count()
            avg_overall = sum(r.overall_score for r in ratings) / ratings.count()

            stats = {
                "total_ratings": ratings.count(),
                "average_knowledge": round(avg_knowledge, 1),
                "average_communication": round(avg_communication, 1),
                "average_punctuality": round(avg_punctuality, 1),
                "average_overall": round(avg_overall, 1)
            }
        else:
            stats = {
                "total_ratings": 0,
                "average_knowledge": 0,
                "average_communication": 0,
                "average_punctuality": 0,
                "average_overall": 0
            }

        return Response({
            "stats": stats,
            "ratings": serializer.data
        })
    @action(detail=False, methods=['get'], url_path='my-ratings')
    def my_ratings(self, request):
        ratings = TrainerRating.objects.filter(user=request.user)
        serializer = self.get_serializer(ratings, many=True)
        return Response(serializer.data)

    def get_queryset(self):
        queryset = TrainerRating.objects.all()
        trainer_id = self.request.query_params.get('trainer_id')
        if trainer_id:
            queryset = queryset.filter(trainer_id=trainer_id)
        return queryset

    def create(self, request, *args, **kwargs):
        # Lấy rating_id từ body request (có thể là trainer_rating hoặc rating_id)
        rating_id = request.data.get('trainer_rating') or request.data.get('rating_id')

        if not rating_id:
            return Response(
                {"error": "Thiếu rating_id trong request body"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate rating_id là số
        try:
            rating_id = int(rating_id)
        except (ValueError, TypeError):
            return Response(
                {"error": "rating_id phải là một số"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Kiểm tra rating có tồn tại không
        try:
            trainer_rating = TrainerRating.objects.get(id=rating_id)
        except TrainerRating.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy đánh giá với rating_id này"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Kiểm tra quyền phản hồi (chỉ trainer được đánh giá mới có thể phản hồi)
        if request.user != trainer_rating.trainer:
            return Response(
                {"error": "Bạn không có quyền phản hồi đánh giá này"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Kiểm tra đã phản hồi chưa
        existing_response = FeedbackResponse.objects.filter(
            trainer_rating=trainer_rating,
            responder=request.user
        ).first()

        if existing_response:
            # Nếu đã có phản hồi, cập nhật thay vì tạo mới
            serializer = self.get_serializer(existing_response, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)

            # Cập nhật trainer_rating và responder
            serializer.validated_data['trainer_rating'] = trainer_rating
            serializer.validated_data['responder'] = request.user

            self.perform_update(serializer)

            return Response(
                {
                    "message": "Phản hồi đã được cập nhật",
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )
        else:
            response_data = request.data.copy()
            response_data['trainer_rating'] = rating_id

            serializer = self.get_serializer(data=response_data)
            serializer.is_valid(raise_exception=True)

            # Set trainer_rating và responder trong perform_create
            serializer.validated_data['trainer_rating'] = trainer_rating
            serializer.validated_data['responder'] = request.user

            self.perform_create(serializer)

            headers = self.get_success_headers(serializer.data)
            return Response(
                {
                    "message": "Phản hồi đã được tạo thành công",
                    "data": serializer.data
                },
                status=status.HTTP_201_CREATED,
                headers=headers
            )

    def perform_create(self, serializer):
        """Gán user hiện tại khi tạo rating"""
        serializer.save(user=self.request.user)
class FeedbackResponseViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.FeedbackResponseSerializer
    permission_classes = [permissions.IsAuthenticated, perms.IsOwnerOrReadOnly]
    pagination_class = paginators.ItemPaginator

    def get_queryset(self):
        # Cho phép filter theo rating_id nếu có trong URL
        rating_id = self.kwargs.get('rating_id')
        if rating_id:
            return FeedbackResponse.objects.filter(
                Q(trainer_rating_id=rating_id) |
                Q(gym_rating_id=rating_id))
        return FeedbackResponse.objects.all()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        rating_id = self.kwargs.get('rating_id')
        if rating_id:
            context['rating_id'] = rating_id
        return context

    def create(self, request, *args, **kwargs):
        """Tạo phản hồi cho đánh giá với rating_id từ body request"""

        # Lấy rating_id từ body request
        trainer_rating_id = request.data.get('trainer_rating')
        gym_rating_id = request.data.get('gym_rating')

        # Kiểm tra có ít nhất một loại rating
        if not trainer_rating_id and not gym_rating_id:
            return Response(
                {"error": "Phải chỉ định trainer_rating hoặc gym_rating trong request body"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Kiểm tra không được chỉ định cả hai
        if trainer_rating_id and gym_rating_id:
            return Response(
                {"error": "Chỉ có thể phản hồi cho một loại đánh giá"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Xử lý trainer rating
        if trainer_rating_id:
            try:
                trainer_rating_id = int(trainer_rating_id)
                trainer_rating = TrainerRating.objects.get(id=trainer_rating_id)

                # Kiểm tra quyền phản hồi
                if request.user != trainer_rating.trainer:
                    return Response(
                        {"error": "Bạn không có quyền phản hồi đánh giá này"},
                        status=status.HTTP_403_FORBIDDEN
                    )

                # Kiểm tra đã phản hồi chưa
                existing_response = FeedbackResponse.objects.filter(
                    trainer_rating=trainer_rating,
                    responder=request.user
                ).first()

            except (ValueError, TypeError):
                return Response(
                    {"error": "trainer_rating phải là một số"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except TrainerRating.DoesNotExist:
                return Response(
                    {"error": "Không tìm thấy đánh giá trainer với ID này"},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Xử lý gym rating (tương tự trainer rating)
        if gym_rating_id:
            try:
                gym_rating_id = int(gym_rating_id)
                # Thêm logic xử lý gym_rating tương tự như trainer_rating
                # gym_rating = GymRating.objects.get(id=gym_rating_id)
                # ... logic kiểm tra quyền và existing response
                existing_response = None  # Placeholder

            except (ValueError, TypeError):
                return Response(
                    {"error": "gym_rating phải là một số"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # except GymRating.DoesNotExist:
            #     return Response(
            #         {"error": "Không tìm thấy đánh giá gym với ID này"},
            #         status=status.HTTP_404_NOT_FOUND
            #     )

        # Kiểm tra response_text có được cung cấp không
        if not request.data.get('response_text'):
            return Response(
                {"error": "Thiếu response_text trong request body"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if existing_response:
            # Cập nhật phản hồi hiện có
            update_data = {'response_text': request.data.get('response_text')}

            serializer = self.get_serializer(existing_response, data=update_data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()

            return Response(
                {
                    "message": "Phản hồi đã được cập nhật thành công",
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )
        else:
            # Tạo phản hồi mới - sử dụng toàn bộ request.data
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(
                {
                    "message": "Phản hồi đã được tạo thành công",
                    "data": serializer.data
                },
                status=status.HTTP_201_CREATED
            )
    def _check_trainer_rating_permission(self, user, trainer_rating):
        """Kiểm tra quyền phản hồi đánh giá HLV"""
        return (user.is_staff or user.is_manager or
                (user.is_trainer and trainer_rating.trainer == user))

    def _check_gym_rating_permission(self, user, gym_rating):
        """Kiểm tra quyền phản hồi đánh giá phòng gym"""
        return (user.is_staff or user.is_manager)

    @action(detail=False, methods=['get'], url_path='stats')
    def response_stats(self, request, rating_id=None):
        responses = self.get_queryset()

        if not responses.exists():
            return Response(
                {"message": "Chưa có phản hồi nào cho đánh giá này"},
                status=status.HTTP_200_OK
            )

        # Thống kê cơ bản
        data = {
            "rating_id": rating_id,
            "total_responses": responses.count(),
            "latest_response": serializers.FeedbackResponseSerializer(responses.latest('created_at')).data,
            "responders": list(responses.values_list('responder__username', flat=True).distinct())
        }

        return Response(data, status=status.HTTP_200_OK)


class GymRatingViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.GymRatingSerializer
    permission_classes = [permissions.IsAuthenticated, perms.IsOwnerOrReadOnly]
    pagination_class = paginators.ItemPaginator



    @action(detail=False, methods=['get'], url_path='my-ratings')
    def my_ratings(self, request):
        ratings = GymRating.objects.filter(user=request.user)
        serializer = self.get_serializer(ratings, many=True)
        return Response(serializer.data)

    def get_queryset(self):
        queryset = GymRating.objects.all()
        gym_id = self.request.query_params.get('gym_id')
        if gym_id:
            queryset = queryset.filter(gym_id=gym_id)
        return queryset

    def create(self, request, *args, **kwargs):
        gym_id = request.data.get('gym_id')
        if not gym_id:
            return Response(
                {"error": "Thiếu gym_id trong request body"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Kiểm tra gym có tồn tại không
        try:
            gym = Gym.objects.get(id=gym_id)
        except Gym.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy phòng gym với ID đã cung cấp"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Kiểm tra user đã đánh giá gym này chưa
        if GymRating.objects.filter(user=request.user, gym_id=gym_id).exists():
            return Response(
                {"error": "Bạn đã đánh giá phòng gym này rồi"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Tạo data với gym_id
        data = request.data.copy()
        data['gym'] = gym_id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )



import logging
import hmac
import hashlib
import requests
import json
import uuid
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from django.http import JsonResponse, HttpResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)

#
#
#
class MoMoPaymentService:
    """Service class để xử lý thanh toán MoMo"""

    @staticmethod
    def create_signature(raw_signature):
        """Tạo chữ ký HMAC SHA256 - Fixed encoding issue"""
        secret_key = settings.MOMO_CONFIG['SECRET_KEY']

        # Fix: Sử dụng UTF-8 encoding thay vì ASCII
        h = hmac.new(
            secret_key.encode('utf-8'),
            raw_signature.encode('utf-8'),
            hashlib.sha256
        )
        return h.hexdigest()

    @staticmethod
    def create_payment_url(amount, order_id, order_info, extra_data=""):
        """Tạo URL thanh toán MoMo"""
        config = settings.MOMO_CONFIG
        request_id = str(uuid.uuid4())

        # Fix: Đảm bảo order_info được xử lý đúng với Unicode
        order_info = str(order_info).strip()

        # Tạo raw signature
        raw_signature = (
            f"accessKey={config['ACCESS_KEY']}"
            f"&amount={amount}"
            f"&extraData={extra_data}"
            f"&ipnUrl={config['IPN_URL']}"
            f"&orderId={order_id}"
            f"&orderInfo={order_info}"
            f"&partnerCode={config['PARTNER_CODE']}"
            f"&redirectUrl={config['REDIRECT_URL']}"
            f"&requestId={request_id}"
            f"&requestType={config['REQUEST_TYPE']}"
        )

        signature = MoMoPaymentService.create_signature(raw_signature)

        # Dữ liệu gửi đến MoMo
        data = {
            'partnerCode': config['PARTNER_CODE'],
            'orderId': order_id,
            'partnerName': config['PARTNER_NAME'],
            'storeId': config['STORE_ID'],
            'ipnUrl': config['IPN_URL'],
            'amount': str(amount),
            'lang': config['LANG'],
            'requestType': config['REQUEST_TYPE'],
            'redirectUrl': config['REDIRECT_URL'],
            'autoCapture': config['AUTO_CAPTURE'],
            'orderInfo': order_info,
            'requestId': request_id,
            'extraData': extra_data,
            'signature': signature,
            'orderGroupId': ""
        }

        try:
            # Fix: Đảm bảo request được gửi với UTF-8 encoding
            response = requests.post(
                config['ENDPOINT'],
                json=data,
                headers={
                    'Content-Type': 'application/json; charset=utf-8',
                    'Accept': 'application/json'
                },
                timeout=30
            )

            # Log để debug
            logger.info(f"MoMo request data: {json.dumps(data, ensure_ascii=False)}")
            logger.info(f"MoMo response: {response.text}")

            return response.json()
        except requests.RequestException as e:
            logger.error(f"MoMo API error: {str(e)}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"MoMo JSON decode error: {str(e)}")
            return None



@method_decorator(csrf_exempt, name='dispatch')
class MoMoIPNView(APIView):
    """Xử lý IPN (Instant Payment Notification) từ MoMo"""
    permission_classes = []

    def post(self, request):
        """Xử lý callback từ MoMo sau khi thanh toán"""
        try:
            data = request.data
            logger.info(f"MoMo IPN received: {data}")

            # Validate signature
            config = settings.MOMO_CONFIG
            raw_signature = (
                f"accessKey={config['ACCESS_KEY']}"
                f"&amount={data.get('amount', '')}"
                f"&extraData={data.get('extraData', '')}"
                f"&message={data.get('message', '')}"
                f"&orderId={data.get('orderId', '')}"
                f"&orderInfo={data.get('orderInfo', '')}"
                f"&orderType={data.get('orderType', '')}"
                f"&partnerCode={data.get('partnerCode', '')}"
                f"&payType={data.get('payType', '')}"
                f"&requestId={data.get('requestId', '')}"
                f"&responseTime={data.get('responseTime', '')}"
                f"&resultCode={data.get('resultCode', '')}"
                f"&transId={data.get('transId', '')}"
            )

            expected_signature = MoMoPaymentService.create_signature(raw_signature)
            received_signature = data.get('signature', '')

            if expected_signature != received_signature:
                logger.error("Invalid MoMo signature")
                return JsonResponse({"status": "error", "message": "Invalid signature"})

            # Tìm payment record
            order_id = data.get('orderId')
            try:
                payment = Payment.objects.get(transaction_id=order_id)
            except Payment.DoesNotExist:
                logger.error(f"Payment not found for order_id: {order_id}")
                return JsonResponse({"status": "error", "message": "Payment not found"})

            # Cập nhật trạng thái thanh toán
            result_code = data.get('resultCode')
            if result_code == 0:  # Thành công
                payment.status = 'completed'
                payment.confirmed_date = timezone.now()
                payment.transaction_id = data.get('transId', order_id)

                # Cập nhật trạng thái subscription
                subscription = payment.subscription
                subscription.status = 'active'
                subscription.save()

                # Cập nhật hồ sơ thành viên với logic xử lý nhiều gói tập
                try:
                    member_profile = subscription.member.member_profile

                    # So sánh và cập nhật ngày kết thúc nếu gói hiện tại có thời hạn lâu hơn
                    if (not member_profile.membership_end_date or
                            subscription.end_date > member_profile.membership_end_date):
                        member_profile.membership_end_date = subscription.end_date

                    member_profile.is_active = True
                    member_profile.save()

                except MemberProfile.DoesNotExist:
                    # Tạo mới MemberProfile nếu chưa tồn tại
                    MemberProfile.objects.create(
                        user=subscription.member,
                        membership_end_date=subscription.end_date,
                        is_active=True
                    )

                # Thông báo cho hội viên
                try:
                    Notification.objects.create(
                        user=subscription.member,
                        title="Thanh toán MoMo thành công",
                        message=f"Thanh toán cho gói tập {subscription.package.name} đã được xác nhận. Gói tập của bạn đã được kích hoạt.",
                        notification_type="payment_confirmation",
                        related_object_id=subscription.id
                    )
                except Exception as notification_error:
                    logger.error(f"Failed to create notification: {notification_error}")

                logger.info(f"Payment {payment.id} completed successfully via MoMo")
            else:  # Thất bại
                payment.status = 'failed'
                logger.info(f"Payment {payment.id} failed with code: {result_code}")

            payment.notes = f"MoMo response: {data.get('message', '')}"
            payment.save()

            return JsonResponse({"status": "success"})

        except Exception as e:
            logger.error(f"MoMo IPN error: {str(e)}")
            return JsonResponse({"status": "error", "message": str(e)})
@method_decorator(csrf_exempt, name='dispatch')
class MoMoReturnView(APIView):
    """Xử lý redirect từ MoMo sau khi user thanh toán xong"""
    permission_classes = []

    def get(self, request):
        """Xử lý return URL từ MoMo"""
        order_id = request.GET.get('orderId')
        result_code = request.GET.get('resultCode')

        try:
            payment = Payment.objects.get(transaction_id=order_id)

            if result_code == '0':
                message = "Thanh toán thành công!"
                payment_status = "completed"
            else:
                message = "Thanh toán thất bại!"
                payment_status = "failed"

            # Redirect về frontend với thông tin
            frontend_url = f"https://c11e-171-231-61-11.ngrok-free.app/payment-result?status={payment_status}&message={message}&payment_id={payment.id}"

            return JsonResponse({
                "status": payment_status,
                "message": message,
                "payment_id": payment.id,
                "redirect_url": frontend_url
            })

        except Payment.DoesNotExist:
            return JsonResponse({
                "status": "error",
                "message": "Không tìm thấy thông tin thanh toán"
            })
#
#
#
class PaymentViewSet(viewsets.ViewSet):
    """ViewSet để quản lý thanh toán"""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Lấy danh sách thanh toán của user"""
        payments = Payment.objects.filter(
            subscription__member=request.user
        ).select_related('subscription', 'subscription__package')

        serializer = serializers.PaymentSerializer(payments, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """Lấy chi tiết một thanh toán"""
        try:
            payment = Payment.objects.select_related(
                'subscription', 'subscription__package', 'subscription__member'
            ).get(id=pk, subscription__member=request.user)

            serializer = serializers.PaymentSerializer(payment)
            return Response(serializer.data)
        except Payment.DoesNotExist:
            return Response(
                {"error": "Thanh toán không tồn tại"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], url_path='debug')
    def debug_payments(self, request):
        """Debug payment records"""
        if not request.user.is_superuser:
            return Response({'error': 'Permission denied'},
                            status=status.HTTP_403_FORBIDDEN)

        # Lấy các payment gần đây
        recent_payments = Payment.objects.filter(
            payment_method='vnpay'
        ).order_by('-created_at')[:10]

        debug_data = []
        for payment in recent_payments:
            debug_data.append({
                'id': payment.id,
                'transaction_id': payment.transaction_id,
                'status': payment.status,
                'amount': payment.amount,
                'created_at': payment.created_at,
                'user': payment.subscription.member.username,
                'subscription_id': payment.subscription.id
            })

        return Response({'payments': debug_data})

    @action(detail=False, methods=['post'], url_path='cancel-pending')
    def cancel_pending_payments(self, request):
        """Cancel expired pending payments"""
        if not request.user.is_superuser:
            return Response({'error': 'Permission denied'},
                            status=status.HTTP_403_FORBIDDEN)

        # Cancel payments older than 15 minutes
        expired_time = timezone.now() - timedelta(minutes=15)
        expired_payments = Payment.objects.filter(
            status='pending',
            payment_method='vnpay',
            created_at__lt=expired_time
        )

        count = expired_payments.count()
        expired_payments.update(status='expired')

        return Response({
            'message': f'Cancelled {count} expired payments'
        })
    @action(detail=False, methods=['post'], url_path='vnpay/create')
    def create_vnpay_payment(self, request):
        view = CreateVNPayPaymentView()
        return view.post(request)

    @action(detail=True, methods=['get'], url_path='vnpay/status')
    def check_vnpay_status(self, request, pk=None):
        """
        Kiểm tra trạng thái thanh toán VNPay
        """
        try:
            payment = self.get_object()

            if payment.payment_method != 'vnpay':
                return Response(
                    {'error': 'This is not a VNPay payment'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Có thể query trạng thái từ VNPay nếu cần
            vnpay = VNPayUtils()

            return Response({
                'payment_id': payment.id,
                'status': payment.status,
                'transaction_id': payment.transaction_id,
                'amount': payment.amount,
                'payment_date': payment.payment_date,
                'confirmed_date': payment.confirmed_date
            })

        except Exception as e:
            logger.error(f"Error checking VNPay status: {str(e)}")
            return Response(
                {'error': 'Failed to check payment status'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
#
#
#
    @action(detail=False, methods=['post'])
    def create_momo_payment(self, request):
        serializer = serializers.CreateMoMoPaymentSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            subscription = SubscriptionPackage.objects.get(
                id=serializer.validated_data['subscription_id'],
                member=request.user
            )

            # Tạo order ID unique
            order_id = f"GYM_{subscription.id}_{int(datetime.now().timestamp())}"
            amount = int(serializer.validated_data['amount'])

            # Fix: Xử lý order_info với Unicode
            order_info = str(serializer.validated_data['order_info']).strip()

            # Log để debug
            logger.info(f"Creating MoMo payment - Order info: {order_info}")
            logger.info(f"Order info type: {type(order_info)}")

            # Tạo payment record
            payment = Payment.objects.create(
                subscription=subscription,
                amount=serializer.validated_data['amount'],
                payment_method='momo',
                status='pending',
                transaction_id=order_id,
                notes=order_info
            )

            # Gọi MoMo API
            momo_response = MoMoPaymentService.create_payment_url(
                amount=amount,
                order_id=order_id,
                order_info=order_info,
                extra_data=json.dumps({"payment_id": payment.id}, ensure_ascii=False)
            )

            if momo_response and momo_response.get('resultCode') == 0:
                return Response({
                    'payment_id': payment.id,
                    'payment_url': momo_response.get('payUrl'),
                    'order_id': order_id,
                    'amount': amount,
                    'message': 'Tạo thanh toán thành công'
                })
            else:
                payment.status = 'failed'
                payment.save()

                error_message = 'Không thể tạo thanh toán MoMo'
                if momo_response:
                    error_message += f" - Mã lỗi: {momo_response.get('resultCode', 'Unknown')}"
                    if 'message' in momo_response:
                        error_message += f" - {momo_response['message']}"

                return Response({
                    'error': error_message,
                    'details': momo_response
                }, status=status.HTTP_400_BAD_REQUEST)

        except SubscriptionPackage.DoesNotExist:
            return Response(
                {"error": "Gói tập không tồn tại hoặc không thuộc về bạn"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Create MoMo payment error: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")

            return Response(
                {"error": "Có lỗi xảy ra khi tạo thanh toán"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


#
#
#

from django.db import transaction
from decimal import Decimal

class CreateVNPayPaymentView(APIView):
    """
    API tạo thanh toán VNPay
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            serializer = serializers.CreateVNPayPaymentSerializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"Invalid VNPay data: {serializer.errors}")
                return Response(
                    {'error': 'Dữ liệu không hợp lệ', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Lấy và validate dữ liệu
            subscription_id = serializer.validated_data['subscription_id']
            amount = serializer.validated_data['amount']
            order_info = serializer.validated_data['order_info']
            bank_code = serializer.validated_data.get('bank_code')

            # Validate amount
            try:
                amount_decimal = Decimal(str(amount))
                if amount_decimal < Decimal('1000'):
                    return Response(
                        {'error': 'Số tiền tối thiểu là 1,000 VND'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if amount_decimal > Decimal('100000000'):
                    return Response(
                        {'error': 'Số tiền không được vượt quá 100,000,000 VND'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except (ValueError, TypeError):
                return Response(
                    {'error': 'Số tiền không hợp lệ'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Lấy và validate subscription
            try:
                subscription = SubscriptionPackage.objects.get(
                    id=subscription_id,
                    member=request.user
                )
            except SubscriptionPackage.DoesNotExist:
                return Response(
                    {'error': 'Gói tập không tồn tại hoặc không thuộc về bạn'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Kiểm tra xem đã có payment pending cho subscription này chưa
            existing_pending = Payment.objects.filter(
                subscription=subscription,
                payment_method='vnpay',
                status='pending'
            ).first()

            if existing_pending:
                # Hủy payment cũ nếu đã quá 15 phút
                if existing_pending.created_at < timezone.now() - timedelta(minutes=15):
                    existing_pending.status = 'expired'
                    existing_pending.save()
                else:
                    return Response(
                        {
                            'error': 'Đã có giao dịch đang chờ xử lý cho gói tập này',
                            'payment_id': existing_pending.id
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Validate và làm sạch order_info
            if not order_info or len(order_info.strip()) < 5:
                order_info = f"Thanh toan goi tap {subscription.package.name}"

            # Làm sạch order_info (VNPay không cho phép ký tự đặc biệt)
            import re
            # Chỉ giữ lại chữ cái, số, khoảng trắng và dấu gạch ngang
            order_info = re.sub(r'[^\w\s-]', '', order_info.strip())
            # Giới hạn độ dài
            order_info = order_info[:200] if len(order_info) > 200 else order_info
            # Đảm bảo không rỗng
            if not order_info:
                order_info = f"Thanh toan goi tap"

            # Validate bank_code
            if bank_code:
                valid_bank_codes = [
                    'VCB', 'TCB', 'BIDV', 'AGRI', 'MB', 'ACB', 'CTG', 'STB',
                    'NCB', 'SCB', 'EIB', 'MSB', 'NAB', 'VNMART', 'HDB', 'SHB',
                    'ABB', 'OCB', 'BAB', 'VPB', 'VIB', 'DAB', 'TPB', 'OJB',
                    'SEAB', 'UOB', 'PBVN', 'GPB', 'ANZ', 'HSBC', 'DB',
                    'SHINHAN', 'MIRAE', 'CIMB', 'KEB', 'CBB', 'KLB', 'IVB'
                ]

                if bank_code not in valid_bank_codes:
                    logger.warning(f"Invalid bank code: {bank_code}")
                    bank_code = None

            # Tạo order_id không có ký tự đặc biệt (VNPay loại bỏ dấu gạch dưới)
            unique_suffix = str(int(datetime.now().timestamp() * 1000))  # millisecond timestamp
            temp_order_id = f"{subscription.id}{unique_suffix}"  # Bỏ dấu gạch dưới

            # Tạo payment record với transaction_id unique
            with transaction.atomic():
                payment = Payment.objects.create(
                    subscription=subscription,
                    amount=amount_decimal,
                    payment_method='vnpay',
                    status='pending',
                    transaction_id=temp_order_id,  # Sử dụng unique ID
                    notes=f"VNPay payment: {order_info}"
                )

                # Khởi tạo VNPay utils
                vnpay = VNPayUtils()

                # Lấy IP client
                ip_addr = vnpay.get_client_ip(request)

                # Log thông tin debug
                logger.info(f"Creating VNPay payment:")
                logger.info(f"- Payment ID: {payment.id}")
                logger.info(f"- Order ID (transaction_id): {payment.transaction_id}")
                logger.info(f"- Amount: {amount_decimal}")
                logger.info(f"- Order Info: '{order_info}'")
                logger.info(f"- Bank Code: {bank_code}")
                logger.info(f"- IP Address: {ip_addr}")

                # Tạo URL thanh toán với transaction_id thay vì payment.id
                try:
                    payment_url = vnpay.create_payment_url(
                        order_id=payment.transaction_id,  # Sử dụng transaction_id
                        amount=float(amount_decimal),
                        order_desc=order_info,
                        ip_addr=ip_addr,
                        bank_code=bank_code
                    )

                    logger.info(f"VNPay payment URL created successfully for payment {payment.id}")

                except Exception as vnpay_error:
                    logger.error(f"VNPay URL creation failed: {str(vnpay_error)}")
                    logger.error(f"VNPay error details:", exc_info=True)

                    payment.status = 'failed'
                    payment.notes = f"URL creation failed: {str(vnpay_error)}"
                    payment.save()

                    return Response(
                        {'error': 'Không thể tạo URL thanh toán', 'details': str(vnpay_error)},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

                return Response({
                    'payment_id': payment.id,
                    'order_id': payment.transaction_id,  # Return transaction_id as order_id
                    'payment_url': payment_url,
                    'amount': float(amount_decimal),
                    'order_info': order_info,
                    'bank_code': bank_code,
                    'message': 'URL thanh toán đã được tạo thành công'
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Unexpected error in VNPay payment creation: {str(e)}")
            logger.error(f"Error traceback:", exc_info=True)

            return Response(
                {
                    'error': 'Có lỗi xảy ra khi tạo thanh toán',
                    'details': 'Vui lòng thử lại sau'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Sửa lỗi trong VNPayIPNView
@method_decorator(csrf_exempt, name='dispatch')
class VNPayIPNView(APIView):
    def get(self, request):
        """Handle GET request from VNPay IPN"""
        return self.handle_ipn_request(request, request.GET)
    #
    # def post(self, request):
    #     """Handle POST request from VNPay IPN"""
    #     return self.handle_ipn_request(request, request.POST)

    def handle_ipn_request(self, request, data_source):
        logger.info("=== VNPay IPN View Called ===")
        logger.info(f"Method: {request.method}")
        logger.info(f"Data: {dict(data_source)}")

        try:
            # Xử lý data từ GET hoặc POST
            if request.content_type == 'application/json' and request.body:
                import json
                ipn_data = json.loads(request.body.decode('utf-8'))
            else:
                ipn_data = {}
                for key, value in data_source.items():
                    if isinstance(value, list):
                        ipn_data[key] = value[0]
                    else:
                        ipn_data[key] = value

            logger.info(f"Processed IPN data: {ipn_data}")

            # Kiểm tra nếu không có data (có thể là health check)
            if not ipn_data or 'vnp_TxnRef' not in ipn_data:
                logger.info("Empty IPN request - possibly health check")
                return HttpResponse("00", content_type="text/plain")

            # Validate data
            serializer = serializers.VNPayIPNSerializer(data=ipn_data)
            if not serializer.is_valid():
                logger.error(f"Invalid VNPay IPN data: {serializer.errors}")
                return HttpResponse("02", content_type="text/plain")

            # Validate signature
            vnpay = VNPayUtils()
            is_valid, message = vnpay.validate_response(ipn_data)

            if not is_valid:
                logger.error(f"Invalid VNPay IPN signature: {message}")
                return HttpResponse("97", content_type="text/plain")

            order_id = serializer.validated_data['vnp_TxnRef']
            amount = serializer.validated_data['vnp_Amount']
            response_code = serializer.validated_data['vnp_ResponseCode']
            transaction_no = serializer.validated_data['vnp_TransactionNo']

            # Tìm payment
            try:
                payment = Payment.objects.get(transaction_id=order_id)
                logger.info(f"IPN Found payment: {payment.id}, status: {payment.status}")
            except Payment.DoesNotExist:
                logger.error(f"IPN Payment with transaction_id {order_id} not found")
                return HttpResponse("01", content_type="text/plain")

            # VNPay trả về số tiền gốc, không cần chia cho 100
            vnpay_amount = float(amount)  # VNPay trả về số tiền gốc
            payment_amount = float(payment.amount)

            logger.info(f"Raw VNPay amount: {amount}")
            logger.info(f"VNPay amount (no conversion): {vnpay_amount}")
            logger.info(f"Payment amount in DB: {payment_amount}")

            logger.info(f"Amount comparison: VNPay={vnpay_amount}, Payment={payment_amount}")

            if abs(payment_amount - vnpay_amount) > 0.01:  # Cho phép sai lệch nhỏ do làm tròn
                logger.error(f"IPN Amount mismatch: expected {payment_amount}, got {vnpay_amount}")
                return HttpResponse("04", content_type="text/plain")

            # Xử lý thành công - IPN có độ ưu tiên cao hơn Return URL
            if response_code == '00':
                logger.info("IPN Processing successful payment...")

                with transaction.atomic():
                    # Chỉ update nếu chưa completed
                    if payment.status == 'pending':
                        payment.status = 'completed'
                        payment.vnpay_transaction_no = transaction_no
                        payment.confirmed_date = timezone.now()
                        payment.save()

                        # Activate subscription
                        subscription = payment.subscription
                        subscription.status = 'active'
                        subscription.save()

                        # Update member profile
                        try:
                            member_profile = subscription.member.member_profile
                            if (not member_profile.membership_end_date or
                                    subscription.end_date > member_profile.membership_end_date):
                                member_profile.membership_end_date = subscription.end_date
                            member_profile.is_active = True
                            member_profile.save()
                        except MemberProfile.DoesNotExist:
                            MemberProfile.objects.create(
                                user=subscription.member,
                                membership_end_date=subscription.end_date,
                                is_active=True
                            )

                        # Tạo thông báo
                        Notification.objects.create(
                            user=subscription.member,
                            title="Thanh toán thành công (IPN)",
                            message=f"Thanh toán cho gói tập {subscription.package.name} đã hoàn tất",
                            notification_type="payment_success"
                        )

                        logger.info(f"IPN: Payment {payment.id} completed successfully")
                    else:
                        logger.info(f"IPN: Payment {payment.id} already processed")

                return HttpResponse("00", content_type="text/plain")
            else:
                logger.warning(f"IPN Payment failed. Response code: {response_code}")
                if payment.status == 'pending':
                    payment.status = 'failed'
                    payment.save()
                return HttpResponse("00", content_type="text/plain")

        except Exception as e:
            logger.error(f"Error processing VNPay IPN: {str(e)}", exc_info=True)
            return HttpResponse("99", content_type="text/plain")


@method_decorator(csrf_exempt, name='dispatch')
class VNPayReturnView(APIView):
    def get(self, request):
        logger.info("=== VNPay Return View Called ===")
        logger.info(f"GET params: {dict(request.GET)}")

        try:
            return_data = {}
            for key, value in request.GET.items():
                if isinstance(value, list):
                    return_data[key] = value[0]
                else:
                    return_data[key] = value

            logger.info(f"Processed return_data: {return_data}")

            serializer = serializers.VNPayReturnSerializer(data=return_data)
            if not serializer.is_valid():
                logger.error(f"Invalid VNPay return data: {serializer.errors}")
                return HttpResponseRedirect("/payment/failed?error=invalid_data")

            vnpay = VNPayUtils()
            is_valid, message = vnpay.validate_response(return_data)

            if not is_valid:
                logger.error(f"Invalid VNPay signature: {message}")
                return HttpResponseRedirect("/payment/failed?error=invalid_signature")

            order_id = serializer.validated_data['vnp_TxnRef']
            amount = serializer.validated_data['vnp_Amount']
            response_code = serializer.validated_data['vnp_ResponseCode']
            transaction_no = serializer.validated_data['vnp_TransactionNo']

            # Tìm payment
            try:
                payment = Payment.objects.get(transaction_id=order_id)
                logger.info(f"Found payment: {payment.id}, status: {payment.status}")
            except Payment.DoesNotExist:
                logger.error(f"Payment with transaction_id {order_id} not found")
                return HttpResponseRedirect("/payment/failed?error=payment_not_found")

            #VNPay trả về số tiền gốc, không cần chia cho 100
            vnpay_amount = float(amount)  # VNPay trả về số tiền gốc
            payment_amount = float(payment.amount)

            logger.info(f"Raw VNPay amount: {amount}")
            logger.info(f"VNPay amount (no conversion): {vnpay_amount}")
            logger.info(f"Payment amount in DB: {payment_amount}")

            logger.info(f"Return Amount comparison: VNPay={vnpay_amount}, Payment={payment_amount}")

            if abs(payment_amount - vnpay_amount) > 0.01:  # Cho phép sai lệch nhỏ do làm tròn
                logger.error(f"Amount mismatch: expected {payment_amount}, got {vnpay_amount}")
                return HttpResponseRedirect("/payment/failed?error=amount_mismatch")

            #Chỉ xử lý nếu chưa được xử lý (tránh xung đột với IPN)
            if response_code == '00' and payment.status == 'pending':
                logger.info("Return: Processing successful payment...")

                with transaction.atomic():
                    payment.status = 'completed'
                    payment.vnpay_transaction_no = transaction_no
                    payment.confirmed_date = timezone.now()
                    payment.save()

                    # Activate subscription
                    subscription = payment.subscription
                    if subscription.status != 'active':
                        subscription.status = 'active'
                        subscription.save()

                        # Update member profile
                        try:
                            member_profile = subscription.member.member_profile
                            if (not member_profile.membership_end_date or
                                    subscription.end_date > member_profile.membership_end_date):
                                member_profile.membership_end_date = subscription.end_date
                            member_profile.is_active = True
                            member_profile.save()
                        except MemberProfile.DoesNotExist:
                            MemberProfile.objects.create(
                                user=subscription.member,
                                membership_end_date=subscription.end_date,
                                is_active=True
                            )

                        # Tạo thông báo
                        Notification.objects.create(
                            user=subscription.member,
                            title="Thanh toán thành công",
                            message=f"Thanh toán cho gói tập {subscription.package.name} đã hoàn tất",
                            notification_type="payment_success"
                        )

                logger.info("Return: Payment processing completed successfully")
                return HttpResponseRedirect("/payment/success")

            elif payment.status == 'completed':
                logger.info("Return: Payment already processed by IPN")
                return HttpResponseRedirect("/payment/success")

            else:
                logger.warning(f"Return: Payment failed. Response code: {response_code}")
                if payment.status == 'pending':
                    payment.status = 'failed'
                    payment.save()
                return HttpResponseRedirect(f"/payment/failed?error={response_code}")

        except Exception as e:
            logger.error(f"Error in VNPay return: {str(e)}", exc_info=True)
            return HttpResponseRedirect("/payment/failed?error=system_error")


class NotificationViewSet(viewsets.ViewSet, viewsets.GenericViewSet):
    queryset = Notification.objects.all()
    serializer_class = serializers.NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = paginators.ItemPaginator

    @action(detail=False, methods=['get'])
    def my(self, request):
        """Trả về thông báo của người dùng hiện tại với phân trang"""
        notifications = self.get_queryset().filter(user=request.user).order_by('-created_at')

        # Áp dụng phân trang nếu được cấu hình
        page = self.paginate_queryset(notifications)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        # Nếu không phân trang
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Lấy danh sách thông báo chưa đọc"""
        unread_notifications = self.get_queryset().filter(is_read=False)
        serializer = self.get_serializer(unread_notifications, many=True)
        return Response({
            'count': unread_notifications.count(),
            'results': serializer.data
        })

    @action(detail=True, methods=['patch'])
    def mark_as_read(self, request, pk=None):
        """Đánh dấu thông báo đã đọc"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Đánh dấu tất cả thông báo đã đọc"""
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': f'marked {updated} notifications as read'})

class GymListView(generics.ListAPIView, viewsets.ViewSet):
    queryset = Gym.objects.all()
    serializer_class = serializers.GymSerializer
    permission_classes = [permissions.IsAuthenticated]
