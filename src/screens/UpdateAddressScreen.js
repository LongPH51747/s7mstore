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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Checkbox } from 'react-native-paper';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api';

const GHN_API = 'https://online-gateway.ghn.vn/shiip/public-api/master-data/province';
const GHN_DISTRICT_API = 'https://online-gateway.ghn.vn/shiip/public-api/master-data/district';
const GHN_WARD_API = 'https://online-gateway.ghn.vn/shiip/public-api/master-data/ward';
const GHN_TOKEN = '3b3e051d-4a82-11f0-96b4-2e25dbd34d53';

const UpdateAddressScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const address = route.params?.address;

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDistrict, setLoadingDistrict] = useState(false);
  const [loadingWard, setLoadingWard] = useState(false);
  const [error, setError] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [provinceName, setProvinceName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [wardName, setWardName] = useState('');

  // Parse address string to get address detail and location
  useEffect(() => {
    if (address) {
      setFullName(address.fullName || '');
      setPhoneNumber(address.phone_number || '');
      setIsDefault(address.is_default || false);
      
      // Parse address string to get address detail
      const addressParts = address.addressDetail.split(', ');
      if (addressParts.length >= 4) {
        setAddressDetail(addressParts[0]);
        // Province is the last part
        const provinceName = addressParts[addressParts.length - 1];
        // District is the second last part
        const districtName = addressParts[addressParts.length - 2];
        // Ward is the third last part
        const wardName = addressParts[addressParts.length - 3];
        
        // Set the location names
        setProvinceName(provinceName);
        setDistrictName(districtName);
        setWardName(wardName);
      }
    }
  }, [address]);

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(GHN_API, {
          method: 'GET',
          headers: { token: GHN_TOKEN },
        });
        if (!response.ok) throw new Error('Không thể lấy danh sách tỉnh/thành phố');
        const data = await response.json();
        setProvinces(data.data || []);
        
        // Find and set the selected province
        if (provinceName) {
          const province = data.data.find(p => p.ProvinceName === provinceName);
          if (province) {
            setSelectedProvince(province.ProvinceID.toString());
          }
        }
      } catch (err) {
        setError(err.message);
        Alert.alert('Lỗi', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProvinces();
  }, [provinceName]);

  // Fetch districts when province changes
  useEffect(() => {
    if (!selectedProvince) return;
    const fetchDistricts = async () => {
      try {
        setLoadingDistrict(true);
        setDistricts([]);
        setSelectedDistrict('');
        setWards([]);
        setSelectedWard('');
        const response = await fetch(GHN_DISTRICT_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', token: GHN_TOKEN },
          body: JSON.stringify({ province_id: parseInt(selectedProvince) })
        });
        if (!response.ok) throw new Error('Không thể lấy danh sách quận/huyện');
        const data = await response.json();
        setDistricts(data.data || []);
        
        // Find and set the selected district
        if (districtName) {
          const district = data.data.find(d => d.DistrictName === districtName);
          if (district) {
            setSelectedDistrict(district.DistrictID.toString());
          }
        }
      } catch (err) {
        setError(err.message);
        Alert.alert('Lỗi', err.message);
      } finally {
        setLoadingDistrict(false);
      }
    };
    fetchDistricts();
  }, [selectedProvince, districtName]);

  // Fetch wards when district changes
  useEffect(() => {
    if (!selectedDistrict) return;
    const fetchWards = async () => {
      try {
        setLoadingWard(true);
        setWards([]);
        setSelectedWard('');
        const response = await fetch(GHN_WARD_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', token: GHN_TOKEN },
          body: JSON.stringify({ district_id: parseInt(selectedDistrict) })
        });
        if (!response.ok) throw new Error('Không thể lấy danh sách phường/xã');
        const data = await response.json();
        setWards(data.data || []);
        
        // Find and set the selected ward
        if (wardName) {
          const ward = data.data.find(w => w.WardName === wardName);
          if (ward) {
            setSelectedWard(ward.WardCode.toString());
          }
        }
      } catch (err) {
        setError(err.message);
        Alert.alert('Lỗi', err.message);
      } finally {
        setLoadingWard(false);
      }
    };
    fetchWards();
  }, [selectedDistrict, wardName]);

  const validate = () => {
    if (!fullName.trim() || !phoneNumber.trim() || !addressDetail.trim() || !selectedProvince || !selectedDistrict || !selectedWard) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin.');
      return false;
    }
    if (!/^0\d{9}$/.test(phoneNumber.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ.');
      return false;
    }
    return true;
  };

  const handleUpdate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      const userInfo = JSON.parse(userInfoString);
      if (!userInfo || !userInfo._id) throw new Error('Không tìm thấy thông tin người dùng');

      // Lấy tên tỉnh, quận, phường
      const provinceName = provinces.find(p => p.ProvinceID.toString() === selectedProvince)?.ProvinceName || '';
      const districtName = districts.find(d => d.DistrictID.toString() === selectedDistrict)?.DistrictName || '';
      const wardName = wards.find(w => w.WardCode.toString() === selectedWard)?.WardName || '';
      const fullAddress = `${addressDetail}, ${wardName}, ${districtName}, ${provinceName}`;

      const body = {
        fullName: fullName.trim(),
        addressDetail: fullAddress,
        phone_number: phoneNumber.trim(),
        is_default: isDefault
      };

      const response = await fetch(`${API_ENDPOINTS.ADDRESS.UPDATE(address._id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Không thể cập nhật địa chỉ');
      }

      const result = await response.json();
      console.log('Cập nhật địa chỉ thành công:', result);
      Alert.alert('Thành công', 'Đã cập nhật địa chỉ!', [
        { text: 'OK', onPress: () => navigation.navigate('Address', { refresh: true }) }
      ]);
    } catch (err) {
      console.log('Lỗi khi cập nhật địa chỉ:', err);
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật địa chỉ.');
    } finally {
      setSaving(false);
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
        <Text style={[styles.headerTitle, {color: '#000'}]}>Cập nhật địa chỉ</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#000" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          {/* Province */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tỉnh/Thành phố</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedProvince}
                onValueChange={(itemValue) => setSelectedProvince(itemValue)}
                style={styles.picker}
              >
                {provinces.map((province) => (
                  <Picker.Item
                    key={province.ProvinceID}
                    label={province.ProvinceName}
                    value={province.ProvinceID.toString()}
                  />
                ))}
              </Picker>
            </View>
          </View>
          {/* District */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Quận/Huyện</Text>
            <View style={styles.pickerWrapper}>
              {loadingDistrict ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Picker
                  selectedValue={selectedDistrict}
                  onValueChange={(itemValue) => setSelectedDistrict(itemValue)}
                  style={styles.picker}
                >
                  {districts.map((district) => (
                    <Picker.Item
                      key={district.DistrictID}
                      label={district.DistrictName}
                      value={district.DistrictID.toString()}
                    />
                  ))}
                </Picker>
              )}
            </View>
          </View>
          {/* Ward */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Phường/Xã</Text>
            <View style={styles.pickerWrapper}>
              {loadingWard ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Picker
                  selectedValue={selectedWard}
                  onValueChange={(itemValue) => setSelectedWard(itemValue)}
                  style={styles.picker}
                >
                  {wards.map((ward) => (
                    <Picker.Item
                      key={ward.WardCode}
                      label={ward.WardName}
                      value={ward.WardCode.toString()}
                    />
                  ))}
                </Picker>
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
            />
            <Text style={styles.checkboxLabel}>Đặt làm địa chỉ mặc định</Text>
          </View>
          {/* Save button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Đang cập nhật...' : 'Cập nhật địa chỉ'}</Text>
          </TouchableOpacity>
        </>
      )}
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
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E3E4E5',
    borderRadius: 6,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E3E4E5',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 16,
  },
  saveBtn: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  checkboxLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
});

export default UpdateAddressScreen; 