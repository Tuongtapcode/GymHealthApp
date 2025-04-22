from datetime import date, timedelta, datetime

from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from gymhealth import serializers
from rest_framework import viewsets, generics, permissions, status, request
from gymhealth.perms import *
from gymhealth.models import User, HealthInfo, Packages, Benefit, PackageType, WorkoutSession, MemberProfile, \
    TrainerProfile, Promotion, Notification
from gymhealth.serializers import TrainerProfileSerializer, MemberProfileSerializer, BenefitSerializer, \
    PackageTypeSerializer, PackageSerializer, PackageDetailSerializer, TrainerListSerializer, SubscriptionPackage


class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class UserViewSet(viewsets.ViewSet):
    queryset = User.objects.filter(is_active=True).all()
    serializer_class = serializers.UserSerializer

    @action(methods=['get', 'patch'], url_path="current-user", detail=False,
            permission_classes=[permissions.IsAuthenticated])
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


class UserRegisterView(generics.CreateAPIView):
    serializer_class = serializers.UserSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        message = "Đăng ký thành công."
        if user.role == 'MEMBER':
            message += " Thông tin sức khỏe của bạn đã được lưu lại."

        return Response({
            "user": serializer.data,
            "message": message,
            # "token": token.key  # Nếu bạn dùng token auth
        }, status=status.HTTP_201_CREATED)


class HealthInfoViewSet(viewsets.ViewSet):
    serializer_class = serializers.HealthInfoSerializer
    permissions_classes = [permissions.IsAuthenticated, IsOwner]

    def get_object(self):
        """
        Helper để lấy thông tin sức khỏe của user hiện tại.
        """
        try:
            return HealthInfo.objects.get(user=self.request.user)
        except HealthInfo.DoesNotExist:
            return None

    @action(methods=['get'], detail=False, url_path='my', url_name='my-healthinfo')
    def get_health_info(self, request):
        """
        API GET: Lấy thông tin sức khỏe của chính user
        """
        health_info = self.get_object()
        if not health_info:
            return Response({"error": "Bạn chưa có thông tin sức khỏe"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(health_info)
        return Response(serializer.data)

    @action(methods=['put'], detail=False, url_path='update-all', url_name='put_health_info')
    def put_health_info(self, request):
        """
        API PUT: Cập nhật toàn bộ thông tin sức khỏe
        """
        health_info = self.get_object()
        if not health_info:
            return Response({"error": "Bạn chưa có thông tin sức khỏe"}, status=status.HTTP_404_NOT_FOUND)

        serializer = serializers.HealthInfoSerializer(health_info, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(methods=['patch'], detail=False, url_path='update', url_name='update-my-healthinfo-patch')
    def patch_health_info(self, request):
        """
        API PATCH: Cập nhật một phần thông tin sức khỏe
        """
        health_info = self.get_object()
        if not health_info:
            return Response({"error": "Bạn chưa có thông tin sức khỏe"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(health_info, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


class UserProfileView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

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
            if hasattr(user, 'trainer_profile'):
                return user.trainer_profile
            else:
                raise NotFound("Hồ sơ huấn luyện viên chưa được tạo.")
        elif user.is_member:
            if hasattr(user, 'member_profile'):
                return user.member_profile
            else:
                raise NotFound("Hồ sơ hội viên chưa được tạo.")
        else:
            raise PermissionDenied("Bạn không có quyền truy cập hồ sơ.")

    def get(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PackageTypeViewSet(viewsets.ModelViewSet):
    queryset = PackageType.objects.filter(active=True)
    serializer_class = PackageTypeSerializer
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'duration_months']

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            # GET, HEAD, OPTIONS => Ai cũng được phép (AllowAny)
            permission_classes = [permissions.AllowAny]
        else:
            # POST, PUT, PATCH, DELETE => Phải là user có quyền (IsAuthenticated)
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]


class BenefitViewSet(viewsets.ModelViewSet):
    queryset = Benefit.objects.filter(active=True)
    serializer_class = BenefitSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['name', 'description']
    ordering_fields = ['name']


class PackageViewSet(viewsets.ModelViewSet):
    queryset = Packages.objects.filter(active=True)
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = PackageSerializer
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'package_type__duration_months', 'pt_sessions']
    filterset_fields = ['package_type', 'pt_sessions', 'price']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PackageDetailSerializer
        return PackageSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Danh sách các gói còn active"""
        packages = self.queryset.filter(active=True)
        serializer = self.get_serializer(packages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def with_pt(self, request):
        """Danh sách gói có buổi PT"""
        packages = self.queryset.filter(pt_sessions__gt=0)
        serializer = self.get_serializer(packages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Danh sách gói theo type_id"""
        type_id = request.query_params.get('type_id')
        if not type_id:
            return Response({"error": "Missing type_id"}, status=400)

        packages = self.queryset.filter(package_type_id=type_id)
        serializer = self.get_serializer(packages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def benefits(self, request, pk=None):
        """Danh sách quyền lợi của 1 gói"""
        package = self.get_object()
        benefits = package.benefits.filter(active=True)
        serializer = BenefitSerializer(benefits, many=True)
        return Response(serializer.data)


class TrainerListView(generics.ListAPIView):
    """API để lấy danh sách PT với thông tin cơ bản và lịch làm việc"""
    serializer_class = TrainerListSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['username', 'first_name', 'last_name', 'trainer_profile__specialization']
    ordering_fields = ['trainer_profile__experience_years', 'trainer_profile__hourly_rate']

    def get_queryset(self):
        # Lấy tất cả user có role là TRAINER
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
                # Giả sử mỗi ngày PT có thể làm từ 8:00 đến 20:00
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
    """API để lấy thông tin chi tiết của một PT cụ thể"""
    serializer_class = serializers.TrainerDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        trainer_id = self.kwargs.get('trainer_id')
        trainer = User.objects.filter(id=trainer_id, role='TRAINER', is_active=True).first()

        if trainer is None:
            return Response({'detail': 'Trainer not found'}, status=status.HTTP_404_NOT_FOUND)

        return trainer


class TrainerUpcomingSessionsView(generics.ListAPIView):
    """API để lấy danh sách các buổi tập sắp tới của một PT cụ thể"""
    serializer_class = serializers.WorkoutSessionScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        trainer_id = self.kwargs.get('trainer_id')
        # Kiểm tra xem trainer có tồn tại không
        trainer = User.objects.filter(id=trainer_id, role='TRAINER', is_active=True).first()

        if trainer is None:
            return Response({'detail': 'Trainer not found'}, status=status.HTTP_404_NOT_FOUND)

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


class WorkoutSessionCreateView(generics.CreateAPIView):
    """API để tạo buổi tập mới"""
    serializer_class = serializers.WorkoutSessionCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        """Kiểm tra quyền và thực hiện tạo buổi tập"""
        # Kiểm tra người dùng phải là hội viên
        if not self.request.user.is_member:
            raise PermissionDenied("Chỉ hội viên mới có thể đặt lịch tập.")

        # Kiểm tra người dùng phải có hồ sơ hội viên hợp lệ
        try:
            member_profile = self.request.user.member_profile
            if not member_profile.is_membership_valid:
                raise PermissionDenied("Tư cách hội viên của bạn đã hết hạn hoặc không hợp lệ.")
        except MemberProfile.DoesNotExist:
            raise PermissionDenied("Bạn chưa có hồ sơ hội viên.")

        serializer.save()


class TrainerWorkoutSessionListView(generics.ListAPIView):
    """API để PT xem danh sách lịch tập được yêu cầu"""
    serializer_class = serializers.WorkoutSessionListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Lọc danh sách buổi tập theo PT hiện tại"""
        if not self.request.user.is_trainer:
            raise PermissionDenied("Chỉ huấn luyện viên mới có thể xem danh sách này.")

        # Mặc định hiển thị các buổi tập đang chờ duyệt
        status_filter = self.request.query_params.get('status', 'pending')

        queryset = WorkoutSession.objects.filter(
            trainer=self.request.user,
            session_type='pt_session'
        )

        # Lọc theo trạng thái nếu có
        if status_filter != 'all':
            queryset = queryset.filter(status=status_filter)

        return queryset.order_by('session_date', 'start_time')


class TrainerWorkoutSessionUpdateView(generics.UpdateAPIView):
    """API để PT cập nhật trạng thái buổi tập"""
    serializer_class = serializers.WorkoutSessionUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = WorkoutSession.objects.all()

    def get_object(self):
        obj = super().get_object()
        if not self.request.user.is_trainer:
            raise PermissionDenied("Chỉ huấn luyện viên mới có thể cập nhật lịch tập.")

        if obj.trainer != self.request.user:
            raise PermissionDenied("Bạn không có quyền cập nhật buổi tập này.")

        if obj.session_type != 'pt_session':
            raise PermissionDenied("Bạn chỉ có thể cập nhật buổi tập PT.")

        return obj

    def perform_update(self, serializer):
        # Tự động gửi thông báo khi PT cập nhật trạng thái
        session = self.get_object()
        new_status = serializer.validated_data.get('status')
        notes = serializer.validated_data.get('trainer_notes', '')

        serializer.save()

        # Tạo thông báo cho hội viên
        if new_status == 'confirmed':
            message = f"Buổi tập của bạn vào ngày {session.session_date} lúc {session.start_time} đã được PT xác nhận."
        elif new_status == 'cancelled':
            message = f"Buổi tập của bạn vào ngày {session.session_date} lúc {session.start_time} đã bị hủy."
        elif new_status == 'rescheduled':
            message = f"PT đề xuất đổi lịch cho buổi tập vào ngày {session.session_date}."

        if notes:
            message += f" Ghi chú: {notes}"

        # Tạo thông báo cho hội viên
        Notification.objects.create(
            user=session.member,
            title=f"Cập nhật lịch tập - {dict(WorkoutSession.SESSION_STATUS)[new_status]}",
            message=message,
            notification_type='session_reminder',
            related_object_id=session.id
        )


class RescheduleSessionView(generics.GenericAPIView):
    """API để PT đề xuất thời gian mới cho buổi tập"""
    serializer_class = serializers.RescheduleSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_session(self, session_id):
        """Lấy buổi tập từ ID và kiểm tra quyền"""
        try:
            return WorkoutSession.objects.get(id=session_id, trainer=self.request.user)
        except WorkoutSession.DoesNotExist:
            raise Http404("Buổi tập không tồn tại hoặc bạn không phải PT của buổi tập này.")

    def post(self, request, session_id, *args, **kwargs):
        if not request.user.is_trainer:
            return Response({"detail": "Chỉ huấn luyện viên mới có thể đề xuất lịch tập mới."},
                            status=status.HTTP_403_FORBIDDEN)

        # Lấy buổi tập từ ID trong URL
        session = self.get_session(session_id)

        # Truyền session vào context để serializer có thể sử dụng
        serializer = self.get_serializer(
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


class SubscriptionPackageViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.SubscriptionPackageSerializer
    search_fields = ['member__username', 'package__name', 'status']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    filterset_fields = ['status', 'member', 'package']

    def get_permissions(self):
        """
        - GET list: Manager mới xem được danh sách tất cả đăng ký
        - GET detail: Chủ gói hoặc Manager mới xem được chi tiết
        - POST/PUT/PATCH/DELETE: Manager mới thực hiện được
        """
        if self.action == 'list':
            permission_classes = [IsManager]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsManager]
        elif self.action in ['retrieve', 'my_subscriptions', 'active_subscription']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsSubscriptionOwnerOrManager]
        return [permission() for permission in permission_classes]

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

    @action(detail=False, methods=['get'], url_path='my', url_name='my-subscriptions')
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

        page = self.paginate_queryset(subscriptions)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(subscriptions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='active', url_name='active-subscription')
    def active_subscription(self, request):
        """Lấy gói đăng ký đang hoạt động của người dùng hiện tại"""
        if not request.user.is_member:
            return Response({"error": "Chỉ hội viên mới có thể xem gói đăng ký"},
                            status=status.HTTP_403_FORBIDDEN)

        subscription = SubscriptionPackage.objects.filter(
            member=request.user,
            status='active',
            start_date__lte=date.today(),
            end_date__gte=date.today()
        ).first()

        if not subscription:
            return Response({"error": "Không tìm thấy gói đăng ký đang hoạt động"},
                            status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(subscription)
        return Response(serializer.data)

    def perform_create(self, serializer):
        # Kiểm tra thành viên
        member = serializer.validated_data.get('member')
        if not member:
            member = self.request.user

        # Nếu không phải manager và không phải chính mình
        if not self.request.user.is_manager and member != self.request.user:
            raise PermissionDenied("Bạn không có quyền đăng ký cho người khác")

        # Tạo đăng ký
        serializer.save()

    from datetime import date, datetime, timedelta

    @action(detail=False, methods=['post'], url_path='register', permission_classes=[permissions.IsAuthenticated])
    def register_package(self, request):
        """API cho người dùng đăng ký gói tập"""
        if not request.user.is_member:
            return Response({"error": "Chỉ hội viên mới có thể đăng ký gói tập"},
                            status=status.HTTP_403_FORBIDDEN)

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

            # Xử lý ngày không hợp lệ (ví dụ: 31/1 + 1 tháng -> 28/2 hoặc 29/2)
            try:
                end_date = date(year, month, day)
            except ValueError:
                # Nếu ngày không tồn tại, chọn ngày cuối cùng của tháng
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

        # Lưu đăng ký gói
        subscription = serializer.save()

        return Response(
            {"message": f"Đăng ký gói tập {package.name} thành công",
             "subscription": serializer.data},
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='cancel', permission_classes=[IsSubscriptionOwnerOrManager])
    def cancel_subscription(self, request, pk=None):
        """Hủy gói đăng ký"""
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

    @action(detail=True, methods=['post'], url_path='verify-payment', permission_classes=[IsManager])
    def verify_payment(self, request, pk=None):
        """Xác nhận thanh toán từ Manager"""
        subscription = self.get_object()

        if subscription.status != 'pending':
            return Response({"error": "Chỉ có thể xác nhận thanh toán cho gói đăng ký đang chờ xử lý"},
                            status=status.HTTP_400_BAD_REQUEST)

        # Cập nhật trạng thái
        subscription.status = 'active'
        subscription.save()

        # Cập nhật hồ sơ thành viên
        try:
            member_profile = subscription.member.member_profile
            member_profile.membership_end_date = subscription.end_date
            member_profile.is_active = True
            member_profile.save()
        except MemberProfile.DoesNotExist:
            pass

        # Thông báo cho hội viên
        Notification.objects.create(
            user=subscription.member,
            title="Thanh toán đã được xác nhận",
            message=f"Gói tập {subscription.package.name} của bạn đã được kích hoạt và có thể sử dụng.",
            notification_type="payment_confirmation",
            related_object_id=subscription.id
        )

        return Response({"message": "Đã xác nhận thanh toán và kích hoạt gói thành công"})
