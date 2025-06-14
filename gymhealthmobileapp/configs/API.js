import { current } from "@reduxjs/toolkit";
import axios from "axios";

// Địa chỉ cơ bản của server
const BASE_URL = "http:192.168.1.7:8000/"; // Thay đổi 127.0.0.1 thành địa chỉ IP của máy tính
export const endpoints = {
  login: "/o/token/",
  profile: "/profile/",
  register: "/users/register/",
  subscription: "/subscription/",
  workoutSessions: "/workout-sessions/",
  trainingProgress: "/training-progress/",
  packages: "/packages/",
  currentuser: "/users/current-user/",
  workoutessions: "/workout-sessions/me/registered-sessions/",
  registerworkoutessions: "/workout-sessions/member/register/",
  trainers: "/trainers/",
  healthinfo: "/health-info/my/",
  updateStatusSession: "/workout-sessions/{id}/confirm-session/",
  updateHealthInfo: "/health-info/update/",
  notifications: "/notifications/",
  createTrainerRating: "/trainer-rating/",
  deleteTrainerRating: "/trainer-rating/{id}/",
  myTrainerRating: "/trainer-rating/my-ratings/",
  createGymRating: "/gym-rating/",
  deleteGymRating: "/gym-rating/{id}/",
  // Payment endpoints
  createMomoPayment: "/payments/create_momo_payment/",
  createVNPayPayment: "api/payments/vnpay/create/",
  paymentDetail: (id) => `/payments/${id}/`,
  paymentsList: "/payments/",

  // Payment status endpoints
  checkVNPayStatus: (paymentId) => `/payments/${paymentId}/vnpay/status/`,
  checkMomoStatus: (paymentId) => `/payments/${paymentId}/status/`,

  // Subscription payment verification
  verifyPayment: (subscriptionId) =>
    `/subscriptions/${subscriptionId}/verify_payment/`,

  // Payment receipts
  paymentReceipts: "/payment-receipts/",
  uploadReceipt: "/payment-receipts/",
  trainerRating: "/trainer-rating/",
  feedbackResponse: "/feedback-response/",
};

// export const CLIENT_ID = "AybXSAZ8adNhzo3rKcuzxhnts15OmhSsoXzWinQh";
// export const CLIENT_SECRET =
//   "89c3eyIkMYEOboVb79WKxMsuixsRwptPUJwpBzc671UuMMom8ep05xruWHR8SeP63fvRBlPgLTu6H6yWhFveKNWCwkamMXWQN4iSEyfHhfYyPMyVjHvh7JI9nj7u355o";
// // Tạo instance của axios cho các yêu cầu không cần xác thực
// const axiosInstance = axios.create({
//   baseURL: BASE_URL,
// });


export const CLIENT_ID = "lT20dH0jIzVwF1MCCB4XTAIpdjWHVdoECdCn9P7N";
export const CLIENT_SECRET =
  "IxTMTrirrXPG4IPwN2klrQ9TCN5D4XiWQ5gxh0yZFXObCBtsY97omgJEaMQ2mjD0j7uUWb50zbAW7PR8grOZl0UC2cDQQJP4nOWWnVhMJpI9n7ESq03HmWFXaoz28PEL";
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
