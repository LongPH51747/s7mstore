import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_ENDPOINTS, API_HEADERS, API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';

const ReturnRequestScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { order } = route.params;

  const [reason, setReason] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    console.log('[ReturnRequestScreen] Component mounted');
    console.log('[ReturnRequestScreen] Order data received:', {
      orderId: order._id,
      orderItemsCount: order.orderItems?.length || 0,
      orderStatus: order.status,
      orderDate: order.createdAt
    });
    getUserId();
  }, []);

  const getUserId = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        setUserId(userInfo._id);
        console.log('[ReturnRequestScreen] User ID loaded:', userInfo._id);
      } else {
        console.log('[ReturnRequestScreen] No user info found in AsyncStorage');
      }
    } catch (error) {
      console.error('[ReturnRequestScreen] Error getting user ID:', error);
    }
  };



  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert('Thông báo', 'Bạn chỉ có thể chọn tối đa 5 ảnh');
      return;
    }

    try {
      console.log('[ReturnRequestScreen] Launching image picker...');
      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 2000,
        maxWidth: 2000,
        quality: 0.8,
      });

      console.log('[ReturnRequestScreen] Image picker result:', {
        didCancel: result.didCancel,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        assetsCount: result.assets?.length || 0
      });

      if (result.assets && result.assets[0]) {
        const selectedImage = result.assets[0];
        console.log('[ReturnRequestScreen] Selected image:', {
          uri: selectedImage.uri,
          path: selectedImage.path,
          type: selectedImage.type,
          fileName: selectedImage.fileName,
          fileSize: selectedImage.fileSize
        });
        setImages(prev => [...prev, selectedImage]);
      }
    } catch (error) {
      console.error('[ReturnRequestScreen] Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const removeImage = (index) => {
    console.log('[ReturnRequestScreen] Removing image at index:', index);
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      console.log('[ReturnRequestScreen] Images after removal:', newImages.length);
      return newImages;
    });
  };

  const validateForm = () => {
    console.log('[ReturnRequestScreen] Validating form...');
    console.log('[ReturnRequestScreen] Reason:', reason);
    console.log('[ReturnRequestScreen] Images count:', images.length);
    
    if (!reason.trim()) {
      console.log('[ReturnRequestScreen] Validation failed: No reason provided');
      Alert.alert('Lỗi', 'Vui lòng nhập lý do trả hàng');
      return false;
    }

    if (images.length === 0) {
      console.log('[ReturnRequestScreen] Validation failed: No images selected');
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một ảnh');
      return false;
    }

    console.log('[ReturnRequestScreen] Form validation passed');
    return true;
  };

  const submitReturnRequest = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('[ReturnRequestScreen] Starting to submit return request...');
      console.log('[ReturnRequestScreen] Order ID:', order._id);
      console.log('[ReturnRequestScreen] User ID:', userId);
      console.log('[ReturnRequestScreen] Reason:', reason);
      console.log('[ReturnRequestScreen] Images to upload:', images.length);

      const formData = new FormData();
      
      // Add order ID
      formData.append('orderId', order._id);
      console.log('[ReturnRequestScreen] Added orderId to FormData:', order._id);
      
      // Add reason
      formData.append('reason', reason);
      console.log('[ReturnRequestScreen] Added reason to FormData:', reason);
      
      // Add images
      images.forEach((image, index) => {
        const imageFile = {
          uri: image.uri || image.path,
          type: image.type || 'image/jpeg',
          name: image.fileName || `return_image_${index}.jpg`
        };
        formData.append('images', imageFile);
        console.log(`[ReturnRequestScreen] Added image ${index + 1} to FormData:`, {
          uri: imageFile.uri,
          type: imageFile.type,
          name: imageFile.name
        });
      });

      const apiUrl = API_ENDPOINTS.RETURN_REQUEST.CREATE(userId);
      const requestHeaders = {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
      };
      console.log('[ReturnRequestScreen] API URL:', apiUrl);
      console.log('[ReturnRequestScreen] Request headers:', requestHeaders);
      console.log('[ReturnRequestScreen] FormData content:');
      console.log('  - orderId:', order._id);
      console.log('  - reason:', reason);
      console.log('  - images count:', images.length);
      images.forEach((image, index) => {
        console.log(`  - image ${index + 1}:`, {
          uri: image.uri || image.path,
          type: image.type || 'image/jpeg',
          name: image.fileName || `return_image_${index}.jpg`
        });
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: formData,
      });

      console.log('[ReturnRequestScreen] Response status:', response.status);
      console.log('[ReturnRequestScreen] Response headers:', response.headers);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.log('[ReturnRequestScreen] Error response data:', errorData);
        } catch (parseError) {
          console.log('[ReturnRequestScreen] Could not parse error response as JSON');
          errorData = { message: 'Lỗi không xác định' };
        }
        throw new Error(errorData.message || 'Không thể tạo yêu cầu trả hàng');
      }

      let responseData;
      try {
        responseData = await response.json();
        console.log('[ReturnRequestScreen] Success response data:', responseData);
      } catch (parseError) {
        console.log('[ReturnRequestScreen] Could not parse success response as JSON');
        responseData = null;
      }

      Alert.alert(
        'Thành công',
        'Yêu cầu trả hàng đã được gửi thành công',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );

    } catch (error) {
      console.error('[ReturnRequestScreen] Error submitting return request:', error);
      console.error('[ReturnRequestScreen] Error stack:', error.stack);
      Alert.alert('Lỗi', `Không thể gửi yêu cầu trả hàng: ${error.message}`);
    } finally {
      setLoading(false);
      console.log('[ReturnRequestScreen] Request completed, loading set to false');
    }
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
        <Text style={styles.headerTitle}>Yêu cầu trả hàng</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        {/* Thông tin đơn hàng */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
          <Text style={styles.infoText}>Mã đơn hàng: {order._id}</Text>
          <Text style={styles.infoText}>Ngày đặt: {new Date(order.createdAt).toLocaleDateString('vi-VN')}</Text>
        </View>

        {/* Thông tin sản phẩm trong đơn hàng */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sản phẩm trong đơn hàng</Text>
          {order.orderItems.map((item, index) => (
            <View key={item.id_variant || index} style={styles.productItem}>
              <Image
                source={(() => {
                  if (item.image && item.image.startsWith('/uploads_product/')) {
                    return { uri: `${API_BASE_URL}${item.image}` };
                  }
                  if (item.image && (item.image.startsWith('http://') || item.image.startsWith('https://') || item.image.startsWith('data:image'))) {
                    return { uri: item.image };
                  }
                  return require('../assets/errorimg.webp');
                })()}
                style={styles.productImage}
                resizeMode="cover"
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

        {/* Lý do trả hàng */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lý do trả hàng</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Nhập lý do trả hàng..."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Chọn ảnh */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ảnh minh chứng (tối đa 5 ảnh)</Text>
          <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
            <Text style={styles.addImageText}>+ Chọn ảnh</Text>
          </TouchableOpacity>
          
          {images.length > 0 && (
            <View style={styles.imageGrid}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: image.uri || image.path }} style={styles.selectedImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeImageText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Submit button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={submitReturnRequest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Gửi yêu cầu trả hàng</Text>
          )}
        </TouchableOpacity>
      </View>
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
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  productItem: {
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E3E4E5',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
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
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E3E4E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  addImageButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  addImageText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageContainer: {
    position: 'relative',
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E3E4E5',
    elevation: 5,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ReturnRequestScreen;
