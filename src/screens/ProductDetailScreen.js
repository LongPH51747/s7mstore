import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT, API_BASE_URL } from '../config/api';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const ProductDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [currentDisplayImage, setCurrentDisplayImage] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [userInfoById, setUserInfoById] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Function to get user info from AsyncStorage
  const getUserInfo = useCallback(async () => {
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString !== null) {
        const userInfo = JSON.parse(userInfoString);
        if (userInfo && userInfo._id) {
          setUserId(userInfo._id);
          console.log('User ID from AsyncStorage on ProductDetailScreen focus (MongoDB _id):', userInfo._id);
        } else {
          console.warn('userInfo found but _id is missing on ProductDetailScreen focus:', userInfo);
          Alert.alert('Thông báo', 'Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.');
          navigation.replace('Login');
        }
      } else {
        console.warn('No userInfo found in AsyncStorage on ProductDetailScreen focus.');
      }
    } catch (error) {
      console.error('Failed to get user info from AsyncStorage on ProductDetailScreen focus:', error);
    }
  }, [navigation]);

  useEffect(() => {
    getUserInfo();
    const unsubscribe = navigation.addListener('focus', () => {
      getUserInfo();
    });
    return unsubscribe;
  }, [getUserInfo, navigation]);

  useEffect(() => {
    if (route.params?.product) {
      const fetchedProduct = route.params.product;
      console.log('=== PRODUCT DETAIL: Product data received ===');
      console.log('Full product data:', JSON.stringify(fetchedProduct, null, 2));
      setProduct(fetchedProduct);
      
      // Tự động chọn biến thể đầu tiên có sẵn hàng
      if (fetchedProduct.product_variant && fetchedProduct.product_variant.length > 0) {
        const availableVariant = fetchedProduct.product_variant.find(variant => {
          const stockQuantity = variant.variant_stock || variant.variant_quantity || variant.stock || variant.quantity || variant.inventory || 0;
          return stockQuantity > 0;
        });
        
        if (availableVariant) {
          console.log('=== PRODUCT DETAIL: Auto-selecting available variant ===', {
            variantId: availableVariant._id,
            variantColor: availableVariant.variant_color,
            variantSize: availableVariant.variant_size,
            stock: availableVariant.variant_stock || availableVariant.variant_quantity || availableVariant.stock || availableVariant.quantity || availableVariant.inventory || 0
          });
          setSelectedVariant(availableVariant);
          
          // Cập nhật ảnh hiển thị cho biến thể được chọn
          if (availableVariant.variant_image_url) {
            if (typeof availableVariant.variant_image_url === 'string' && availableVariant.variant_image_url.startsWith('/uploads_product/')) {
              setCurrentDisplayImage(`${API_BASE_URL}${availableVariant.variant_image_url}`);
            } else {
              setCurrentDisplayImage(availableVariant.variant_image_url);
            }
          } else if (availableVariant.variant_image_base64 && availableVariant.variant_image_type) {
            setCurrentDisplayImage(`data:${availableVariant.variant_image_type};base64,${availableVariant.variant_image_base64}`);
          } else {
            // Nếu biến thể không có ảnh riêng, sử dụng ảnh sản phẩm chính
            if (fetchedProduct.product_image) {
              if (typeof fetchedProduct.product_image === 'string' && fetchedProduct.product_image.startsWith('/uploads_product/')) {
                setCurrentDisplayImage(`${API_BASE_URL}${fetchedProduct.product_image}`);
              } else {
                setCurrentDisplayImage(fetchedProduct.product_image);
              }
            }
          }
        } else {
          console.log('=== PRODUCT DETAIL: No available variants found ===');
          setSelectedVariant(null);
          // Ảnh lớn mặc định là ảnh sản phẩm chính
          if (fetchedProduct.product_image) {
            if (typeof fetchedProduct.product_image === 'string' && fetchedProduct.product_image.startsWith('/uploads_product/')) {
              setCurrentDisplayImage(`${API_BASE_URL}${fetchedProduct.product_image}`);
            } else {
              setCurrentDisplayImage(fetchedProduct.product_image);
            }
          }
        }
      } else {
        console.log('=== PRODUCT DETAIL: No variants available ===');
        setSelectedVariant(null);
        // Ảnh lớn mặc định là ảnh sản phẩm chính
        if (fetchedProduct.product_image) {
          if (typeof fetchedProduct.product_image === 'string' && fetchedProduct.product_image.startsWith('/uploads_product/')) {
            setCurrentDisplayImage(`${API_BASE_URL}${fetchedProduct.product_image}`);
          } else {
            setCurrentDisplayImage(fetchedProduct.product_image);
          }
        }
      }
    }
  }, [route.params]);

  const handleVariantChange = (variant) => {
    console.log('=== PRODUCT DETAIL: handleVariantChange called ===');
    console.log('Selected variant:', {
      _id: variant._id,
      variant_color: variant.variant_color,
      variant_size: variant.variant_size,
      variant_price: variant.variant_price,
      variant_quantity: variant.variant_quantity,
      stock: variant.stock,
      quantity: variant.quantity,
      inventory: variant.inventory,
      allFields: Object.keys(variant)

    });
    
    // Kiểm tra xem biến thể có hàng tồn kho không - try multiple field names
    const stockQuantity = variant.variant_stock || variant.variant_quantity || variant.stock || variant.quantity || variant.inventory || 0;
    console.log('=== PRODUCT DETAIL: Stock validation ===', {
      stockQuantity,
      isOutOfStock: stockQuantity <= 0,
      fieldValues: {
        variant_quantity: variant.variant_quantity,
        stock: variant.stock,
        quantity: variant.quantity,
        inventory: variant.inventory
      }
    });
    
    if (stockQuantity <= 0) {
      // Find the next available variant
      const nextAvailableVariant = product.product_variant.find(v => {
        const qty = v.variant_stock || v.variant_quantity || v.stock || v.quantity || v.inventory || 0;
        
        return qty > 0 && v._id !== variant._id;
      });
      if (nextAvailableVariant) {
        setSelectedVariant(nextAvailableVariant);
        // Update image for the new variant
        if (nextAvailableVariant.variant_image_url) {
          if (typeof nextAvailableVariant.variant_image_url === 'string' && nextAvailableVariant.variant_image_url.startsWith('/uploads_product/')) {
            setCurrentDisplayImage(`${API_BASE_URL}${nextAvailableVariant.variant_image_url}`);
          } else {
            setCurrentDisplayImage(nextAvailableVariant.variant_image_url);
          }
        } else if (nextAvailableVariant.variant_image_base64 && nextAvailableVariant.variant_image_type) {
          setCurrentDisplayImage(`data:${nextAvailableVariant.variant_image_type};base64,${nextAvailableVariant.variant_image_base64}`);
        } else {
          if (typeof product.product_image === 'string' && product.product_image.startsWith('/uploads_product/')) {
            setCurrentDisplayImage(`${API_BASE_URL}${product.product_image}`);
          } else {
            setCurrentDisplayImage(product.product_image);
          }
        }
        Alert.alert('Thông báo', 'Biến thể này đã hết hàng. Đã chuyển sang biến thể còn hàng tiếp theo.');
      } else {
        Alert.alert('Thông báo', 'Biến thể này đã hết hàng và không còn biến thể nào khác.');
      }
      return;
    }

    setSelectedVariant(variant);
    setQuantity(1);
    console.log('=== PRODUCT DETAIL: Variant changed successfully ===', {
      newSelectedVariant: variant._id,
      newQuantity: 1
    });

    if (variant.variant_image_url) {
      if (typeof variant.variant_image_url === 'string' && variant.variant_image_url.startsWith('/uploads_product/')) {
        setCurrentDisplayImage(`${API_BASE_URL}${variant.variant_image_url}`);
      } else {
        setCurrentDisplayImage(variant.variant_image_url);
      }
    } else if (variant.variant_image_base64 && variant.variant_image_type) {
      setCurrentDisplayImage(`data:${variant.variant_image_type};base64,${variant.variant_image_base64}`);
    } else {
      if (typeof product.product_image === 'string' && product.product_image.startsWith('/uploads_product/')) {
        setCurrentDisplayImage(`${API_BASE_URL}${product.product_image}`);
      } else {
        setCurrentDisplayImage(product.product_image);
      }
    }
  };

  const handleAddToCart = async () => {
    // Kiểm tra đăng nhập trước khi thêm vào giỏ hàng
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    console.log('=== PRODUCT DETAIL: handleAddToCart called ===');
    
    if (!userId) {
      console.log('=== PRODUCT DETAIL: No userId - cannot add to cart ===');
      Alert.alert('Lỗi', 'Không thể thêm vào giỏ hàng: Người dùng chưa đăng nhập.');
      return;
    }

    if (!product) {
      console.log('=== PRODUCT DETAIL: No product - cannot add to cart ===');
      Alert.alert('Lỗi', 'Không thể thêm vào giỏ hàng: Sản phẩm chưa được chọn.');
      return;
    }

    if (!selectedVariant) {
      console.log('=== PRODUCT DETAIL: No selected variant - cannot add to cart ===');
      Alert.alert('Lỗi', 'Vui lòng chọn biến thể sản phẩm.');
      return;
    }

    console.log('=== PRODUCT DETAIL: Validation data ===', {
      userId,
      productId: product._id,
      productName: product.product_name,
      selectedVariantId: selectedVariant._id,
      selectedVariantColor: selectedVariant.variant_color,
      selectedVariantSize: selectedVariant.variant_size,
      quantity,
      selectedVariantPrice: selectedVariant.variant_price
    });

    // Kiểm tra số lượng tồn kho
    const stockQuantity = selectedVariant.variant_stock || selectedVariant.variant_quantity || selectedVariant.stock || selectedVariant.quantity || selectedVariant.inventory || 0;
    console.log('=== PRODUCT DETAIL: Stock validation ===', {
      stockQuantity,
      requestedQuantity: quantity,
      isOutOfStock: stockQuantity <= 0,
      exceedsStock: quantity > stockQuantity,
      fieldValues: {
        variant_quantity: selectedVariant.variant_quantity,
        stock: selectedVariant.stock,
        quantity: selectedVariant.quantity,
        inventory: selectedVariant.inventory
      }
    });
    
    if (stockQuantity <= 0) {
      console.log('=== PRODUCT DETAIL: Item is out of stock ===');
      Alert.alert('Thông báo', 'Sản phẩm này đã hết hàng trong kho.');
      return;
    }

    if (quantity > stockQuantity) {
      console.log('=== PRODUCT DETAIL: Quantity exceeds stock ===', {
        requested: quantity,
        available: stockQuantity
      });
      Alert.alert('Thông báo', `Chỉ còn ${stockQuantity} sản phẩm trong kho. Vui lòng giảm số lượng xuống ${stockQuantity} hoặc ít hơn.`);
      return;
    }

    if (quantity <= 0) {
      console.log('=== PRODUCT DETAIL: Invalid quantity ===', { quantity });
      Alert.alert('Lỗi', 'Số lượng phải lớn hơn 0.');
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const requestBody = {
        cartItem: {
          id_product: product._id,
          id_variant: selectedVariant._id,
          name_product: product.product_name,
          color: selectedVariant.variant_color,
          size: selectedVariant.variant_size,
          quantity: quantity,
          unit_price_item: selectedVariant.variant_price,
          total_price_item: selectedVariant.variant_price * quantity,
          image: selectedVariant.variant_image_url || 
                 (selectedVariant.variant_image_base64 ? 
                  `data:${selectedVariant.variant_image_type};base64,${selectedVariant.variant_image_base64}` : 
                  product.product_image),
          status: false,
        }
      };

      console.log('=== PRODUCT DETAIL: Add to cart request ===', {
        endpoint: `${API_ENDPOINTS.CART.ADD_TO_CART}/${userId}`,
        requestBody: JSON.stringify(requestBody, null, 2)
      });

      const response = await fetch(`${API_ENDPOINTS.CART.ADD_TO_CART}/${userId}`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      console.log('=== PRODUCT DETAIL: Add to cart response ===', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        let errorData = '';
        try {
          errorData = await response.text();
          console.error('=== PRODUCT DETAIL: Raw error response ===', errorData);
          const jsonError = JSON.parse(errorData);
          throw new Error(`Failed to add to cart: ${response.status} - ${jsonError.message || response.statusText}`);
        } catch (parseError) {
          throw new Error(`Failed to add to cart: ${response.status} - Unexpected response format: ${errorData.substring(0, 100)}...`);
        }
      }

      const responseData = await response.json();
      console.log('=== PRODUCT DETAIL: Add to cart successful ===', responseData);
      Alert.alert('Thành công', `Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('=== PRODUCT DETAIL: Request timeout ===');
        Alert.alert('Lỗi', 'Thời gian yêu cầu thêm vào giỏ hàng đã hết. Vui lòng thử lại.');
      } else {
        console.error('=== PRODUCT DETAIL: Error adding to cart ===', error);
        Alert.alert('Lỗi', `Không thể thêm vào giỏ hàng: ${error.message}`);
      }
    }
  };

  useEffect(() => {
    if (product?._id) {
      fetchReviews(product._id);
    }
  }, [product?._id]);

  const fetchReviews = async (productId) => {
    setLoadingReviews(true);
    try {
      const url = API_ENDPOINTS.REVIEWS.GET_REVIEW_BY_PRODUCT_ID(productId);
      const res = await fetch(url, { headers: API_HEADERS });
      if (!res.ok) throw new Error('Failed to fetch reviews');
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchUserInfo = async (userId) => {
    if (userInfoById[userId]) return; // Đã có rồi thì không fetch lại
    try {
      const res = await fetch(API_ENDPOINTS.USERS.GET_BY_ID(userId), { headers: API_HEADERS });
      if (!res.ok) throw new Error('Failed to fetch user');
      const data = await res.json();
      setUserInfoById(prev => ({ ...prev, [userId]: data.data || data }));
    } catch (e) {}
  };

  useEffect(() => {
    // Fetch user info cho tất cả review_user_id
    reviews.forEach(r => fetchUserInfo(r.review_user_id));
  }, [reviews]);

  // Declare only once before first use
  const isSelectedVariantInStock = selectedVariant && (selectedVariant.variant_stock || selectedVariant.variant_quantity || selectedVariant.stock || selectedVariant.quantity || selectedVariant.inventory || 0) > 0;
  const selectedVariantStock = selectedVariant ? (selectedVariant.variant_stock || selectedVariant.variant_quantity || selectedVariant.stock || selectedVariant.quantity || selectedVariant.inventory || 0) : 0;

  console.log('=== PRODUCT DETAIL: Current state ===', {
    hasProduct: !!product,
    hasSelectedVariant: !!selectedVariant,
    selectedVariantId: selectedVariant?._id,
    selectedVariantColor: selectedVariant?.variant_color,
    selectedVariantSize: selectedVariant?.variant_size,
    selectedVariantStock,
    isSelectedVariantInStock,
    currentQuantity: quantity,
    userId: userId,
    stockFieldValues: selectedVariant ? {
      variant_quantity: selectedVariant.variant_quantity,
      stock: selectedVariant.stock,
      quantity: selectedVariant.quantity,
      inventory: selectedVariant.inventory
    } : null
  });

  if (!product) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text>Loading product details...</Text>
      </View>
    );
  }

  const displayImageSource = (
    typeof currentDisplayImage === 'string' && 
    (currentDisplayImage.startsWith('http://') || 
     currentDisplayImage.startsWith('https://') || 
     currentDisplayImage.startsWith('data:image'))
  )
    ? { uri: currentDisplayImage }
    : require('../assets/errorimg.webp');

  const renderStars = (rate) => (
    <View style={{ flexDirection: 'row' }}>
      {[...Array(5)].map((_, i) => (
        <Icon
          key={i}
          name={i < rate ? 'star' : 'star-o'} // star-o là sao rỗng
          size={18}
          color="#FFD700"
        />
      ))}
    </View>
  );

  // Hàm xử lý khi nhấn vào variant
  const handleVariantPress = (variantId, productName) => {
    // Ví dụ: log ra, hoặc mở modal, hoặc điều hướng
    console.log('Variant ID:', variantId, 'Tên sản phẩm:', productName);
    // Bạn có thể điều hướng hoặc xử lý khác ở đây
  };

  // Tính điểm trung bình chỉ với review hợp lệ
  const validReviews = reviews.filter(r => typeof r.review_rate === 'number' && !isNaN(r.review_rate));
  const averageRating = validReviews.length
    ? (validReviews.reduce((sum, r) => sum + r.review_rate, 0) / validReviews.length).toFixed(1)
    : null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#222" />
        </TouchableOpacity>
      </View>

      {/* 1. Ảnh sản phẩm lớn */}
      <Image
        source={displayImageSource}
        style={styles.productMainImage}
        resizeMode="cover"
        onError={(e) => {
          console.error('Product detail image loading error:', e.nativeEvent.error);
          e.target.setNativeProps({ source: require('../assets/errorimg.webp') });
        }}
      />

      {/* Các phiên bản sản phẩm - Gộp với phần chọn biến thể */}
      {product?.product_variant && product.product_variant.length > 0 && (
        <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>Các phiên bản sản phẩm</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {product.product_variant.map((variant) => {
              const isSelected = selectedVariant && selectedVariant._id === variant._id;
              const stockQuantity = variant.variant_stock || variant.variant_quantity || variant.stock || variant.quantity || variant.inventory || 0;
              const isOutOfStock = stockQuantity <= 0;
              
              // Lấy ảnh variant
              let variantImgSrc = require('../assets/errorimg.webp');
              if (variant.variant_image_url) {
                variantImgSrc =
                  typeof variant.variant_image_url === 'string' && variant.variant_image_url.startsWith('/uploads_product/')
                    ? { uri: `${API_BASE_URL}${variant.variant_image_url}` }
                    : { uri: variant.variant_image_url };
              } else if (variant.variant_image_base64 && variant.variant_image_type) {
                variantImgSrc = { uri: `data:${variant.variant_image_type};base64,${variant.variant_image_base64}` };
              } else if (product.product_image) {
                variantImgSrc =
                  typeof product.product_image === 'string' && product.product_image.startsWith('/uploads_product/')
                    ? { uri: `${API_BASE_URL}${product.product_image}` }
                    : { uri: product.product_image };
              }

              return (
                <TouchableOpacity
                  key={variant._id}
                  style={[
                    styles.variantCard,
                    isSelected && styles.selectedVariantCard,
                    isOutOfStock && styles.outOfStockVariantCard
                  ]}
                  onPress={() => handleVariantChange(variant)}
                  disabled={isOutOfStock}
                  activeOpacity={0.85}
                >
                  <Image
                    source={variantImgSrc}
                    style={[
                      styles.variantCardImage,
                      isOutOfStock && styles.outOfStockVariantCardImage
                    ]}
                    resizeMode="cover"
                  />
                  {isOutOfStock && (
                    <View style={styles.variantCardOverlayOut}>
                      <Text style={styles.variantCardOverlayText}>Hết hàng</Text>
                    </View>
                  )}
                  <View style={styles.variantCardInfo}>
                    <Text style={[
                      styles.variantCardText,
                      isSelected && styles.selectedVariantCardText,
                      isOutOfStock && styles.outOfStockVariantCardText
                    ]}>
                      {variant.variant_color} - {variant.variant_size}
                    </Text>
                    <Text style={[
                      styles.variantCardPrice,
                      isOutOfStock && styles.outOfStockVariantCardText
                    ]}>
                      {variant.variant_price?.toLocaleString('vi-VN')}đ
                    </Text>
                    <Text style={[
                      styles.variantCardStock,
                      isOutOfStock ? styles.variantCardStockOut : styles.variantCardStockIn
                    ]}>
                      {isOutOfStock ? 'Hết hàng' : `${stockQuantity} sản phẩm`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 2. Tên, giá, mô tả */}
      <View style={styles.detailsContainer}>
        <Text style={styles.productName}>{product.product_name}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={18} color="#FFD700" />
          <Text style={styles.ratingText}>
            {averageRating ? averageRating : '0.0'}/5
          </Text>
          <Text style={styles.ratingCount}>
            ({validReviews.length} đánh giá)
          </Text>
        </View>
        <Text style={styles.productPrice}>
          {selectedVariant ? selectedVariant.variant_price?.toLocaleString('vi-VN') : product.product_price?.toLocaleString('vi-VN')}đ
          {selectedVariant && (
            <Text style={styles.variantInfo}>
              {' '}({selectedVariant.variant_color} - {selectedVariant.variant_size})
            </Text>
          )}
        </Text>
        <Text style={styles.description}>{product.product_description}</Text>
      </View>

      {/* 3. Chọn số lượng */}
      {selectedVariant && isSelectedVariantInStock && (
        <View style={styles.quantityContainerModern}>
          <TouchableOpacity
            style={[styles.quantityButtonModern, quantity <= 1 && styles.quantityButtonModernDisabled]}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            <Text style={[styles.quantityButtonModernText, quantity <= 1 && styles.quantityButtonModernTextDisabled]}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantityNumberModern}>{quantity}</Text>
          <TouchableOpacity
            style={[styles.quantityButtonModern, quantity >= selectedVariantStock && styles.quantityButtonModernDisabled]}
            onPress={() => {
              if (quantity < selectedVariantStock) {
                setQuantity(quantity + 1);
              } else {
                Alert.alert('Thông báo', `Chỉ còn ${selectedVariantStock} sản phẩm trong kho. Không thể tăng thêm số lượng.`);
              }
            }}
            disabled={quantity >= selectedVariantStock}
          >
            <Text style={[styles.quantityButtonModernText, quantity >= selectedVariantStock && styles.quantityButtonModernTextDisabled]}>+</Text>
          </TouchableOpacity>
          <Text style={styles.stockLimitTextModern}>
            {`Còn lại: ${selectedVariantStock} sản phẩm`}
          </Text>
        </View>
      )}

      {/* 4. Nút thêm vào giỏ hàng */}
      <TouchableOpacity
        style={[
          styles.addToCartButtonModern,
          (!selectedVariant || !isSelectedVariantInStock) && styles.addToCartButtonModernDisabled
        ]}
        onPress={handleAddToCart}
        disabled={!selectedVariant || !isSelectedVariantInStock}
      >
        <Text style={[
          styles.addToCartTextModern,
          (!selectedVariant || !isSelectedVariantInStock) && styles.addToCartTextModernDisabled
        ]}>
          {!selectedVariant ? 'Vui lòng chọn biến thể' :
            !isSelectedVariantInStock ? 'Hết hàng' :
            `Thêm vào giỏ hàng - ${selectedVariant.variant_color} ${selectedVariant.variant_size}`}
        </Text>
      </TouchableOpacity>

      {/* Hiển thị danh sách review */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewTitle}>Đánh giá sản phẩm</Text>
        {loadingReviews ? (
          <ActivityIndicator size="small" color="#000" />
        ) : reviews.length === 0 ? (
          <Text style={styles.reviewEmpty}>Chưa có đánh giá nào cho sản phẩm này.</Text>
        ) : (
          reviews.map((review) => {
            const user = userInfoById[review.review_user_id];
            // Tìm variant nếu có id_variant trong review
            let variantName = product.product_name;
            if (review.id_variant && Array.isArray(product.product_variant)) {
              const foundVariant = product.product_variant.find(
                v => v._id === review.id_variant || v.variant_sku === review.id_variant
              );
              if (foundVariant) {
                variantName = `${foundVariant.variant_color || ''}${foundVariant.variant_color && foundVariant.variant_size ? ' - ' : ''}${foundVariant.variant_size || ''}`.trim();
              }
            }
            console.log('Review', review._id, 'variantName:', variantName, 'id_variant:', review.id_variant);
            return (
              <View key={review._id} style={styles.reviewCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  {user?.avatar && (
                    <Image
                      source={{ uri: user.asvatar.startsWith('http') ? user.avatar : `${API_BASE_URL}/${user.avatar.replace(/\\/g, '/')}` }}
                      style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 15 }}>{user?.fullname || 'Người dùng'}</Text>
                    {renderStars(review.review_rate)}
                    {/* Hiển thị tên biến thể dưới sao */}
                    <Text style={{ color: '#888', fontSize: 13, marginTop: 2 }}>{variantName}</Text>
                  </View>
                </View>
                <Text style={{ color: '#444', marginVertical: 6, fontSize: 14 }}>{review.review_comment}</Text>
                {Array.isArray(review.review_image) && review.review_image.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                    {review.review_image.map((img, idx) => (
                      <TouchableOpacity key={idx} onPress={() => { setSelectedImage(`${API_BASE_URL}${img}`); setShowImageModal(true); }}>
                        <Image
                          source={{ uri: `${API_BASE_URL}${img}` }}
                          style={{ width: 150, height: 150, borderRadius: 8, marginRight: 8 }}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Modal xem ảnh lớn */}
      <Modal visible={showImageModal} transparent onRequestClose={() => setShowImageModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 40, right: 20, zIndex: 2 }} onPress={() => setShowImageModal(false)}>
            <Icon name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={{ width: '90%', height: '70%', borderRadius: 10 }} resizeMode="contain" />
          )}
        </View>
      </Modal>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  productImage: {
    width: width,
    height: width * 0.9,
  },
  productMainImage: {
    width: '92%',
    height: 260,
    borderRadius: 18,
    alignSelf: 'center',
    marginTop: 18,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 6,
},
  detailsContainer: {
    padding: 16,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 20,
    color: '#2ecc71',
    marginBottom: 16,
  },
  variantInfo: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'normal',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 24,
  },
  stockInfo: {
    marginBottom: 16,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inStock: {
    color: '#2ecc71',
  },
  outOfStock: {
    color: '#e74c3c',
  },
  variantSelectionContainer: {
    marginBottom: 20,
  },
  variantSelectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  variantButtonsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  variantButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    marginBottom: 10,
  },
  selectedVariantButton: {
    backgroundColor: '#FF0000',
    borderColor: '#FF0000',
  },
  outOfStockVariantButton: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
    opacity: 0.6,
  },
  variantButtonText: {
    fontSize: 14,
    color: '#333',
  },
  selectedVariantButtonText: {
    color: '#fff',
  },
  outOfStockVariantButtonText: {
    color: '#999',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quantityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quantityText: {
    fontSize: 16,
  },
  stockLimitText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  quantityButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: '#e0e0e0',
    opacity: 0.5,
  },
  quantityButtonText: {
    fontSize: 18,
    color: '#333',
  },
  quantityButtonTextDisabled: {
    color: '#999',
  },
  quantityNumber: {
    fontSize: 16,
    marginHorizontal: 15,
  },
  stockWarningText: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  addToCartButton: {
    backgroundColor: '#2ecc71',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addToCartTextDisabled: {
    color: '#666',
  },
  variantButtonContainer: {
    alignItems: 'center',
    marginBottom: 15,
    marginRight: 10,
  },
  variantStockText: {
    fontSize: 12,
    marginTop: 5,
    fontWeight: '500',
  },
  variantStockTextIn: {
    color: '#2ecc71',
  },
  variantStockTextOut: {
    color: '#e74c3c',
  },
  variantCard: {
    width: 130,
    marginRight: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#eee',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    marginBottom: 8,
    position: 'relative',
  },
  selectedVariantCard: {
    borderColor: '#2ecc71', // xanh lá nổi bật
    shadowColor: '#2ecc71',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  outOfStockVariantCard: {
    borderColor: '#ccc',
    backgroundColor: '#f8f8f8',
    opacity: 0.7,
  },
  variantCardImage: {
    width: '100%',
    height: 110,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  outOfStockVariantCardImage: {
    opacity: 0.5,
  },
  variantCardInfo: {
    padding: 10,
    alignItems: 'center',
  },
  variantCardText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  selectedVariantCardText: {
    color: '#2ecc71',
  },
  outOfStockVariantCardText: {
    color: '#999',
  },
  variantCardPrice: {
    fontSize: 13,
    color: '#e74c3c',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  variantCardStock: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 2,
  },
  variantCardStockIn: {
    color: '#2ecc71',
  },
  variantCardStockOut: {
    color: '#e74c3c',
  },
  variantCardOverlayOut: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    zIndex: 2,
  },
  variantCardOverlayText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 16,
    textShadowColor: '#fff',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  quantityContainerModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
},
quantityButtonModern: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    elevation: 2,
},
quantityButtonModernDisabled: {
    backgroundColor: '#e0e0e0',
    opacity: 0.5,
},
quantityButtonModernText: {
    fontSize: 22,
    color: '#333',
    fontWeight: 'bold',
},
quantityButtonModernTextDisabled: {
    color: '#bbb',
},
quantityNumberModern: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 8,
},
stockLimitTextModern: {
    fontSize: 13,
    color: '#888',
    marginLeft: 16,
},
addToCartButtonModern: {
    backgroundColor: '#2ecc71',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 18,
    elevation: 3,
},
addToCartButtonModernDisabled: {
    backgroundColor: '#ccc',
},
addToCartTextModern: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
},
addToCartTextModernDisabled: {
    color: '#666',
},
reviewSection: {
    marginTop: 24,
    paddingHorizontal: 16,
},
reviewTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
    color: '#222',
},
reviewEmpty: {
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 12,
},
reviewCard: {
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
},
ratingRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 6,
  marginTop: 2,
},
ratingText: {
  fontSize: 15,
  fontWeight: 'bold',
  color: '#222',
  marginLeft: 4,
},
ratingCount: {
  fontSize: 13,
  color: '#888',
  marginLeft: 6,
},
});

export default ProductDetailScreen; 