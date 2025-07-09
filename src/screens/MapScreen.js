import Geolocation from '@react-native-community/geolocation';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Button, Dimensions, Alert, Image, ActivityIndicator } from 'react-native';
import MapView from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const MARKER_WIDTH = 48;
const MARKER_HEIGHT = 48;
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY'; // điền key của bạn

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
    latitude,
    longitude,
    addressDetail,
    selectedWard,
    selectedDistrict,
    selectedProvince,
    wards = [],
    districts = [],
    provinces = [],
  } = route.params || {};

  const [region, setRegion] = useState({
    latitude: latitude || 21.028511,
    longitude: longitude || 105.804817,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLocation = async () => {
      setLoading(true);
      let location = null;
      // 1. Nếu có đủ thông tin địa chỉ, thử geocode
      if (addressDetail && selectedWard && selectedDistrict && selectedProvince) {
        let address = `${addressDetail}, ${wards.find(w => w.WardCode?.toString() === selectedWard)?.WardName || ''}, ${districts.find(d => d.DistrictID?.toString() === selectedDistrict)?.DistrictName || ''}, ${provinces.find(p => p.ProvinceID?.toString() === selectedProvince)?.ProvinceName || ''}`;
        location = await getGeocode(address);
        // 2. Nếu không có, thử với phường/xã, quận/huyện, tỉnh/thành
        if (!location) {
          address = `${wards.find(w => w.WardCode?.toString() === selectedWard)?.WardName || ''}, ${districts.find(d => d.DistrictID?.toString() === selectedDistrict)?.DistrictName || ''}, ${provinces.find(p => p.ProvinceID?.toString() === selectedProvince)?.ProvinceName || ''}`;
          location = await getGeocode(address);
        }
        // 3. Nếu không có, thử với quận/huyện, tỉnh/thành
        if (!location) {
          address = `${districts.find(d => d.DistrictID?.toString() === selectedDistrict)?.DistrictName || ''}, ${provinces.find(p => p.ProvinceID?.toString() === selectedProvince)?.ProvinceName || ''}`;
          location = await getGeocode(address);
        }
      }
      // 4. Nếu vẫn không có, lấy vị trí hiện tại
      if (!location) {
        console.log('Không geocode được, thử lấy vị trí hiện tại của người dùng...');
        await new Promise((resolve) => {
          Geolocation.getCurrentPosition(
            pos => {
              location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              console.log('Lấy được vị trí hiện tại:', location);
              resolve();
            },
            err => {
              console.log('Không lấy được vị trí hiện tại:', err);
              resolve();
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
          );
        });
      }
      // 5. Nếu vẫn không có, dùng vị trí mặc định
      if (!location) {
        console.log('Không lấy được vị trí nào, dùng vị trí mặc định Hà Nội');
        location = { lat: 21.028511, lng: 105.804817 };
      }
      console.log('Tọa độ cuối cùng sẽ hiển thị trên bản đồ:', location);
      // CHUẨN HÓA KEY CHO REGION
      setRegion(r => ({
        ...r,
        latitude: location.lat !== undefined ? location.lat : location.latitude,
        longitude: location.lng !== undefined ? location.lng : location.longitude,
      }));
      setLoading(false);
    };
    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = () => {
    navigation.navigate({
      name: route.params?.fromScreen || 'AddAddress',
      params: {
        selectedLat: region.latitude,
        selectedLng: region.longitude,
      },
      merge: true,
    });
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