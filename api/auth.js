// src/api/auth.js
const API_BASE_URL = 'http://192.168.2.104:5000/api/auth'; // THAY THẾ BẰNG URL BACKEND THẬT CỦA BẠN

export const apiRegister = async (username, email, password, fullname) => {
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password, fullname }),
        });

        const data = await response.json();

        if (!response.ok) {
            // Nếu backend trả về lỗi, ném ra một Error với message từ API
            throw new Error(data.message || 'Đăng ký thất bại từ server.');
        }

        // API nên trả về token và thông tin người dùng
        // Ví dụ: { token: "abcxyz", user: { id: "123", username: "john_doe", email: "john@example.com", fullname: "John Doe" }, message: "Đăng ký thành công!" }
        return data; // data chứa { token, user, message }
    } catch (error) {
        console.error("Lỗi khi gọi API đăng ký:", error);
        throw error; // Ném lại lỗi để AuthContext có thể bắt
    }
};

// Bạn cũng có thể thêm apiLogin vào đây
export const apiLogin = async (email, password) => {
    try {
        const response = await fetch(`${API_BASE_URL}/login-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        console.log('API login response data:', data); // debug xem response

        if (!response.ok) {
            throw new Error(data.message || 'Đăng nhập thất bại từ server.');
        }

        return data;
    } catch (error) {
        console.error("Lỗi khi gọi API đăng nhập:", error);
        throw error;
    }
};
