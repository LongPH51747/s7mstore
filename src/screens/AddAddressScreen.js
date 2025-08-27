import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Checkbox } from 'react-native-paper';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api';
import { useLocationData } from '../hooks/useLocationData';

const AddAddressScreen = ({ route }) => {
  const navigation = useNavigation();
  const { provinces, wards, loading, loadWardsByProvince } = useLocationData();
  
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [loadingWard, setLoadingWard] = useState(false);
  const [error, setError] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [latitude, setLatitude] = useState(21.028511); // Hà Nội mặc định
  const [longitude, setLongitude] = useState(105.804817);
  const [locationLoading, setLocationLoading] = useState(false);

  // Set province đầu tiên khi provinces được load
  useEffect(() => {
    // Không tự động chọn tỉnh đầu tiên nữa
    // if (provinces.length > 0 && !selectedProvince) {
    //   setSelectedProvince(provinces[0].id);
    // }
  }, [provinces]);

  // Load wards khi province thay đổi
  useEffect(() => {
    if (selectedProvince) {
      loadWardsForProvince(selectedProvince);
    }
  }, [selectedProvince]);

  // Set ward đầu tiên khi wards được load
  useEffect(() => {
    if (wards.length > 0 && !selectedWard) {
      setSelectedWard(wards[0].id);
    }
  }, [wards, selectedWard]);

  const loadWardsForProvince = async (provinceId) => {
    try {
      setLoadingWard(true);
      setSelectedWard('');
      await loadWardsByProvince(provinceId);
    } catch (err) {
      setError('Không thể tải danh sách xã/phường');
      Alert.alert('Lỗi', 'Không thể tải danh sách xã/phường');
    } finally {
      setLoadingWard(false);
    }
  };

  useEffect(() => {
    if (route.params?.selectedLat && route.params?.selectedLng) {
      setLatitude(route.params.selectedLat);
      setLongitude(route.params.selectedLng);
      setLocationLoading(false);
      console.log('Tọa độ mới được cập nhật:', route.params.selectedLat, route.params.selectedLng);
    }
  }, [route.params?.selectedLat, route.params?.selectedLng]);

  // Reset loading state khi focus lại màn hình
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setLocationLoading(false);
    });

    return unsubscribe;
  }, [navigation]);

  const validate = () => {
    if (!fullName.trim() || !phoneNumber.trim() || !addressDetail.trim() || !selectedProvince || !selectedWard) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin.');
      return false;
    }
    if (!/^0\d{9}$/.test(phoneNumber.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ.');
      return false;
    }
    // Kiểm tra tọa độ có hợp lệ không
    if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
      Alert.alert('Lỗi', 'Tọa độ không hợp lệ. Vui lòng chọn vị trí trên bản đồ.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      const userInfo = JSON.parse(userInfoString);
      if (!userInfo || !userInfo._id) throw new Error('Không tìm thấy thông tin người dùng');
      
      // Lấy tên tỉnh và xã từ SQLite data
      const provinceName = provinces.find(p => p.id === selectedProvince)?.name || '';
      const provinceType = provinces.find(p => p.id === selectedProvince)?.type || '';
      const wardName = wards.find(w => w.id === selectedWard)?.name || '';
      const wardType = wards.find(w => w.id === selectedWard)?.type || '';
      
      // Địa chỉ chi tiết: {addressDetail}, {wardName}, {provinceName}
      const cleanAddressDetail = addressDetail.trim();
      const fullAddress = cleanAddressDetail ? `${cleanAddressDetail}, ${wardName}, ${provinceName}` : `${wardName}, ${provinceName}`;
      
      const body = {
        fullName: fullName.trim(),
        addressDetail: fullAddress,
        phone_number: phoneNumber.trim(),
        is_default: isDefault,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      };
      
      console.log('Gửi dữ liệu địa chỉ:', body);
      
      const response = await fetch(API_ENDPOINTS.ADDRESS.CREATE(userInfo._id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errData = await response.json();
        console.log('Lỗi khi thêm địa chỉ:', errData);
        throw new Error(errData.message || 'Không thể thêm địa chỉ');
      }
      
      const result = await response.json();
      console.log('Thêm địa chỉ thành công:', result);
      Alert.alert('Thành công', 'Đã thêm địa chỉ mới!', [
        { text: 'OK', onPress: () => navigation.navigate('AddressScreen', { refresh: true }) }
      ]);
    } catch (err) {
      console.log('Lỗi khi lưu địa chỉ:', err);
      Alert.alert('Lỗi', err.message || 'Không thể lưu địa chỉ.');
    } finally {
      setSaving(false);
    }
  };

  const handleChooseLocation = () => {
    // Kiểm tra xem đã chọn tỉnh và xã chưa
    if (!selectedProvince || !selectedWard) {
      Alert.alert('Lỗi', 'Vui lòng chọn Tỉnh/Thành phố và Xã/Phường trước khi chọn vị trí trên bản đồ.');
      return;
    }

    setLocationLoading(true);
    
    // Lấy các trường cần thiết để truyền sang MapScreen
    const provinceName = provinces.find(p => p.id === selectedProvince)?.name || '';
    const provinceType = provinces.find(p => p.id === selectedProvince)?.type || '';
    const wardName = wards.find(w => w.id === selectedWard)?.name || '';
    const wardType = wards.find(w => w.id === selectedWard)?.type || '';
    
    navigation.navigate('MapScreen', {
      addressDetail,
      wardType,
      wardName,
      provinceType,
      provinceName,
      fromScreen: 'AddAddress',
      currentLat: latitude,
      currentLng: longitude,
    });
  };

  // Sắp xếp và nhóm tỉnh/thành phố theo chữ cái đầu
  const sortedProvinces = React.useMemo(() => {
    return [...provinces].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [provinces]);

  const provincePickerItems = React.useMemo(() => {
    const items = [
      <Picker.Item
        key="province-placeholder"
        label="Tỉnh/Thành phố"
        value=""
        color="#888"
        enabled={false}
      />
    ];
    let lastProvinceChar = '';
    sortedProvinces.forEach((province) => {
      const firstChar = province.name[0].toUpperCase();
      if (firstChar !== lastProvinceChar) {
        items.push(
          <Picker.Item
            key={`header-province-${firstChar}`}
            label={`--- ${firstChar} ---`}
            value={`_header_province_${firstChar}`}
            enabled={false}
            color="#888"
          />
        );
        lastProvinceChar = firstChar;
      }
      items.push(
        <Picker.Item
          key={province.id}
          label={`${province.name} (${province.type})`}
          value={province.id}
          color="#000"
        />
      );
    });
    return items;
  }, [sortedProvinces]);

  // Sắp xếp và nhóm xã/phường theo chữ cái đầu
  const sortedWards = React.useMemo(() => {
    return [...wards].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [wards]);

  const wardPickerItems = React.useMemo(() => {
    const items = [];
    let lastWardChar = '';
    sortedWards.forEach((ward) => {
      const firstChar = ward.name[0].toUpperCase();
      if (firstChar !== lastWardChar) {
        items.push(
          <Picker.Item
            key={`header-ward-${firstChar}`}
            label={`--- ${firstChar} ---`}
            value={`_header_ward_${firstChar}`}
            enabled={false}
            color="#888"
          />
        );
        lastWardChar = firstChar;
      }
      items.push(
        <Picker.Item
          key={ward.id}
          label={`${ward.name} (${ward.type})`}
          value={ward.id}
          color="#000"
        />
      );
    });
    return items;
  }, [sortedWards]);

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
        <Text style={[styles.headerTitle, {color: '#000'}]}>Thêm địa chỉ mới</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#000" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled">
        {/* Province */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tỉnh/Thành phố</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedProvince}
              onValueChange={(itemValue) => setSelectedProvince(itemValue)}
              style={styles.picker}
            >
              {provincePickerItems}
            </Picker>
          </View>
        </View>
        {/* Ward */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Xã/Phường</Text>
          <View style={styles.pickerWrapper}>
            {loadingWard ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              selectedProvince && wardPickerItems.length > 0 ? (
                <Picker
                  selectedValue={selectedWard}
                  onValueChange={(itemValue) => setSelectedWard(itemValue)}
                  style={styles.picker}
                >
                  {wardPickerItems}
                </Picker>
              ) : null
            )}
          </View>
        </View>
        {/* Address detail */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Địa chỉ cụ thể</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập địa chỉ cụ thể"
            value={addressDetail}
            onChangeText={setAddressDetail}
          />
          {/* Map button */}
          <TouchableOpacity
            style={[styles.mapButton, locationLoading && styles.mapButtonDisabled]}
            onPress={handleChooseLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#1A73E8" style={{ marginRight: 8 }} />
            ) : (
              <Text style={styles.mapButtonText}>📍 Chọn vị trí trên bản đồ</Text>
            )}
          </TouchableOpacity>
          {/* Hiển thị tọa độ hiện tại nếu có */}
          {(latitude !== 21.028511 || longitude !== 105.804817) && (
            <Text style={styles.coordinatesText}>
              Tọa độ: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </Text>
          )}
        </View>
        {/* Full name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Họ tên</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập họ tên"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>
        {/* Phone number */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập số điện thoại"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>
        {/* Default address checkbox */}
        <View style={styles.checkboxRow}>
          <Checkbox
            status={isDefault ? 'checked' : 'unchecked'}
            onPress={() => setIsDefault(!isDefault)}
            color="#1A73E8"
          />
          <Text style={styles.checkboxLabel}>Đặt làm địa chỉ mặc định</Text>
        </View>
        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Đang lưu...' : 'Lưu địa chỉ'}</Text>
        </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FA', // màu nền dịu mắt
    padding: 0,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F0F1F3',
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  headerRight: {
    width: 40,
  },
  formGroup: {
    marginBottom: 20,
    marginHorizontal: 18,
  },
  label: {
    fontSize: 15,
    marginBottom: 6,
    color: '#444',
    fontWeight: '600',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E3E4E5',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
  },
  picker: {
    height: 48,
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E3E4E5',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
    color: '#333',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#1A73E8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginHorizontal: 18,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    marginHorizontal: 18,
  },
  checkboxLabel: {
    fontSize: 16,
    marginLeft: 8,
    color: '#444',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E3E4E5',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
  },
  mapIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: '#1A73E8',
  },
  mapButtonText: {
    fontSize: 14,
    color: '#1A73E8',
    fontWeight: '600',
  },
  mapButtonDisabled: {
    opacity: 0.6,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default AddAddressScreen;
