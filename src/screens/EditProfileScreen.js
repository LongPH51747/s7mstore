import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import axios from 'axios';
import { API_BASE_URL, API_HEADERS, API_ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'react-native-image-picker';
import Loading from '../components/Loading';

const EditProfileScreen = ({ route }) => {
  const navigation = useNavigation();
  const { user } = route.params || {};
  const [fullname, setFullname] = useState(user?.fullname || '');
  const [username, setUsername] = useState(user?.username || '');
  const [avatar, setAvatar] = useState(user?.photoURL || user?.avatar || 'https://via.placeholder.com/150');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const handlePickAvatar = () => {
    ImagePicker.launchImageLibrary(
      { mediaType: 'photo', quality: 0.7 },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Lỗi', 'Không thể chọn ảnh');
          return;
        }
        const uri = response.assets?.[0]?.uri;
        if (uri) setAvatar(uri); // Lưu URI local tạm thời để hiển thị
      }
    );
  };

  const handleSave = async () => {
    // Validation
    if (!username.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên đăng nhập');
      return;
    }
    if (!fullname.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
      return;
    }

    setLoading(true);
    setLoadingText('Đang cập nhật...');
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = user._id;
      if (!userId) throw new Error('Không tìm thấy ID người dùng');

      // Chuẩn bị dữ liệu để gửi
      const formData = new FormData();
      formData.append('fullname', fullname);
      formData.append('username', username);

      // Xử lý avatar
      if (avatar.startsWith('file://')) {
        // Avatar là file local, thêm vào FormData
        const avatarFile = {
          uri: avatar,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        };
        formData.append('avatar', avatarFile);
      } else {
        // Avatar là URL, gửi như string
        formData.append('avatar', avatar);
      }

      // Gửi request PUT để cập nhật thông tin người dùng
      const response = await axios.put(
        API_ENDPOINTS.USERS.UPDATE_INFO(userId),
        formData,
        { 
          headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}` 
          } 
        }
      );

      // Cập nhật userInfo trong AsyncStorage
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        const updatedUserInfo = {
          ...userInfo,
          fullname: fullname,
          username: username,
          photoURL: response.data?.avatar || avatar,
          avatar: response.data?.avatar || avatar,
          displayName: fullname,
        };
        await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
      }

      Alert.alert('Thành công', 'Cập nhật thông tin thành công!');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Lỗi', error?.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chỉnh sửa hồ sơ</Text>

      {/* Avatar Section */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <TouchableOpacity onPress={handlePickAvatar}>
          <Image
            source={(() => {
              const avatarImg = avatar;
              if (typeof avatarImg === 'string' && avatarImg.startsWith('uploads_avatar/')) {
                return { uri: `${API_BASE_URL}/${avatarImg}` };
              } else if (typeof avatarImg === 'string' && (avatarImg.startsWith('http://') || avatarImg.startsWith('https://') || avatarImg.startsWith('data:image') || avatarImg.startsWith('file://'))) {
                return { uri: avatarImg };
              } else {
                return { uri: 'https://via.placeholder.com/150' };
              }
            })()}
            style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 8, borderWidth: 2, borderColor: '#007bff' }}
            onError={(e) => {
              console.error('Edit profile avatar image loading error:', e.nativeEvent.error, 'for URL:', avatar);
              e.target.setNativeProps({
                source: { uri: 'https://via.placeholder.com/150' }
              });
            }}
          />
          <Text style={{ color: '#007bff', textAlign: 'center' }}>Đổi ảnh đại diện</Text>
        </TouchableOpacity>
      </View>

      {/* Username Input */}
      <TextInput
        style={styles.input}
        placeholder="Tên đăng nhập"
        value={username}
        onChangeText={setUsername}
      />

      {/* Fullname Input */}
      <TextInput
        style={styles.input}
        placeholder="Họ và tên"
        value={fullname}
        onChangeText={setFullname}
      />

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Lưu</Text>}
      </TouchableOpacity>

      <Loading visible={loading} text={loadingText} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default EditProfileScreen;