import axios from 'axios';

// Tạo instance của axios
const BASE_URL = 'http://127.0.0.1:8000/';

// Định nghĩa các endpoint
export const endpoints = {
//   login: '/auth/login',
//   register: '/auth/register',
//   getUser: '/user',
//   updateUser: '/user/update',
};

export const authAPI = (accessToken) => {
    return axios.create({
        'baseURL': BASE_URL,
        'headers': {
        Authorization: `Bearer ${accessToken}`
        },
    });
};
 export default axios.create({
    'baseURL': BASE_URL
 });

