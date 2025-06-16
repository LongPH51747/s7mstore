import AsyncStorage from "@react-native-async-storage/async-storage";
import {  createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import { apiRegister, apiLogin } from '../api/auth';
const AuthContext = createContext();
export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const loadAuthData = async() => {
            try {
                const storedToken = await AsyncStorage.getItem('userToken');
                const storedUser = await AsyncStorage.getItem('currentUser');

                if(storedToken && storedUser){
                    const parsedUser = JSON.parse(storedUser);
                    setToken(storedToken);
                    setUser(parsedUser);
                    setIsAuthenticated(true);
                }
            } catch (error) {
                 console.error('Lỗi khi tải dữ liệu xác thực từ AsyncStorage:', error);
            }finally{
                 setLoading(false);
            }
        }
        loadAuthData()
    }, []);

    const login = async (email, password) => {
    try {
        const result = await apiLogin(email, password);
        console.log('Login API result:', result);

        // Lấy token đúng vị trí
        const token = result.user?.access_token;
        const user = result.user?.user;

        if (!token) {
            throw new Error('Token đăng nhập không tồn tại trong phản hồi API');
        }
        if (!user) {
            throw new Error('Thông tin user không tồn tại trong phản hồi API');
        }

        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('currentUser', JSON.stringify(user));

        setToken(token);
        setUser(user);
        setIsAuthenticated(true);

        console.log("Đăng nhập thành công: Dữ liệu đã được lưu vào AsyncStorage."); 
    } catch (error) {
        console.error('Lỗi khi đăng nhập:', error);
        Alert.alert('Lỗi', error.message || 'Đăng nhập không thành công.');
    }
};



    const updateUser = async(newUserData) => {
        try {
            await AsyncStorage.setItem('currentUser', JSON.stringify(newUserData));
            setUser(newUserData);
        } catch (error) {
            console.error('Lỗi khi cập nhật thông tin người dùng trong AsyncStorage:', error);
        }
    };

    const logout = async () => {
        try {
            // Xóa token và user khỏi AsyncStorage
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('currentUser');

            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            Alert.alert('Thông báo', 'Bạn đã đăng xuất thành công!');
        } catch (error) {
            console.error('Lỗi khi xóa dữ liệu đăng xuất từ AsyncStorage:', error);
            Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
        }
    };

     const register = async (username, email, password, fullname) => {
        try {
            // Gọi API đăng ký từ file api/auth.js
            const result = await apiRegister(username, email, password, fullname);

            // Nếu API đăng ký thành công, sử dụng hàm `login` của AuthContext để lưu dữ liệu
            // `result` từ `apiRegister` nên trả về `{ token, user, message }`
            await login(email, password);

            console.log("Đăng ký thành công và người dùng đã được đăng nhập.");

            // Trả về một thông báo thành công cho component gọi
            return { success: true, message: result.message || "Đăng ký tài khoản thành công!" };
        } catch (error) {
            console.error('Lỗi trong AuthContext khi đăng ký:', error);
            
            throw new Error(error.message || "Đăng ký không thành công.");
        }
    };

     return(
            <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated,
                loading, // Cung cấp trạng thái loading
                login,
                logout,
                updateUser,
                register,
            }}
        >
            {children}
        </AuthContext.Provider>
        )
};

export const useAuth = () => {
    return useContext(AuthContext);
}

       