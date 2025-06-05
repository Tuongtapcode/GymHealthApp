import hmac
import hashlib
from urllib.parse import urlencode

# Cấu hình
HASH_SECRET = 'V3025B1XYEAPJFBN9FSXWEXIC52YRTMM'


def create_secure_hash(params, secret):
    # Bước 1: Sắp xếp params theo key alphabet (ASCII)
    sorted_params = dict(sorted(params.items()))

    # Bước 2: Tạo chuỗi query string (không encode ký tự đặc biệt)
    query_string = urlencode(sorted_params, doseq=True, safe='')

    # Bước 3: Tạo HMAC SHA512
    hash_data = hmac.new(secret.encode('utf-8'), query_string.encode('utf-8'), hashlib.sha512).hexdigest()

    return hash_data


params = {
    "vnp_Amount": "45000000",
    "vnp_CreateDate": "20250605102545",
    "vnp_OrderInfo": "Thanh toan goi tap Mot thang khong khuyen mai",
    "vnp_ResponseCode": "00",
    "vnp_TmnCode": "643RJMBQ",
    "vnp_TransactionDate": "20250605102545",
    "vnp_TransactionNo": "15000632",
    "vnp_TxnRef": "2111749093877902"
}

secure_hash = create_secure_hash(params, HASH_SECRET)
print("vnp_SecureHash =", secure_hash)
