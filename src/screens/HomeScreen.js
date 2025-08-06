import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, SafeAreaView, Text, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT, API_BASE_URL } from '../config/api';
import Icon from 'react-native-vector-icons/Ionicons';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const numColumns = 2;
const { width } = Dimensions.get('window');
const ITEM_WIDTH = width / numColumns - 24;
const PRODUCTS_PER_PAGE = 2;

/**
 * Màn hình Trang chủ (Home Screen)
 *
 * Chức năng:
 * - Hiển thị banner quảng cáo
 * - Hiển thị danh mục sản phẩm
 * - Hiển thị danh sách sản phẩm
 * - Tìm kiếm sản phẩm
 * - Điều hướng đến các màn hình khác
 */
const HomeScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [activeTab, setActiveTab] = useState('Home');
  const [topPage, setTopPage] = useState(0);
  const [newProducts, setNewProducts] = useState([]);
  const [newPage, setNewPage] = useState(0);
  
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (page > 1 && selectedCategory === 'All') {
      fetchMoreProducts();
    }
  }, [page, selectedCategory]);

  useEffect(() => {
  const fetchNewProducts = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.PRODUCTS.GET_NEW_PRODUCTS, {
        headers: API_HEADERS,
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setNewProducts(data);
      }
    } catch (error) {
      console.error('Error fetching new products:', error);
    }
  };
  fetchNewProducts();
}, []);

const NEW_PRODUCTS_PER_PAGE = 4;
const newTotalPages = Math.ceil(newProducts.length / NEW_PRODUCTS_PER_PAGE);
const newProductsPage = newProducts.slice(newPage * NEW_PRODUCTS_PER_PAGE, (newPage + 1) * NEW_PRODUCTS_PER_PAGE);

  // Add useFocusEffect to refresh data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // Check if returning from payment success
      const checkReturningFromPaymentSuccess = async () => {
        try {
          const returningFromPaymentSuccess = await AsyncStorage.getItem('returningFromPaymentSuccess');
          if (returningFromPaymentSuccess === 'true') {
            console.log('HomeScreen: Returning from payment success, refreshing data');
            // Clear the flag
            await AsyncStorage.removeItem('returningFromPaymentSuccess');
            // Reset pagination state
            setPage(1);
            setHasMore(true);
            setProducts([]);
            // Refresh data to get updated information
            fetchData();
          }
        } catch (error) {
          console.error('Error checking returning from payment success flag:', error);
        }
      };
      
      checkReturningFromPaymentSuccess();
    }, [])
  );

  const fetchProductsByCategory = async (categoryId) => {
    try {
      setLoading(true);
      console.log('Fetching products for category:', categoryId);
      
      const productsController = new AbortController();
      const productsTimeout = setTimeout(() => productsController.abort(), API_TIMEOUT);
      
      // Category API doesn't support pagination - it returns all products for the category
      const url = `${API_ENDPOINTS.PRODUCTS.GET_BY_CATEGORY(categoryId)}`;
      console.log('Category API URL:', url);
      
      const productsResponse = await fetch(url, {
        headers: API_HEADERS,
        signal: productsController.signal,
      });
      clearTimeout(productsTimeout);
      
      if (!productsResponse.ok) {
        throw new Error(`Failed to fetch products by category: ${productsResponse.status}`);
      }
      
      let responseData;
      try {
        responseData = await productsResponse.json();
      } catch (e) {
        console.error('Error parsing JSON from category response:', e);
        setProducts([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      // Category API returns an array of products (no pagination)
      if (responseData && Array.isArray(responseData)) {
        console.log('Number of products for category:', responseData.length);
        setProducts(responseData);
        setHasMore(false); // No pagination for category products
        setPage(1);
      } else {
        console.log('No products found for category or invalid data format');
        setProducts([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching products by category:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreProducts = async () => {
    try {
      setLoadingMore(true);
      console.log('Fetching more products - Page:', page);
      
      const productsController = new AbortController();
      const productsTimeout = setTimeout(() => productsController.abort(), API_TIMEOUT);
      
      const url = `${API_ENDPOINTS.PRODUCTS.GET_ALL_LIMIT}?page=${page}&limit=${PRODUCTS_PER_PAGE}`;
      console.log('API URL:', url);
      
      const productsResponse = await fetch(url, {
        headers: API_HEADERS,
        signal: productsController.signal,
      });
      clearTimeout(productsTimeout);
      
      if (!productsResponse.ok) {
        throw new Error(`Failed to fetch products: ${productsResponse.status}`);
      }
      
      let responseData;
      try {
        responseData = await productsResponse.json();
      } catch (e) {
        console.error('Error parsing JSON from response:', e);
        setHasMore(false);
        setLoadingMore(false);
        return;
      }

      console.log('Type of responseData:', typeof responseData);
      console.log('Is responseData truthy?', !!responseData);
      console.log('Does responseData have data property?', 'data' in responseData);
      if ('data' in responseData) {
        console.log('Is responseData.data an array?', Array.isArray(responseData.data));
      }
      
      console.log('Condition check - responseData:', !!responseData, 'responseData.data truthy:', !!responseData.data, 'Array.isArray(responseData.data):', Array.isArray(responseData.data));

      if (responseData && responseData.data && Array.isArray(responseData.data)) {
        console.log('Number of products received:', responseData.data.length);
        
        // Kiểm tra xem có sản phẩm mới không
        if (responseData.data.length > 0) {
          setProducts(prevProducts => {
            const newProducts = [...prevProducts, ...responseData.data];
            console.log('Total products after update:', newProducts.length);
            return newProducts;
          });
          
          setTotalPages(responseData.totalPages || 1);
          setHasMore(page < (responseData.totalPages || 1));
          console.log('Has more:', page < (responseData.totalPages || 1), 'Total pages:', responseData.totalPages || 1);
        } else {
          // Không có sản phẩm mới, dừng pagination
          console.log('No new products received, stopping pagination');
          setHasMore(false);
        }
      } else {
        console.log('Condition failed: No products received or invalid data format');
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching more products:', error);
      // Thử lại sau 3 giây nếu có lỗi
      setTimeout(() => {
        if (hasMore && !loadingMore) {
          console.log('Retrying to fetch more products...');
          setPage(prevPage => prevPage);
        }
      }, 3000);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('HomeScreen: Fetching fresh data - Page:', 1);
      
      // Reset pagination state when fetching fresh data
      setPage(1);
      setHasMore(true);
      setProducts([]);
      
      const productsController = new AbortController();
      const productsTimeout = setTimeout(() => productsController.abort(), API_TIMEOUT);
        
      const url = `${API_ENDPOINTS.PRODUCTS.GET_ALL_LIMIT}?page=1&limit=${PRODUCTS_PER_PAGE}`;
      console.log('Initial API URL:', url);
      
      const productsResponse = await fetch(url, {
          headers: API_HEADERS,
          signal: productsController.signal,
        });
        clearTimeout(productsTimeout);
        
        if (!productsResponse.ok) {
          throw new Error(`Failed to fetch products: ${productsResponse.status}`);
        }
      
      let responseData;
      try {
        responseData = await productsResponse.json();
      } catch (e) {
        console.error('Error parsing JSON from initial response:', e);
        setProducts([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      console.log('Type of responseData:', typeof responseData);
      console.log('Is responseData truthy?', !!responseData);
      console.log('Does responseData have data property?', 'data' in responseData);
      if ('data' in responseData) {
        console.log('Is responseData.data an array?', Array.isArray(responseData.data));
      }

      console.log('Condition check - responseData:', !!responseData, 'responseData.data truthy:', !!responseData.data, 'Array.isArray(responseData.data):', Array.isArray(responseData.data));

      if (responseData && responseData.data && Array.isArray(responseData.data)) {
        console.log('Initial number of products:', responseData.data.length);
        setProducts(responseData.data);
        setTotalPages(responseData.totalPages || 1);
        setHasMore(1 < (responseData.totalPages || 1));
        console.log('Initial has more:', 1 < (responseData.totalPages || 1), 'Total pages:', responseData.totalPages || 1);
        } else {
        console.log('Condition failed: No initial products or invalid data format');
          setProducts([]);
        setHasMore(false);
        }

        // Fetch categories
        console.log('Fetching categories...');
        const categoriesController = new AbortController();
        const categoriesTimeout = setTimeout(() => categoriesController.abort(), API_TIMEOUT);
        
        const categoriesResponse = await fetch(API_ENDPOINTS.CATEGORIES.GET_ALL, {
          headers: API_HEADERS,
          signal: categoriesController.signal,
        });
        clearTimeout(categoriesTimeout);
        
        if (!categoriesResponse.ok) {
          throw new Error(`Failed to fetch categories: ${categoriesResponse.status}`);
        }
        const categoriesData = await categoriesResponse.json();
        if (categoriesData && Array.isArray(categoriesData)) {
          // Transform category data to ensure valid image URLs
          const transformedCategories = categoriesData.map(category => ({
            ...category,
            category_image: (category.category_image && 
              (category.category_image.startsWith('http://') || 
               category.category_image.startsWith('https://') || 
               category.category_image.startsWith('data:image')))
              ? category.category_image 
              : null
          }));
          setCategories(transformedCategories);
        } else {
          setCategories([]);
        }

        // Fetch banners
        console.log('Fetching banners...');
        try {
          const bannersController = new AbortController();
          const bannersTimeout = setTimeout(() => bannersController.abort(), API_TIMEOUT);
          
          const bannersResponse = await fetch(API_ENDPOINTS.BANNERS.GET_ALL, {
            headers: API_HEADERS,
            signal: bannersController.signal,
          });
          clearTimeout(bannersTimeout);
          
          if (!bannersResponse.ok) {
            throw new Error(`Failed to fetch banners: ${bannersResponse.status}`);
          }
          const bannersData = await bannersResponse.json();
          
          if (bannersData && Array.isArray(bannersData)) {
            const transformedBanners = bannersData.map(banner => ({
              ...banner,
              image: banner.banner_image_url || banner.banner_image || null
            })).filter(banner => banner.image !== null);
            
            setBanners(transformedBanners);
          } else {
            setBanners([]);
          }
        } catch (bannerError) {
          setBanners([]);
        }

        setLoading(false);
      } catch (error) {
      console.error('Error fetching initial data:', error);
      setLoading(false);
    } finally {
        setLoading(false);
      }
    };

    const TOP_PRODUCTS_PER_PAGE = 4;
  const topProductsSorted = [...products]
    .sort((a, b) => (b.product_sold || 0) - (a.product_sold || 0));
  const topProducts = selectedCategory === 'All'
    ? topProductsSorted.slice(topPage * TOP_PRODUCTS_PER_PAGE, (topPage + 1) * TOP_PRODUCTS_PER_PAGE)
    : [];
  const topTotalPages = Math.ceil(topProductsSorted.length / TOP_PRODUCTS_PER_PAGE);


  /**
   * Tự động chuyển banner sau mỗi 3s
   */
  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setBannerIndex(idx => (idx + 1) % banners.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [banners]);

  /**
   * Lọc sản phẩm theo danh mục
   */
  const filteredProducts = selectedCategory === 'All'
    ? products
    : products; // When category is selected, products array already contains category-specific products

  // Add error handling for filtering
  useEffect(() => {
    if (selectedCategory !== 'All') {
      console.log('Category products count:', products.length);
    }
  }, [selectedCategory, products]);


  const loadMoreProducts = () => {
    if (selectedCategory === 'All' && !loadingMore && hasMore && page < totalPages) {
      console.log('Loading more products - Current page:', page, 'Total pages:', totalPages);
      setPage(prevPage => prevPage + 1);
    } else {
      console.log('Not loading more - Category:', selectedCategory, 'Loading:', loadingMore, 'Has more:', hasMore, 'Page:', page, 'Total pages:', totalPages);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  };

  /**
   * Render item sản phẩm trong grid
   */
  const renderItem = ({ item }) => {
    // console.log('Rendering product:', item);
    // console.log('Product Image URL before validation:', item.product_image);
    const productImageSource = (typeof item.product_image === 'string' && item.product_image.startsWith('/uploads_product/'))
      ? { uri: `${API_BASE_URL}${item.product_image}` }
      : (typeof item.product_image === 'string' && (item.product_image.startsWith('http://') || item.product_image.startsWith('https://') || item.product_image.startsWith('data:image')))
        ? { uri: item.product_image }
        : require('../assets/errorimg.webp');

    return (
      
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('ProductDetailScreen', { product: item })}
      >
        <View style={styles.imageContainer}>
          <Image 
          source={productImageSource} 
          style={styles.image} 
          resizeMode="cover"
          onError={(e) => {
            console.error('Product image loading error:', e.nativeEvent.error, 'for URL:', item.product_image);
            e.target.setNativeProps({
              source: require('../assets/errorimg.webp')
            });
          }}
        />
        </View>
        
         <Text style={styles.name} numberOfLines={2}>{item.product_name}</Text>

         <View style={styles.priceContainer}>
        <Text style={styles.price}>{item.product_price?.toLocaleString('vi-VN')}Đ</Text>
        <Text style={styles.soldText}>Đã bán: {typeof item.product_sold === 'number' ? item.product_sold : 0}</Text>
         </View>
       
       
      </TouchableOpacity>
    );
  };

  /**
   * Hiển thị loading khi đang tải dữ liệu
   */
  if (loading) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header: logo và ô tìm kiếm */}
      <View style={styles.header}>
        <Text style={{fontFamily: 'Nunito-Black'}}>S7M STORE</Text>
        <TouchableOpacity 
          style={styles.searchContainer}
          onPress={() => navigation.navigate('SearchScreen')}
        >
          <Text style={styles.searchPlaceholder}> Tìm kiếm sản phẩm...</Text>
        </TouchableOpacity>
      </View>
      <ScrollView>
        {/* Banner quảng cáo */}
        {banners.length > 0 && banners[bannerIndex] && (
          <View style={styles.bannerImgWrap}>
            <Image
              source={(() => {
                const bannerImg = banners[bannerIndex].image;
                // console.log('Banner Image URL before validation:', bannerImg); // Removed for long base64
                if (typeof bannerImg === 'string' && (bannerImg.startsWith('data:image') || bannerImg.startsWith('http://') || bannerImg.startsWith('https://'))) {
                  return { uri: bannerImg };
                } else {
                  // If it's not a valid URL or base64, fallback to default image
                  return require('../assets/errorimg.webp'); 
                }
              })()}
              style={styles.bannerImg}
              resizeMode="cover"
              onError={(e) => {
                console.error('Banner image loading error:', e.nativeEvent.error, 'for URL:', banners[bannerIndex].image);
                setBannerIndex((prevIndex) => (prevIndex + 1) % banners.length); // Try next banner on error
              }}
            />
          </View>
        )}
        {/* Danh mục sản phẩm (tabs) */}
        <View style={styles.categoriesContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            <TouchableOpacity
              style={[
                styles.categoryTab,
                selectedCategory === 'All' && styles.selectedCategoryTab
              ]}
              onPress={() => {
                if (selectedCategory !== 'All') {
                  setSelectedCategory('All');
                  // Reset pagination state for all products
                  setPage(1);
                  setHasMore(true);
                  setProducts([]);
                  fetchData(); // Reset to all products
                }
              }}
            >
              <View style={styles.categoryImageContainer}>
                <Image
                  source={require('../assets/all.jpg')}
                  style={styles.categoryImage}
                />
              </View>
              <Text style={[
                styles.categoryText,
                selectedCategory === 'All' && styles.selectedCategoryText
              ]}>Tất cả</Text>
            </TouchableOpacity>
            {categories.map((category) => (
                          <TouchableOpacity
              key={category._id}
              style={[
                styles.categoryTab,
                selectedCategory === category._id && styles.selectedCategoryTab
              ]}
              onPress={() => {
                if (selectedCategory !== category._id) {
                  setSelectedCategory(category._id);
                  // Category products don't use pagination, so just fetch all products
                  fetchProductsByCategory(category._id);
                }
              }}
            >
                <View style={styles.categoryImageContainer}>
                  <Image
                    source={(() => {
                      const categoryImg = category.category_image;
                      if (typeof categoryImg === 'string' && 
                          (categoryImg.startsWith('http://') || 
                           categoryImg.startsWith('https://') || 
                           categoryImg.startsWith('data:image'))) {
                        return { uri: categoryImg };
                      }
                      return require('../assets/errorimg.webp');
                    })()}
                    style={styles.categoryImage}
                    onError={(e) => {
                      console.error('Category image loading error:', e.nativeEvent.error, 'for URL:', category.category_image);
                      e.target.setNativeProps({
                        source: require('../assets/errorimg.webp')
                      });
                    }}
                  />
                </View>
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category._id && styles.selectedCategoryText
                ]}>{category.category_name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
       
       {selectedCategory === 'All' && (
  <>
    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 8}}>
      <Text style={{fontSize: 16, fontFamily: 'Nunito-Black', color: '#DB6A34'}}>Top sale</Text>
      {topTotalPages > 1 && (
        <TouchableOpacity onPress={() => setTopPage((prev) => (prev + 1) % topTotalPages)}>
          <Text style={{color: '#007AFF', fontFamily: 'Nunito-Black'}}>Xem thêm <Icon name="arrow-forward" size={16} color="#007AFF" /></Text>
        </TouchableOpacity>
      )}
    </View>

    <FlatList
      data={topProducts}
      horizontal
      keyExtractor={item => item._id}
      showsHorizontalScrollIndicator={false}
      style={{marginVertical: 8, marginLeft: 12}}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={{
            width: 170,
            marginRight: 12,
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 8,
           
           
          }}
          onPress={() => navigation.navigate('ProductDetailScreen', { product: item })}
        >
          <Image
            source={
              typeof item.product_image === 'string' && item.product_image.startsWith('/uploads_product/')
                ? { uri: `${API_BASE_URL}${item.product_image}` }
                : (typeof item.product_image === 'string' && (item.product_image.startsWith('http://') || item.product_image.startsWith('https://') || item.product_image.startsWith('data:image')))
                  ? { uri: item.product_image }
                  : require('../assets/errorimg.webp')
            }
            style={{ width: 150, height: 150, borderRadius: 8, marginBottom: 6 }}
            resizeMode="cover"
          />
          <Text style={{fontSize: 13, fontFamily: 'Nunito-Black', color: '#222'}} numberOfLines={2}>{item.product_name}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4, width: '100%'}}>
          <Text style={{fontSize: 12, color: '#DB6A34', fontFamily: 'Nunito-Black', marginRight: 20}}>{item.product_price?.toLocaleString('vi-VN')}Đ</Text>
          <Text style={{fontSize: 11, color: '#888', fontFamily: 'Nunito-Medium'}}>Đã bán: {item.product_sold || 0}</Text>
          </View>
          
        </TouchableOpacity>
      )}
    />
  </>
)}

    {selectedCategory === 'All' && (
  <>
    {/* ...Top sale code... */}
    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 8}}>
  <Text style={{fontSize: 16, fontFamily: 'Nunito-Black', color: '#3498db'}}>Sản phẩm mới</Text>
  {newTotalPages > 1 && (
    <TouchableOpacity onPress={() => setNewPage((prev) => (prev + 1) % newTotalPages)}>
      <Text style={{color: '#007AFF', fontFamily: 'Nunito-Black'}}>See All <Icon name="arrow-forward" size={16} color="#007AFF" /></Text>
    </TouchableOpacity>
  )}
</View>
    <FlatList
      data={newProductsPage}
      horizontal
      keyExtractor={item => item._id}
      showsHorizontalScrollIndicator={false}
      style={{marginVertical: 8, marginLeft: 12}}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={{
            width: 140,
            marginRight: 12,
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 8,
            alignItems: 'center',
           
          }}
          onPress={() => navigation.navigate('ProductDetailScreen', { product: item })}
        >
          <Image
            source={
              typeof item.product_image === 'string' && item.product_image.startsWith('/uploads_product/')
                ? { uri: `${API_BASE_URL}${item.product_image}` }
                : (typeof item.product_image === 'string' && (item.product_image.startsWith('http://') || item.product_image.startsWith('https://') || item.product_image.startsWith('data:image')))
                  ? { uri: item.product_image }
                  : require('../assets/errorimg.webp')
            }
            style={{ width: 100, height: 100, borderRadius: 8, marginBottom: 6 }}
            resizeMode="cover"
          />
          <Text style={{fontSize: 13, fontFamily: 'Nunito-Black', color: '#222'}} numberOfLines={2}>{item.product_name}</Text>
          <Text style={{fontSize: 12, color: '#DB6A34', fontFamily: 'Nunito-Black'}}>{item.product_price?.toLocaleString('vi-VN')}Đ</Text>
        </TouchableOpacity>
      )}
    />
  </>
)}

 {selectedCategory === 'All' && (
          <Text style={styles.recomentText}>Có thể bạn sẽ thích</Text>
        )}
        <FlatList
          data={filteredProducts}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          numColumns={numColumns}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreProducts}
          onEndReachedThreshold={0.1}
          ListFooterComponent={renderFooter}
          scrollEnabled={false}
          removeClippedSubviews={false}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      </ScrollView>
      {/* Bottom Navigation: các icon điều hướng nhanh */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => {
          setActiveTab('Home');
          navigation.navigate('HomeScreen');
        }}>
          <Icon name={activeTab === 'Home' ? 'home' : 'home-outline'} size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          setActiveTab('Search');
          navigation.navigate('SearchScreen');
        }}>
          <Icon name={activeTab === 'Search' ? 'search' : 'search-outline'} size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          setActiveTab('Cart');
          navigation.navigate('CartScreen');
        }}>
          <Icon name={activeTab === 'Cart' ? 'cart' : 'cart-outline'} size={24} color="#000" />
        </TouchableOpacity>
       
        <TouchableOpacity onPress={() => {
          setActiveTab('Profile');
          navigation.navigate('ProfileScreen');
        }}>
          <Icon name={activeTab === 'Profile' ? 'person' : 'person-outline'} size={24} color="#000" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', fontFamily: 'Nunito-Black' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  headerLogo: {
    width: 100,
    height: 40,
  },
  searchContainer: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
  },
  searchPlaceholder: {
    color: '#666',
    fontFamily: 'Nunito-Medium',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#222', letterSpacing: 1 },
  headerIcon: { fontSize: 26, color: '#222' },
  tabs: { 
    flexDirection: 'row', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderColor: '#eee',
  },
  tab: { marginRight: 16, color: '#888', fontSize: 16 },
  tabActive: { marginRight: 16, fontWeight: 'bold', color: '#000', fontSize: 16 },
  list: { padding: 12 },
  card: {
    width: ITEM_WIDTH,
    margin: 6,
    backgroundColor: '#fff',
    padding: 8,
    position: 'relative',
  },
  image: { width: '100%', height: 194, borderRadius: 12 },
  price: {fontFamily: 'Nunito-Black',color: '#DB6A34', fontSize: 13 },
  name: { color: 'black', fontSize: 14, marginTop: 2, marginBottom: 8, fontFamily: 'Nunito-Medium',  },
 
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#fff',
  },
 
  bannerImgWrap: { width: '100%', height: 234, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  bannerImg: { width: '95%', height: 234, borderRadius: 12 },
  categoriesContainer: {
    paddingVertical: 16,
    backgroundColor: '#fff',
       borderColor: '#eee',
  },
  categoriesScrollContent: {
    paddingHorizontal: 12,
  },
  categoryTab: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  selectedCategoryTab: {
    backgroundColor: '#FFF1E9',
    borderColor: '#ddd',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'Nunito-Medium'
  },
  selectedCategoryText: {
    color: '#DB6A34',
   fontFamily: 'Nunito-Black',
  },
  categoryImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  soldText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Nunito-Medium',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#ffffffff',
    shadowColor: '#000',
    
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    padding: 3,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'},

  recomentText: {
    fontSize: 16,
    marginLeft: 20,
    fontFamily: 'Nunito-Black',
    color:'#A9CFCF'
    }
});

export default HomeScreen; 