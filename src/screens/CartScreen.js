import React, { useEffect, useState, useCallback, useRef } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Checkbox } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { Animated, LayoutAnimation, Platform, UIManager, Modal, Alert } from 'react-native';
import Loading from '../components/Loading';
import Icon from 'react-native-vector-icons/Ionicons';

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
import CustomAlertConfirmDelete from "../components/CustomAlertDelete";

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
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [cartItemToDelete, setCartItemToDelete] = useState(null);

  const confirmRemoveItem = (cartItemId) => {
  setCartItemToDelete(cartItemId);
  setShowDeleteAlert(true);
};

const handleConfirmDelete = () => {
  if (cartItemToDelete) {
    handleRemoveItem(cartItemToDelete);
    setCartItemToDelete(null);
    setShowDeleteAlert(false);
  }
};

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

    console.log('CartScreen: Fetching fresh cart data for user:', idUser);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(`${API_ENDPOINTS.CART.GET_BY_USER_ID}/${idUser}`, {
        headers: API_HEADERS,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

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
        console.log('CartScreen: Received cart data with', data.cartItem.length, 'items');
        setCart(data);
        setCartItem(data.cartItem);
        
        // Reset selected items if cart is empty
        if (data.cartItem.length === 0) {
          setSelectedItems({});
          setSelectAll(false);
        }
      } else {
        console.log('CartScreen: No cart items found or invalid data format');
        setCart({ cartItem: [] });
        setCartItem([]);
        setSelectedItems({});
        setSelectAll(false);
      }
    } catch (error) {
      console.error('CartScreen: Error fetching cart:', error);
      if (error.name === 'AbortError') {
        Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Thời gian tải giỏ hàng đã hết. Vui lòng thử lại.' });
      } else {
        Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Không thể tải giỏ hàng. Vui lòng thử lại sau.' });
      }
      setCart({ cartItem: [] });
      setCartItem([]);
      setSelectedItems({});
      setSelectAll(false);
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      // Gửi request xóa lên server TRƯỚC
      const response = await fetch(`${API_ENDPOINTS.CART.DELETE_CART_ITEM(currentItem._id)}`, {
        method: 'DELETE',
        headers: API_HEADERS,
        body: JSON.stringify({ userId: idUser }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

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
      if (error.name === 'AbortError') {
        Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Thời gian xóa sản phẩm đã hết. Vui lòng thử lại.' });
      } else {
        Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Có lỗi khi xóa sản phẩm khỏi giỏ hàng.' });
      }
      
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
            console.log("Id cart trước khi chuyển sang CheckoutScreen: ", cart._id);
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
        <View style={styles.productRow}>
          <Checkbox
            status={selectedItems[product.id_variant] ? 'checked' : 'unchecked'}
            onPress={() => toggleItemSelection(product.id_variant)}
            style={styles.checkbox}
            color="#6366F1"
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
            <View style={styles.productSpecs}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>🎨 Màu:</Text>
                <Text style={styles.specValue}>{product.color}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>📏 Kích thước:</Text>
                <Text style={styles.specValue}>{product.size}</Text>
              </View>
            </View>
            <View style={styles.productPriceContainer}>
              <Text style={styles.discountedPrice}>{product.price?.toLocaleString('vi-VN')}đ</Text>
            </View>
          </View>
          
          <View style={styles.productControls}>
            <TouchableOpacity 
              onPress={() => confirmRemoveItem(product.id_variant)} 
              style={[
                styles.deleteButton,
                isDeletingItems[product.id_variant] && styles.deleteButtonDisabled
              ]}
              disabled={isDeletingItems[product.id_variant]}
            >
              {isDeletingItems[product.id_variant] ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
               <Icon name="trash-outline" size={16} color="#EF4444" />
              )}
            </TouchableOpacity>
            
            <View style={styles.quantityContainer}>
              <TouchableOpacity 
                onPress={() => handleQuantityChange('minus', product.id_variant)}
                style={styles.quantityButton}
              >
                <Icon name="remove" size={16} color="#6366F1" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{localQuantities[product.id_variant] || product.quantity}</Text>
              <TouchableOpacity 
                onPress={() => handleQuantityChange('plus', product.id_variant)}
                disabled={(() => {
                  const maxStock = variantStocks[product.id_variant] ?? 99;
                  return (localQuantities[product.id_variant] || product.quantity) >= maxStock;
                })()}
                style={[styles.quantityButton, (() => {
                  const maxStock = variantStocks[product.id_variant] ?? 99;
                  return (localQuantities[product.id_variant] || product.quantity) >= maxStock;
                })() && styles.quantityButtonDisabled]}
              >
                <Icon name="add" size={16} color="#6366F1" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
      
      // Check if an order was created recently
      const checkOrderCreated = async () => {
        try {
          const orderCreatedFlag = await AsyncStorage.getItem('orderCreated');
          if (orderCreatedFlag === 'true') {
            console.log('CartScreen: Order created flag found, refreshing cart data');
            // Clear the flag
            await AsyncStorage.removeItem('orderCreated');
            // Refresh cart data to get updated information
            if (idUser && isActive) {
              await getCart();
            }
          }
          
          // Check if returning from payment success
          const returningFromPaymentSuccess = await AsyncStorage.getItem('returningFromPaymentSuccess');
          if (returningFromPaymentSuccess === 'true') {
            console.log('CartScreen: Returning from payment success, refreshing cart data');
            // Clear the flag
            await AsyncStorage.removeItem('returningFromPaymentSuccess');
            // Refresh cart data to get updated information
            if (idUser && isActive) {
              await getCart();
            }
          }
        } catch (error) {
          console.error('Error checking order created flag:', error);
        }
      };
      
      checkOrderCreated();
      
      // Refresh cart data when screen is focused
      if (idUser && isActive) {
        getCart();
      }
      
      return () => { 
        isActive = false; 
      }; // clean-up
    }, [idUser, getCart])
  );

  // Thêm hàm xác nhận xóa
  // const confirmRemoveItem = (cartItemId) => {
  //   Alert.alert(
  //     'Xác nhận',
  //     'Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?',
  //     [
  //       {
  //         text: 'Hủy',
  //         style: 'cancel',
  //       },
  //       {
  //         text: 'Xóa',
  //         style: 'destructive',
  //         onPress: () => handleRemoveItem(cartItemId),
  //       },
  //     ],
  //     { cancelable: true }
  //   );
  // };

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

      <CustomAlertConfirmDelete
  visible={showDeleteAlert}
  title="Xác nhận xóa"
  message="Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?"
  onCancel={() => setShowDeleteAlert(false)}
  onConfirm={handleConfirmDelete}
/>
      <Loading visible={!cartItem} text="Đang tải dữ liệu giỏ hàng..." />
      {showLoginModal ? null : (
        !cartItem ? (
          <View style={{flex:1, backgroundColor:"#FFFFFF", alignItems:"center", justifyContent:"center", flexDirection:"column", color:"black"}}>
            <ActivityIndicator size={"large"} color={'black'}/>
            <Text>Đang tải dữ liệu...</Text>
          </View>
        ) : (
          <SafeAreaView style={styles.container}>
            {/* Modern Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                <Icon name="arrow-back" size={24} color="#1E293B" />
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>🛒 Giỏ hàng</Text>
                <Text style={styles.headerSubtitle}>{cartItem.length} sản phẩm</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('UserReviewScreen')} style={styles.headerButton}>
                <Icon name="search-outline" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            {/* Select All Section */}
            {cartItem.length >= 2 && (
              <View style={styles.selectAllContainer}>
                <Checkbox
                  status={selectAll ? 'checked' : 'unchecked'}
                  onPress={handleSelectAll}
                  color="#6366F1"
                />
                <Text style={styles.selectAllText}>Chọn tất cả sản phẩm</Text>
              </View>
            )}

            {/* Products List */}
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
              {cartItem.map(product => (
                <View key={product.id_variant}>
                  {renderProductItem(product)}
                </View>
              ))}
            </ScrollView>

            {/* Modern Checkout Section */}
            <View style={styles.fixedCheckoutContainer}>
              <View style={styles.summaryContainer}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryTitle}>📋 Tóm tắt đơn hàng</Text>
                </View>
                <SummaryItem label="Tổng tiền hàng" value={`${totalPrice?.toLocaleString('vi-VN')}đ`} />
                <SummaryItem label="Giảm giá" value={`-${discount?.toLocaleString('vi-VN')}đ`} isDiscount={true} />
              </View>
              
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
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
                <Icon name="card-outline" size={20} color="#FFFFFF" />
                <Text style={styles.checkoutText}>Thanh toán ngay</Text>
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
const SummaryItem = ({ label, value, isDiscount = false }) => (
  <View style={styles.summaryItem}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, isDiscount && styles.discountValue]}>{value}</Text>
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
    paddingBottom: 80, // Add padding to account for fixed bottom section
    paddingTop: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  productContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  productImage: {
    width: 60,
    height: 75,
    marginRight: 8,
    borderRadius: 8,
  },
  productDetails: {
    flex: 1,
    justifyContent: "space-between",
    marginRight: 8,
  },
  productName: {
    color: "#1E293B",
    fontSize: 16,
    fontFamily: 'Nunito-Black',
    marginBottom: 4,
    lineHeight: 20,
  },
  productSpecs: {
    marginBottom: 4,
  },
  specItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  specLabel: {
    color: "#64748B",
    fontSize: 12,
    fontFamily: 'Nunito-Medium',
    marginRight: 4,
    minWidth: 60,
  },
  specValue: {
    color: "#1E293B",
    fontSize: 12,
    fontFamily: 'Nunito-Medium',
    fontWeight: '600',
  },
  productPriceContainer: {
    marginBottom: 4,
  },
  discountedPrice: {
    color: "#DB6A34",
    fontSize: 16,
    fontFamily: 'Nunito-Black',
    fontWeight: '700',
  },
  productControls: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 75,
    position: 'relative',
  },
  quantityContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  quantityButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 2,
  },
  quantityButtonDisabled: {
    backgroundColor: "#E2E8F0",
    opacity: 0.5,
  },
  quantityText: {
    color: "#1E293B",
    fontSize: 11,
    fontWeight: "700",
    minWidth: 16,
    textAlign: 'center',
  },
  fixedCheckoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  summaryContainer: {
    marginBottom: 6,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
    paddingVertical: 1,
  },
  summaryLabel: {
    color: "#64748B",
    fontSize: 14,
    fontFamily: 'Nunito-Medium',
    flex: 1,
  },
  summaryValue: {
    color: "#1E293B",
    fontSize: 14,
    fontFamily: 'Nunito-Medium',
    fontWeight: '600',
    textAlign: "right",
    flex: 1,
  },
  totalContainer: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  totalLabel: {
    color: "#1E293B",
    fontSize: 16,
    fontFamily: 'Nunito-Black',
    fontWeight: "700",
  },
  totalValue: {
    color: "#1E293B",
    fontSize: 18,
    fontFamily: 'Nunito-Black',
    fontWeight: "700",
  },
  checkoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6366F1",
    borderRadius: 8,
    paddingVertical: 6,
    shadowColor: "#6366F1",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  checkoutText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: 'Nunito-Black',
    fontWeight: "700",
    marginLeft: 4,
  },
  deleteButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  checkbox: {
    marginRight: 0,
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 8,
  },
  selectAllText: {
    color: '#444',
    fontSize: 12,
    marginLeft: 4,
    fontFamily: 'Nunito-Medium',
  },
  headerButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Black',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  summaryHeader: {
    marginBottom: 3,
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: 'Nunito-Black',
    color: '#1E293B',
    marginBottom: 3,
  },
  discountValue: {
    color: '#DB6A34',
    fontFamily: 'Nunito-Black',
  },
});

export default CartScreen;
