import axios from 'axios';

// Địa chỉ cơ bản của server
const BASE_URL = 'http://192.168.233.1:8000/'; // Thay đổi 127.0.0.1 thành địa chỉ IP của máy tính

// Định nghĩa các endpoint
export const endpoints = {
  login: '/o/token/',
  register: '/register/'
};

export const CLIENT_ID = 'xFbPBC3vOcOnf5e4dhcVcroXxeqed8Dnpb41PtPY';
export const CLIENT_SECRET = 'aJhbfraNTsaTdsr8RqbWmsPM177OGRzlpOrxoCNXqlP9aPPAYFZikipa9rotIp4Ql9QlysSKu8HEHh0ewQC84JspFZA8BubRdGen5NSJHiZNMjqz9XLpixW8L16pCMpr';
// Tạo instance của axios cho các yêu cầu không cần xác thực
const axiosInstance = axios.create({
  baseURL: BASE_URL,
});

// Tạo instance của axios cho các yêu cầu cần xác thực
export const authAPI = (accessToken) => {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

export default axiosInstance;

