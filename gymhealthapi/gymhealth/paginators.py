from rest_framework.pagination import PageNumberPagination


class ItemPaginator(PageNumberPagination):
    page_size = 10  # Hoặc giá trị phù hợp
    page_size_query_param = 'page_size'  # Cho phép thay đổi qua query param
    max_page_size = 100  # Giới hạn kích thước trang tối đa
