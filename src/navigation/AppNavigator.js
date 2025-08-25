import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import HomeScreen from '../screens/HomeScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import SearchScreen from '../screens/SearchScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import CartScreen from '../screens/CartScreen';
import OrderScreen from '../screens/OrderScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import AddressScreen from '../screens/AddressScreen';
import AddAddressScreen from '../screens/AddAddressScreen';
import UpdateAddressScreen from '../screens/UpdateAddressScreen';
import PaymentSuccessScreen from '../screens/PaymentSuccessScreen';
import RatingScreen from '../screens/RatingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UserChatScreen from '../screens/ChatScreen';
import MapScreen from '../screens/MapScreen';
import ForgotPasswordScreen from '../screens/ForgotPassword';
import OtpScreen from '../screens/OtpScreen';
import ResetPasswordScreen from '../screens/ResetPassword';
import ChangePasswordScreen from '../screens/ChangePassword';
import RefundReturnScreen from '../screens/TraHangScreen';
import UserReviewsScreen from '../screens/UserReviewsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import VoucherScreen from '../screens/VoucherScreen';
import ReturnRequestScreen from '../screens/ReturnRequestScreen';
import NotificationScreen from '../screens/NotificationScreen';

const Stack = createStackNavigator();

/**
 * Bộ điều hướng chính của ứng dụng (App Navigator)
 *
 * Chức năng:
 * - Định nghĩa các màn hình và luồng điều hướng chính
 * - Ẩn/hiện header cho từng  màn hình
 * - Thiết lập màn hình khởi động
 */
const AppNavigator = () => {
  // Export navigation service globally for notification deep linking
  React.useEffect(() => {
    global.navigationService = {
      navigate: (name, params) => {
        if (global._navigator) {
          global._navigator.navigate(name, params);
        }
      }
    };
  }, []);
  
  return (
    <Stack.Navigator
      initialRouteName="HomeScreen"
      screenOptions={{
        headerShown: false,
      }}
    >
        {/* Màn hình chào mừng */}
        <Stack.Screen name="WelcomeScreen" component={WelcomeScreen}
        options={{
          detachPreviousScreen: true
        }}
        />
        
        {/* Màn hình đăng nhập */}
        <Stack.Screen name="LoginScreen" component={LoginScreen}
        options={{
          detachPreviousScreen: true
        }} />
        <Stack.Screen name="SignUpScreen" component={SignUpScreen}
        options={{
          detachPreviousScreen: true
        }}
        />
        {/* Màn hình trang chủ */}
        <Stack.Screen name="HomeScreen" component={HomeScreen}
        options={{
          detachPreviousScreen: true
        }} />
        {/* Màn hình tìm kiếm */}
        <Stack.Screen name="SearchScreen" component={SearchScreen}
        options={{
          detachPreviousScreen: true
        }}
        />
        {/* Màn hình kết quả tìm kiếm */}
        <Stack.Screen name="SearchResultsScreen" component={SearchResultsScreen}
        options={{
          detachPreviousScreen: true
        }} />
        {/* Màn hình chi tiết sản phẩm */}
        <Stack.Screen name="ProductDetailScreen" component={ProductDetailScreen}
        options={{
          detachPreviousScreen: true
        }}
        />
        
        {/* Màn hình giỏ hàng */}
        <Stack.Screen name="CartScreen" component={CartScreen}
        options={{
          detachPreviousScreen: true
        }} />
        {/* Màn hình đặt hàng */}
                    <Stack.Screen name="CheckoutScreen" component={CheckoutScreen}
        options={{
          detachPreviousScreen: true
        }}
        />
        {/* Màn hình chọn địa chỉ */}
        <Stack.Screen name="AddressScreen" component={AddressScreen}
        options={{
          detachPreviousScreen: true
        }} />
        {/* Màn hình thêm địa chỉ */}
        <Stack.Screen name="AddAddressScreen" component={AddAddressScreen}
        options={{
          detachPreviousScreen: true
        }}
         />
        {/* Màn hình sửa địa chỉ */}
        <Stack.Screen name="UpdateAddressScreen" component={UpdateAddressScreen}
        options={{
          detachPreviousScreen: true
        }} />
        <Stack.Screen name="PaymentSuccessScreen" component={PaymentSuccessScreen}
        options={{
          detachPreviousScreen: true
        }}
        />
        <Stack.Screen name="MapScreen" component={MapScreen}
        options={{
          detachPreviousScreen: true
        }} />
        
        {/* Màn hình đơn hàng */}
                <Stack.Screen name="OrderScreen" component={OrderScreen}
        options={{
          detachPreviousScreen: true
        }} />
        <Stack.Screen name="OrderDetailScreen" component={OrderDetailScreen}
        options={{
          detachPreviousScreen: true
        }} />
        <Stack.Screen name="ReturnRequestScreen" component={ReturnRequestScreen} />
        <Stack.Screen name='Otp' component={OtpScreen}
        options={{
          detachPreviousScreen: true
        }} />
        <Stack.Screen name='VoucherScreen' component={VoucherScreen}
        options={{
          detachPreviousScreen: true
        }} />
        <Stack.Screen name="RatingScreen" component={RatingScreen} />
        <Stack.Screen name="ProfileScreen" component={ProfileScreen}
        options={{
          detachPreviousScreen: true
        }} />
        <Stack.Screen name="ChatScreen" component={UserChatScreen}
        options={{
          detachPreviousScreen: true
        }} />
        {/* Các màn hình bổ sung */}
        <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen}
        options={{
          detachPreviousScreen: true
        }}   />
        <Stack.Screen name="OtpScreen" component={OtpScreen}
        options={{
          detachPreviousScreen: true
        }} />
        <Stack.Screen name="ChangePassScreen" component={ChangePasswordScreen}
        options={{
          detachPreviousScreen: true
        }}
        />
        <Stack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen}
        options={{
          detachPreviousScreen: true
        }} />
        <Stack.Screen name="RefundReturnScreen" component={RefundReturnScreen}
        options={{
          detachPreviousScreen: true
        }} />
        <Stack.Screen name="EditProfileScreen" component={EditProfileScreen}
        options={{
          detachPreviousScreen: true
        }} />
        <Stack.Screen name="NotificationScreen" component={NotificationScreen}
        options={{
          detachPreviousScreen: true
        }} />
      </Stack.Navigator>
  );
};

export default AppNavigator; 