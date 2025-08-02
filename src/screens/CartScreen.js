import React, { useEffect, useState, useCallback, useRef } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Checkbox } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { Animated, LayoutAnimation, Platform, UIManager, Modal, Alert } from 'react-native';
import Loading from '../components/Loading';

import { 
  SafeAreaView, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Text, 
  StyleSheet, 
  ActivityIndicator
} from "react-native";
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT, API_BASE_URL } from '../config/api'; // Import API config

// Main component
const CartScreen = (props) => {
  const navigation = useNavigation();
  const url = `${API_BASE_URL}/cart/getByUserId/`
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
  const [localQuantities, setLocalQuantities] = useState({});
  const debounceTimers = useRef({});
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [variantStocks, setVariantStocks] = useState({}); // Lưu tồn kho theo id_variant
  const [isDeletingItems, setIsDeletingItems] = useState({}); // Thêm state để track các item đang xóa

  // Function to get user info from AsyncStorage
  const getUserInfo = useCallback(async () => {
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString !== null) {
        const userInfo = JSON.parse(userInfoString);
        if (userInfo && userInfo._id) {
          setIdUser(userInfo._id);
        } else {
          setShowLoginModal(true);
        }
      } else {
        setShowLoginModal(true);
      }
    } catch (error) {
      setShowLoginModal(true);
    }
  }, []);

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
      return;
    }

    try {
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

      if (data && data.cartItem && Array.isArray(data.cartItem)) {
        setCart(data);
        setCartItem(data.cartItem);
      } else {
        setCart({ cartItem: [] });
        setCartItem([]);
      }
    } catch (error) {
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
      const initialQuantities = {};
      cartItem.forEach(item => {
        initialQuantities[item.id_variant] = item.quantity;
      });
      setLocalQuantities(initialQuantities);
    }
  }, [cartItem]);

  useEffect(() => {
    if (cartItem && cartItem.length > 0) {
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
      setTotalPrice(0);
      setDiscount(0);
      setShippingFee(0);
      setFinalTotal(0);
    }
  }, [cartItem, selectedItems]);

  // Hàm lấy tồn kho thực tế cho từng sản phẩm trong cart
  const fetchVariantStocks = useCallback(async () => {
    if (!cartItem || cartItem.length === 0) return;
    const stocks = {};
    for (const item of cartItem) {
      try {
        const res = await fetch(`${API_ENDPOINTS.PRODUCTS.GET_BY_ID_FULL(item.id_product)}`);
        const data = await res.json();
        if (res.ok && data && data.product_variant) {
          const variant = data.product_variant.find(v => v._id === item.id_variant);
          if (variant && typeof variant.variant_stock === 'number') {
            stocks[item.id_variant] = variant.variant_stock;
          }
        }
      } catch (e) {}
    }
    setVariantStocks(stocks);
  }, [cartItem]);

  useEffect(() => {
    fetchVariantStocks();
  }, [fetchVariantStocks]);

  const handleQuantityChange = (type, itemId) => {
    setLocalQuantities(prev => {
      const currentItem = cartItem.find(item => item.id_variant === itemId);
      if (!currentItem) return prev;
      // Lấy tồn kho thực tế từ variantStocks
      const maxStock = variantStocks[itemId] ?? 99;
      const currentQuantity = prev[itemId] || currentItem.quantity || 1;
      let newQuantity = currentQuantity;
      if (type === 'plus') {
        if (currentQuantity < maxStock) {
          newQuantity = currentQuantity + 1;
        } else {
          Toast.show({ type: 'info', text1: 'Thông báo', text2: `Chỉ còn ${maxStock} sản phẩm trong kho.` });
        }
      } else if (type === 'minus') {
        newQuantity = Math.max(currentQuantity - 1, 1);
      }
      return { ...prev, [itemId]: newQuantity };
    });
  };

  const handleRemoveItem = async (cartItemId) => {
    // Kiểm tra nếu đang xóa item này
    if (isDeletingItems[cartItemId]) {
      return;
    }

    const currentItem = cartItem.find(item => item.id_variant === cartItemId);
    if (!currentItem || !currentItem._id) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Không tìm thấy sản phẩm để xóa.' });
      return;
    }

    // Đánh dấu item đang được xóa
    setIsDeletingItems(prev => ({ ...prev, [cartItemId]: true }));

    try {
      // Gửi request xóa lên server TRƯỚC
      const response = await fetch(`${API_ENDPOINTS.CART.DELETE_CART_ITEM(currentItem._id)}`, {
        method: 'DELETE',
        headers: API_HEADERS,
        body: JSON.stringify({ userId: idUser }),
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = responseText;
      }

      if (!response.ok) {
        throw new Error(responseData.message || `Failed to remove item: ${response.status}`);
      }

      // Chỉ xóa khỏi UI SAU KHI server xác nhận thành công
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      
      // Xóa khỏi cartItem
      setCartItem(prev => prev.filter(item => item.id_variant !== cartItemId));
      
      // Xóa khỏi cart
      setCart(prev => ({
        ...prev,
        cartItem: prev.cartItem.filter(item => item.id_variant !== cartItemId)
      }));

      // Xóa khỏi selectedItems
      setSelectedItems(prev => {
        const newSelected = { ...prev };
        delete newSelected[cartItemId];
        return newSelected;
      });

      // Xóa khỏi localQuantities
      setLocalQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[cartItemId];
        return newQuantities;
      });

      // Xóa khỏi animatedValues
      setAnimatedValues(prev => {
        const newAnimated = { ...prev };
        delete newAnimated[cartItemId];
        return newAnimated;
      });

      // Xóa khỏi variantStocks
      setVariantStocks(prev => {
        const newStocks = { ...prev };
        delete newStocks[cartItemId];
        return newStocks;
      });

      Toast.show({ type: 'success', text1: 'Thành công', text2: 'Sản phẩm đã được xóa khỏi giỏ hàng.' });
      
      // Đồng bộ lại dữ liệu từ server để đảm bảo tính nhất quán
      await getCart();
      
    } catch (error) {
      console.error('Error removing item:', error);
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Có lỗi khi xóa sản phẩm khỏi giỏ hàng.' });
      
      // Đồng bộ lại dữ liệu từ server nếu có lỗi
      await getCart();
    } finally {
      // Luôn reset trạng thái xóa
      setIsDeletingItems(prev => {
        const newDeleting = { ...prev };
        delete newDeleting[cartItemId];
        return newDeleting;
      });
    }
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
    
            navigation.navigate('CheckoutScreen', { cartItems: selectedProducts, cartId: cart._id });
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
    let productImageSource;
    if (typeof product.image === 'string' && product.image.startsWith('/uploads_product/')) {
      productImageSource = { uri: `${API_BASE_URL}${product.image}` };
    } else if (
      typeof product.image === 'string' &&
      (product.image.startsWith('http://') || product.image.startsWith('https://') || product.image.startsWith('data:image'))
    ) {
      productImageSource = { uri: product.image };
    } else {
      productImageSource = require('../assets/errorimg.webp');
    }

    return (
      <Animated.View style={[styles.productContainer, { transform: [{ translateX: animatedValues[product.id_variant] || new Animated.Value(0) }] }]}>
        <Checkbox
          status={selectedItems[product.id_variant] ? 'checked' : 'unchecked'}
          onPress={() => toggleItemSelection(product.id_variant)}
          style={styles.checkbox}
        />
        <Image 
          source={productImageSource} 
          style={styles.productImage}
          onError={(e) => {
            e.target.setNativeProps({
              source: require('../assets/errorimg.webp')
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
            <Text style={styles.quantityText}>{localQuantities[product.id_variant] || product.quantity}</Text>
            <TouchableOpacity 
              onPress={() => handleQuantityChange('plus', product.id_variant)}
              disabled={(() => {
                const maxStock = variantStocks[product.id_variant] ?? 99;
                return (localQuantities[product.id_variant] || product.quantity) >= maxStock;
              })()}
            >
              <Image source={require('../assets/plus.png')} style={styles.quantityIcon} />
            </TouchableOpacity>
          </View>
        </View>
        {/* Delete Button */}
        <TouchableOpacity 
          onPress={() => confirmRemoveItem(product.id_variant)} 
          style={[
            styles.deleteButton,
            isDeletingItems[product.id_variant] && styles.deleteButtonDisabled
          ]}
          disabled={isDeletingItems[product.id_variant]}
        >
          {isDeletingItems[product.id_variant] ? (
            <ActivityIndicator size="small" color="#666" />
          ) : (
            <Image source={require('../assets/x.png')} style={styles.deleteIcon} />
          )}
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

  useEffect(() => {
    Object.entries(localQuantities).forEach(([itemId, quantity]) => {
      const currentItem = cartItem?.find(item => item.id_variant === itemId);
      if (!currentItem || currentItem.quantity === quantity) return;

      // Xóa timer cũ nếu có
      if (debounceTimers.current[itemId]) {
        clearTimeout(debounceTimers.current[itemId]);
      }

      // Tạo timer mới
      debounceTimers.current[itemId] = setTimeout(async () => {
        try {
          const response = await fetch(`${API_ENDPOINTS.CART.UPDATE_QUANTITY(currentItem._id)}`, {
            method: 'PATCH',
            headers: {
              ...API_HEADERS,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              quantity,
              userId: idUser
            }),
          });
          const responseText = await response.text();
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch (e) {}
          if (!response.ok) {
            throw new Error(responseData?.message || `Failed to update quantity: ${response.status}`);
          }
          getCart();
        } catch (error) {
          Toast.show({ type: 'error', text1: 'Lỗi', text2: error.message || 'Không thể cập nhật số lượng.' });
        }
      }, 500); // 500ms debounce
    });
    // Cleanup khi unmount
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, [localQuantities]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      const checkLogin = async () => {
        const token = await AsyncStorage.getItem('userToken');
        if (!token && isActive) {
          setShowLoginModal(true);
        }
      };
      checkLogin();
      return () => { isActive = false; }; // clean-up
    }, [])
  );

  // Thêm hàm xác nhận xóa
  const confirmRemoveItem = (cartItemId) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => handleRemoveItem(cartItemId),
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <>
      <Modal
        visible={showLoginModal}
        transparent
        animationType="fade"
      >
        <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.5)'}}>
          <View style={{backgroundColor:'#fff', padding:24, borderRadius:12, alignItems:'center'}}>
            <Text style={{fontSize:16, marginBottom:16}}>Bạn cần đăng nhập để sử dụng chức năng này!</Text>
            <TouchableOpacity
              style={{backgroundColor:'#1c2b38', padding:12, borderRadius:8}}
              onPress={() => {
                setShowLoginModal(false);
                navigation.navigate('LoginScreen');
              }}
            >
              <Text style={{color:'#fff', fontWeight:'bold'}}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Loading visible={!cartItem} text="Đang tải dữ liệu giỏ hàng..." />
      {showLoginModal ? null : (
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
              <TouchableOpacity onPress={() => navigation.navigate('UserReviewScreen')}>
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
                  source={{ uri: "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/e4f67212-d4f1-4513-bc97-88e16a24676d" }} 
                  style={styles.checkoutIcon} 
                />
                <Text style={styles.checkoutText}>{"Checkout"}</Text>
              </TouchableOpacity>
            </View>
            <Toast />
          </SafeAreaView>
        )
      )}
    </>
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
    backgroundColor: 'transparent',
  },
  deleteIcon: {
    width: 18,
    height: 18,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  checkbox: {
    marginRight: 8,
  },
});

export default CartScreen;
