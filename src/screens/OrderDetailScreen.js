import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL, API_ENDPOINTS, API_HEADERS } from '../config/api';
import { convertStatusToNumber, convertNumberToStatus } from '../utils/orderStatusUtils';

const OrderDetailScreen = ({ route }) => {
  const navigation = useNavigation();
  const { order, onOrderUpdate } = route.params;
  const [isCancelling, setIsCancelling] = useState(false);

  // Convert order status to text for display if it's a number
  const displayOrder = {
    ...order,
    status: typeof order.status === 'number' ? convertNumberToStatus(order.status) : order.status
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Hủy đơn hàng',
      'Bạn có chắc chắn muốn hủy đơn hàng này?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy đơn',
          onPress: async () => {
            if (isCancelling) return;
            setIsCancelling(true);
            try {
              const response = await fetch(API_ENDPOINTS.ORDERS.UPDATE_STATUS(order._id), {
                method: 'PATCH',
                headers: API_HEADERS,
                body: JSON.stringify({ status: convertStatusToNumber('Đã hủy') }),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Lỗi không xác định' }));
                throw new Error(errorData.message);
              }

              Alert.alert('Thành công', 'Đã hủy đơn hàng thành công.');
              if (onOrderUpdate) {
                onOrderUpdate();
              }
              navigation.goBack(); 

            } catch (error) {
              Alert.alert('Lỗi', `Không thể hủy đơn hàng: ${error.message}`);
            } finally {
              setIsCancelling(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleRateOrder = () => {
            navigation.navigate('RatingScreen', { order });
  };

  const handleReturnOrder = () => {
    navigation.navigate('ReturnRequestScreen', { order });
  };

  return (
    <SafeAreaView style={styles.container}>
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
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Trạng thái đơn hàng */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trạng thái đơn hàng</Text>
<<<<<<<<< Temporary merge branch 1
          <Text style={styles.statusText}>{order?.status || 'Đang xử lý'}</Text>
=========
          <Text style={styles.statusText}>{displayOrder.status}</Text>
>>>>>>>>> Temporary merge branch 2
        </View>

        {/* Thông tin đơn hàng */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
<<<<<<<<< Temporary merge branch 1
          <Text style={styles.infoText}>Mã đơn hàng: {order?._id || 'N/A'}</Text>
          <Text style={styles.infoText}>Ngày đặt: {order?.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</Text>
          <Text style={styles.infoText}>Phương thức thanh toán: {order?.payment_method === 'cod' ? 'Thanh toán khi nhận hàng' : 'Thanh toán qua Momo'}</Text>
          <Text style={styles.infoText}>Trạng thái thanh toán: {order?.payment_status || 'Chưa xác định'}</Text>
=========
          <Text style={styles.infoText}>Mã đơn hàng: {order._id}</Text>
          <Text style={styles.infoText}>Ngày đặt: {new Date(order.createdAt).toLocaleDateString('vi-VN')}</Text>
          <Text style={styles.infoText}>Phương thức thanh toán: {order.payment_method === 'COD' ? 'Thanh toán khi nhận hàng' : 'Thanh toán qua Momo'}</Text>
          <Text style={styles.infoText}>Trạng thái thanh toán: {order.payment_status}</Text>
>>>>>>>>> Temporary merge branch 2
        </View>

        {/* Thông tin người nhận */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin người nhận</Text>
          <Text style={styles.infoText}>Họ tên: {order.id_address.fullName}</Text>
          <Text style={styles.infoText}>Số điện thoại: {order.id_address.phone_number}</Text>
          <Text style={styles.infoText}>Địa chỉ: {order.id_address.addressDetail}</Text>
        </View>

        {/* Sản phẩm */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sản phẩm</Text>
          {order.orderItems.map((item, index) => (
            <View key={item.id_variant || index} style={styles.productItem}>
              <Image
                source={(() => {
                  console.log('OrderDetailScreen - item.image:', item.image);
                  if (item.image && item.image.startsWith('/uploads_product/')) {
                    const src = { uri: `${API_BASE_URL}${item.image}` };
                    console.log('OrderDetailScreen - image source:', src);
                    return src;
                  }
                  if (item.image && (item.image.startsWith('http://') || item.image.startsWith('https://') || item.image.startsWith('data:image'))) {
                    const src = { uri: item.image };
                    console.log('OrderDetailScreen - image source:', src);
                    return src;
                  }
                  console.log('OrderDetailScreen - image source: default');
                  return require('../assets/errorimg.webp');
                })()}
                style={styles.productImage}
                resizeMode="cover"
                onError={(e) => {
                  e.target.setNativeProps({
                    source: require('../assets/errorimg.webp')
                  });
                }}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name_product}</Text>
                <Text style={styles.productDetail}>Màu: {item.color}</Text>
                <Text style={styles.productDetail}>Size: {item.size}</Text>
                <Text style={styles.productDetail}>Số lượng: {item.quantity}</Text>
                <Text style={styles.productPrice}>{item.unit_price_item?.toLocaleString('vi-VN')}đ</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tổng tiền */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tổng tiền</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tạm tính:</Text>
            <Text style={styles.totalValue}>{order.sub_total_amount?.toLocaleString('vi-VN')}đ</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Phí vận chuyển:</Text>
            <Text style={styles.totalValue}>{order.shipping?.toLocaleString('vi-VN')}đ</Text>
          </View>

          {order.discount > 0 && (
        <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Voucher giảm giá:</Text>
            <Text style={[styles.totalValue, styles.voucherValue]}>-{order.discount?.toLocaleString('vi-VN')}đ</Text>
        </View>
    )}
          <View style={[styles.totalRow, styles.finalTotal]}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalValue}>{order.total_amount?.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>
      </ScrollView>

      {displayOrder.status === 'Chờ xác nhận' && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.fullWidthButton, isCancelling && styles.disabledButton]}
            onPress={handleCancelOrder}
            disabled={isCancelling}
          >
            <Text style={styles.buttonTextPrimary}>{isCancelling ? 'Đang xử lý...' : 'Hủy đơn hàng'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {displayOrder.status === 'Giao thành công' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.halfWidthButtonSecondary} onPress={handleReturnOrder}>
            <Text style={styles.buttonTextSecondary}>Trả hàng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.halfWidthButtonPrimary} onPress={() => navigation.navigate('Checkout', { cartItems: order.orderItems })}>
            <Text style={styles.buttonTextPrimary}>Mua lại</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E4E5',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 1,
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
    color: '#000',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E4E5',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  statusText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  productItem: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F6F8F9',
    padding: 12,
    borderRadius: 8,
  },
  productImage: {
    width: 80,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  productDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D3180C',
    marginTop: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#000',
  },
  finalTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E3E4E5',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E3E4E5',
    elevation: 5,
  },
  fullWidthButton: {
    flex: 1,
    backgroundColor: '#D3180C',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  halfWidthButtonPrimary: {
    flex: 1,
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  halfWidthButtonSecondary: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
    marginRight: 8,
  },
  buttonTextPrimary: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonTextSecondary: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

export default OrderDetailScreen;
