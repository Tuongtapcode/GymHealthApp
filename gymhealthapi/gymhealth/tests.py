import hmac
import hashlib

secret_key = "V3025B1XYEAPJFBN9FSXWEXIC52YRTMM"
query_string = "vnp_Amount=45000000&vnp_Command=pay&vnp_CreateDate=20250607105931&vnp_CurrCode=VND&vnp_ExpireDate=20250607111431&vnp_IpAddr=192.168.2.16&vnp_IpnUrl=https%3A%2F%2F02e5-171-231-61-11.ngrok-free.app%2Fapi%2Fpayments%2Fvnpay%2Fipn%2F&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+goi+tap+Mot+thang+khong+khuyen+mai&vnp_OrderType=other&vnp_ReturnUrl=https%3A%2F%2F02e5-171-231-61-11.ngrok-free.app%2Fapi%2Fpayments%2Fvnpay%2Freturn%2F&vnp_TmnCode=643RJMBQ&vnp_TxnRef=2421749268771268&vnp_Version=2.1.0"
hash_value = hmac.new(
    secret_key.encode('utf-8'),
    query_string.encode('utf-8'),
    hashlib.sha512
).hexdigest()
print(hash_value)