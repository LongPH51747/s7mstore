import Geolocation from '@react-native-community/geolocation';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Button, Dimensions, Alert, Image, ActivityIndicator } from 'react-native';
import MapView from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const MARKER_WIDTH = 48;
const MARKER_HEIGHT = 48;
const GOOGLE_API_KEY = 'AIzaSyB7ETOwK6NMmiPXlHUAThIjfDbCxXq_A6c';
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

const getGeocode = async (address) => {
  console.log('Địa chỉ truyền vào geocode:', address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('Kết quả trả về từ Google:', data);
    if (data.results && data.results.length > 0) {
      return data.results[0].geometry.location;
    }
  } catch (err) {
    console.log('Lỗi khi gọi geocode:', err);
  }
  return null;
};

const MapScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    addressDetail,
    wardType,
    wardName,
    provinceType,
    provinceName,
    fromScreen,
  } = route.params || {};

  const [region, setRegion] = useState({
    latitude: 21.028511,
    longitude: 105.804817,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('🔍 [DEBUG] MapScreen useEffect triggered - Component mounted');
    console.log('🔍 [DEBUG] Route params:', route.params);
    console.log('🔍 [DEBUG] Address details:', {
      addressDetail,
      wardType,
      wardName,
      provinceType,
      provinceName,
      fromScreen
    });
    
    const fetchLatLng = async (address) => {
      try {
        const url = `${NOMINATIM_API}?q=${encodeURIComponent(address)}&format=json&limit=1`;
        const response = await fetch(url, { headers: { 'User-Agent': 's7mstore/1.0' } });
        const data = await response.json();
        if (data && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        }
        return null;
      } catch (err) {
        return null;
      }
    };

    const getLocation = async () => {
      setLoading(true);
      // 1. Thử với fullAddress
      const fullAddress = `${addressDetail}, ${wardType} ${wardName}, ${provinceType} ${provinceName}`;
      console.log('🔍 [DEBUG] Fetching location for:', fullAddress);
      let geo = await fetchLatLng(fullAddress);
      // 2. Nếu không có, thử với xã/phường + tỉnh/thành phố
      if (!geo) {
        const fallbackAddress = `${wardType} ${wardName}, ${provinceType} ${provinceName}`;
        console.log('🔍 [DEBUG] Using fallback address:', fallbackAddress);
        geo = await fetchLatLng(fallbackAddress);
      }
      // 3. Nếu vẫn không có, dùng toạ độ mặc định Hà Nội
      const lat = geo?.lat || 21.028511;
      const lng = geo?.lon || 105.804817;
      console.log('🔍 [DEBUG] Location set to:', { lat, lng });
      setRegion(r => ({ ...r, latitude: lat, longitude: lng }));
      setLoading(false);
    };
    getLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressDetail, wardType, wardName, provinceType, provinceName]);

  const handleConfirm = () => {
    console.log('🔍 [DEBUG] handleConfirm called');
    console.log('🔍 [DEBUG] fromScreen:', fromScreen);
    console.log('🔍 [DEBUG] selected coordinates:', {
      latitude: region.latitude,
      longitude: region.longitude
    });
    
    // Log tất cả screen names có sẵn
    console.log('🔍 [DEBUG] Available screen names:', navigation.getState()?.routeNames || 'Unknown');
    
    // Thử sử dụng goBack với params
    if (fromScreen) {
      console.log('🔍 [DEBUG] Navigating back to:', fromScreen);
      
      // Kiểm tra và sửa tên screen nếu cần
      let screenName = fromScreen;
      if (fromScreen === 'AddAddress') {
        screenName = 'AddAddressScreen';
        console.log('🔍 [DEBUG] Fixed screen name to:', screenName);
      }
      
      navigation.navigate({
        name: screenName,
        params: {
          selectedLat: region.latitude,
          selectedLng: region.longitude,
        },
        merge: true,
      });
    } else {
      console.log('🔍 [DEBUG] No fromScreen, using goBack');
      // Nếu không có fromScreen, sử dụng goBack với params
      navigation.goBack();
      // Gửi event để màn hình trước nhận params
      if (route.params?.onLocationSelected) {
        route.params.onLocationSelected({
          selectedLat: region.latitude,
          selectedLng: region.longitude,
        });
      }
    }
  };

  const handleCurrentLocation = () => {
    setLoading(true);
    Geolocation.getCurrentPosition(
      pos => {
        setRegion(r => ({
          ...r,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        setLoading(false);
      },
      err => {
        console.log('Lỗi khi lấy vị trí hiện tại:', err);
        Alert.alert('Lỗi', 'Không lấy được vị trí hiện tại.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
      />
      {/* Marker.png luôn ở trung tâm, điểm nhọn là điểm chọn */}
      <View pointerEvents="none" style={styles.centerMarkerWrapper}>
        <Image
          source={require('../assets/marker.png')}
          style={styles.centerMarker}
        />
      </View>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      )}
      <View style={styles.buttonContainer}>
        <Button title="Hủy" onPress={() => navigation.goBack()} color="#888" />
        <View style={{ width: 20 }} />
        <Button title="Xác nhận" onPress={handleConfirm} color="#2196F3" />
        <View style={{ width: 20 }} />
        <Button title="Chọn vị trí hiện tại của tôi" onPress={handleCurrentLocation} color="#4CAF50" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centerMarkerWrapper: {
    position: 'absolute',
    left: width / 2 - MARKER_WIDTH / 2,
    top: height / 2 - MARKER_HEIGHT + MARKER_WIDTH / 2,
    zIndex: 10,
    width: MARKER_WIDTH,
    height: MARKER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMarker: {
    width: MARKER_WIDTH,
    height: MARKER_HEIGHT,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
});

export default MapScreen; 