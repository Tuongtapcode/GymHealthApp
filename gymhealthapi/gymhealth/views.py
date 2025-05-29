from datetime import date, timedelta, datetime
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView

from gymhealth import serializers, perms, paginators
from rest_framework import viewsets, generics, permissions, status, request, parsers, permissions, filters, mixins
from gymhealth.models import User, HealthInfo, Packages, Benefit, PackageType, WorkoutSession, MemberProfile, \
    TrainerProfile, Promotion, Notification, TrainingProgress, TrainerRating, GymRating, Gym, \
    FeedbackResponse
from gymhealth.perms import IsOwner, IsProfileOwnerOrManager
from gymhealth.serializers import TrainerProfileSerializer, MemberProfileSerializer, BenefitSerializer, \
    PackageTypeSerializer, PackageSerializer, PackageDetailSerializer, TrainerListSerializer, SubscriptionPackage
from django.db.models import Min, Max, Q, Count


class UserViewSet(viewsets.ViewSet, viewsets.GenericViewSet):
    queryset = User.objects.filter(is_active=True)
    serializer_class = serializers.UserSerializer
    # Định nghĩa gửi form
    parser_classes = [parsers.MultiPartParser]

    # Thêm các lớp filter và sắp xếp
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['first_name', 'last_name', 'email', 'is_staff']  # Các trường để filter
    search_fields = ['first_name', 'last_name', 'email', 'username']  # Các trường để tìm kiếm
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


class UserRegisterView(generics.CreateAPIView):
    serializer_class = serializers.UserSerializer
    permission_classes = [permissions.AllowAny]  # ALL

    def create(self, request, *args, **kwargs):
        # Khởi tạo serializer với dữ liệu từ request (POST body)
        serializer = self.get_serializer(data=request.data)

        # Kiểm tra dữ liệu có hợp lệ không
        serializer.is_valid(raise_exception=True)
        user = serializer.save()  # Lưu vào db
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
    # Quyền đã đăng nhập và chủ sở hữu mới được sử dụng API
    permission_classes = [permissions.IsAuthenticated, perms.IsOwner]
    # Phân trang
    pagination_class = paginators.ItemPaginator

    # Cài đặt bộ lọc
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['blood_type', 'gender', 'height', 'weight', 'user__is_active']
    search_fields = ['user__username', 'user__email', 'user__first_name', 'user__last_name', 'note']
    ordering_fields = ['created_date', 'updated_date', 'height', 'weight', 'user__date_joined']
    ordering = ['-updated_date']  # Mặc định sắp xếp theo ngày cập nhật, mới nhất trước

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
    # Quyền đã đăng nhập, và sở hữu
    permission_classes = [permissions.IsAuthenticated, perms.IsOwner]
    pagination_class = paginators.ItemPaginator

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


class PackageTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PackageType.objects.filter(active=True)
    serializer_class = PackageTypeSerializer
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'duration_months']
    pagination_class = paginators.ItemPaginator

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            # GET, HEAD, OPTIONS => Ai cũng được phép (AllowAny)
            permission_classes = [permissions.AllowAny]
        else:
            # POST, PUT, PATCH, DELETE => Phải là user có quyền (IsAuthenticated)
            permission_classes = [permissions.IsAuthenticated, perms.IsManager]
        return [permission() for permission in permission_classes]


class BenefitViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Benefit.objects.filter(active=True)
    serializer_class = BenefitSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['name', 'description']
    ordering_fields = ['name']
    pagination_class = paginators.ItemPaginator


class PackageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Packages.objects.filter(active=True)
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = PackageSerializer
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'package_type__duration_months', 'pt_sessions']
    filterset_fields = ['package_type', 'pt_sessions', 'price']
    filter_backends = [DjangoFilterBackend]
    pagination_class = paginators.ItemPaginator

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            # GET, HEAD, OPTIONS => Ai cũng được phép (AllowAny)
            permission_classes = [permissions.AllowAny]
        else:
            # POST, PUT, PATCH, DELETE => Phải là user có quyền (IsAuthenticated)
            permission_classes = [permissions.IsAuthenticated, perms.IsManager]
        return [permission() for permission in permission_classes]

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
        """Danh sách gói có buổi PT"""
        # Apply filters first, then add the pt_sessions filter
        queryset = self.filter_queryset(self.get_queryset())
        packages = queryset.filter(pt_sessions__gt=0)
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
    pagination_class = paginators.ItemPaginator

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
    pagination_class = paginators.ItemPaginator

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


#
# class WorkoutSessionCreateView(generics.CreateAPIView):
#     """API để tạo buổi tập mới"""
#     serializer_class = serializers.WorkoutSessionCreateSerializer
#     permission_classes = [permissions.IsAuthenticated]
#
#     def perform_create(self, serializer):
#         """Kiểm tra quyền và thực hiện tạo buổi tập"""
#         # Kiểm tra người dùng phải là hội viên
#         if not self.request.user.is_member:
#             raise PermissionDenied("Chỉ hội viên mới có thể đặt lịch tập.")
#
#         # Kiểm tra người dùng phải có hồ sơ hội viên hợp lệ
#         try:
#             member_profile = self.request.user.member_profile
#             if not member_profile.is_membership_valid:
#                 raise PermissionDenied("Tư cách hội viên của bạn đã hết hạn hoặc không hợp lệ.")
#         except MemberProfile.DoesNotExist:
#             raise PermissionDenied("Bạn chưa có hồ sơ hội viên.")
#
#         serializer.save()
#
#
# class TrainerWorkoutSessionListView(generics.ListAPIView):
#     """API để PT xem danh sách lịch tập được yêu cầu"""
#     serializer_class = serializers.WorkoutSessionListScheduleSerializer
#     permission_classes = [permissions.IsAuthenticated]
#
#     def get_queryset(self):
#         """Lọc danh sách buổi tập theo PT hiện tại"""
#         if not self.request.user.is_trainer:
#             raise PermissionDenied("Chỉ huấn luyện viên mới có thể xem danh sách này.")
#
#         # Mặc định hiển thị các buổi tập đang chờ duyệt
#         status_filter = self.request.query_params.get('status', 'pending')
#
#         queryset = WorkoutSession.objects.filter(
#             trainer=self.request.user,
#             session_type='pt_session'
#         )
#
#         # Lọc theo trạng thái nếu có
#         if status_filter != 'all':
#             queryset = queryset.filter(status=status_filter)
#
#         return queryset.order_by('session_date', 'start_time')
#
#
# class TrainerWorkoutSessionUpdateView(generics.UpdateAPIView):
#     """API để PT cập nhật trạng thái buổi tập"""
#     serializer_class = serializers.WorkoutSessionUpdateSerializer
#     permission_classes = [permissions.IsAuthenticated]
#     queryset = WorkoutSession.objects.all()
#
#     def get_object(self):
#         obj = super().get_object()
#         if not self.request.user.is_trainer:
#             raise PermissionDenied("Chỉ huấn luyện viên mới có thể cập nhật lịch tập.")
#
#         if obj.trainer != self.request.user:
#             raise PermissionDenied("Bạn không có quyền cập nhật buổi tập này.")
#
#         if obj.session_type != 'pt_session':
#             raise PermissionDenied("Bạn chỉ có thể cập nhật buổi tập PT.")
#
#         return obj
#
#     def perform_update(self, serializer):
#         # Tự động gửi thông báo khi PT cập nhật trạng thái
#         session = self.get_object()
#         new_status = serializer.validated_data.get('status')
#         notes = serializer.validated_data.get('trainer_notes', '')
#
#         serializer.save()
#
#         # Tạo thông báo cho hội viên
#         if new_status == 'confirmed':
#             message = f"Buổi tập của bạn vào ngày {session.session_date} lúc {session.start_time} đã được PT xác nhận."
#         elif new_status == 'cancelled':
#             message = f"Buổi tập của bạn vào ngày {session.session_date} lúc {session.start_time} đã bị hủy."
#         elif new_status == 'rescheduled':
#             message = f"PT đề xuất đổi lịch cho buổi tập vào ngày {session.session_date}."
#
#         if notes:
#             message += f" Ghi chú: {notes}"
#
#         # Tạo thông báo cho hội viên
#         Notification.objects.create(
#             user=session.member,
#             title=f"Cập nhật lịch tập - {dict(WorkoutSession.SESSION_STATUS)[new_status]}",
#             message=message,
#             notification_type='session_reminder',
#             related_object_id=session.id
#         )
#
#
# class RescheduleSessionView(generics.GenericAPIView):
#     """API để PT đề xuất thời gian mới cho buổi tập"""
#     serializer_class = serializers.RescheduleSessionSerializer
#     permission_classes = [permissions.IsAuthenticated]
#
#     def get_session(self, session_id):
#         """Lấy buổi tập từ ID và kiểm tra quyền"""
#         try:
#             return WorkoutSession.objects.get(id=session_id, trainer=self.request.user)
#         except WorkoutSession.DoesNotExist:
#             return Response(
#                 {"detail": "Buổi tập không tồn tại hoặc bạn không phải PT của buổi tập này."},
#                 status=status.HTTP_404_NOT_FOUND
#             )
#
#     def post(self, request, session_id, *args, **kwargs):
#         if not request.user.is_trainer:
#             return Response({"detail": "Chỉ huấn luyện viên mới có thể đề xuất lịch tập mới."},
#                             status=status.HTTP_403_FORBIDDEN)
#
#         # Lấy buổi tập từ ID trong URL
#         session = self.get_session(session_id)
#
#         # Truyền session vào context để serializer có thể sử dụng
#         serializer = self.get_serializer(
#             data=request.data,
#             context={'request': request, 'session': session}
#         )
#         serializer.is_valid(raise_exception=True)
#
#         # Tạo bản ghi lịch sử về việc đổi lịch
#         old_date = session.session_date
#         old_start = session.start_time
#
#         # Cập nhật trạng thái và tạo ghi chú
#         reason = serializer.validated_data.get('reason', '')
#         note = f"Đề xuất đổi lịch từ {old_date} {old_start} sang {serializer.validated_data['new_date']} {serializer.validated_data['new_start_time']}. "
#         if reason:
#             note += f"Lý do: {reason}"
#
#         # Cập nhật session
#         session.session_date = serializer.validated_data['new_date']
#         session.start_time = serializer.validated_data['new_start_time']
#         session.end_time = serializer.validated_data['new_end_time']
#         session.status = 'rescheduled'
#         session.trainer_notes = note
#         session.save()
#
#         # Tạo thông báo cho hội viên
#         Notification.objects.create(
#             user=session.member,
#             title="Đề xuất thay đổi lịch tập",
#             message=f"PT {request.user.get_full_name()} đã đề xuất đổi lịch tập của bạn sang ngày {serializer.validated_data['new_date']} lúc {serializer.validated_data['new_start_time']}. {reason}",
#             notification_type='session_reminder',
#             related_object_id=session.id
#         )
#
#         return Response({
#             "detail": "Đã đề xuất lịch tập mới thành công.",
#             "session": {
#                 "id": session.id,
#                 "member": session.member.get_full_name(),
#                 "new_date": session.session_date,
#                 "new_start_time": session.start_time,
#                 "new_end_time": session.end_time,
#                 "status": session.status
#             }
#         }, status=status.HTTP_200_OK)
#

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

        page = self.paginate_queryset(subscriptions)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(subscriptions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='active', url_name='active-subscription',
            permission_classes=[permissions.IsAuthenticated, perms.IsSubscriptionOwnerOrManager])
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

    @action(detail=False, methods=['post'], url_path='register',
            permission_classes=[permissions.IsAuthenticated, perms.IsMember])
    def register_package(self, request):
        """API cho người dùng đăng ký gói tập"""

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

    @action(detail=True, methods=['post'], url_path='cancel',
            permission_classes=[permissions.IsAuthenticated, perms.IsSubscriptionOwnerOrManager])
    def cancel_subscription(self, request, pk=None):
        """Hủy gói đăng ký"""
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

    @action(detail=True, methods=['post'], url_path='verify-payment',
            permission_classes=[permissions.IsAuthenticated, perms.IsManager])
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


class WorkoutSessionViewSet(viewsets.ViewSet):
    """ViewSet để quản lý các buổi tập"""
    queryset = WorkoutSession.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = paginators.ItemPaginator

    def get_serializer_class(self):
        """Trả về serializer tương ứng dựa trên action"""
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
        """API để hội viên đăng ký buổi tập"""
        # Kiểm tra người dùng phải có hồ sơ hội viên hợp lệ
        try:
            member_profile = request.user.member_profile
            if not member_profile.is_membership_valid:
                raise PermissionDenied("Tư cách hội viên của bạn đã hết hạn hoặc không hợp lệ.")
        except MemberProfile.DoesNotExist:
            raise PermissionDenied("Bạn chưa có hồ sơ hội viên.")

        # Lấy serializer class và khởi tạo nó
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(data=request.data, context={'request': request})

        # Xác thực dữ liệu
        serializer.is_valid(raise_exception=True)
        # Lưu dữ liệu khi đã xác thực
        serializer.save(member=request.user)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='trainer/pending-session', url_name='trainer_sessions',
            permission_classes=[permissions.IsAuthenticated, perms.IsTrainer])
    def trainer_sessions(self, request):
        """API để PT xem danh sách lịch tập được yêu cầu"""

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
            # Giới hạn quyền cập nhật trạng thái dựa trên vai trò
            new_status = request.data.get('status')

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

            # Xử lý cập nhật trạng thái
        serializer = serializers.WorkoutSessionUpdateSerializer(session, data=request.data, partial=True)
        if serializer.is_valid():
            # Lấy dữ liệu từ serializer
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
        """API để xem lịch tập từ thứ 2 đến thứ 7 của tuần hiện tại"""

        # Lấy thời gian hiện tại
        today = datetime.now().date()

        # Tính thứ mấy trong tuần (isoweekday: Monday=1, Sunday=7)
        weekday = today.isoweekday()

        # Tìm ngày thứ 2 (đầu tuần)
        monday = today - timedelta(days=weekday - 1)

        # Tìm ngày thứ 7 (cuối tuần)
        saturday = monday + timedelta(days=5)

        # Query lịch tập trong khoảng từ thứ 2 đến thứ 7
        queryset = WorkoutSession.objects.filter(
            session_date__gte=monday,
            session_date__lte=saturday
        )

        # Nếu bạn muốn filter theo PT (user đăng nhập)
        if request.user.is_trainer:
            queryset = queryset.filter(trainer=request.user)
        else:
            # Nếu là hội viên, thì filter theo member
            queryset = queryset.filter(member=request.user)

        queryset = queryset.order_by('session_date', 'start_time')

        serializer = self.get_serializer(queryset, many=True)

        return Response({
            "start_date": monday,
            "end_date": saturday,
            "sessions": serializer.data
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
    #
    # @action(detail=False, methods=['post'], url_path='record-progress')
    # def record_progress(self, request):
    #     """API để tạo mới hoặc cập nhật bản ghi tiến độ"""
    #     serializer = self.get_serializer(data=request.data)
    #     serializer.is_valid(raise_exception=True)
    #
    #     health_info = serializer.validated_data.get('health_info')
    #     workout_session = serializer.validated_data.get('workout_session')
    #
    #     # Tìm bản ghi hiện có
    #     try:
    #         existing = TrainingProgress.objects.get(
    #             health_info=health_info,
    #             workout_session=workout_session
    #         )
    #         # Kiểm tra người dùng hiện tại có phải người tạo không
    #         if existing.created_by != request.user:
    #             return Response(
    #                 {"error": "Bạn không có quyền chỉnh sửa bản ghi này vì bạn không phải người tạo"},
    #                 status=status.HTTP_403_FORBIDDEN
    #             )
    #
    #         # Cập nhật bản ghi hiện có
    #         update_serializer = self.get_serializer(existing, data=request.data, partial=True)
    #         update_serializer.is_valid(raise_exception=True)
    #         instance = update_serializer.save()
    #         return Response(self.get_serializer(instance).data)
    #     except TrainingProgress.DoesNotExist:
    #         # Tạo mới nếu chưa tồn tại
    #         instance = serializer.save(created_by=request.user)
    #         return Response(
    #             self.get_serializer(instance).data,
    #             status=status.HTTP_201_CREATED
    #         )
    #
    # @action(detail=False, methods=['post'], url_path='record-progress')
    # def record_progress(self, request):
    #     """API để tạo mới hoặc cập nhật bản ghi tiến độ"""
    #     serializer = self.get_serializer(data=request.data)
    #     serializer.is_valid(raise_exception=True)
    #
    #     health_info = serializer.validated_data.get('health_info')
    #     workout_session = serializer.validated_data.get('workout_session')
    #
    #     # Tìm bản ghi hiện có
    #     try:
    #         existing = TrainingProgress.objects.get(
    #             health_info=health_info,
    #             workout_session=workout_session
    #         )
    #         # Kiểm tra người dùng hiện tại có phải người tạo không
    #         if existing.created_by != request.user:
    #             return Response(
    #                 {"error": "Bạn không có quyền chỉnh sửa bản ghi này vì bạn không phải người tạo"},
    #                 status=status.HTTP_403_FORBIDDEN
    #             )
    #
    #         # Cập nhật bản ghi hiện có
    #         update_serializer = self.get_serializer(existing, data=request.data, partial=True)
    #         update_serializer.is_valid(raise_exception=True)
    #         instance = update_serializer.save()
    #         return Response(self.get_serializer(instance).data)
    #     except TrainingProgress.DoesNotExist:
    #         # Tạo mới nếu chưa tồn tại
    #         instance = serializer.save(created_by=request.user)
    #         return Response(
    #             self.get_serializer(instance).data,
    #             status=status.HTTP_201_CREATED
    #         )


### API ratiing:

class TrainerRatingViewSet(viewsets.ModelViewSet):
    """
    API endpoint cho đánh giá huấn luyện viên
    - List/Create: GET/POST /api/trainers/{trainer_id}/ratings/
    - Retrieve/Update/Destroy: GET/PUT/DELETE /api/ratings/{id}/
    - Custom actions:
      + average_rating: GET /api/trainers/{trainer_id}/ratings/average/
    """
    serializer_class = serializers.TrainerRatingSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = paginators.ItemPaginator

    def get_queryset(self):
        # Cho phép filter theo trainer_id nếu có trong URL
        trainer_id = self.kwargs.get('trainer_id')
        if trainer_id:
            return TrainerRating.objects.filter(trainer_id=trainer_id)
        return TrainerRating.objects.all()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        trainer_id = self.kwargs.get('trainer_id')
        if trainer_id:
            context['trainer_id'] = trainer_id
        return context

    def create(self, request, *args, **kwargs):
        trainer_id = self.kwargs.get('trainer_id')
        if not trainer_id:
            return Response(
                {"error": "Thiếu trainer_id trong URL"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            trainer = User.objects.get(id=trainer_id, role='TRAINER')
        except User.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy huấn luyện viên"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = request.data.copy()
        data['trainer'] = trainer_id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )

    @action(detail=False, methods=['get'], url_path='average')
    def average_rating(self, request, trainer_id=None):
        """
        Lấy điểm trung bình của huấn luyện viên
        GET /api/trainers/{trainer_id}/ratings/average/
        """
        trainer = User.objects.filter(id=trainer_id, role='TRAINER').first()
        if trainer is None:
            return Response({"detail": "Không tìm thấy huấn luyện viên."}, status=status.HTTP_404_NOT_FOUND)
        ratings = TrainerRating.objects.filter(trainer=trainer)

        if not ratings.exists():
            return Response(
                {"average": 0, "count": 0},
                status=status.HTTP_200_OK
            )

        # Tính toán điểm trung bình
        avg_knowledge = sum(r.knowledge_score for r in ratings) / ratings.count()
        avg_communication = sum(r.communication_score for r in ratings) / ratings.count()
        avg_punctuality = sum(r.punctuality_score for r in ratings) / ratings.count()
        avg_overall = sum(r.overall_score for r in ratings) / ratings.count()

        data = {
            "trainer_id": trainer_id,
            "trainer_name": trainer.get_full_name(),
            "average_knowledge": round(avg_knowledge, 1),
            "average_communication": round(avg_communication, 1),
            "average_punctuality": round(avg_punctuality, 1),
            "average_overall": round(avg_overall, 1),
            "total_ratings": ratings.count()
        }

        return Response(data, status=status.HTTP_200_OK)


class GymRatingViewSet(viewsets.ModelViewSet):
    """
    API endpoint cho đánh giá phòng gym
    - List: GET /api/gyms/{gym_id}/ratings/
    - Create: POST /api/gyms/{gym_id}/ratings/
    - Retrieve/Update/Destroy: GET/PUT/DELETE /api/ratings/{id}/
    - Custom actions:
      + average: GET /api/gyms/{gym_id}/ratings/average/
    """
    serializer_class = serializers.GymRatingSerializer
    permission_classes = [permissions.IsAuthenticated, perms.IsRatingOwnerOrAdmin]
    pagination_class = paginators.ItemPaginator

    def get_queryset(self):
        # Cho phép filter theo gym_id nếu có trong URL
        gym_id = self.kwargs.get('gym_id')
        if gym_id:
            return GymRating.objects.filter(gym_id=gym_id)
        return GymRating.objects.all()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        gym_id = self.kwargs.get('gym_id')
        if gym_id:
            context['gym_id'] = gym_id
        return context

    def create(self, request, *args, **kwargs):
        gym_id = self.kwargs.get('gym_id')
        if not gym_id:
            return Response(
                {"error": "Thiếu gym_id trong URL"},
                status=status.HTTP_400_BAD_REQUEST
            )

        gym = Gym.objects.filter(id=gym_id).first()
        if gym is None:
            return Response(
                {"error": "Không tìm thấy phòng gym với ID đã cung cấp"},
                status=status.HTTP_404_NOT_FOUND
            )

        if GymRating.objects.filter(user=request.user, gym_id=gym_id).exists():
            return Response(
                {"error": "Bạn đã đánh giá phòng gym này rồi"},
                status=status.HTTP_400_BAD_REQUEST
            )

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

    @action(detail=False, methods=['get'], url_path='(?P<gym_id>\d+)/average')
    def average(self, request, gym_id=None):
        """
        Lấy điểm trung bình của phòng gym
        GET /api/gyms/{gym_id}/ratings/average/
        """
        gym = Gym.objects.filter(id=gym_id).first()
        if gym is None:
            return Response(
                {"error": "Không tìm thấy phòng gym với ID đã cung cấp"},
                status=status.HTTP_404_NOT_FOUND
            )

        ratings = GymRating.objects.filter(gym=gym)

        if not ratings.exists():
            return Response(
                {"average": 0, "count": 0},
                status=status.HTTP_200_OK
            )

        avg_facility = sum(r.facility_score for r in ratings) / ratings.count()
        avg_service = sum(r.service_score for r in ratings) / ratings.count()
        avg_overall = sum(r.overall_score for r in ratings) / ratings.count()

        data = {
            "gym_id": gym_id,
            "gym_name": gym.name,
            "average_facility": round(avg_facility, 1),
            "average_service": round(avg_service, 1),
            "average_overall": round(avg_overall, 1),
            "total_ratings": ratings.count()
        }

        return Response(data, status=status.HTTP_200_OK)


class FeedbackResponseViewSet(viewsets.ModelViewSet):
    """
    API endpoint cho phản hồi đánh giá
    - List/Create: GET/POST /api/ratings/{rating_id}/responses/
    - Retrieve/Update/Destroy: GET/PUT/DELETE /api/responses/{id}/
    - Custom actions:
      + responses: GET /api/ratings/{rating_id}/responses/ (đã tích hợp sẵn)
    """
    serializer_class = serializers.FeedbackResponseSerializer
    permission_classes = [permissions.IsAuthenticated, perms.IsResponseOwnerOrAdmin]
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
        rating_id = self.kwargs.get('rating_id')
        if not rating_id:
            return Response(
                {"error": "Thiếu rating_id trong URL"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Kiểm tra loại rating và quyền truy cập
        trainer_rating = None
        gym_rating = None

        try:
            trainer_rating = TrainerRating.objects.get(id=rating_id)
            if not self._check_trainer_rating_permission(request.user, trainer_rating):
                return Response(
                    {"error": "Bạn không có quyền phản hồi đánh giá này"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except TrainerRating.DoesNotExist:
            try:
                gym_rating = GymRating.objects.get(id=rating_id)
                if not self._check_gym_rating_permission(request.user, gym_rating):
                    return Response(
                        {"error": "Bạn không có quyền phản hồi đánh giá này"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except GymRating.DoesNotExist:
                return Response(
                    {"error": "Không tìm thấy đánh giá"},
                    status=status.HTTP_404_NOT_FOUND
                )

        data = request.data.copy()
        if trainer_rating:
            data['trainer_rating'] = rating_id
        elif gym_rating:
            data['gym_rating'] = rating_id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
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
        """
        Lấy thống kê phản hồi cho đánh giá
        GET /api/ratings/{rating_id}/responses/stats/
        """
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
