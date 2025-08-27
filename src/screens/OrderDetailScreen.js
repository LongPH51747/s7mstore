import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL, API_ENDPOINTS, API_HEADERS } from '../config/api';
import { convertStatusToNumber, convertNumberToStatus } from '../utils/orderStatusUtils';

const OrderDetailScreen = ({ route }) => {
  const navigation = useNavigation();
  const { order } = route.params;
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Chờ xác nhận':
        return '#F59E0B';
      case 'Đã xác nhận':
        return '#3B82F6';
      case 'Chờ giao hàng':
        return '#8B5CF6';
      case 'Giao thành công':
        return '#10B981';
      case 'Trả hàng':
        return '#EF4444';
      case 'Đã hủy':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Modern Header */}
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
          <Text style={styles.headerSubtitle}>#{order._id.slice(-8)}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Section with Enhanced Design */}
        <TouchableOpacity 
          style={styles.statusSection}
          onPress={() => navigation.navigate('OrderTrackingScreen', { order: order })}
        >
          <View style={styles.statusHeader}>
            <View style={styles.statusLeft}>
              <Text style={styles.statusTitle}>Trạng thái đơn hàng</Text>
              <Text style={[styles.statusText, { color: getStatusColor(displayOrder.status) }]}>
                {displayOrder.status}
              </Text>
            </View>
            <View style={styles.trackButton}>
              <Text style={styles.trackButtonText}>Theo dõi</Text>
              <Text style={styles.trackArrow}>→</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Order Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📋</Text>
            <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Ngày đặt</Text>
              <Text style={styles.infoValue}>
                {new Date(order.createdAt).toLocaleDateString('vi-VN')}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Thanh toán</Text>
              <Text style={styles.infoValue}>
                {order.payment_method === 'COD' ? 'Tiền mặt' : 'Momo'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recipient Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>👤</Text>
            <Text style={styles.sectionTitle}>Thông tin người nhận</Text>
          </View>
          <View style={styles.recipientCard}>
            <View style={styles.recipientRow}>
              <Text style={styles.recipientLabel}>Họ tên:</Text>
              <Text style={styles.recipientValue}>{order.id_address.fullName}</Text>
            </View>
            <View style={styles.recipientRow}>
              <Text style={styles.recipientLabel}>Số điện thoại:</Text>
              <Text style={styles.recipientValue}>{order.id_address.phone_number}</Text>
            </View>
            <View style={styles.recipientRow}>
              <Text style={styles.recipientLabel}>Địa chỉ:</Text>
              <Text style={styles.recipientValue}>{order.id_address.addressDetail}</Text>
            </View>
          </View>
        </View>

        {/* Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🛍️</Text>
            <Text style={styles.sectionTitle}>Sản phẩm ({order.orderItems.length})</Text>
          </View>
          {order.orderItems.map((item, index) => (
            <View key={item.id_variant || index} style={styles.productCard}>
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
                <Text style={styles.productName} numberOfLines={2}>{item.name_product}</Text>
                <View style={styles.productSpecs}>
                  <Text style={styles.productSpec}>Màu: {item.color}</Text>
                  <Text style={styles.productSpec}>Size: {item.size}</Text>
                  <Text style={styles.productSpec}>SL: {item.quantity}</Text>
                </View>
                <Text style={styles.productPrice}>{item.unit_price_item?.toLocaleString('vi-VN')}đ</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Total Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>💰</Text>
            <Text style={styles.sectionTitle}>Tổng tiền</Text>
          </View>
          <View style={styles.totalCard}>
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
                <Text style={styles.totalLabel}>Giảm giá:</Text>
                <Text style={[styles.totalValue, styles.discountValue]}>
                  -{order.discount?.toLocaleString('vi-VN')}đ
                </Text>
              </View>
            )}
            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalLabel}>Tổng cộng:</Text>
              <Text style={styles.finalTotalValue}>{order.total_amount?.toLocaleString('vi-VN')}đ</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Enhanced Footer */}
      {displayOrder.status === 'Chờ xác nhận' && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cancelButton, isCancelling && styles.disabledButton]}
            onPress={handleCancelOrder}
            disabled={isCancelling}
          >
            <Text style={styles.cancelButtonText}>
              {isCancelling ? 'Đang xử lý...' : '❌ Hủy đơn hàng'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {displayOrder.status === 'Giao thành công' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.returnButton} onPress={handleReturnOrder}>
            <Text style={styles.returnButtonText}>↩️ Trả hàng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rebuyButton} onPress={() => navigation.navigate('Checkout', { cartItems: order.orderItems })}>
            <Text style={styles.rebuyButtonText}>🔄 Mua lại</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 40,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 16,
    height: 16,
    tintColor: '#475569',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  headerRight: {
    width: 32,
  },

  // Scroll Styles
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingVertical: 8,
    paddingBottom: 100,
  },

  // Status Section
  statusSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLeft: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 3,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  trackButtonText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
    marginRight: 3,
  },
  trackArrow: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
  },

  // Section Styles
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },

  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },

  // Recipient Card
  recipientCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
  },
  recipientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recipientLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  recipientValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  // Product Card
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 6,
    marginBottom: 6,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 6,
    backgroundColor: '#FFFFFF',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 3,
    lineHeight: 18,
  },
  productSpecs: {
    marginBottom: 3,
  },
  productSpec: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 1,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },

  // Total Card
  totalCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  discountValue: {
    color: '#DC2626',
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  finalTotalLabel: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '700',
  },
  finalTotalValue: {
    fontSize: 18,
    color: '#059669',
    fontWeight: '700',
  },

  // Footer Styles
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  returnButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 4,
  },
  returnButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  rebuyButton: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginLeft: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  rebuyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default OrderDetailScreen;
