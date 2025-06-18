import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { List } from 'react-native-paper';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api'; // Import API config

const OrderDetailScreen = ({ route, navigation }) => {
  const { order } = route.params;
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        const response = await fetch(`${API_ENDPOINTS.ORDERS.GET_ORDER_DETAIL}/${order._id}`, {
          headers: API_HEADERS,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to fetch order details: ${response.status} - ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        setOrderDetails(data);
      } catch (error) {
        console.error('Error fetching order details:', error);
        if (error.name === 'AbortError') {
          Alert.alert('Lỗi', 'Thời gian yêu cầu chi tiết đơn hàng đã hết. Vui lòng thử lại.');
        } else {
          Alert.alert('Lỗi', `Không thể tải chi tiết đơn hàng: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [order._id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!orderDetails) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load order details</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Chi tiết đơn hàng</Text>

      {/* Trạng thái */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Trạng thái</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Đang giao</Text>
        </View>
      </View>

      {/* Thông tin đơn hàng */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
        <Text style={styles.orderId}>Order ID: {orderDetails._id}</Text>
        <Text style={styles.orderDate}>
          Date: {new Date(orderDetails.createdAt).toLocaleDateString()}
        </Text>
        <Text style={styles.orderStatus}>
          Status: {orderDetails.order_status}
        </Text>
      </View>

      {/* Sản phẩm */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sản phẩm</Text>
        {orderDetails.order_items.map((item) => (
          <View key={item._id} style={styles.productItem}>
            <Image
              source={(() => {
                const imageUrl = item.product_variant?.variant_image_url || 
                                 item.product_variant?.variant_image_base64 || 
                                 item.product?.product_image; 
                if (typeof imageUrl === 'string' && 
                    (imageUrl.startsWith('http://') || 
                     imageUrl.startsWith('https://') || 
                     imageUrl.startsWith('data:image'))
                ) {
                  return { uri: imageUrl };
                }
                return require('../assets/LogoGG.png'); // Fallback image
              })()}
              style={styles.productImage}
              onError={(e) => {
                console.error('Order item image loading error:', e.nativeEvent.error, 'for URL:', item.product_variant?.variant_image_url || item.product_variant?.variant_image_base64 || item.product?.product_image);
                e.target.setNativeProps({
                  source: require('../assets/LogoGG.png')
                });
              }}
            />
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.product.product_name}</Text>
              <Text style={styles.variantInfo}>
                {item.product_variant.variant_color} - {item.product_variant.variant_size}
              </Text>
              <Text style={styles.quantity}>Quantity: {item.quantity}</Text>
              <Text style={styles.price}>
                {item.product_variant.variant_price.toLocaleString('vi-VN')}đ
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Thông tin khách hàng */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
        <Text style={styles.shippingInfo}>{orderDetails.shipping_address}</Text>
        <Text style={styles.shippingInfo}>{orderDetails.shipping_phone}</Text>
      </View>

      {/* Chi tiết thanh toán */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chi tiết thanh toán</Text>
        <Text style={styles.paymentInfo}>
          Total: {orderDetails.total_amount.toLocaleString('vi-VN')}đ
        </Text>
        <Text style={styles.paymentInfo}>
          Payment Method: {orderDetails.payment_method}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
    borderTopWidth: 8,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderTopWidth: 8,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderId: {
    color: '#888',
    marginBottom: 4,
  },
  orderDate: {
    color: '#888',
    marginBottom: 4,
  },
  orderStatus: {
    color: '#888',
    marginBottom: 4,
  },
  statusContainer: {
    backgroundColor: '#009688',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
  },
  productItem: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productInfo: {
    marginLeft: 10,
    flex: 1,
  },
  productName: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 4,
  },
  variantInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  quantity: {
    color: '#888',
    marginTop: 4,
  },
  price: {
    color: 'red',
    fontWeight: 'bold',
    marginTop: 4,
  },
  shippingInfo: {
    color: '#888',
    marginBottom: 4,
  },
  paymentInfo: {
    color: '#888',
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});

export default OrderDetailScreen;
