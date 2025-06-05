import json
import uuid
import requests
import hmac
import hashlib
from django.conf import settings
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class MoMoService:
    def __init__(self):
        self.config = settings.MOMO_CONFIG

    def create_signature(self, raw_signature):
        """Tạo chữ ký HMAC SHA256"""
        h = hmac.new(
            bytes(self.config['SECRET_KEY'], 'ascii'),
            bytes(raw_signature, 'ascii'),
            hashlib.sha256
        )
        return h.hexdigest()

    def create_payment_request(self, subscription_id, amount, order_info="Thanh toán gói tập gym"):
        """Tạo yêu cầu thanh toán MoMo"""
        try:
            # Tạo các ID duy nhất
            order_id = f"GYM_{subscription_id}_{uuid.uuid4().hex[:8]}"
            request_id = str(uuid.uuid4())

            # Chuyển đổi amount thành string
            amount_str = str(int(amount))

            # Tạo raw signature
            raw_signature = (
                f"accessKey={self.config['ACCESS_KEY']}"
                f"&amount={amount_str}"
                f"&extraData="
                f"&ipnUrl={self.config['IPN_URL']}"
                f"&orderId={order_id}"
                f"&orderInfo={order_info}"
                f"&partnerCode={self.config['PARTNER_CODE']}"
                f"&redirectUrl={self.config['REDIRECT_URL']}"
                f"&requestId={request_id}"
                f"&requestType={self.config['REQUEST_TYPE']}"
            )

            # Tạo chữ ký
            signature = self.create_signature(raw_signature)

            # Tạo data payload
            data = {
                'partnerCode': self.config['PARTNER_CODE'],
                'orderId': order_id,
                'partnerName': self.config['PARTNER_NAME'],
                'storeId': self.config['STORE_ID'],
                'ipnUrl': self.config['IPN_URL'],
                'amount': amount_str,
                'lang': self.config['LANG'],
                'requestType': self.config['REQUEST_TYPE'],
                'redirectUrl': self.config['REDIRECT_URL'],
                'autoCapture': self.config['AUTO_CAPTURE'],
                'orderInfo': order_info,
                'requestId': request_id,
                'extraData': '',
                'signature': signature,
                'orderGroupId': ''
            }

            # Gửi request đến MoMo
            response = requests.post(
                self.config['ENDPOINT'],
                data=json.dumps(data),
                headers={
                    'Content-Type': 'application/json',
                    'Content-Length': str(len(json.dumps(data)))
                },
                timeout=30
            )

            logger.info(f"MoMo request: {data}")
            logger.info(f"MoMo response: {response.json()}")

            return {
                'success': True,
                'data': response.json(),
                'order_id': order_id,
                'request_id': request_id
            }

        except Exception as e:
            logger.error(f"MoMo payment request error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def verify_ipn_signature(self, data):
        """Xác thực chữ ký IPN từ MoMo"""
        try:
            # Tạo raw signature từ response data
            raw_signature = (
                f"accessKey={self.config['ACCESS_KEY']}"
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

            expected_signature = self.create_signature(raw_signature)
            received_signature = data.get('signature', '')

            return expected_signature == received_signature

        except Exception as e:
            logger.error(f"MoMo signature verification error: {str(e)}")
            return False