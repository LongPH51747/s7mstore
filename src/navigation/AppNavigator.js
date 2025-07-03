import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
  return (
    <NavigationContainer>
      {/* Stack Navigator quản lý các màn hình chính */}
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Màn hình chào mừng */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        
        {/* Màn hình đăng nhập */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        {/* Màn hình trang chủ */}
        <Stack.Screen name="Home" component={HomeScreen} />
        {/* Màn hình tìm kiếm */}
        <Stack.Screen name="Search" component={SearchScreen} />
        {/* Màn hình kết quả tìm kiếm */}
        <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
        {/* Màn hình chi tiết sản phẩm */}
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        
        {/* Màn hình giỏ hàng */}
        <Stack.Screen name="Cart" component={CartScreen} />
        {/* Màn hình đặt hàng */}
        <Stack.Screen name="Checkout" component={CheckoutScreen}/>
        {/* Màn hình chọn địa chỉ */}
        <Stack.Screen name="Address" component={AddressScreen} />
        {/* Màn hình thêm địa chỉ */}
        <Stack.Screen name="AddAddress" component={AddAddressScreen} />
        {/* Màn hình sửa địa chỉ */}
        <Stack.Screen name="UpdateAddress" component={UpdateAddressScreen} />
        <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
        
        {/* Màn hình đơn hàng */}
        <Stack.Screen name="Orders" component={OrderScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="Rating" component={RatingScreen} />
        <Stack.Screen name='Profile' component={ProfileScreen}/>
        <Stack.Screen name='Chat' component={UserChatScreen}/>
        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 