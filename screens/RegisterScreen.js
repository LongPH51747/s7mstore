// src/screens/RegisterScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, CheckBox, StatusBar } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../src/contexts/AuthContext';
import Icon from 'react-native-vector-icons/Feather'; 

const RegisterScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // Thêm trường confirmPassword
    const [username, setUsername] = useState(''); // Cần username cho backend của bạn
    const [fullname, setFullname] = useState(''); // Cần fullname cho backend của bạn
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false); // Checkbox Remember me
    const [showPassword, setShowPassword] = useState(false); // State để ẩn/hiện mật khẩu
    const [showConfirmPassword, setShowConfirmPassword] = useState(false); // State để ẩn/hiện confirm password

    const navigation = useNavigation();
    const { register } = useAuth();

    const handleRegister = async () => {
        // Kiểm tra thông tin đầu vào
        if (!email || !password || !confirmPassword || !username || !fullname) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
            return;
        }

        setLoading(true);
        try {
            const result = await register(username, email, password, fullname); // Gọi hàm register
            Alert.alert('Thành công', result.message || 'Đăng ký tài khoản thành công!');
            navigation.navigate('profile'); // Điều hướng đến màn hình profile
        } catch (err) {
            Alert.alert('Lỗi đăng ký', err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.'); // Hiển thị thông báo lỗi
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor='white' barStyle='dark-content'/>
            {/* Logo hoặc hình ảnh thương hiệu */}
            <Image
                source={require('../assets/image/logo.png')} // Thay đổi đường dẫn đến logo của bạn
                style={styles.logo}
            />
            <Text style={styles.title}>Create Your Account</Text>

            {/* Input Email */}
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

            {/* Input Username */}
            <View style={styles.inputContainer}>
                <Icon name="user" size={20} color="#888" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="Username"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    placeholderTextColor="#999"
                />
            </View>

            {/* Input Full Name */}
            <View style={styles.inputContainer}>
                <Icon name="info" size={20} color="#888" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={fullname}
                    onChangeText={setFullname}
                    placeholderTextColor="#999"
                />
            </View>

            {/* Input Password */}
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

            {/* Input Confirm Password */}
            <View style={styles.inputContainer}>
                <Icon name="lock" size={20} color="#888" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    placeholderTextColor="#999"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                    <Icon name={showConfirmPassword ? "eye" : "eye-off"} size={20} color="#888" />
                </TouchableOpacity>
            </View>

            {/* Remember Me Checkbox */}
            <View style={styles.checkboxContainer}>
                <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setRememberMe(!rememberMe)}
                >
                    <Icon name={rememberMe ? "check-square" : "square"} size={20} color="#888" />
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Remember me</Text>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
                style={styles.button}
                onPress={handleRegister}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Sign up</Text>
                )}
            </TouchableOpacity>

            {/* Or continue with text (có thể bỏ nếu không cần) */}
            <Text style={styles.orText}>or continue with</Text>

            {/* Đã có tài khoản? Đăng nhập ngay */}
            <TouchableOpacity onPress={() => navigation.navigate('login')}>
                <Text style={styles.bottomLink}>Already have an account? <Text style={styles.linkText}>Sign in</Text></Text>
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
        backgroundColor: 'white', // Màu nền hồng nhạt từ hình ảnh
    },
    logo: {
        width: 150, // Kích thước logo
        height: 150,
        marginBottom: 30,
        resizeMode: 'contain',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#333',
        // fontFamily: 'YourCustomFont-Bold', // Thêm font tùy chỉnh nếu có
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        backgroundColor: '#F2F4F5',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 20,
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
        backgroundColor: '#343A40', // Màu nút đậm
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
        color: '#343A40', // Màu đậm cho chữ "Sign in"
        fontWeight: 'bold',
    },
});

export default RegisterScreen;