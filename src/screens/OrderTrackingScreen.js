import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity, 
  Image,
  Dimensions,
  Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

  const OrderTrackingScreen = ({ route }) => {
  console.log('🔍 [DEBUG] OrderTrackingScreen rendering...');
  
  const navigation = useNavigation();
  const { order } = route.params;
  const scrollViewRef = useRef(null);
  const [deliveryTimeline, setDeliveryTimeline] = useState([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);

  // Log khi showImageModal thay đổi
  useEffect(() => {
    console.log('🔍 [DEBUG] showImageModal changed to:', showImageModal);
  }, [showImageModal]);

  // Function để xử lý URL ảnh
  const getFullImageUrl = (imagePath) => {
    if (!imagePath) {
      console.log('🔍 [DEBUG] Image path is null/undefined');
      return null;
    }
    
    // Kiểm tra nếu là string rỗng
    if (typeof imagePath === 'string' && imagePath.trim() === '') {
      console.log('🔍 [DEBUG] Image path is empty string');
      return null;
    }
    
    // Nếu đã là URL đầy đủ (bắt đầu bằng http/https)
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      console.log('🔍 [DEBUG] Image already has full URL:', imagePath);
      return imagePath;
    }
    
    // Nếu là đường dẫn tương đối, thêm base URL
    // Đảm bảo không có dấu / thừa
    const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    const fullUrl = `${API_BASE_URL}${cleanPath}`;
    console.log('🔍 [DEBUG] Converting relative path to full URL:', imagePath, '->', fullUrl);
    return fullUrl;
  };

  // Log thông tin order để debug
  console.log('🔍 [DEBUG] Order data:', JSON.stringify(order, null, 2));
  console.log('🔍 [DEBUG] Order status:', order.status, 'type:', typeof order.status);
  console.log('🔍 [DEBUG] Order image_success:', order.image_success, 'type:', typeof order.image_success);
  console.log('🔍 [DEBUG] Order image_success exists:', !!order.image_success);
  console.log('🔍 [DEBUG] Order image_success length:', order.image_success?.length || 0);


  // Function để lấy delivery timeline từ API
  const fetchDeliveryTimeline = async () => {
    try {
      console.log('🔍 [DEBUG] Starting fetchDeliveryTimeline...');
      console.log('🔍 [DEBUG] Order ID:', order._id);
      console.log('🔍 [DEBUG] API URL:', API_ENDPOINTS.ORDERS.GET_HISTORY_UPDATE(order._id));
      
      setIsLoadingTimeline(true);
      const response = await fetch(API_ENDPOINTS.ORDERS.GET_HISTORY_UPDATE(order._id));
      
      console.log('🔍 [DEBUG] API Response status:', response.status);
      console.log('🔍 [DEBUG] API Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [DEBUG] API Response data:', JSON.stringify(data, null, 2));
        
        const timeline = data.map((item, index) => {
          console.log('🔍 [DEBUG] Processing item:', item);
          console.log('🔍 [DEBUG] Item status_order:', item.status_order, 'type:', typeof item.status_order);
          console.log('🔍 [DEBUG] Current order status:', order.status, 'type:', typeof order.status);
          
          const statusInfo = getStatusInfo(item.status_order);
          console.log('🔍 [DEBUG] Status info for', item.status_order, ':', statusInfo);
          
          // Kiểm tra xem status_order này có trùng với order.status hiện tại không
          const isCurrentStatus = item.status_order === order.status;
          console.log('🔍 [DEBUG] Comparison:', item.status_order, '===', order.status, '=', isCurrentStatus);
          
          // Nếu là trạng thái hiện tại, sử dụng màu highlight
          const statusColor = isCurrentStatus ? '#2196F3' : statusInfo.color;
          console.log('🔍 [DEBUG] Final color:', statusColor, '(highlighted:', isCurrentStatus, ')');
          
          // Log để debug isFinal
          const isFinal = item.status_order === 7 || item.status_order === 8;
          console.log('🔍 [DEBUG] Item isFinal:', isFinal, 'for status_order:', item.status_order);
          
          return {
            id: index + 1,
            date: formatDate(new Date(item.history_update)),
            time: new Date(item.history_update).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            status: statusInfo.text,
            description: statusInfo.description,
            isCompleted: true,
            isFinal: isFinal,
            color: statusColor,
            isCurrentStatus: isCurrentStatus
          };
        });
        
        // Đảo ngược thứ tự để trạng thái mới nhất ở trên cùng
        const reversedTimeline = timeline.reverse();
        console.log('🔍 [DEBUG] Reversed timeline:', JSON.stringify(reversedTimeline, null, 2));
        setDeliveryTimeline(reversedTimeline);
        
        console.log('🔍 [DEBUG] Final timeline:', JSON.stringify(timeline, null, 2));
        setDeliveryTimeline(timeline);
      } else {
        console.log('🔍 [DEBUG] API Response not ok, status:', response.status);
        const errorText = await response.text();
        console.log('🔍 [DEBUG] Error response body:', errorText);
      }
    } catch (error) {
      console.log('❌ [ERROR] Error fetching delivery timeline:', error);
      console.log('❌ [ERROR] Error stack:', error.stack);
      // Fallback: sử dụng timeline mẫu
      const fallbackTimeline = getDefaultTimeline();
      console.log('🔍 [DEBUG] Using fallback timeline:', fallbackTimeline);
      setDeliveryTimeline(fallbackTimeline);
    } finally {
      setIsLoadingTimeline(false);
      console.log('🔍 [DEBUG] Loading finished');
    }
  };

  // Function để chuyển đổi status number thành text và description
  const getStatusInfo = (status) => {
    console.log('🔍 [DEBUG] getStatusInfo called with status:', status, 'type:', typeof status);
    
    switch (status) {
      case 1:
        console.log('🔍 [DEBUG] Status 1: Đơn hàng được tạo');
        return { text: 'Đơn hàng được tạo', description: '', color: '#666' };
      case 2:
        console.log('🔍 [DEBUG] Status 2: Đơn hàng được xác nhận');
        return { text: 'Đơn hàng được xác nhận', description: '', color: '#666' };
      case 3:
        console.log('🔍 [DEBUG] Status 3: Đơn hàng đã rời kho');
        return { text: 'Đơn hàng đã rời kho', description: '', color: '#666' };
      case 4:
        console.log('🔍 [DEBUG] Status 4: Đơn hàng đã tới bưu cục khu vực của bạn');
        return { text: 'Đơn hàng đã tới bưu cục khu vực của bạn', description: '', color: '#666' };
      case 6:
        console.log('🔍 [DEBUG] Status 6: Đơn hàng đang trên đường giao tới địa chỉ của bạn, vui lòng chú ý điện thoại');
        return { text: 'Đơn hàng đang trên đường giao tới địa chỉ của bạn', description: 'Vui lòng chú ý điện thoại', color: '#666' };
      case 7:
      case 8:
        console.log('🔍 [DEBUG] Status 7/8: Đơn hàng được giao thành công');
        return { text: 'Đơn hàng được giao thành công', description: 'Xem hình ảnh giao hàng', color: '#4CAF50' };
      default:
        console.log('🔍 [DEBUG] Unknown status:', status, 'returning default');
        return { text: 'Trạng thái không xác định', description: '', color: '#666' };
    }
  };

  // Function để tạo timeline mẫu khi API lỗi
  const getDefaultTimeline = () => [
    {
      id: 1,
      date: formatDate(new Date()),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      status: 'Đơn hàng đã được đặt',
      description: '',
      isCompleted: true,
      color: '#666'
    }
  ];

  // Gọi API khi component mount
  useEffect(() => {
    console.log('🔍 [DEBUG] useEffect triggered');
    console.log('🔍 [DEBUG] Order object:', JSON.stringify(order, null, 2));
    console.log('🔍 [DEBUG] Order ID:', order._id);
    console.log('🔍 [DEBUG] Order address:', order.id_address);
    console.log('🔍 [DEBUG] Order status:', order.status);
    console.log('🔍 [DEBUG] Order status type:', typeof order.status);
    console.log('🔍 [DEBUG] Order all fields:', Object.keys(order));
    
    fetchDeliveryTimeline();
  }, []);


    

  // Dữ liệu bản đồ - lấy từ thông tin đơn hàng thực tế
  const mapData = React.useMemo(() => {
    console.log('🔍 [DEBUG] Creating mapData...');
    
    const data = {
      origin: { latitude: 21.0380074, longitude: 105.7468965 }, // Điểm gửi cố định
      destination: order.id_address?.latitude && order.id_address?.longitude 
        ? { 
            latitude: parseFloat(order.id_address.latitude), 
            longitude: parseFloat(order.id_address.longitude) 
          }
        : { latitude: 21.1861, longitude: 105.9753 }, // Fallback nếu không có tọa độ
      waypoints: [
        { latitude: 21.0380074, longitude: 105.7468965 }, // Điểm gửi
        order.id_address?.latitude && order.id_address?.longitude 
          ? { 
              latitude: parseFloat(order.id_address.latitude), 
              longitude: parseFloat(order.id_address.longitude) 
            }
          : { latitude: 21.1861, longitude: 105.9753 } // Điểm nhận
      ]
    };

    console.log('🔍 [DEBUG] MapData created:', JSON.stringify(data, null, 2));
    console.log('🔍 [DEBUG] Order address coordinates:', {
      latitude: order.id_address?.latitude,
      longitude: order.id_address?.longitude,
      hasCoordinates: !!(order.id_address?.latitude && order.id_address?.longitude)
    });

    return data;
  }, [order.id_address?.latitude, order.id_address?.longitude]);





  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: 'short'
    }).replace(' ', ' Th');
  };

  const getEstimatedDeliveryDate = () => {
    if (order.status === 'Chờ xác nhận' || order.status === 'Đã hủy') {
      return 'Chưa xác định';
    }
    
    const orderDate = new Date(order.createdAt);
    const estimatedDate = new Date(orderDate);
    estimatedDate.setDate(orderDate.getDate() + 3);
    
    return formatDate(estimatedDate);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
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
        <Text style={styles.headerTitle}>{order.status}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon}>
            <Text style={styles.headerIconText}>🎧</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Text style={styles.headerIconText}>❓</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Maps - 1/2 màn hình phía trên */}
      <View style={styles.mapContainer}>
        <MapView

          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: (mapData.origin.latitude + mapData.destination.latitude) / 2,
            longitude: (mapData.origin.longitude + mapData.destination.longitude) / 2,
            latitudeDelta: Math.abs(mapData.origin.latitude - mapData.destination.latitude) * 1.5,
            longitudeDelta: Math.abs(mapData.origin.longitude - mapData.destination.longitude) * 1.5,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          showsTraffic={false}
          showsBuildings={true}
          mapType="standard"
        >
          {/* Origin Marker */}
          <Marker
            coordinate={mapData.origin}
            title="Điểm gửi"
            description="Kho hàng"
            pinColor="#FF6B35"
          />
          
          {/* Destination Marker */}
          <Marker
            coordinate={mapData.destination}
            title="Điểm nhận"
            description="Địa chỉ giao hàng"
            pinColor="#4CAF50"
          />
          
          {/* Route Line */}
          <Polyline
            coordinates={mapData.waypoints}
            strokeColor="#FF6B35"
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        </MapView>
      </View>

      {/* Lịch sử giao hàng - 1/2 màn hình phía dưới */}
      <View style={styles.timelineSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lịch sử giao hàng</Text>
        </View>
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.timelineContainer}
          showsVerticalScrollIndicator={false}
        >
          {isLoadingTimeline ? (
            <View style={styles.loadingTimelineContainer}>
              <Text style={styles.loadingTimelineText}>Đang tải lịch sử giao hàng...</Text>
            </View>
          ) : (
            deliveryTimeline.map((item, index) => (
            <View key={item.id} style={styles.timelineItem}>
              {/* Time and Date */}
                                <View style={styles.timelineLeft}>
                    <Text style={styles.timelineDate}>{item.date}</Text>
                    <Text style={styles.timelineTime}>{item.time}</Text>
                    <View style={[
                      styles.timelineDot,
                      { 
                        backgroundColor: item.color,
                        borderWidth: item.isCurrentStatus ? 3 : 0,
                        borderColor: '#2196F3'
                      }
                    ]} />
                    {index < deliveryTimeline.length - 1 && (
                      <View style={[
                        styles.timelineLine,
                        { 
                          backgroundColor: item.isCurrentStatus ? '#2196F3' : '#E0E0E0'
                        }
                      ]} />
                    )}
                  </View>

                                {/* Status Content */}
                  <View style={styles.timelineContent}>
                    <Text style={[
                      styles.timelineStatus,
                      { 
                        color: item.color,
                        fontWeight: item.isCurrentStatus ? 'bold' : 'normal'
                      }
                    ]}>
                      {item.status}
                      {item.isCurrentStatus && ' (Hiện tại)'}
                    </Text>
                    {item.description && (
                      <Text style={styles.timelineDescription}>
                        {item.description}
                      </Text>
                    )}
                    {item.isFinal && order.image_success && (
                      <TouchableOpacity onPress={() => {
                        console.log('🔍 [DEBUG] Opening image modal for order:', order._id);
                        console.log('🔍 [DEBUG] Original image path:', order.image_success);
                        console.log('🔍 [DEBUG] Full image URL:', getFullImageUrl(order.image_success));
                        setShowImageModal(true);
                      }}>
                        <Text style={styles.viewImageLink}>
                          Xem hình ảnh giao hàng
                        </Text>
                      </TouchableOpacity>
                    )}
                    {/* Debug log cho việc hiển thị text */}
                    {console.log('🔍 [DEBUG] Rendering timeline item:', {
                      itemId: item.id,
                      isFinal: item.isFinal,
                      orderStatus: order.status,
                      hasImageSuccess: !!order.image_success,
                      imageSuccessValue: order.image_success,
                      shouldShowImageLink: item.isFinal && order.image_success
                    })}
                  </View>
            </View>
          ))
          )}
        </ScrollView>
      </View>

      {/* Modal hiển thị ảnh giao hàng */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            console.log('🔍 [DEBUG] Closing image modal by overlay tap');
            setShowImageModal(false);
          }}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ảnh giao hàng thành công</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  console.log('🔍 [DEBUG] Closing image modal by close button');
                  setShowImageModal(false);
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {(() => {
              const imageUrl = getFullImageUrl(order.image_success);
              console.log('🔍 [DEBUG] Rendering image with URL:', imageUrl);
              return order.image_success && imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.deliveryImage}
                  resizeMode="contain"
                  onError={(error) => {
                    console.log('❌ [ERROR] Image loading error:', error.nativeEvent);
                  }}
                  onLoad={() => {
                    console.log('✅ [SUCCESS] Image loaded successfully');
                  }}
                />
              ) : null;
            })()}
            
            <Text style={styles.modalDescription}>
              Ảnh xác nhận giao hàng thành công
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E4E5',
    zIndex: 1000,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#D3180C',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    padding: 8,
    marginLeft: 8,
  },
  headerIconText: {
    fontSize: 20,
  },

  // Map - 1/3 màn hình phía trên
  mapContainer: {
    height: height * 0.35, // Chiếm 35% màn hình
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },




  // Timeline
  timelineContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
    width: 60,
  },
  timelineDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 6,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 6,
  },
  timelineLine: {
    width: 2,
    height: 32,
    backgroundColor: '#E0E0E0',
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  loadingTimelineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingTimelineText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  viewImageLink: {
    fontSize: 14,
    color: '#4CAF50',
    textDecorationLine: 'underline',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxWidth: width - 40,
    maxHeight: height - 80,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: 16,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  deliveryImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Timeline Section - 2/3 màn hình phía dưới
  timelineSection: {
    height: height * 0.65, // Chiếm 65% màn hình
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});

export default OrderTrackingScreen;
