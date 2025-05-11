const initialState = null; // Trạng thái ban đầu là null

const MyUserReducer = (state = initialState, action) => {
  console.log('Reducer called with action:', action);
  switch (action.type) {
    case 'login':
      return action.payload || state; // Trả về payload hoặc trạng thái hiện tại
    case 'logout':
      return null; // Trả về null khi đăng xuất
    default:
      return state; // Trả về trạng thái hiện tại nếu không có action phù hợp
  }
};

export default MyUserReducer;