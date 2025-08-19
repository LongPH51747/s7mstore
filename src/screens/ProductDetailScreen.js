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
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT, API_BASE_URL } from '../config/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Loading from '../components/Loading';
import CustomAlert from '../components/CustomAlert';

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
  const [loading, setLoading] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ title: '', message: '', buttons: [] });

  const showCustomAlert = (title, message, buttons) => {
  setAlertData({ title, message, buttons });
  setAlertVisible(true);
};
  const [productLoading, setProductLoading] = useState(false);

  // Function to get user info from AsyncStorage
  const getUserInfo = useCallback(async () => {
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString !== null) {
        const userInfo = JSON.parse(userInfoString);
        if (userInfo && userInfo._id) {
          setUserId(userInfo._id);
          console.log("Id người dùng: ", userInfo._id)
          
        } else {
          Alert.alert('Thông báo', 'Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.');
          navigation.replace('Login');
        }
      }
    } catch (error) {
      console.error('Failed to get user info from AsyncStorage:', error);
    }
  }, [navigation]);

  // Function to fetch fresh product data from server
  const fetchProductData = useCallback(async (productId) => {
    if (!productId) return;
    
    console.log('ProductDetailScreen: Fetching fresh product data for ID:', productId);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
      
      const response = await fetch(API_ENDPOINTS.PRODUCTS.GET_BY_ID_FULL(productId), {
        headers: API_HEADERS,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Failed to fetch product data');
      }
      
      const data = await response.json();
      if (data && data.product) {
        console.log('ProductDetailScreen: Received updated product data:', data.product.product_name);
        setProduct(data.product);
        
        // Tự động chọn biến thể đầu tiên có sẵn hàng
        if (data.product.product_variant && data.product.product_variant.length > 0) {
          const availableVariant = data.product.product_variant.find(variant => {
            const stockQuantity = variant.variant_stock || variant.variant_quantity || variant.stock || variant.quantity || variant.inventory || 0;
            return stockQuantity > 0;
          });
          
          if (availableVariant) {
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
              if (data.product.product_image) {
                if (typeof data.product.product_image === 'string' && data.product.product_image.startsWith('/uploads_product/')) {
                  setCurrentDisplayImage(`${API_BASE_URL}${data.product.product_image}`);
                } else {
                  setCurrentDisplayImage(data.product.product_image);
                }
              }
            }
          } else {
            setSelectedVariant(null);
            // Ảnh lớn mặc định là ảnh sản phẩm chính
            if (data.product.product_image) {
              if (typeof data.product.product_image === 'string' && data.product.product_image.startsWith('/uploads_product/')) {
                setCurrentDisplayImage(`${API_BASE_URL}${data.product.product_image}`);
              } else {
                setCurrentDisplayImage(data.product.product_image);
              }
            }
          }
        } else {
          setSelectedVariant(null);
          // Ảnh lớn mặc định là ảnh sản phẩm chính
          if (data.product.product_image) {
            if (typeof data.product.product_image === 'string' && data.product.product_image.startsWith('/uploads_product/')) {
              setCurrentDisplayImage(`${API_BASE_URL}${data.product.product_image}`);
            } else {
              setCurrentDisplayImage(data.product.product_image);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
      if (error.name === 'AbortError') {
        console.log('ProductDetailScreen: Request timeout, will retry later');
      }
    }
  }, []);

  useEffect(() => {
    getUserInfo();
    const unsubscribe = navigation.addListener('focus', () => {
      getUserInfo();
    });
    return unsubscribe;
  }, [getUserInfo, navigation]);

  // Add useFocusEffect to refresh product data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (route.params?.product?._id) {
        // Refresh product data from server when screen is focused
        fetchProductData(route.params.product._id);
        
        // Check if an order was created recently
        const checkOrderCreated = async () => {
          try {
            const orderCreatedFlag = await AsyncStorage.getItem('orderCreated');
            if (orderCreatedFlag === 'true') {
              console.log('ProductDetailScreen: Order created flag found, refreshing product data');
              // Clear the flag
              await AsyncStorage.removeItem('orderCreated');
              // Refresh product data to get updated stock
              fetchProductData(route.params.product._id);
            }
            
            // Check if returning from payment success
            const returningFromPaymentSuccess = await AsyncStorage.getItem('returningFromPaymentSuccess');
            if (returningFromPaymentSuccess === 'true') {
              console.log('ProductDetailScreen: Returning from payment success, refreshing product data');
              // Clear the flag
              await AsyncStorage.removeItem('returningFromPaymentSuccess');
              // Refresh product data to get updated stock
              fetchProductData(route.params.product._id);
              
              // Reset quantity to 1 after successful payment
              setQuantity(1);
              
              // Show success message
              Alert.alert(
                'Thành công',
                'Đơn hàng đã được thanh toán thành công! Sản phẩm đã được cập nhật.',
                [{ text: 'OK' }],
                { cancelable: true }
              );
            }
          } catch (error) {
            console.error('Error checking order created flag:', error);
          }
        };
        
        checkOrderCreated();
      }
    }, [route.params?.product?._id, fetchProductData])
  );
  // Fetch product by ID when only productId is provided
  const fetchProductById = async (productId) => {
    try {
      setProductLoading(true);
      console.log('🔍 Fetching product by ID:', productId);
      
      // Try multiple API endpoints to find the working one
      const endpoints = [
        API_ENDPOINTS.PRODUCTS.GET_BY_ID_FULL(productId),
        API_ENDPOINTS.PRODUCTS.GET_BY_ID(productId),
        `${API_BASE_URL}/api/products/get-products-by-id/id/${productId}`,
        `${API_BASE_URL}/api/products/get-product-by-id/${productId}`,
      ];
      
      let foundProduct = null;
      let lastError = null;
      
      for (const apiUrl of endpoints) {
        try {
          console.log('🔗 Trying API URL:', apiUrl);
          
          const response = await fetch(apiUrl, {
            headers: API_HEADERS,
          });
          
          console.log('📡 Response status:', response.status);
          
          if (response.ok) {
            const result = await response.json();
            console.log('📦 API Response:', result);
            
            // Extract product from response (try different formats)
            foundProduct = result.data || result.product || result;
            
            if (foundProduct && foundProduct._id) {
              console.log('✅ Product found with endpoint:', apiUrl);
              break;
            }
          } else {
            console.log(`❌ Endpoint failed: ${apiUrl} (${response.status})`);
          }
        } catch (endpointError) {
          console.log(`❌ Endpoint error: ${apiUrl}`, endpointError.message);
          lastError = endpointError;
        }
      }
      
      if (!foundProduct || !foundProduct._id) {
        console.log('❌ No working endpoint found');
        
        // Fallback: Try to find in all products
        console.log('🔄 Fallback: Searching in all products...');
        const allProductsResponse = await fetch(API_ENDPOINTS.PRODUCTS.GET_ALL, {
          headers: API_HEADERS,
        });
        
        if (allProductsResponse.ok) {
          const allProducts = await allProductsResponse.json();
          foundProduct = allProducts.find(p => p._id === productId);
          
          if (foundProduct) {
            console.log('✅ Product found via fallback search');
          }
        }
      }
      
      if (!foundProduct || !foundProduct._id) {
        Alert.alert('Lỗi', 'Không tìm thấy sản phẩm!');
        navigation.goBack();
        return;
      }
      
      console.log('✅ Product fetched successfully:', foundProduct.product_name);
      setProduct(foundProduct);
      
    } catch (error) {
      console.error('❌ Error fetching product:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin sản phẩm. Vui lòng thử lại!');
      navigation.goBack();
    } finally {
      setProductLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔍 ProductDetailScreen useEffect - route.params:', route.params);
    
    // Case 1: Full product object provided (from search, home, etc.)
    if (route.params?.product) {
      const fetchedProduct = route.params.product;
      console.log('📦 Using provided product object:', fetchedProduct.product_name);
      setProduct(fetchedProduct);
    }
    // Case 2: Only productId provided (from notifications)
    else if (route.params?.productId) {
      console.log('🔗 Only productId provided, fetching from API...', route.params.productId);
      fetchProductById(route.params.productId);
    }
    // Case 3: No product data
    else {
      console.log('❌ No product data provided');
      Alert.alert('Lỗi', 'Không có thông tin sản phẩm!');
      navigation.goBack();
    }
  }, [route.params]);

  useEffect(() => {
    if (product) {
      const fetchedProduct = product;
      
      // Tự động chọn biến thể đầu tiên có sẵn hàng
      if (fetchedProduct.product_variant && fetchedProduct.product_variant.length > 0) {
        const availableVariant = fetchedProduct.product_variant.find(variant => {
          const stockQuantity = variant.variant_stock || variant.variant_quantity || variant.stock || variant.quantity || variant.inventory || 0;
          return stockQuantity > 0;
        });
        
        if (availableVariant) {
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
  }, [product]);

  const handleVariantChange = (variant) => {
    // Kiểm tra xem biến thể có hàng tồn kho không - try multiple field names
    const stockQuantity = variant.variant_stock || variant.variant_quantity || variant.stock || variant.quantity || variant.inventory || 0;
    
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
    if (isAddingToCart) return;
    setIsAddingToCart(true);

    setLoading(true);
    // Kiểm tra đăng nhập trước khi thêm vào giỏ hàng
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      setShowLoginModal(true);
      setLoading(false);
      return;
    }
    
    if (!userId) {
      Alert.alert('Lỗi', 'Không thể thêm vào giỏ hàng: Người dùng chưa đăng nhập.');
      setLoading(false);
      return;
    }

    if (!product) {
      Alert.alert('Lỗi', 'Không thể thêm vào giỏ hàng: Sản phẩm chưa được chọn.');
      setLoading(false);
      return;
    }

    if (!selectedVariant) {
      Alert.alert('Lỗi', 'Vui lòng chọn biến thể sản phẩm.');
      setLoading(false);
      return;
    }

    // Kiểm tra số lượng tồn kho
    const stockQuantity = selectedVariant.variant_stock || selectedVariant.variant_quantity || selectedVariant.stock || selectedVariant.quantity || selectedVariant.inventory || 0;
    
    if (stockQuantity <= 0) {
      Alert.alert('Thông báo', 'Sản phẩm này đã hết hàng trong kho.');
      setLoading(false);
      return;
    }

    if (quantity > stockQuantity) {
      Alert.alert('Thông báo', `Chỉ còn ${stockQuantity} sản phẩm trong kho. Vui lòng giảm số lượng xuống ${stockQuantity} hoặc ít hơn.`);
      setLoading(false);
      return;
    }

    if (quantity <= 0) {
      Alert.alert('Lỗi', 'Số lượng phải lớn hơn 0.');
      setLoading(false);
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

      const response = await fetch(`${API_ENDPOINTS.CART.ADD_TO_CART}/${userId}`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData = '';
        try {
          errorData = await response.text();
          const jsonError = JSON.parse(errorData);
          throw new Error(`Failed to add to cart: ${response.status} - ${jsonError.message || response.statusText}`);
        } catch (parseError) {
          throw new Error(`Failed to add to cart: ${response.status} - Unexpected response format: ${errorData.substring(0, 100)}...`);
        }
      }

      const responseData = await response.json();
      
      showCustomAlert(
    '🎉 Thành công',
    `Đã thêm ${quantity} sản phẩm vào giỏ hàng!`,
    [
      { text: 'Ở lại', style: 'cancel', onPress: () => setAlertVisible(false) },
      { text: 'Đi đến giỏ hàng', onPress: () => navigation.navigate('CartScreen') }
    ]
  );

    } catch (error) {
      if (error.name === 'AbortError') {
        Alert.alert('Lỗi', 'Thời gian yêu cầu thêm vào giỏ hàng đã hết. Vui lòng thử lại.');
      } else {
        console.error('Error adding to cart:', error);
        Alert.alert('Lỗi', `Không thể thêm vào giỏ hàng: ${error.message}`);
      }
    } finally {
      setLoading(false);
      setIsAddingToCart(false);
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

  if (!product || productLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>
          {productLoading ? 'Đang tải thông tin sản phẩm...' : 'Loading product details...'}
        </Text>
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
    // Có thể mở modal hoặc điều hướng ở đây
  };

  // Tính điểm trung bình chỉ với review hợp lệ
  const validReviews = reviews.filter(r => typeof r.review_rate === 'number' && !isNaN(r.review_rate));
  const averageRating = validReviews.length
    ? (validReviews.reduce((sum, r) => sum + r.review_rate, 0) / validReviews.length).toFixed(1)
    : null;

  return (
    <ScrollView style={styles.container}>
      

      {/* 1. Ảnh sản phẩm lớn */}
      <View style={styles.mainImageWrapper}>
        <View style={styles.productMainImageShadow}>
          <Image
            source={displayImageSource}
            style={styles.productMainImage}
            resizeMode="cover"
            onError={(e) => {
              console.error('Product detail image loading error:', e.nativeEvent.error);
              e.target.setNativeProps({ source: require('../assets/errorimg.webp') });
            }}
          />
        </View>
        <TouchableOpacity
          style={styles.floatingBackButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#222" />
        </TouchableOpacity>
      </View>

      {/* Các phiên bản sản phẩm - Gộp với phần chọn biến thể */}
      {product?.product_variant && product.product_variant.length > 0 && (
        <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
          <Text style={{fontSize: 16, marginBottom: 12, fontFamily:'Nunito-Black' }}>Các phiên bản sản phẩm</Text>
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
        <View style={styles.ratingRowWithSold}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="star" size={18} color="#FFD700" />
            <Text style={styles.ratingText}>
              {averageRating ? averageRating : '0.0'}/5
            </Text>
            <Text style={styles.ratingCount}>
              ({validReviews.length} đánh giá)
            </Text>
          </View>
          <Text style={styles.soldTextDetail}>Đã bán: {typeof product.product_sold === 'number' ? product.product_sold : 0}</Text>
        </View>
        <View style={styles.priceAndQuantityRow}>
          <Text style={styles.productPrice}>
            {selectedVariant ? selectedVariant.variant_price?.toLocaleString('vi-VN') : product.product_price?.toLocaleString('vi-VN')}đ
            {selectedVariant && (
              <Text style={styles.variantInfo}>
                {' '}({selectedVariant.variant_color} - {selectedVariant.variant_size})
              </Text>
            )}
          </Text>
          {selectedVariant && isSelectedVariantInStock && (
            <View style={styles.quantityInlineContainer}>
              <TouchableOpacity
                style={[styles.quantityButtonInline, quantity <= 1 && styles.quantityButtonInlineDisabled]}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Text style={[styles.quantityButtonInlineText, quantity <= 1 && styles.quantityButtonInlineTextDisabled]}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityNumberInline}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.quantityButtonInline, quantity >= selectedVariantStock && styles.quantityButtonInlineDisabled]}
                onPress={() => {
                  if (quantity < selectedVariantStock) setQuantity(quantity + 1);
                }}
                disabled={quantity >= selectedVariantStock}
              >
                <Text style={[styles.quantityButtonInlineText, quantity >= selectedVariantStock && styles.quantityButtonInlineTextDisabled]}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Text style={styles.description}>{product.product_description}</Text>
      </View>

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
      {loading && <Loading visible={loading} text="Đang xử lý..." />}

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

            return (
              <View key={review._id} style={styles.reviewCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  {user?.avatar && (
                      <Image
                        source={(() => {
                          const avatarImg = user.avatar;
                          if (typeof avatarImg === 'string' && avatarImg.startsWith('uploads_avatar/')) {
                            return { uri: `${API_BASE_URL}/${avatarImg}` };
                          } else if (typeof avatarImg === 'string' && (avatarImg.startsWith('http://') || avatarImg.startsWith('https://') || avatarImg.startsWith('data:image'))) {
                            return { uri: avatarImg };
                          } else {
                            return { uri: 'https://via.placeholder.com/150' };
                          }
                        })()}
                        style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }}
                        onError={(e) => {
                          console.error('Review avatar image loading error:', e.nativeEvent.error, 'for URL:', user.avatar);
                          e.target.setNativeProps({
                            source: { uri: 'https://via.placeholder.com/150' }
                          });
                        }}
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
                {/* Admin reply section */}
                {review.admin_reply && review.admin_reply.content && (
                  <View style={{
                    backgroundColor: '#f0f6ff',
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 8,
                    borderLeftWidth: 4,
                    borderLeftColor: '#2e7be4'
                  }}>
                    <Text style={{ color: '#2e7be4', fontWeight: 'bold', marginBottom: 2 }}>
                      Phản hồi từ Admin:
                    </Text>
                    <Text style={{ color: '#222', fontSize: 14 }}>
                      {review.admin_reply.content}
                    </Text>
                    {review.admin_reply.createdAt && (
                      <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
                        {new Date(review.admin_reply.createdAt).toLocaleString('vi-VN')}
                      </Text>
                    )}
                  </View>
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

      <CustomAlert
  visible={alertVisible}
  title={alertData.title}
  message={alertData.message}
  buttons={alertData.buttons}
  onClose={() => setAlertVisible(false)}
/>


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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  productImage: {
    width: width,
    height: width * 0.9,
  },
  mainImageWrapper: {
    width: '90%',
    height: 369,
    position: 'relative',
    marginBottom: 10,
    alignSelf: 'center',
    alignItems: 'center',
    
  },
  productMainImageShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
 borderRadius: 30,
  
    width: '100%',
    height: 369,
    
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },
  productMainImage: {
    width: '100%',
    height: '100%',
   
 
  },
  floatingBackButton: {
    position: 'absolute',
    top: 35,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
  detailsContainer: {
    padding: 16,
  },
  productName: {
    fontSize: 24,
    fontFamily: 'Nunito-Black',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 20,
    color: '#2ecc71',
    marginBottom: 16,
    fontFamily: 'Nunito-Medium',
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
    fontFamily: 'Nunito-Medium',
  },
  stockInfo: {
    marginBottom: 16,
  },
  stockText: {
    fontSize: 14,

    fontFamily: 'Nunito-Medium',
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
    fontFamily: 'Nunito-Black',
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
    borderColor: '#a4ffcaff', // xanh lá nổi bật
    shadowColor: '#a2ffc9ff',
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
    fontFamily: 'Nunito-Medium',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  selectedVariantCardText: {
    color: '#70f4e2ff',
    fontFamily: 'Nunito-Medium',
  },
  outOfStockVariantCardText: {
    color: '#999',
  },
  variantCardPrice: {
    fontSize: 13,
    color: '#DB6A34',
   fontFamily: 'Nunito-Black',
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
    backgroundColor: '#374151',
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
   fontFamily: 'Nunito-Black',
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
  priceAndQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  quantityInlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f6f6',
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  quantityButtonInline: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 1,
  },
  quantityButtonInlineDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#eee',
  },
  quantityButtonInlineText: {
    fontSize: 20,
    color: '#222',
    fontWeight: 'bold',
  },
  quantityButtonInlineTextDisabled: {
    color: '#bbb',
  },
  quantityNumberInline: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 8,
    minWidth: 24,
    textAlign: 'center',
  },
  ratingRowWithSold: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginTop: 2,
  },
  soldTextDetail: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },
});

export default ProductDetailScreen; 