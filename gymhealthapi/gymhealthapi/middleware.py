# middleware.py
from django.utils.deprecation import MiddlewareMixin

class VNPayCORSMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if request.path.startswith('/api/payments/vnpay/'):
            # Log request để debug
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"VNPay request: {request.method} {request.path}")
            logger.info(f"Headers: {dict(request.headers)}")
            logger.info(f"GET params: {dict(request.GET)}")
            logger.info(f"POST data: {dict(request.POST)}")

    def process_response(self, request, response):
        if request.path.startswith('/api/payments/vnpay/'):
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response["Access-Control-Max-Age"] = "86400"
        return response