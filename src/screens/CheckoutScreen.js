import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking, TextInput, Modal } from 'react-native';
import { RadioButton } from 'react-native-paper';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { API_ENDPOINTS, API_HEADERS, API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import VoucherScreen from './VoucherScreen'; // Đảm bảo đường dẫn này đúng


export default function CheckoutScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const [isVoucherModalVisible, setIsVoucherModalVisible] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [subTotalPrice, setSubTotalPrice] = useState(0);
  const [voucherAmount, setVoucherAmount] = useState(0);
  const [shippingFee, setShippingFee] = useState(20000); // Phí vận chuyển cố định
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [defaultAddress, setDefaultAddress] = useState(null);
  const [hasAddresses, setHasAddresses] = useState(false);
  const [userNote, setUserNote] = useState('');
  const [orderCreated, setOrderCreated] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState(null); // Thêm state cho voucher đã áp dụng


  // Function to notify other screens that order was created successfully
  const notifyOrderCreated = () => {
    AsyncStorage.setItem('orderCreated', 'true');
    setOrderCreated(true);
    console.log('Order created flag set in AsyncStorage');
  };

  useEffect(() => {
    if (route.params?.selectedAddress) {
      setSelectedAddress(route.params.selectedAddress);
    }
  }, [route.params?.selectedAddress]);

  useEffect(() => {
    const fetchDefaultAddress = async () => {
      try {
        const userInfoString = await AsyncStorage.getItem('userInfo');
        const userInfo = JSON.parse(userInfoString);
        
        if (!userInfo || !userInfo._id) {
          throw new Error('User information not found');
        }

        const response = await fetch(
          API_ENDPOINTS.ADDRESS.GET_BY_USER_ID(userInfo._id)
        );

        if (!response.ok) {
          throw new Error('Failed to fetch addresses');
        }

        const addresses = await response.json();
        setHasAddresses(addresses.length > 0);
        const defaultAddr = addresses.find(addr => addr.is_default);
        setDefaultAddress(defaultAddr);
        
        if (!selectedAddress && defaultAddr) {
          setSelectedAddress(defaultAddr);
        }
      } catch (error) {
        console.error('Error fetching default address:', error);
      }
    };

    fetchDefaultAddress();
  }, [selectedAddress]);

  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.cartItems) {
        setCartItems(route.params.cartItems);
      } else if (route.params?.product && route.params?.quantity) {
        const singleProduct = {
          ...route.params.product,
          quantity: route.params.quantity,
          unit_price_item: route.params.product.selectedVariant?.variant_price || route.params.product.product_price,
          color: route.params.product.selectedVariant?.variant_color || '',
          size: route.params.product.selectedVariant?.variant_size || '',
          image: route.params.product.selectedVariant?.variant_image_url || route.params.product.product_image,
          name_product: route.params.product.product_name,
        };
        setCartItems([singleProduct]);
      }
    }, [route.params])
  );

  useEffect(() => {
    let subTotal = 0;
    cartItems.forEach(item => {
      subTotal += (item.unit_price_item || item.price) * item.quantity;
    });
    setSubTotalPrice(subTotal);
  }, [cartItems]);

  useEffect(() => {
    // Tính toán lại tổng tiền khi subtotal, voucher hoặc phí ship thay đổi
    const newTotal = subTotalPrice - voucherAmount + shippingFee;
    setTotalAmount(newTotal > 0 ? newTotal : 0);
  }, [subTotalPrice, voucherAmount, shippingFee]);


  // HÀM MỚI: Xử lý khi người dùng chọn voucher từ VoucherScreen
  const handleVoucherSelect = async (voucher) => {
    setIsVoucherModalVisible(false);

    // Nếu người dùng chọn voucher
    if (voucher) {
      try {
        const userInfoString = await AsyncStorage.getItem('userInfo');
        const userInfo = JSON.parse(userInfoString);
        
        if (!userInfo || !userInfo._id) {
          throw new Error('User information not found');
        }

        // Gọi API apply voucher
        const response = await axios.post(
           API_ENDPOINTS.VOUCHER.APPLY_VOUCHER(userInfo._id),
          { 
            code: voucher.code, 
            subtotal: subTotalPrice 
          },
          { headers: { 'ngrok-skip-browser-warning': 'true' } }
        );

        if (response.status === 200) {
          const newTotal = response.data; // API trả về tổng tiền mới
          console.log("Giá tiền voucher giảm ",response.data)
          console.log("Giá tiền trước khi có voucher: ",subTotalPrice)
          const calculatedDiscount = subTotalPrice + shippingFee - newTotal;
          console.log("Giá tiền sau khi áp voucher: ",calculatedDiscount)
          setAppliedVoucher(voucher); // Lưu lại voucher đã áp dụng
          setVoucherAmount(newTotal); // Cập nhật số tiền giảm giá
          setTotalAmount(newTotal); // Cập nhật tổng tiền cuối cùng
          Alert.alert('Thành công', 'Voucher đã được áp dụng.');
        } else {
          Alert.alert('Lỗi', response.data || 'Không thể áp dụng voucher.');
          setAppliedVoucher(null);
          setVoucherAmount(0);
          setTotalAmount(subTotalPrice + shippingFee);
        }
      } catch (error) {
        console.error("Lỗi khi áp dụng voucher:", error);
        Alert.alert('Lỗi', 'Đã xảy ra lỗi trong quá trình áp dụng voucher.');
        setAppliedVoucher(null);
        setVoucherAmount(0);
        setTotalAmount(subTotalPrice + shippingFee);
      }
    } else {
      // Nếu người dùng đóng modal mà không chọn voucher
      setAppliedVoucher(null);
      setVoucherAmount(0);
      setTotalAmount(subTotalPrice + shippingFee);
    }
  };


  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Giỏ hàng trống', 'Vui lòng thêm sản phẩm vào giỏ hàng trước khi đặt.');
      return;
    }

    if (!selectedAddress) {
      Alert.alert('Thiếu địa chỉ', 'Vui lòng chọn địa chỉ giao hàng.');
      return;
    }

    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      const userInfo = JSON.parse(userInfoString);
      
      if (!userInfo || !userInfo._id) {
        throw new Error('User information not found');
      }

      // Format order items
      const orderItems = cartItems.map(item => ({
        id_product: item.id_product,
        id_variant: item.id_variant || '',
        quantity: item.quantity
      }));
      
      // Chuẩn bị dữ liệu cho order
      const orderData = {
        orderItems,
        id_address: selectedAddress._id,
        payment_method: paymentMethod,
        id_cart: route.params?.cartId || null,
        user_note: userNote.trim(),
        id_voucher: appliedVoucher ? appliedVoucher._id : null, // Thêm ID voucher
      };


      if(paymentMethod === 'COD'){
        // Call create order API for COD
        const response = await fetch(
          `${API_ENDPOINTS.ORDERS.CREATE_ORDER(userInfo._id)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
          }
        );
        console.log("Order data: ",JSON.stringify(orderData));

        if (!response.ok) {
          throw new Error('Failed to create order');
        }

        const result_cod = await response.json();
        console.log('Order created:', result_cod);
        notifyOrderCreated();
        navigation.navigate('PaymentSuccessScreen', { orderId: result_cod._id || result_cod.id });
      } else if( paymentMethod === 'MOMO'){
        console.log('Tiến hành thanh toán với MOMO...');

        const response = await fetch(
          `${API_ENDPOINTS.ORDERS.CREATE_ORDER(userInfo._id)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
          }
        );
        console.log(JSON.stringify(orderData));

        if (!response.ok) {
          throw new Error('Failed to create order');
        }

        const result_momo = await response.json();
        console.log('Order created:', result_momo);
        notifyOrderCreated();
        
        const result = await axios.post(`${API_BASE_URL}/api/momo/create-payment`,{
          total_amount: result_momo.total_amount,
          orderId: result_momo._id
        })

        if (result.status !== 200) {
          throw new Error('Thanh toán thất bại với MOMO')
        }

        console.log('Data:', result.data);
        
        const { deeplink } = result?.data?.data
        console.log('LINK:', deeplink);
        
        if (deeplink) {
          await Linking.openURL(deeplink)
        } else {
          throw new Error('MOMO payUrl not received from server')
        }
      }
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Lỗi', 'Không thể đặt hàng. Vui lòng thử lại.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image 
            source={require('../assets/back.png')} 
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>

        {/* Địa chỉ giao hàng */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
          <TouchableOpacity 
            style={styles.addressContainer}
            onPress={() => navigation.navigate('AddressScreen')}
          >
            {selectedAddress ? (
              <>
                <View style={styles.addressHeader}>
                  <Text style={styles.nameText}>{selectedAddress.fullName}</Text>
                  <Text style={styles.phoneText}> | {selectedAddress.phone_number}</Text>
                </View>
                <Text style={styles.addressText}>{selectedAddress.addressDetail}</Text>
              </>
            ) : defaultAddress ? (
              <>
                <View style={styles.addressHeader}>
                  <Text style={styles.nameText}>{defaultAddress.fullName}</Text>
                  <Text style={styles.phoneText}> | {defaultAddress.phone_number}</Text>
                </View>
                <Text style={styles.addressText}>{defaultAddress.addressDetail}</Text>
              </>
            ) : !hasAddresses ? (
              <Text style={styles.addAddressText}>Thêm địa chỉ giao hàng</Text>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Sản phẩm */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sản phẩm</Text>
          {cartItems.map((item, index) => {
            const productImageSource = (
              item.image && item.image.startsWith('/uploads_product/')
            )
              ? { uri: `${API_BASE_URL}${item.image}` }
              : (item.image && (item.image.startsWith('http://') || item.image.startsWith('https://') || item.image.startsWith('data:image')))
                ? { uri: item.image }
                : require('../assets/errorimg.webp');

            return (
              <View key={item.id_variant || item._id || index} style={styles.productRow}>
                <Image
                  source={productImageSource}
                  style={styles.image}
                  onError={(e) => {
                    console.error('Product image loading error in CheckoutScreen:', e.nativeEvent.error, 'for product:', item.name_product || item.product_name);
                    e.target.setNativeProps({
                      source: require('../assets/errorimg.webp')
                    });
                  }}
                />
                <View style={styles.editQuantity}>
                  <Text>{item.quantity}</Text>
                </View>

                <View style={styles.productDetails}>
                  <Text style={styles.productName}>{item.name_product || item.product_name}</Text>
                  <Text style={styles.productColor}>Color: {item.color}</Text>
                  <Text style={styles.productSize}>Size: {item.size}</Text>
                </View>
                <Text style={styles.price}>
                  {(item.unit_price_item || item.price)?.toLocaleString('vi-VN')}đ
                </Text>
              </View>
            );
          })}
        </View>

        {/* Voucher */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>S7M Voucher</Text>
          <TouchableOpacity onPress={() => setIsVoucherModalVisible(true)}>
            <Text style={styles.editText}>
              {appliedVoucher ? `Đã chọn: ${appliedVoucher.code}` : 'Chọn voucher'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chi tiết thanh toán */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi tiết thanh toán</Text>
          <Text style={styles.paymentText}>Tổng tiền hàng: {subTotalPrice?.toLocaleString('vi-VN')}đ</Text>
          <Text style={styles.paymentText}>Voucher: -{voucherAmount?.toLocaleString('vi-VN')}đ</Text>
          <Text style={styles.paymentText}>Vận chuyển: {shippingFee?.toLocaleString('vi-VN')}đ</Text>
        </View>

        {/* Phương thức thanh toán */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          <View style={styles.radioRow}>
            <RadioButton
              value="COD"
              status={paymentMethod === 'COD' ? 'checked' : 'unchecked'}
              onPress={() => setPaymentMethod('COD')}
            />
            <Text style={styles.paymentMethodText}>Thanh toán khi nhận hàng</Text>
          </View>
          <View style={styles.radioRow}>
            <RadioButton
              value="MOMO"
              status={paymentMethod === 'MOMO' ? 'checked' : 'unchecked'}
              onPress={() => setPaymentMethod('MOMO')}
            />
            <Text style={styles.paymentMethodText}>Thanh toán qua Momo</Text>
          </View>
        </View>

        {/* Ghi chú đơn hàng */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú đơn hàng</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Nhập ghi chú cho đơn hàng (tùy chọn)"
            value={userNote}
            onChangeText={setUserNote}
            multiline={true}
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>
            {userNote.length}/200 ký tự
          </Text>
        </View>
      </ScrollView>

      {/* Footer cố định */}
      <View style={styles.fixedFooter}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Tổng:</Text>
          <Text style={styles.totalValue}>{totalAmount?.toLocaleString('vi-VN')}đ</Text>
        </View>
        <TouchableOpacity style={styles.orderBtn} onPress={handlePlaceOrder}>
          <Text style={styles.orderText}>Đặt hàng</Text>
        </TouchableOpacity>
      </View>

      {/* Modal cho VoucherScreen */}
      <Modal
        visible={isVoucherModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsVoucherModalVisible(false)}
      >
        <VoucherScreen 
          onSelectVoucher={handleVoucherSelect}
          currentSubtotal={subTotalPrice} 
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#F5F7F8' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E4E5',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 12,
    paddingBottom: 100,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 12,
    color: '#000'
  },
  section: { 
    marginBottom: 16 ,

  },
  sectionTitle: { 
    fontSize: 16, 
    color: '#000',
    fontFamily: 'Nunito-Black',
  },
  editBtn: { 
    position: 'absolute', 
    right: 0, 
    top: 0 
  },
  editText: { 
    color: '#000',
    fontSize: 14,
    fontFamily: 'Nunito-Medium',
  },
  productColor: {
    color: '#444',
    fontSize: 14,
    fontFamily: 'Nunito-Medium',
  },
  productSize: {
    color: '#444',
    fontSize: 14,
    fontFamily: 'Nunito-Medium',
  },
  productRow: { 
    flexDirection: 'row', 
    marginTop: 8,
    alignItems: 'center',
    
    padding: 8,
    borderRadius: 8
  },
  image: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    marginRight: 8,
    position: 'relative',
  },
  productDetails: { 
    flex: 1, 
    marginLeft: 8,
  },
  productName: { 
    fontFamily: 'Nunito-Black',
    marginBottom: 2,
    fontSize: 16,
    color: '#000'
  },
  price: { 
    color: '#10B981', 
    marginTop: 4,
    fontSize: 14,
    fontFamily: 'Nunito-Black',
  },
  quantity: {
    marginTop: 4,
    fontSize: 14,
    color: '#666'
   
  },
  radioRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4,
    backgroundColor: 'rgba(224, 212, 246, 1)',
    padding: 8,
    borderRadius: 15  
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
    color: '#000'
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  orderBtn: { 
    backgroundColor: 'rgba(191, 165, 240, 1)', 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: 6 
  },
  orderText: { 
    color: '#fff', 
    fontSize: 14,
    fontFamily: 'Nunito-Black',
  },
  addressContainer: {
    backgroundColor: 'rgba(233, 226, 245, 1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  addAddressText: {
    color: '#007AFF',
    fontSize: 14,
    textAlign: 'center',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000'
  },
  phoneText: {
    fontSize: 14,
    color: '#666',
  },
  addressText: {
    fontSize: 14,
    color: '#333',
  },
  paymentText: {
    fontSize: 14,
    color: '#000',
    marginVertical: 2,
    fontFamily: 'Nunito-Medium',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#000',
    fontFamily: 'Nunito-Medium',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E3E4E5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#F6F8F9',
    minHeight: 80,
    fontFamily: 'Nunito-Medium',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  editQuantity: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CCEEEF',
    justifyContent: 'center',
    alignItems: 'center',
    top: 13,
    left: 70,
    borderWidth: 2,
    borderColor: 'white',
    position: 'absolute',
  },
});
