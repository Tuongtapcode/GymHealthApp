import { current } from "@reduxjs/toolkit";
import axios from "axios";

// Địa chỉ cơ bản của server
const BASE_URL = "http://192.168.1.9:8000/"; // Thay đổi 127.0.0.1 thành địa chỉ IP của máy tính

// Định nghĩa các endpoint
export const endpoints = {
  login: '/o/token/',
  profile: '/profile/',
  register: '/users/register/',
  subscription: '/subscription/',
  workoutSessions: '/workout-sessions/',
  trainingProgress: '/training-progress/',
  packages: '/packages/',
  currentuser: '/users/current-user/',
  workoutessions: '/workout-sessions/me/registered-sessions/',
  registerworkoutessions:'/workout-sessions/member/register/',
  trainers:'/trainers/',
  verifyPayment: "/subscription/{subscriptionId}/verify-payment/",
  healthinfo: "/health-info/my/",
  updateStatusSession: "/workout-sessions/{id}/confirm-session/",
  updateHealthInfo: "/health-info/update/",
};

export const CLIENT_ID = "AybXSAZ8adNhzo3rKcuzxhnts15OmhSsoXzWinQh";
export const CLIENT_SECRET =
  "89c3eyIkMYEOboVb79WKxMsuixsRwptPUJwpBzc671UuMMom8ep05xruWHR8SeP63fvRBlPgLTu6H6yWhFveKNWCwkamMXWQN4iSEyfHhfYyPMyVjHvh7JI9nj7u355o";
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
