import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT, API_BASE_URL } from '../config/api';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const RatingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { order } = route.params;

  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [images, setImages] = useState({});
  const [videos, setVideos] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Initialize ratings for each product
  useEffect(() => {
    console.log('=== RATING SCREEN INITIALIZATION ===');
    console.log('Order data received:', {
      orderId: order._id,
      orderItemsCount: order.orderItems.length,
      orderItems: order.orderItems.map(item => ({
        id_product: item.id_product,
        id_variant: item.id_variant,
        _id: item._id,
        name: item.name_product,
        quantity: item.quantity,
        image: item.image
      }))
    });

    const initialRatings = {};
    const initialComments = {};
    const initialImages = {};
    const initialVideos = {};

    order.orderItems.forEach((item) => {
      // Sử dụng id_variant làm key duy nhất cho mỗi item
      const itemId = item.id_variant || item.id_product || item._id;
      initialRatings[itemId] = 0;
      initialComments[itemId] = '';
      initialImages[itemId] = [];
      initialVideos[itemId] = [];
      
      console.log('Initialized state for item:', {
        itemId,
        id_variant: item.id_variant,
        id_product: item.id_product,
        name: item.name_product,
        initialRating: 0,
        initialComment: '',
        initialImages: [],
        initialVideos: []
      });
    });

    console.log('Setting initial state:', {
      ratings: initialRatings,
      comments: initialComments,
      images: initialImages,
      videos: initialVideos
    });

    setRatings(initialRatings);
    setComments(initialComments);
    setImages(initialImages);
    setVideos(initialVideos);

    // Debug: Check if user token exists and validate it
    const checkUserToken = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        const userInfo = await AsyncStorage.getItem('userInfo');
        console.log('Debug - User token exists:', !!userToken);
        console.log('Debug - User info exists:', !!userInfo);
        
        if (userToken) {
          console.log('Debug - Token length:', userToken.length);
          console.log('Debug - Token preview:', userToken.substring(0, 20) + '...');
          console.log('Debug - Token validation skipped, will rely on server response');
        } else {
          console.log('Debug - No token found');
          Alert.alert(
            'Chưa đăng nhập',
            'Vui lòng đăng nhập để đánh giá sản phẩm.',
            [
              {
                text: 'Đăng nhập',
                onPress: () => {
                  navigation.replace('Login');
                }
              }
            ]
          );
        }
      } catch (error) {
        console.error('Debug - Error checking token:', error);
      }
    };
    checkUserToken();
  }, [order, navigation]);

  const requestPermissions = async (type) => {
    try {
      // For now, we'll just return true and handle permissions later
      return true;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  };

  const handleStarPress = (itemId, starCount) => {
    setRatings(prev => ({
      ...prev,
      [itemId]: starCount
    }));
  };

  const handleCommentChange = (itemId, text) => {
    setComments(prev => ({
      ...prev,
      [itemId]: text
    }));
  };

  const handleImageCapture = (itemId) => {
    Alert.alert(
      'Ảnh',
      'Chọn phương thức',
      [
        {
          text: 'Chụp ảnh',
          onPress: () => captureImage(itemId, 'camera')
        },
        {
          text: 'Chọn từ thư viện',
          onPress: () => captureImage(itemId, 'library')
        },
        {
          text: 'Hủy',
          style: 'cancel'
        }
      ]
    );
  };

  const handleVideoCapture = (itemId) => {
    Alert.alert(
      'Video',
      'Chọn phương thức',
      [
        {
          text: 'Quay video',
          onPress: () => captureVideo(itemId, 'camera')
        },
        {
          text: 'Chọn từ thư viện',
          onPress: () => captureVideo(itemId, 'library')
        },
        {
          text: 'Hủy',
          style: 'cancel'
        }
      ]
    );
  };

  const captureImage = async (itemId, source) => {
    try {
      console.log('Starting image capture for item:', itemId, 'source:', source);
      
      const options = {
        mediaType: 'photo',
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.8,
        includeBase64: false,
      };

      let result;
      if (source === 'camera') {
        console.log('Launching camera...');
        result = await launchCamera(options);
      } else {
        console.log('Launching image library...');
        result = await launchImageLibrary(options);
      }

      console.log('Image picker result:', result);

      if (result.assets && result.assets.length > 0) {
        const newImages = [...(images[itemId] || []), { uri: result.assets[0].uri }];
        console.log('=== IMAGE CAPTURE SUCCESS ===');
        console.log('Image capture result:', {
          itemId,
          source,
          newImageUri: result.assets[0].uri,
          imageSize: result.assets[0].fileSize,
          imageType: result.assets[0].type,
          imageWidth: result.assets[0].width,
          imageHeight: result.assets[0].height,
          totalImagesForItem: newImages.length,
          allImagesForItem: newImages.map(img => img.uri)
        });
        setImages(prev => ({
          ...prev,
          [itemId]: newImages
        }));
        console.log('Image added to state successfully');
        console.log('Current images state for item', itemId, ':', newImages);
      } else if (result.uri) {
        // Fallback for older version structure
        const newImages = [...(images[itemId] || []), { uri: result.uri }];
        console.log('=== IMAGE CAPTURE SUCCESS (FALLBACK) ===');
        console.log('Image capture result (fallback):', {
          itemId,
          source,
          newImageUri: result.uri,
          totalImagesForItem: newImages.length,
          allImagesForItem: newImages.map(img => img.uri)
        });
        setImages(prev => ({
          ...prev,
          [itemId]: newImages
        }));
        console.log('Image added to state successfully (fallback)');
        console.log('Current images state for item', itemId, ':', newImages);
      } else if (result.didCancel) {
        console.log('=== IMAGE CAPTURE CANCELLED ===');
        console.log('User cancelled image capture for item:', itemId);
      } else {
        console.log('=== IMAGE CAPTURE ERROR ===');
        console.log('No image selected or error occurred');
        console.log('Full image picker result object:', result);
        console.log('Error details:', {
          itemId,
          source,
          didCancel: result.didCancel,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage
        });
        Toast.show({
          type: 'error',
          text1: 'Không có ảnh được chọn',
          text2: 'Vui lòng thử lại hoặc chọn ảnh khác.'
        });
      }
    } catch (error) {
      console.error('Image capture error:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi chụp ảnh',
        text2: 'Không thể chụp ảnh. Vui lòng thử lại.'
      });
    }
  };

  const captureVideo = async (itemId, source) => {
    try {
      console.log('Starting video capture for item:', itemId, 'source:', source);
      
      const options = {
        mediaType: 'video',
        maxDuration: 60,
        quality: 0.8,
      };

      let result;
      if (source === 'camera') {
        console.log('Launching camera for video...');
        result = await launchCamera(options);
      } else {
        console.log('Launching video library...');
        result = await launchImageLibrary(options);
      }

      console.log('Video picker result:', result);

      if (result.assets && result.assets.length > 0) {
        const newVideos = [...(videos[itemId] || []), { uri: result.assets[0].uri }];
        console.log('=== VIDEO CAPTURE SUCCESS ===');
        console.log('Video capture result:', {
          itemId,
          source,
          newVideoUri: result.assets[0].uri,
          videoSize: result.assets[0].fileSize,
          videoType: result.assets[0].type,
          videoDuration: result.assets[0].duration,
          totalVideosForItem: newVideos.length,
          allVideosForItem: newVideos.map(vid => vid.uri)
        });
        setVideos(prev => ({
          ...prev,
          [itemId]: newVideos
        }));
        console.log('Video added to state successfully');
        console.log('Current videos state for item', itemId, ':', newVideos);
      } else if (result.uri) {
        // Fallback for older version structure
        const newVideos = [...(videos[itemId] || []), { uri: result.uri }];
        console.log('=== VIDEO CAPTURE SUCCESS (FALLBACK) ===');
        console.log('Video capture result (fallback):', {
          itemId,
          source,
          newVideoUri: result.uri,
          totalVideosForItem: newVideos.length,
          allVideosForItem: newVideos.map(vid => vid.uri)
        });
        setVideos(prev => ({
          ...prev,
          [itemId]: newVideos
        }));
        console.log('Video added to state successfully (fallback)');
        console.log('Current videos state for item', itemId, ':', newVideos);
      } else if (result.didCancel) {
        console.log('=== VIDEO CAPTURE CANCELLED ===');
        console.log('User cancelled video capture for item:', itemId);
      } else {
        console.log('=== VIDEO CAPTURE ERROR ===');
        console.log('No video selected or error occurred');
        console.log('Full video picker result object:', result);
        console.log('Error details:', {
          itemId,
          source,
          didCancel: result.didCancel,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage
        });
        Toast.show({
          type: 'error',
          text1: 'Không có video được chọn',
          text2: 'Vui lòng thử lại hoặc chọn video khác.'
        });
      }
    } catch (error) {
      console.error('Video capture error:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi quay video',
        text2: 'Không thể quay video. Vui lòng thử lại.'
      });
    }
  };

  const removeImage = (itemId, index) => {
    setImages(prev => ({
      ...prev,
      [itemId]: prev[itemId].filter((_, i) => i !== index)
    }));
  };

  const removeVideo = (itemId, index) => {
    setVideos(prev => ({
      ...prev,
      [itemId]: prev[itemId].filter((_, i) => i !== index)
    }));
  };

  const validateRatings = () => {
    console.log('=== VALIDATING RATINGS ===');
    const itemIds = Object.keys(ratings);
    console.log('Validating ratings for items:', itemIds);
    console.log('Current ratings state:', ratings);
    
    const validationResults = [];
    for (const itemId of itemIds) {
      const rating = ratings[itemId];
      const isValid = rating > 0;
      validationResults.push({
        itemId,
        rating,
        isValid,
        message: isValid ? 'Valid' : 'No rating provided'
      });
      
      if (!isValid) {
        console.error('Validation failed: No rating for item', itemId);
      } else {
        console.log('Item', itemId, 'has valid rating:', rating);
      }
    }
    
    console.log('Validation results:', validationResults);
    const allValid = validationResults.every(result => result.isValid);
    
    if (!allValid) {
      console.error('Validation failed - showing alert');
      Alert.alert('Lỗi', 'Vui lòng đánh giá tất cả sản phẩm');
      return false;
    }
    
    console.log('All ratings validated successfully');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateRatings()) {
      return;
    }

    setSubmitting(true);
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      const userInfo = JSON.parse(userInfoString);
      
      // Get user token for authentication
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        throw new Error('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.');
      }
      
      console.log('Starting to submit reviews for order:', order._id);
      console.log('User ID:', userInfo._id);
      console.log('User token found:', userToken ? 'Yes' : 'No');
      console.log('Token validation skipped, will rely on server response');
      
      // Chuẩn bị map itemId -> orderItem để lấy id_variant
      const itemIdToOrderItem = {};
      order.orderItems.forEach(item => {
        const itemId = item.id_variant || item.id_product || item._id;
        itemIdToOrderItem[itemId] = item;
      });

      // Process each product rating
      const reviewPromises = Object.keys(ratings).map(async (itemId) => {
        const rating = ratings[itemId];
        const comment = comments[itemId] || '';
        const productImages = images[itemId] || [];
        const productVideos = videos[itemId] || [];
        const orderItem = itemIdToOrderItem[itemId];
        const id_variant = orderItem && orderItem.id_variant ? orderItem.id_variant : '';
        
        console.log(`Processing review for product ${itemId}:`, {
          rating,
          comment,
          imageCount: productImages.length,
          videoCount: productVideos.length,
          id_variant
        });

        // Use images directly without base64 conversion
        const imageUrls = productImages.map(image => image.uri).filter(uri => uri);

        // Get first video (if any)
        const videoUrl = productVideos.length > 0 ? productVideos[0].uri : '';

        const reviewData = {
          review_user_id: userInfo._id,
          review_product_id: orderItem.id_product || orderItem._id, // Sử dụng id_product thực tế
          review_comment: comment,
          review_image: imageUrls,
          review_video: videoUrl,
          review_rate: rating,
          id_variant: id_variant
        };

        // Validate review data
        if (!reviewData.review_user_id) {
          console.error('Missing user_id for product:', itemId);
        }
        if (!reviewData.review_product_id) {
          console.error('Missing product_id for product:', itemId);
        }
        if (typeof reviewData.review_rate !== 'number' || reviewData.review_rate < 1 || reviewData.review_rate > 5) {
          console.error('Invalid rating for product:', itemId, 'rating:', reviewData.review_rate);
        }
        if (!Array.isArray(reviewData.review_image)) {
          console.error('Invalid image array for product:', itemId);
        }
        if (!reviewData.id_variant) {
          console.error('Missing id_variant for product:', itemId);
        }

        console.log('Review data prepared:', {
          ...reviewData,
          review_image: `${reviewData.review_image.length} images`,
          review_comment: reviewData.review_comment.substring(0, 50) + '...'
        });

        // Log the complete review data structure
        console.log('Complete review data for product', itemId, ':', {
          review_user_id: reviewData.review_user_id,
          review_product_id: reviewData.review_product_id,
          review_comment: reviewData.review_comment,
          review_image_count: reviewData.review_image.length,
          review_image_sample: reviewData.review_image.length > 0 ? reviewData.review_image[0].substring(0, 100) + '...' : 'No images',
          review_video: reviewData.review_video,
          review_rate: reviewData.review_rate,
          id_variant: reviewData.id_variant
        });

        return reviewData;
      });

      const reviews = await Promise.all(reviewPromises);
      
      console.log(`Submitting ${reviews.length} reviews to server...`);
      console.log('Complete reviews array:', reviews.map((review, index) => ({
        index: index + 1,
        product_id: review.review_product_id,
        rating: review.review_rate,
        comment_length: review.review_comment.length,
        image_count: review.review_image.length,
        has_video: !!review.review_video,
        id_variant: review.id_variant
      })));

      // Submit each review individually
      const submissionResults = [];
      for (let i = 0; i < reviews.length; i++) {
        const review = reviews[i];
        console.log(`Submitting review ${i + 1}/${reviews.length} for product ${review.review_product_id}`);
        console.log(`Review ${i + 1} data:`, {
          user_id: review.review_user_id,
          product_id: review.review_product_id,
          rating: review.review_rate,
          comment_length: review.review_comment.length,
          image_count: review.review_image.length,
          has_video: !!review.review_video,
          id_variant: review.id_variant
        });
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

          // Include token in headers
          const headersWithToken = {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${userToken}`,
          };

          // Endpoint url có thêm id_order
          const endpointUrl = `${API_ENDPOINTS.RATINGS.CREATE}/${order._id}`;
          console.log(`Review ${i + 1} request headers:`, headersWithToken);
          console.log(`Review ${i + 1} request URL:`, endpointUrl);
          
          // Create FormData for multipart/form-data
          const formData = new FormData();
          formData.append('review_user_id', review.review_user_id);
          formData.append('review_product_id', review.review_product_id);
          formData.append('review_comment', review.review_comment);
          formData.append('review_rate', review.review_rate.toString());
          formData.append('id_variant', review.id_variant);
          
          console.log(`Review ${i + 1} - FormData basic fields:`, {
            user_id: review.review_user_id,
            product_id: review.review_product_id,
            comment: review.review_comment,
            rate: review.review_rate,
            id_variant: review.id_variant
          });
          
          // Add images to FormData
          if (review.review_image && review.review_image.length > 0) {
            console.log(`Review ${i + 1} - Processing ${review.review_image.length} images:`, review.review_image);
            review.review_image.forEach((imageUri, index) => {
              // Create file object from URI
              const imageFile = {
                uri: imageUri,
                type: 'image/jpeg',
                name: `image_${index}.jpg`
              };
              console.log(`Review ${i + 1} - Adding image ${index + 1}:`, {
                uri: imageUri,
                type: imageFile.type,
                name: imageFile.name
              });
              formData.append('review_image', imageFile);
            });
          } else {
            console.log(`Review ${i + 1} - No images to add`);
          }
          
          // Add video to FormData if exists
          if (review.review_video) {
            console.log(`Review ${i + 1} - Processing video:`, review.review_video);
            const videoFile = {
              uri: review.review_video,
              type: 'video/mp4',
              name: 'video.mp4'
            };
            console.log(`Review ${i + 1} - Adding video:`, {
              uri: review.review_video,
              type: videoFile.type,
              name: videoFile.name
            });
            formData.append('review_video', videoFile);
          } else {
            console.log(`Review ${i + 1} - No video to add`);
          }

          console.log(`Review ${i + 1} - FormData created successfully with ${review.review_image.length} images and ${review.review_video ? '1' : '0'} video`);
          console.log(`Review ${i + 1} - FormData entries:`, Array.from(formData._parts || []).map(part => ({ name: part[0], value: typeof part[1] === 'object' ? 'File object' : part[1] })));

          const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: headersWithToken,
            body: formData,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          console.log(`Review ${i + 1} response status:`, response.status);
          console.log(`Review ${i + 1} response headers:`, response.headers);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Review ${i + 1} server error:`, errorText);
            console.error(`Review ${i + 1} full response:`, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
              body: errorText
            });
            
            // Check if token is expired or invalid
            if (response.status === 403 && errorText.includes('Token không hợp lệ hoặc hết hạn')) {
              throw new Error('Token đã hết hạn. Vui lòng đăng nhập lại.');
            }
            
            throw new Error(`Server error: ${response.status} - ${errorText}`);
          }

          const responseData = await response.json();
          console.log(`Review ${i + 1} success response:`, responseData);
          submissionResults.push({ success: true, review });
        } catch (error) {
          console.error(`Error submitting review ${i + 1}:`, error);
          console.error(`Review ${i + 1} error details:`, {
            message: error.message,
            name: error.name,
            stack: error.stack
          });
          
          // If token is expired, stop processing and redirect to login
          if (error.message.includes('Token đã hết hạn') || error.message.includes('Token không hợp lệ')) {
            throw error; // Re-throw to be caught by outer catch
          }
          
          submissionResults.push({ success: false, review, error: error.message });
        }
      }

      // Check results
      const successfulReviews = submissionResults.filter(r => r.success);
      const failedReviews = submissionResults.filter(r => !r.success);

      console.log('Submission results:', {
        total: reviews.length,
        successful: successfulReviews.length,
        failed: failedReviews.length
      });

      if (failedReviews.length > 0) {
        console.error('Failed reviews:', failedReviews);
        
        // Show detailed error information
        failedReviews.forEach((failedReview, index) => {
          console.error(`Failed review ${index + 1} details:`, {
            productId: failedReview.review.review_product_id,
            rating: failedReview.review.review_rate,
            comment: failedReview.review.review_comment,
            imageCount: failedReview.review.review_image.length,
            error: failedReview.error
          });
        });
        
        // If some reviews succeeded, show partial success
        if (successfulReviews.length > 0) {
          throw new Error(`${successfulReviews.length} đánh giá thành công, ${failedReviews.length} đánh giá thất bại. Chi tiết lỗi: ${failedReviews.map(fr => fr.error).join(', ')}`);
        } else {
          throw new Error(`${failedReviews.length} đánh giá gửi thất bại. Chi tiết: ${failedReviews.map(fr => fr.error).join(', ')}`);
        }
      }

      console.log('All reviews submitted successfully!');

      Alert.alert(
        'Thành công',
        `Đã gửi thành công ${successfulReviews.length} đánh giá!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting reviews:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      let errorMessage = 'Không thể gửi đánh giá. Vui lòng thử lại.';
      let shouldRedirectToLogin = false;
      
      if (error.message.includes('Token đã hết hạn') || 
          error.message.includes('Token không hợp lệ') ||
          error.message.includes('token đăng nhập')) {
        errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        shouldRedirectToLogin = true;
      } else if (error.name === 'AbortError') {
        errorMessage = 'Thời gian gửi đánh giá đã hết. Vui lòng thử lại.';
      } else if (error.message.includes('Server error:')) {
        errorMessage = `Ảnh chứa nội dung nhạy cảm, không phù hợp!`;
      } else if (error.message.includes('Network')) {
        errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.';
      }
      
      Alert.alert('Lỗi', errorMessage, [
        {
          text: 'OK',
          onPress: () => {
            if (shouldRedirectToLogin) {
              // Clear stored data and redirect to login
              AsyncStorage.multiRemove(['userToken', 'userInfo', 'userPhone', 'shouldAutoLogin'])
                .then(() => {
                  navigation.replace('Login');
                })
                .catch(clearError => {
                  console.error('Error clearing storage:', clearError);
                  navigation.replace('Login');
                });
            }
          }
        }
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (itemId, currentRating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(itemId, i)}
          style={styles.starButton}
        >
          <Text style={[
            styles.star,
            { color: i <= currentRating ? '#FFD700' : '#E0E0E0' }
          ]}>
            ★
          </Text>
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const renderMediaSection = (itemId, type) => {
    const media = type === 'image' ? images[itemId] : videos[itemId];
    const removeFunction = type === 'image' ? removeImage : removeVideo;
    const captureFunction = type === 'image' ? handleImageCapture : handleVideoCapture;
    const buttonText = type === 'image' ? 'Ảnh' : 'Video';
    const iconText = type === 'image' ? '📷' : '🎥';

    console.log(`Rendering ${type} section for item ${itemId}:`, {
      mediaCount: media ? media.length : 0,
      media: media
    });

    return (
      <View style={styles.mediaSection}>
        <View style={styles.mediaHeader}>
          <Text style={styles.mediaTitle}>{type === 'image' ? 'Hình ảnh' : 'Video'}</Text>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => captureFunction(itemId)}
          >
            <Text style={styles.mediaButtonText}>{iconText} {buttonText}</Text>
          </TouchableOpacity>
        </View>
        
        {media && media.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaList}>
            {media.map((item, index) => (
              <View key={index} style={styles.mediaItem}>
                {type === 'image' ? (
                  <Image
                    source={(() => {
                      // For images selected from library or camera, use the URI directly
                      if (item.uri) {
                        return { uri: item.uri };
                      }
                      // Fallback for other cases
                      if (item && item.startsWith('/uploads_product/')) {
                        return { uri: `${API_BASE_URL}${item}` };
                      } else if (item && (item.startsWith('http://') || item.startsWith('https://') || item.startsWith('data:image'))) {
                        return { uri: item };
                      } else {
                        return require('../assets/errorimg.webp');
                      }
                    })()}
                    style={styles.mediaThumbnail}
                    resizeMode="cover"
                    onError={(e) => {
                      console.error('Media image loading error in RatingScreen:', e.nativeEvent.error, 'for item:', item);
                      e.target.setNativeProps({
                        source: require('../assets/errorimg.webp')
                      });
                    }}
                  />
                ) : (
                  <View style={styles.videoThumbnail}>
                    <View style={styles.videoPlayIcon}>
                      <Text style={styles.videoPlayText}>▶</Text>
                    </View>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeMediaButton}
                  onPress={() => removeFunction(itemId, index)}
                >
                  <Text style={styles.removeMediaText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
        <Image 
              source={require('../assets/back.png')} 
              style={styles.headerIcon} 
            />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá đơn hàng</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderInfoText}>
            Đơn hàng #{order._id?.slice(-8) || 'N/A'}
          </Text>
          <Text style={styles.orderInfoText}>
            {order.orderItems.length} sản phẩm
          </Text>
        </View>

        {order.orderItems.map((item, index) => {
          const itemId = item.id_variant || item.id_product || item._id;
          const currentRating = ratings[itemId] || 0;
          const currentComment = comments[itemId] || '';
          
          console.log(`Rendering item ${index + 1}:`, {
            itemId,
            id_variant: item.id_variant,
            id_product: item.id_product,
            _id: item._id,
            name: item.name_product,
            currentRating,
            currentCommentLength: currentComment.length,
            imagesCount: images[itemId] ? images[itemId].length : 0,
            videosCount: videos[itemId] ? videos[itemId].length : 0
          });

          return (
            <View key={itemId} style={styles.productCard}>
              <View style={styles.productHeader}>
                <Image
                  source={(() => {
                    if (item.image && item.image.startsWith('/uploads_product/')) {
                      return { uri: `${API_BASE_URL}${item.image}` };
                    } else if (item.image && (item.image.startsWith('http://') || item.image.startsWith('https://') || item.image.startsWith('data:image'))) {
                      return { uri: item.image };
                    } else {
                      return require('../assets/errorimg.webp');
                    }
                  })()}
                  style={styles.productImage}
                  resizeMode="cover"
                  onError={(e) => {
                    console.error('Product image loading error in RatingScreen:', e.nativeEvent.error, 'for product:', item.name_product || 'Unknown product');
                    e.target.setNativeProps({
                      source: require('../assets/errorimg.webp')
                    });
                  }}
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.name_product || 'Không rõ tên sản phẩm'}
                  </Text>
                  <Text style={styles.productQuantity}>
                    Số lượng: {item.quantity}
                  </Text>
                </View>
              </View>

              <View style={styles.ratingSection}>
                <Text style={styles.ratingTitle}>Đánh giá sản phẩm</Text>
                <View style={styles.starsContainer}>
                  {renderStars(itemId, currentRating)}
                </View>
                {currentRating > 0 && (
                  <Text style={styles.ratingText}>
                    {currentRating} sao
                  </Text>
                )}
              </View>

              <View style={styles.commentSection}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentTitle}>Nhận xét của bạn</Text>
                  <Text style={styles.characterCount}>
                    {currentComment.length}/200
                  </Text>
                </View>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                  value={currentComment}
                  onChangeText={(text) => handleCommentChange(itemId, text)}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={200}
                />
              </View>

              {renderMediaSection(itemId, 'image')}
              {renderMediaSection(itemId, 'video')}
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Gửi đánh giá</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#999',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  headerIcon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  orderInfo: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#999',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderInfoText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  productCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#999',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F9F9F9',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  productQuantity: {
    fontSize: 13,
    color: '#888',
  },
  ratingSection: {
    marginBottom: 12,
  },
  ratingTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  starButton: {
    marginRight: 4,
  },
  star: {
    fontSize: 28,
    color: '#E0E0E0',
  },
  ratingText: {
    fontSize: 13,
    color: '#888',
  },
  commentSection: {
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
  },
  characterCount: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#FFF',
    minHeight: 80,
  },
  mediaSection: {
    marginBottom: 12,
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mediaTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
  },
  mediaButton: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mediaList: {
    flexDirection: 'row',
  },
  mediaItem: {
    marginRight: 8,
    position: 'relative',
  },
  mediaThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#888',
    borderRadius: 12,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  removeMediaText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
    shadowColor: '#999',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  submitButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  videoThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  videoPlayIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
  },
});

export default RatingScreen; 