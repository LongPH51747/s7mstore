import React, { useEffect, useState, useCallback } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Checkbox } from 'react-native-paper';

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
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT, API_BASE_URL } from '../config/api'; // Import API config

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
          Alert.alert('Lỗi', 'Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.');
          navigation.replace('Login');
        }
      } else {
        console.log('No userInfo found in AsyncStorage on focus.');
        Alert.alert('Lỗi', 'Chưa đăng nhập. Vui lòng đăng nhập để xem giỏ hàng.');
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin người dùng từ AsyncStorage on focus:', error);
      Alert.alert('Lỗi', 'Không thể lấy thông tin người dùng. Vui lòng thử lại.');
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
      console.log('=== CART SCREEN: Fetching cart for userId ===', idUser);
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

      console.log('=== CART SCREEN: Raw cart data received ===');
      console.log('Full cart response:', JSON.stringify(data, null, 2));
      
      if (data && data.cartItem && Array.isArray(data.cartItem)) {
        console.log('=== CART SCREEN: Cart items details ===');
        data.cartItem.forEach((item, index) => {
          console.log(`Item ${index + 1}:`, {
            id_variant: item.id_variant,
            name_product: item.name_product,
            color: item.color,
            size: item.size,
            quantity: item.quantity,
            unit_price_item: item.unit_price_item,
            price: item.price,
            stock: item.stock,
            variant_quantity: item.variant_quantity,
            inventory: item.inventory,
            image: item.image ? 'Has image' : 'No image',
            _id: item._id,
            allFields: Object.keys(item),
            calculatedStock: item.variant_quantity || item.stock || item.quantity || item.inventory || 0
          });
        });
        
        setCart(data);
        setCartItem(data.cartItem);
      } else {
        console.log('=== CART SCREEN: Invalid cart data format ===', data);
        setCart({ cartItem: [] });
        setCartItem([]);
      }
    } catch (error) {
      console.error('=== CART SCREEN: Error fetching cart ===', error);
      Alert.alert('Lỗi', 'Không thể tải giỏ hàng. Vui lòng thử lại sau.');
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
      cartItem.forEach(item => {
        initialSelected[item.id_variant] = true;
      });
      setSelectedItems(initialSelected);
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

  const handleQuantityChange = async (type, itemId) => {
    console.log('=== CART SCREEN: handleQuantityChange called ===');
    console.log('Type:', type, 'ItemId:', itemId);
    
    const currentItem = cartItem.find(item => item.id_variant === itemId);
    if (!currentItem) {
      console.log('=== CART SCREEN: Item not found in cart ===', itemId);
      return;
    }

    console.log('=== CART SCREEN: Current item details ===', {
      id_variant: currentItem.id_variant,
      name_product: currentItem.name_product,
      current_quantity: currentItem.quantity,
      stock: currentItem.stock,
      variant_quantity: currentItem.variant_quantity
    });

    // Check if item is out of stock
    const stockQuantity = currentItem.variant_stock || currentItem.variant_quantity || currentItem.stock || currentItem.quantity || currentItem.inventory || 0;
    console.log('=== CART SCREEN: Stock validation ===', {
      stockQuantity,
      isOutOfStock: stockQuantity <= 0
    });
    
    if (stockQuantity <= 0) {
      console.log('=== CART SCREEN: Item is out of stock ===');
      Alert.alert('Thông báo', 'Sản phẩm này đã hết hàng trong kho.');
      return;
    }

    let newQuantity = currentItem.quantity;
    if (type === 'plus') {
      // Kiểm tra số lượng tồn kho trước khi tăng
      if (newQuantity >= stockQuantity) {
        console.log('=== CART SCREEN: Cannot increase quantity - at stock limit ===', {
          currentQuantity: newQuantity,
          stockLimit: stockQuantity
        });
        Alert.alert('Thông báo', `Chỉ còn ${stockQuantity} sản phẩm trong kho. Không thể tăng thêm số lượng.`);
        return;
      }
      newQuantity++;
      console.log('=== CART SCREEN: Increasing quantity ===', {
        from: currentItem.quantity,
        to: newQuantity
      });
    } else if (type === 'minus' && newQuantity > 1) {
      newQuantity--;
      console.log('=== CART SCREEN: Decreasing quantity ===', {
        from: currentItem.quantity,
        to: newQuantity
      });
    } else if (type === 'minus' && newQuantity <= 1) {
      console.log('=== CART SCREEN: Cannot decrease quantity - at minimum ===');
      Alert.alert('Thông báo', 'Số lượng tối thiểu là 1. Nếu muốn xóa sản phẩm, vui lòng sử dụng nút X.');
      return;
    } else return;

    try {
      console.log('=== CART SCREEN: Updating quantity with data ===', {
        itemId,
        newQuantity,
        userId: idUser,
        currentItem: {
          _id: currentItem._id,
          name_product: currentItem.name_product,
          stockQuantity
        }
      });

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

      // Log the raw response for debugging
      const responseText = await response.text();
      console.log('=== CART SCREEN: Raw response from quantity update ===', responseText);

      if (response.status === 404) {
        throw new Error('Endpoint not found. Please check the API configuration.');
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('=== CART SCREEN: Parsed response data ===', responseData);
      } catch (e) {
        console.log('=== CART SCREEN: Response is not JSON, but operation might have succeeded ===');
        // If we get here, the operation might have succeeded but returned non-JSON
        // We'll proceed with refreshing the cart
        getCart();
        return;
      }

      if (!response.ok) {
        throw new Error(responseData.message || `Failed to update quantity: ${response.status}`);
      }

      console.log('=== CART SCREEN: Quantity updated successfully ===', responseData);
      getCart(); // Re-fetch cart to update UI

    } catch (error) {
      console.error('=== CART SCREEN: Error updating quantity ===', error);
      Alert.alert(
        'Lỗi',
        error.message || 'Không thể cập nhật số lượng. Vui lòng thử lại sau.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRemoveItem = async (cartItemId) => {
    const currentItem = cartItem.find(item => item.id_variant === cartItemId);
    if (!currentItem) {
      console.log('Item not found in cart:', cartItemId);
      return;
    }

    try {
      console.log('Removing item with data:', {
        cartItemId,
        userId: idUser,
        cartId: cart._id,
        currentItem
      });

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

      console.log('Item removed successfully:', responseData);
      Alert.alert(
        'Thành công',
        'Sản phẩm đã được xóa khỏi giỏ hàng.',
        [{ text: 'OK' }]
      );
      getCart(); // Re-fetch cart to update UI

    } catch (error) {
      console.error('Error removing item:', error);
      Alert.alert(
        'Lỗi',
        'Không thể xóa sản phẩm. Vui lòng thử lại sau.',
        [{ text: 'OK' }]
      );
    }
  };

  const toggleItemSelection = (itemId) => {
    const item = cartItem.find(item => item.id_variant === itemId);
    if (item) {
      const stockQuantity = item.variant_stock || item.variant_quantity || item.stock || item.quantity || item.inventory || 0;
      if (stockQuantity <= 0) {
        Alert.alert('Thông báo', 'Không thể chọn sản phẩm đã hết hàng.');
        return;
      }
    }
    
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleCheckout = () => {
    const selectedProducts = cartItem.filter(item => selectedItems[item.id_variant]);
    
    if (selectedProducts.length === 0) {
      Alert.alert(
        'Thông báo',
        'Vui lòng chọn ít nhất một sản phẩm để thanh toán.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check stock availability for all selected items
    const outOfStockItems = selectedProducts.filter(item => {
      const stockQuantity = item.variant_stock || item.variant_quantity || item.stock || item.quantity || item.inventory || 0;
      return stockQuantity <= 0;
    });

    const lowStockItems = selectedProducts.filter(item => {
      const stockQuantity = item.variant_stock || item.variant_quantity || item.stock || item.quantity || item.inventory || 0;
      return stockQuantity > 0 && item.quantity > stockQuantity;
    });

    if (outOfStockItems.length > 0) {
      Alert.alert(
        'Sản phẩm hết hàng',
        'Một số sản phẩm trong giỏ hàng đã hết hàng. Vui lòng xóa chúng trước khi thanh toán.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (lowStockItems.length > 0) {
      const lowStockMessage = lowStockItems.map(item => 
        `${item.name_product} (${item.color} - ${item.size}): Chỉ còn ${item.variant_quantity || item.stock || item.quantity || item.inventory} sản phẩm`
      ).join('\n');

      Alert.alert(
        'Cảnh báo tồn kho',
        `Một số sản phẩm có số lượng vượt quá tồn kho:\n\n${lowStockMessage}\n\nVui lòng điều chỉnh số lượng trước khi thanh toán.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    navigation.navigate('Checkout', { cartItems: selectedProducts, cartId: cart._id });
  };

  const renderDivider = () => (
    <View style={styles.divider} />
  );
  // Function to render a product item
  const renderProductItem = (product) => {
    // console.log('Rendering product item:', product);
    // Update image source logic to properly handle variant images
    const productImageSource = (
      product.image && product.image.startsWith('/uploads_product/')
    )
      ? { uri: `${API_BASE_URL}${product.image}` }
      : (product.image && (product.image.startsWith('http://') || product.image.startsWith('https://') || product.image.startsWith('data:image')))
        ? { uri: product.image }
        : require('../assets/erorrimg.png');
    console.log('CartScreen - product.image:', product.image);
    console.log('CartScreen - productImageSource:', productImageSource);

    // Check stock status
    const stockQuantity = product.variant_stock || product.variant_quantity || product.stock || product.quantity || product.inventory || 0;
    const isOutOfStock = stockQuantity <= 0;
    const isQuantityAtMax = product.quantity >= stockQuantity;

    console.log('=== CART SCREEN: Rendering product item ===', {
      id_variant: product.id_variant,
      name_product: product.name_product,
      quantity: product.quantity,
      stockQuantity,
      isOutOfStock,
      isQuantityAtMax,
      color: product.color,
      size: product.size,
      price: product.price,
      unit_price_item: product.unit_price_item,
      stockFieldValues: {
        variant_quantity: product.variant_quantity,
        stock: product.stock,
        quantity: product.quantity,
        inventory: product.inventory
      }
    });

    return (
      <View style={styles.productContainer}>
        <Checkbox
          status={selectedItems[product.id_variant] ? 'checked' : 'unchecked'}
          onPress={() => toggleItemSelection(product.id_variant)}
          style={styles.checkbox}
          disabled={isOutOfStock}
        />
        <Image 
          key={product.image}
          source={productImageSource} 
          style={styles.productImage}
          onError={(e) => {
            console.error('Product image loading error in CartScreen:', e.nativeEvent.error, 'for product:', product.name_product);
            e.target.setNativeProps({
              source: require('../assets/erorrimg.png')
            });
          }}
        />
        <View style={styles.productDetails}>
          <Text style={styles.productName}>{product.name_product}</Text>
          <View style={styles.productInfo}>
            {product.color && (
              <Text style={styles.productColorLabel}>{"Màu:"} {product.color}</Text>
            )}
            {product.size && (
              <>
                <Text style={styles.productSizeLabel}>{"Size:"}</Text>
                <Text style={styles.productSize}>{product.size}</Text>
              </>
            )}
          </View>
          
          {/* Stock status display */}
          <View style={styles.stockStatusContainer}>
            <Text style={[
              styles.stockStatusText,
              isOutOfStock ? styles.outOfStockText : styles.inStockText
            ]}>
              {isOutOfStock ? 'Hết hàng' : `Còn ${stockQuantity} sản phẩm trong kho`}
            </Text>
          </View>
          
          <View style={styles.productPriceContainer}>
            <Text style={styles.discountedPrice}>{product.price?.toLocaleString('vi-VN')}đ</Text>
          </View>
          <View style={styles.quantityContainer}>
            <TouchableOpacity 
              onPress={() => handleQuantityChange('minus', product.id_variant)}
              disabled={isOutOfStock || product.quantity <= 1}
              style={[
                styles.quantityButton,
                (isOutOfStock || product.quantity <= 1) && styles.quantityButtonDisabled
              ]}
            >
              <Image 
                source={require('../assets/minus.png')} 
                style={[
                  styles.quantityIcon,
                  (isOutOfStock || product.quantity <= 1) && styles.quantityIconDisabled
                ]} 
              />
            </TouchableOpacity>
            <Text style={[
              styles.quantityText,
              isOutOfStock && styles.quantityTextDisabled
            ]}>{product.quantity}</Text>
            <TouchableOpacity 
              onPress={() => handleQuantityChange('plus', product.id_variant)}
              disabled={isOutOfStock || isQuantityAtMax}
              style={[
                styles.quantityButton,
                (isOutOfStock || isQuantityAtMax) && styles.quantityButtonDisabled
              ]}
            >
              <Image 
                source={require('../assets/plus.png')} 
                style={[
                  styles.quantityIcon,
                  (isOutOfStock || isQuantityAtMax) && styles.quantityIconDisabled
                ]} 
              />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => handleRemoveItem(product.id_variant)} 
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonText}>X</Text>
        </TouchableOpacity>
      </View>
    );
  };

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
              source={{ uri: "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/3d932128-0328-4607-bacf-7a9ced0de013" }} 
              style={styles.headerIcon} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{"Cart"}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
            <Image 
              source={{ uri: "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/c5d652d4-87eb-4bb4-8eaf-62b26c7c040b" }} 
              style={styles.headerIcon}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.cartTextContainer}>
          <Text style={styles.cartText}>
            {"You have"} {cartItem.length} {"products in your Cart"}
          </Text>
        </View>
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
    fontSize: 14,
    marginRight: 36,
    flex: 1,
  },
  productInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  productColorLabel: {
    color: "#000000",
    fontSize: 14,
    marginRight: 16,
  },
  productSizeLabel: {
    color: "#000000",
    fontSize: 14,
    marginRight: 20,
  },
  productSize: {
    color: "#000000",
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
    backgroundColor: '#FF0000',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  checkbox: {
    marginRight: 8,
  },
  stockStatusContainer: {
    marginBottom: 5,
  },
  stockStatusText: {
    color: "#000000",
    fontSize: 14,
  },
  outOfStockText: {
    color: "#FF0000",
  },
  inStockText: {
    color: "#00FF00",
  },
  quantityButton: {
    borderRadius: 8,
    width: 15,
    height: 15,
    marginHorizontal: 16,
  },
  quantityButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  quantityIconDisabled: {
    opacity: 0.5,
  },
  quantityTextDisabled: {
    opacity: 0.5,
  },
});
export default CartScreen;