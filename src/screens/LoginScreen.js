/**
 * Màn hình Đăng nhập (Login Screen)
 *
 * Màn hình này cho phép người dùng đăng nhập với các chức năng:
 * - Đăng nhập bằng số điện thoại và OTP
 * - Đăng nhập bằng Google
 * - Xác thực người dùng
 * - Lưu thông tin đăng nhập
 * - Chuyển hướng đến màn hình Home sau khi đăng nhập thành công
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth, { getAuth, signInWithCredential, GoogleAuthProvider } from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import Loading from '../components/Loading';
// import { normalizeUserData, logUserInfo } from '../utils/userUtils';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPasswordLink, setShowForgotPasswordLink] = useState(false); // State mới để hiển thị link quên mật khẩu
    const navigation = useNavigation();

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: '649260662561-3l4i52uibivtvf20ioed5g6f98ps24o5.apps.googleusercontent.com',
            offlineAccess: true,
            scopes: ['profile', 'email']
        });
    }, []);

    // Logic đăng nhập email/password (từ src/screens/LoginScreen.js)
    const handleLogin = async () => {
        console.log('[LOGIN] Email:', email, 'Password:', password);
        setShowForgotPasswordLink(false); // Reset trạng thái hiển thị link khi bắt đầu đăng nhập mới

        if (!email || !password) {
            Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu');
            console.log('[LOGIN] Thiếu email hoặc password');
            return;
        }
        setLoading(true);
        try {
            console.log('[LOGIN] Gửi request tới API:', API_ENDPOINTS.AUTH.LOGIN_EMAIL);
            const response = await axios.post(API_ENDPOINTS.AUTH.LOGIN_EMAIL, {
                email,
                password
            }, {
                timeout: API_TIMEOUT,
                headers: API_HEADERS,
            });
            console.log('[LOGIN] Response:', response.data);
            if (response.data && response.data.user && response.data.user.access_token) {
                const backendResponseData = response.data.user;
                const backendUser = backendResponseData.user || {};
                const userInfoToStore = {
                    displayName: backendUser.fullname || backendUser.displayName || '',
                    email: backendUser.email || email,
                    photoURL: backendUser.avatar || '',
                    _id: backendUser._id,
                    is_allowed: backendUser.is_allowed,
                    provider: 'local', // Đánh dấu provider là local/email
                    ...backendUser
                };
                console.log('[LOGIN - DEBUG] backendResponseData:', backendResponseData); // Xem dữ liệu thô
                console.log('[LOGIN - DEBUG] backendUser:', backendUser);             // Xem đối tượng user đã tách
                console.log('[LOGIN - DEBUG] userInfoToStore:', userInfoToStore);

                await AsyncStorage.setItem('userToken', backendResponseData.access_token);
                await AsyncStorage.setItem('shouldAutoLogin', 'true');
                await AsyncStorage.setItem('userInfo', JSON.stringify(userInfoToStore));
                console.log('[LOGIN] userInfoToStore:', userInfoToStore); // Log thông tin user vừa lưu
                // Thử lưu một giá trị testKey vào AsyncStorage
                await AsyncStorage.setItem('testKey', 'testValue');
                const testValue = await AsyncStorage.getItem('testKey');
                console.log('[LOGIN] testKey value:', testValue);
                try { await getAuth().signOut(); } catch (e) {} // Đảm bảo signOut Firebase
                console.log('[LOGIN] Đăng nhập thành công, chuyển sang Home');
                navigation.replace('HomeScreen');
            } else {
                console.log('[LOGIN] Đăng nhập thất bại, response không hợp lệ:', response.data);
                throw new Error('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
            }
        } catch (error) {
            let message = 'Đăng nhập thất bại. Vui lòng thử lại.';
            if (axios.isAxiosError(error) && error.response) {
                // Kiểm tra mã trạng thái HTTP hoặc message cụ thể từ backend
                if (error.response.status === 500 || error.response.data?.message === 'Mật khẩu không đúng') { // Ví dụ: 401 Unauthorized hoặc message cụ thể từ backend
                    message = 'Email hoặc mật khẩu không đúng.';
                    setShowForgotPasswordLink(true); // Hiển thị link quên mật khẩu
                } else {
                    message = error.response.data.message || message;
                }
            } else {
                message = error.message || message;
            }
            console.log('[LOGIN] Lỗi:', error, error?.response?.data);
            Alert.alert('Lỗi', message);
        } finally {
            setLoading(false);
        }
    };

    // Hàm xử lý khi nhấn vào link "Quên mật khẩu?"
    const handleForgotPassword = () => {
        navigation.navigate('ForgotPass'); // Điều hướng đến màn hình ForgotPasswordScreen
    };

    // Logic Google Sign-In (ẩn nút, nhưng giữ logic để dùng về sau)
    const handleGoogleLogin = async () => {
        if (loading) return;
        setLoading(true);
        try {
            console.log('[GOOGLE] Bắt đầu đăng nhập Google...');
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            await GoogleSignin.signOut();
            const userInfo = await GoogleSignin.signIn();
            console.log('[GOOGLE] userInfo:', userInfo);
            const idToken = userInfo?.idToken || userInfo?.data?.idToken;
            if (!idToken) throw new Error('Không nhận được ID token');
            const googleCredential = GoogleAuthProvider.credential(idToken);
            const userCredential = await signInWithCredential(auth(), googleCredential);
            console.log('[GOOGLE] userCredential:', userCredential);
            if (userCredential.user) {
                const email = userCredential.user.email;
                const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
                const requestData = {
                    idToken: idToken,
                    user: {
                        email: userCredential.user.email,
                        username: username,
                        fullname: userCredential.user.displayName,
                        avatar: userCredential.user.photoURL,
                        googleId: userCredential.user.uid
                    }
                };
                console.log('[GOOGLE] Gửi request tới API:', API_ENDPOINTS.AUTH.LOGIN_GOOGLE, requestData);
                const response = await axios.post(API_ENDPOINTS.AUTH.LOGIN_GOOGLE, requestData, {
                    timeout: API_TIMEOUT,
                    headers: API_HEADERS,
                });
                console.log('[GOOGLE] Response:', response.data);
                if (response.data && response.data.data && response.data.data.access_token) {
                    const backendResponseData = response.data.data;
                    const backendUser = backendResponseData.user || {};
                    const userInfoToStore = {
                        displayName: backendUser.fullname || userCredential.user.displayName,
                        email: backendUser.email || userCredential.user.email,
                        photoURL: backendUser.avatar || userCredential.user.photoURL,
                        _id: backendUser._id, // Chỉ lưu MongoDB _id
                        googleId: backendUser.googleId || userCredential.user.uid,
                        is_allowed: backendUser.is_allowed,
                        provider: 'firebase',
                        role: backendUser.role || 'user',
                        ...backendUser
                    };
                    console.log('[GOOGLE] ID MongoDB nhận từ backend (backendUser._id):', backendUser._id); 
                    console.log('[GOOGLE] Firebase UID nhận từ Google:', userCredential.user.uid);
                    await AsyncStorage.setItem('userToken', backendResponseData.access_token);
                    await AsyncStorage.setItem('shouldAutoLogin', 'true');
                    await AsyncStorage.setItem('userInfo', JSON.stringify(userInfoToStore));
                    console.log('[GOOGLE] Đăng nhập Google thành công, chuyển sang Home');
                    console.log('[GOOGLE] Access Token nhận từ backend và đã lưu vào AsyncStorage:', backendResponseData.access_token ? backendResponseData.access_token.substring(0, 30) + '...' : 'null');
                    console.log("[User infor Store] ",userInfoToStore)
                    const tokenJustRead = await AsyncStorage.getItem('userToken');
                    const userInfoJustRead = await AsyncStorage.getItem('userInfo');
                    console.log('[GOOGLE] Token VỪA ĐỌC LẠI TỪ AsyncStorage:', tokenJustRead ? tokenJustRead.substring(0, 30) + '...' : 'null');
                    console.log('[GOOGLE] User Info VỪA ĐỌC LẠI TỪ AsyncStorage (parsed ._id):', userInfoJustRead ? JSON.parse(userInfoJustRead)._id : 'null');
                    navigation.replace('HomeScreen');
                } else {
                    console.log('[GOOGLE] Đăng nhập Google thất bại, response không hợp lệ:', response.data);
                    throw new Error('Không nhận được token từ server');
                }
            }
        } catch (error) {
            let message = 'Đăng nhập Google thất bại';
            if (error.code === '12501') message = 'Đăng nhập Google bị hủy';
            else if (error.code === '12502') message = 'Đăng nhập Google đang được tiến hành';
            else if (error.code === '7') message = 'Google Play Services không khả dụng';
            else if (error.code === 'DEVELOPER_ERROR') message = 'Lỗi cấu hình Google Sign-In. Vui lòng kiểm tra lại cấu hình.';
            else if (error.message) message = error.message;
            console.log('[GOOGLE] Lỗi:', error, error?.response?.data);
            Alert.alert('Lỗi', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor='white' barStyle='dark-content'/>
            <Image
                source={require('../../assets/image/logo.png')}
                style={styles.logo}
            />
            <Text style={styles.title}>Welcome to S7M</Text>
            <View style={styles.inputContainer}>
                <Icon name="mail" size={20} color="#888" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#999"
                />
            </View>
            <View style={styles.inputContainer}>
                <Icon name="lock" size={20} color="#888" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#999"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Icon name={showPassword ? "eye" : "eye-off"} size={20} color="#888" />
                </TouchableOpacity>
            </View>

            {/* Dòng chữ "Quên mật khẩu?" */}
            {showForgotPasswordLink && (
                <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordLinkContainer}>
                    <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
                </TouchableOpacity>
            )}

            <View style={styles.checkboxContainer}>
                <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setRememberMe(!rememberMe)}
                >
                    <Icon name={rememberMe ? "check-square" : "square"} size={20} color="#888" />
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Remember me</Text>
            </View>
            <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={loading}
            >
                {loading ? (
                    <Loading visible={loading} text="Đang đăng nhập..." />
                ) : (
                    <Text style={styles.buttonText}>Log In</Text>
                )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleGoogleLogin} style={styles.buttonGG} disabled={loading}>
                <Image
                    source={require('../../assets/image/LogoGG.png')}
                    style={{ width: 30, height: 30, marginRight: 10 }}
                />
                <Text style={styles.buttonText}>Đăng nhập bằng Google</Text>
            </TouchableOpacity>
            <Loading visible={loading} text="Đang đăng nhập..." />
            <Text style={styles.orText}>or continue with</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUpScreen')}>
                <Text style={styles.bottomLink}>Bạn chưa có tài khoản? <Text style={styles.linkText}>Đăng kí ngay</Text></Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 25,
        backgroundColor: 'white',
    },
    logo: {
        width: 150,
        height: 150,
        marginBottom: 30,
        resizeMode: 'contain',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#333',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        backgroundColor: '#F2F4F5',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 20, // Giữ nguyên marginBottom cho input container
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: '#333',
    },
    eyeIcon: {
        padding: 5,
    },
    forgotPasswordLinkContainer: { // Style cho container của link quên mật khẩu
        width: '100%',
        alignItems: 'flex-end', // Căn phải
        marginTop: -15, // Đẩy lên gần input mật khẩu
        marginBottom: 15, // Khoảng cách với checkbox
    },
    forgotPasswordText: { // Style cho text quên mật khẩu
        color: '#007AFF', // Màu xanh dương nổi bật
        fontSize: 14,
        fontWeight: '600',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 25,
    },
    checkbox: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    checkboxLabel: {
        fontSize: 16,
        color: '#555',
    },
    button: {
        width: '100%',
        height: 55,
        backgroundColor: '#343A40',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    buttonGG: {
        flexDirection: 'row',
        backgroundColor: '#ff6e41',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
        marginBottom: 10,
        width:'100%'
    },
    orText: {
        fontSize: 16,
        color: '#888',
        marginBottom: 20,
    },
    bottomLink: {
        fontSize: 16,
        color: '#555',
    },
    linkText: {
        color: '#343A40',
        fontWeight: 'bold',
    },
});

export default LoginScreen;