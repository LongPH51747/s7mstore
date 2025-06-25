import React, { useEffect, useState, useCallback, useRef } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Checkbox } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { Animated, LayoutAnimation, Platform, UIManager } from 'react-native';

import { 
  SafeAreaView, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  Alert
} from "react-native";
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api'; // Import API config

// Main component
const CartScreen = (props) => {
  const navigation = useNavigation();
  const [idUser, setIdUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartItem, setCartItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [finalTotal, setFinalTotal] = useState(0);
  const [selectAll, setSelectAll] = useState(false);
  const [animatedValues, setAnimatedValues] = useState({});
  const quantityTimers = useRef({}); // Thêm dòng này để lưu timer debounce cho từng sản phẩm

  // Function to get user info from AsyncStorage
  const getUserInfo = useCallback(async () => {
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString !== null) {
        const userInfo = JSON.parse(userInfoString);
        if (userInfo && userInfo._id) {
          setIdUser(userInfo._id);
          console.log('User ID from AsyncStorage on focus (MongoDB _id):', userInfo._id);
        } else {
          console.log('userInfo found but _id is missing on focus:', userInfo);
          Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.' });
          navigation.replace('Login');
        }
      } else {
        console.log('No userInfo found in AsyncStorage on focus.');
        Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Chưa đăng nhập. Vui lòng đăng nhập để xem giỏ hàng.' });
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin người dùng từ AsyncStorage on focus:', error);
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Không thể lấy thông tin người dùng. Vui lòng thử lại.' });
    }
  }, [navigation]);

  useEffect(() => {
    // Initial load
    getUserInfo();

    // Add listener for focus events
    const unsubscribe = navigation.addListener('focus', () => {
      getUserInfo();
    });

    // Clean up the listener when the component unmounts
    return unsubscribe;
  }, [getUserInfo, navigation]);

  const getCart = useCallback(async () => {
    if(!idUser) {
      console.log("Waiting for userId...");
      return;
    }

    try {
      console.log('Fetching cart for userId:', idUser);
      const response = await fetch(`${API_ENDPOINTS.CART.GET_BY_USER_ID}/${idUser}`, {
        headers: API_HEADERS,
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error('Server returned non-JSON response');
      }

      if (!response.ok) {
        throw new Error(data.message || `Failed to fetch cart: ${response.status}`);
      }

      console.log('Cart data received:', data);
      
      if (data && data.cartItem && Array.isArray(data.cartItem)) {
        setCart(data);
        setCartItem(data.cartItem);
      } else {
        console.log('Invalid cart data format:', data);
        setCart({ cartItem: [] });
        setCartItem([]);
      }
    } catch (error) {
      console.error('Lỗi khi lấy giỏ hàng:', error);
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Không thể tải giỏ hàng. Vui lòng thử lại sau.' });
      setCart({ cartItem: [] });
      setCartItem([]);
    }
  }, [idUser]);

  useEffect(() => {
    if (idUser) {
      getCart();
    }
  }, [getCart, idUser]);

  useEffect(() => {
    if (cartItem && cartItem.length > 0) {
      // Initialize selected items when cart is loaded
      const initialSelected = {};
      const initialAnimated = {};
      cartItem.forEach(item => {
        initialSelected[item.id_variant] = false; // Mặc định không chọn
        initialAnimated[item.id_variant] = new Animated.Value(0); // 0 là vị trí ban đầu
      });
      setSelectedItems(initialSelected);
      setAnimatedValues(initialAnimated);
    }
  }, [cartItem]);

  useEffect(() => {
    if (cartItem && cartItem.length > 0) {
      console.log("Số phần tử trong mảng cartItem:", cartItem.length);
      let subTotal = 0;
      cartItem.forEach(item => {
        if (selectedItems[item.id_variant]) {
          subTotal += (item.unit_price_item || item.price || 0) * (item.quantity || 0);
        }
      });
      setTotalPrice(subTotal);

      // Tính toán discount và shipping fee
      const calculatedDiscount = Math.min(subTotal * 0.1, 14950); // 10% discount, max 14950đ
      setDiscount(calculatedDiscount);
      
      // Chỉ tính phí vận chuyển nếu có sản phẩm được chọn
      const hasSelectedItems = Object.values(selectedItems).some(value => value);
      setShippingFee(hasSelectedItems ? (subTotal > 500000 ? 0 : 30000) : 0);

      setFinalTotal(subTotal - calculatedDiscount + (hasSelectedItems ? (subTotal > 500000 ? 0 : 30000) : 0));
    } else {
      console.log("CartItem is empty or null.");
      setTotalPrice(0);
      setDiscount(0);
      setShippingFee(0);
      setFinalTotal(0);
    }
  }, [cartItem, selectedItems]);

  const handleQuantityChange = (type, itemId) => {
    const currentItem = cartItem.find(item => item.id_variant === itemId);
    if (!currentItem) return;

    let newQuantity = currentItem.quantity;
    if (type === 'plus') newQuantity++;
    else if (type === 'minus' && newQuantity > 1) newQuantity--;
    else return;

    const prevCartItem = [...cartItem];
    setCartItem(prev =>
      prev.map(item =>
        item.id_variant === itemId ? { ...item, quantity: newQuantity } : item
      )
    );

    // Clear timer cũ nếu có
    if (quantityTimers.current[itemId]) {
      clearTimeout(quantityTimers.current[itemId]);
    }

    // Đặt timer mới (debounce 400ms)
    quantityTimers.current[itemId] = setTimeout(async () => {
      try {
        const response = await fetch(`${API_ENDPOINTS.CART.UPDATE_QUANTITY(currentItem._id)}`, {
          method: 'PATCH',
          headers: {
            ...API_HEADERS,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            quantity: newQuantity,
            userId: idUser
          }),
        });

        const responseText = await response.text();
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          return;
        }

        if (!response.ok) {
          throw new Error(responseData.message || `Failed to update quantity: ${response.status}`);
        }
      } catch (error) {
        setCartItem(prevCartItem);
        Toast.show({ type: 'error', text1: 'Lỗi', text2: error.message || 'Không thể cập nhật số lượng. Vui lòng thử lại sau.' });
      }
    }, 400);
  };

  const handleRemoveItem = async (cartItemId) => {
    const currentItem = cartItem.find(item => item.id_variant === cartItemId);
    if (!currentItem) {
      console.log('Item not found in cart:', cartItemId);
      return;
    }

    // Animation: trượt sang trái
    Animated.timing(animatedValues[cartItemId], {
      toValue: -400, // trượt sang trái 400px
      duration: 100,
      useNativeDriver: true,
    }).start(async () => {
      // Thêm LayoutAnimation để các item còn lại dồn lên mượt mà
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      // Xóa khỏi state cartItem trước để có hiệu ứng
      setCartItem(prev => prev.filter(item => item.id_variant !== cartItemId));
      Toast.show({ type: 'success', text1: 'Thành công', text2: 'Sản phẩm đã được xóa khỏi giỏ hàng.' });
      setCart(prev => ({
        ...prev,
        cartItem: prev.cartItem.filter(item => item.id_variant !== cartItemId)
      }));
      // Sau đó mới gọi API xóa thật và đồng bộ lại dữ liệu
      try {
        const response = await fetch(`${API_ENDPOINTS.CART.DELETE_CART_ITEM(currentItem._id)}`, {
          method: 'DELETE',
          headers: {
            ...API_HEADERS,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId: idUser,
            cartItemId: currentItem._id,
            cartId: cart._id
          }),
        });

        let responseData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          throw new Error('Server returned non-JSON response');
        }

        if (!response.ok) {
          throw new Error(responseData.message || `Failed to remove item: ${response.status}`);
        }

        
        // Đồng bộ lại dữ liệu sau một chút (nếu muốn)
        setTimeout(() => { getCart(); }, 400);
      } catch (error) {
        console.error('Error removing item:', error);
        Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Có lỗi khi xóa sản phẩm khỏi giỏ hàng' });
        // Nếu lỗi, có thể reload lại cart
        setTimeout(() => { getCart(); }, 100);
      }
    });
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleCheckout = () => {
    const selectedProducts = cartItem.filter(item => selectedItems[item.id_variant]);
    
    if (selectedProducts.length === 0) {
      Toast.show({ type: 'info', text1: 'Thông báo', text2: 'Vui lòng chọn ít nhất một sản phẩm để thanh toán.' });
      return;
    }
    
    navigation.navigate('Checkout', { cartItems: selectedProducts, cartId: cart._id });
  };

  const handleSelectAll = () => {
    const newValue = !selectAll;
    setSelectAll(newValue);
    const newSelected = {};
    if (cartItem && cartItem.length > 0) {
      cartItem.forEach(item => {
        newSelected[item.id_variant] = newValue;
      });
    }
    setSelectedItems(newSelected);
  };

  const renderDivider = () => (
    <View style={styles.divider} />
  );
  // Function to render a product item
  const renderProductItem = (product) => {
    const productImageSource = (
      product.image && 
      (product.image.startsWith('http://') || 
       product.image.startsWith('https://') || 
       product.image.startsWith('data:image'))
    )
      ? { uri: product.image }
      : require('../assets/errorimg.webp');

    return (
      <Animated.View style={[styles.productContainer, { transform: [{ translateX: animatedValues[product.id_variant] || new Animated.Value(0) }] }]}>
        <Checkbox
          status={selectedItems[product.id_variant] ? 'checked' : 'unchecked'}
          onPress={() => toggleItemSelection(product.id_variant)}
          color="#000"
          uncheckedColor="#E0E0E0"
          style={[styles.checkbox, styles.customCheckbox]}
        />
        <Image 
          source={productImageSource} 
          style={styles.productImage}
          onError={(e) => {
            console.error('Product image loading error:', e.nativeEvent.error);
            e.target.setNativeProps({
              source: require('../assets/LogoGG.png')
            });
          }}
        />
        <View style={styles.productDetails}>
          <Text style={styles.productName}>{product.name_product}</Text>
          <View style={styles.productInfo}>
            <Text style={styles.productColorLabel}>{"Color:"}  {product.color}</Text>
            <Text style={styles.productSizeLabel}>{"Size:"}</Text>
            <Text style={styles.productSize}>{product.size}</Text>
          </View>
          <View style={styles.productPriceContainer}>
            <Text style={styles.discountedPrice}>{product.price?.toLocaleString('vi-VN')}đ</Text>
          </View>
          <View style={styles.quantityContainer}>
            <TouchableOpacity onPress={() => handleQuantityChange('minus', product.id_variant)}>
              <Image source={require('../assets/minus.png')} style={styles.quantityIcon} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{product.quantity}</Text>
            <TouchableOpacity onPress={() => handleQuantityChange('plus', product.id_variant)}>
              <Image source={require('../assets/plus.png')} style={styles.quantityIcon} />
            </TouchableOpacity>
          </View>
        </View>
        {/* Delete Button */}
        <TouchableOpacity 
          onPress={() => handleRemoveItem(product.id_variant)} 
          style={styles.deleteButton}
        >
          <Image source={require('../assets/x.png')} style={styles.deleteIcon} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  return (
    !cartItem ? (
      <View style={{flex:1, backgroundColor:"#FFFFFF", alignItems:"center", justifyContent:"center", flexDirection:"column", color:"black"}}>
        <ActivityIndicator size={"large"} color={'black'}/>
        <Text>Đang tải dữ liệu...</Text>
      </View>
    ) : (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image 
              source={require('../assets/back.png')} 
              style={styles.headerIcon} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{"Cart"}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
            <Image 
              source={require('../assets/search.png')} 
              style={styles.headerIcon}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.cartTextContainer}>
          <Text style={styles.cartText}>
            {"You have"} {cartItem.length} {"products in your Cart"}
          </Text>
        </View>
        {cartItem.length >= 2 && (
          <View style={{flexDirection: 'row', alignItems: 'center', marginLeft: 16, marginBottom: 4}}>
            <Checkbox
              status={selectAll ? 'checked' : 'unchecked'}
              onPress={handleSelectAll}
              color="#000"
              uncheckedColor="#E0E0E0"
              style={[styles.checkbox, styles.customCheckbox]}
            />
            <Text style={{color: '#222', fontSize: 14}}>Chọn tất cả</Text>
          </View>
        )}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
          {cartItem.map(product => (
            <View key={product.id_variant}>
              {renderProductItem(product)}
            </View>
          ))}
          {renderDivider()}
        </ScrollView>
        <View style={styles.fixedCheckoutContainer}>
          <View style={styles.summaryContainer}>
            <SummaryItem label="Total Price" value={`${totalPrice?.toLocaleString('vi-VN')}đ`} />
            <SummaryItem label="Discount" value={`-${discount?.toLocaleString('vi-VN')}đ`} />
            <SummaryItem label="Delivery" value={shippingFee === 0 ? "Free" : `${shippingFee?.toLocaleString('vi-VN')}đ`} />
          </View>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>{"Total:"}</Text>
            <Text style={styles.totalValue}>{`${finalTotal?.toLocaleString('vi-VN')}đ`}</Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.checkoutButton,
              Object.values(selectedItems).every(value => !value) && styles.checkoutButtonDisabled
            ]} 
            onPress={handleCheckout}
            disabled={Object.values(selectedItems).every(value => !value)}
          >
            <Image 
              source={require('../assets/checkout.png')} 
              style={styles.checkoutIcon} 
            />
            <Text style={styles.checkoutText}>{"Checkout"}</Text>
          </TouchableOpacity>
        </View>
        <Toast />
      </SafeAreaView>
    )   
  );
};
// Summary item component
const SummaryItem = ({ label, value }) => (
  <View style={styles.summaryItem}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);
// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 180, // Add padding to account for fixed bottom section
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E4E5',
  },
  headerIcon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  cartTextContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  cartText: {
    color: "#000000",
    fontSize: 16,
  },
  divider: {
    height: 2,
    backgroundColor: "#F2F3F4",
    marginBottom: 16,
  },
  productContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F8F9",
    paddingVertical: 8,
    paddingHorizontal: 24,
    marginBottom: 16,
    position: 'relative',
  },
  productImage: {
    width: 98,
    height: 127,
    marginRight: 16,
  },
  productDetails: {
    flex: 1,
    alignItems: "flex-start",
  },
  productName: {
    color: "#202325",
    fontSize: 16,
    marginRight: 36,
    flex: 1,
    fontWeight: 'bold',
  },
  productInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    color: '#444',
  },
  productColorLabel: {
    color: "#444",
    fontSize: 14,
    marginRight: 16,
  },
  productSizeLabel: {
    color: "#444",
    fontSize: 14,
    marginRight: 5,
  },
  productSize: {
    color: "#444",
    fontSize: 14,
  },
  productPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  discountedPrice: {
    color: "#D3180C",
    fontSize: 16,
    fontWeight: "bold",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#E3E4E5",
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    marginTop: 13,
  },
  quantityIcon: {
    borderRadius: 8,
    width: 15,
    height: 15,
    marginHorizontal: 16,
  },
  quantityText: {
    color: "#090A0A",
    fontSize: 14,
    fontWeight: "bold",
  },
  fixedCheckoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E3E4E5',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  summaryContainer: {
    marginBottom: 8,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  summaryLabel: {
    color: "#979C9E",
    fontSize: 14,
    marginRight: 4,
    flex: 1,
  },
  summaryValue: {
    color: "#979C9E",
    fontSize: 14,
    textAlign: "right",
    flex: 1,
  },
  totalContainer: {
    backgroundColor: "#F2F3F4",
    paddingVertical: 6,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: "#090A0A",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  totalValue: {
    color: "#090A0A",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  checkoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#090A0A",
    borderRadius: 8,
    paddingVertical: 10,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  checkoutIcon: {
    borderRadius: 8,
    width: 18,
    height: 18,
    marginRight: 8,
  },
  checkoutText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  deleteButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    width: 18,
    height: 18,
    tintColor: '#000',
  },
  checkbox: {
    marginRight: 8,
  },
  customCheckbox: {
    // Add any custom styles for the checkbox here
  },
});
export default CartScreen;