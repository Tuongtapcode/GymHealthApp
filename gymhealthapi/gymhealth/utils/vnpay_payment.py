import hashlib
import hmac
import urllib.parse
import requests
from datetime import datetime, timedelta
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

    
class VNPayUtils:
    def __init__(self):
        self.tmn_code = settings.VNPAY_CONFIG['TMN_CODE']
        self.secret_key = settings.VNPAY_CONFIG['HASH_SECRET']
        self.vnpay_url = settings.VNPAY_CONFIG['URL']
        self.api_url = settings.VNPAY_CONFIG['API_URL']
        self.return_url = settings.VNPAY_CONFIG['RETURN_URL']
        self.version = settings.VNPAY_CONFIG['VERSION']
        self.command = settings.VNPAY_CONFIG['COMMAND']
        self.curr_code = settings.VNPAY_CONFIG['CURR_CODE']
        self.locale = settings.VNPAY_CONFIG['LOCALE']

    def create_payment_url(self, order_id, amount, order_desc, ip_addr, bank_code=None):
        """
        Tạo URL thanh toán VNPay theo chuẩn SDK chính thức
        """
        # Tạo timestamp
        create_date = datetime.now().strftime('%Y%m%d%H%M%S')

        # Tạo expire time (15 phút sau) - SỬA LỖI TẠI ĐÂY
        expire_date = datetime.now() + timedelta(minutes=15)
        expire_time = expire_date.strftime('%Y%m%d%H%M%S')

        # Tạo parameters theo chuẩn VNPay SDK
        params = {
            'vnp_Version': self.version,
            'vnp_Command': self.command,
            'vnp_TmnCode': self.tmn_code,
            'vnp_Amount': str(int(float(amount) * 100)),  # VNPay yêu cầu amount * 100
            'vnp_CurrCode': self.curr_code,
            'vnp_TxnRef': str(order_id),
            'vnp_OrderInfo': order_desc,
            'vnp_OrderType': 'other',
            'vnp_Locale': self.locale,
            'vnp_ReturnUrl': self.return_url,
            'vnp_IpAddr': ip_addr,
            'vnp_CreateDate': create_date,
            'vnp_ExpireDate': expire_time
        }

        # Thêm bank code nếu có
        if bank_code and bank_code.strip():
            params['vnp_BankCode'] = bank_code.strip()

        # Lọc bỏ các giá trị None hoặc rỗng
        params = {k: v for k, v in params.items() if v is not None and str(v).strip() != ''}

        # Sắp xếp parameters theo thứ tự alphabet (quan trọng cho signature)
        sorted_params = sorted(params.items())

        # Tạo query string theo chuẩn VNPay
        query_string = '&'.join([f"{key}={urllib.parse.quote_plus(str(value), safe='')}"
                                 for key, value in sorted_params])

        # Tạo secure hash
        secure_hash = self.create_secure_hash(query_string)

        # Thêm secure hash vào URL
        payment_url = f"{self.vnpay_url}?{query_string}&vnp_SecureHash={secure_hash}"

        logger.info(f"Created VNPay payment URL for order {order_id}, amount: {amount}")
        return payment_url

    def create_secure_hash(self, query_string):
        """
        Tạo secure hash cho VNPay
        """
        return hmac.new(
            self.secret_key.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()

    def validate_response(self, response_data):
        """
        Validate response từ VNPay
        """
        # Lấy secure hash từ response
        received_hash = response_data.pop('vnp_SecureHash', None)

        if not received_hash:
            return False, "Missing secure hash"

        # Sắp xếp parameters
        sorted_params = sorted(response_data.items())

        # Tạo query string để validate
        query_string = '&'.join([f"{key}={urllib.parse.quote_plus(str(value))}"
                                 for key, value in sorted_params if value])

        # Tạo expected hash
        expected_hash = self.create_secure_hash(query_string)

        # So sánh hash
        is_valid = hmac.compare_digest(received_hash.upper(), expected_hash.upper())

        if not is_valid:
            logger.warning(f"Invalid VNPay signature. Expected: {expected_hash}, Received: {received_hash}")
            return False, "Invalid signature"

        # Kiểm tra response code
        response_code = response_data.get('vnp_ResponseCode', '')
        if response_code == '00':
            return True, "Success"
        else:
            error_msg = self.get_response_message(response_code)
            return False, error_msg

    def get_response_message(self, response_code):
        """
        Lấy message từ response code
        """
        messages = {
            '00': 'Giao dịch thành công',
            '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
            '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
            '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
            '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
            '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
            '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch.',
            '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
            '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
            '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
            '75': 'Ngân hàng thanh toán đang bảo trì.',
            '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch',
            '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)'
        }
        return messages.get(response_code, f'Unknown error code: {response_code}')

    def query_transaction(self, order_id, transaction_date):
        """
        Truy vấn thông tin giao dịch từ VNPay
        """
        params = {
            'vnp_Version': self.version,
            'vnp_Command': 'querydr',
            'vnp_TmnCode': self.tmn_code,
            'vnp_TxnRef': str(order_id),
            'vnp_OrderInfo': f'Query transaction {order_id}',
            'vnp_TransactionDate': transaction_date,
            'vnp_CreateDate': datetime.now().strftime('%Y%m%d%H%M%S'),
            'vnp_IpAddr': '127.0.0.1'
        }

        # Sắp xếp và tạo hash
        sorted_params = sorted(params.items())
        query_string = '&'.join([f"{key}={urllib.parse.quote_plus(str(value))}"
                                 for key, value in sorted_params])
        secure_hash = self.create_secure_hash(query_string)
        params['vnp_SecureHash'] = secure_hash

        try:
            response = requests.post(self.api_url, data=params, timeout=30)
            return response.json() if response.status_code == 200 else None
        except Exception as e:
            logger.error(f"Error querying VNPay transaction: {str(e)}")
            return None

    def get_client_ip(self, request):
        """
        Lấy IP của client
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip or '127.0.0.1'