import { useState, useEffect } from 'react';
import databaseService from '../services/database';

export const useLocationData = () => {
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Đảm bảo database được khởi tạo
  const ensureDatabaseInitialized = async () => {
    if (!databaseService.database) {
      try {
        await databaseService.initDatabase();
      } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
      }
    }
  };

  // Lấy tất cả provinces
  const loadProvinces = async () => {
    try {
      setLoading(true);
      await ensureDatabaseInitialized();
      const provincesData = await databaseService.getAllProvinces();
      setProvinces(provincesData);
      setError(null);
    } catch (err) {
      console.error('Error loading provinces:', err);
      setError('Không thể tải danh sách tỉnh/thành phố');
    } finally {
      setLoading(false);
    }
  };

  // Lấy wards theo province
  const loadWardsByProvince = async (provinceId) => {
    try {
      setLoading(true);
      await ensureDatabaseInitialized();
      const wardsData = await databaseService.getWardsByProvince(provinceId);
      setWards(wardsData);
      setError(null);
    } catch (err) {
      console.error('Error loading wards:', err);
      setError('Không thể tải danh sách quận/huyện');
    } finally {
      setLoading(false);
    }
  };

  // Load provinces khi component mount
  useEffect(() => {
    loadProvinces();
  }, []);

  return {
    provinces,
    wards,
    loading,
    error,
    loadProvinces,
    loadWardsByProvince,
    refreshProvinces: loadProvinces
  };
}; 