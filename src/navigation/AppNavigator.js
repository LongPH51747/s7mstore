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

const Stack = createStackNavigator();

/**
 * Bộ điều hướng chính của ứng dụng (App Navigator)
 *
 * Chức năng:
 * - Định nghĩa các màn hình và luồng điều hướng chính
 * - Ẩn/hiện header cho từng màn hình
 * - Thiết lập màn hình khởi động
 */
const AppNavigator = () => {
  return (
    <NavigationContainer>
      {/* Stack Navigator quản lý các màn hình chính */}
      <Stack.Navigator
        initialRouteName="Welcome"
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
        
        {/* Màn hình đơn hàng */}
        <Stack.Screen name="Orders" component={OrderScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 