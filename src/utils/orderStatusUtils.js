// Utility functions for order status conversion between text and numbers

// Mapping từ text sang số (khi gửi request)
export const statusToNumber = {
  'Chờ xác nhận': 1,
  'Đã xác nhận': 2,
  'Chờ giao hàng': 3, // Mặc định là 3, có thể là 3,4,5,6
  'Giao thành công': 7, // Mặc định là 7, có thể là 7,8
  'Trả hàng': 13, // Mặc định là 13, có thể là 13,14,15,16,17
  'Đã hủy': 19
};

// Mapping từ số sang text (khi nhận response)
export const numberToStatus = {
  1: 'Chờ xác nhận',
  2: 'Đã xác nhận',
  3: 'Chờ giao hàng',
  4: 'Chờ giao hàng',
  5: 'Chờ giao hàng',
  6: 'Chờ giao hàng',
  7: 'Giao thành công',
  8: 'Giao thành công',
  13: 'Trả hàng',
  14: 'Trả hàng',
  15: 'Trả hàng',
  16: 'Trả hàng',
  17: 'Trả hàng',
  19: 'Đã hủy'
};

// Chuyển đổi từ text sang số
export const convertStatusToNumber = (statusText) => {
  return statusToNumber[statusText] || 1; // Mặc định là 1 nếu không tìm thấy
};

// Chuyển đổi từ số sang text
export const convertNumberToStatus = (statusNumber) => {
  return numberToStatus[statusNumber] || 'Chờ xác nhận'; // Mặc định là 'Chờ xác nhận' nếu không tìm thấy
};

// Kiểm tra xem một trạng thái có thuộc nhóm nào không
export const getStatusGroup = (statusNumber) => {
  if ([3, 4, 5, 6].includes(statusNumber)) return 'Chờ giao hàng';
  if ([7, 8].includes(statusNumber)) return 'Giao thành công';
  if ([13, 14, 15, 16, 17].includes(statusNumber)) return 'Trả hàng';
  return convertNumberToStatus(statusNumber);
};

// Lấy tất cả các số tương ứng với một trạng thái text
export const getStatusNumbers = (statusText) => {
  switch (statusText) {
    case 'Chờ xác nhận':
      return [1];
    case 'Đã xác nhận':
      return [2];
    case 'Chờ giao hàng':
      return [3, 4, 5, 6];
    case 'Giao thành công':
      return [7, 8];
    case 'Trả hàng':
      return [13, 14, 15, 16, 17];
    case 'Đã hủy':
      return [19];
    default:
      return [1];
  }
};
