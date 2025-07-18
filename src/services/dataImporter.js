import AsyncStorage from '@react-native-async-storage/async-storage';
import databaseService from './database';

class DataImporter {
  // Đảm bảo database được khởi tạo
  async ensureDatabaseInitialized() {
    if (!databaseService.database) {
      try {
        await databaseService.initDatabase();
      } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
      }
    }
  }

  // Import dữ liệu từ JSON files
  async importLocationData() {
    try {
      console.log('Starting location data import...');
      
      // Đảm bảo database được khởi tạo
      await this.ensureDatabaseInitialized();
      
      // Kiểm tra xem đã import chưa bằng AsyncStorage
      const isImported = await this.isDataImported();
      if (isImported) {
        console.log('Location data already imported, skipping...');
        return { success: true, message: 'Data already imported' };
      }

      // Import provinces
      const provincesData = await this.loadProvincesData();
      await databaseService.importProvinces(provincesData);
      console.log(`Imported ${provincesData.length} provinces`);

      // Import wards
      const wardsData = await this.loadWardsData();
      await databaseService.importWards(wardsData);
      console.log(`Imported ${wardsData.length} wards`);

      // Đánh dấu đã import bằng AsyncStorage
      await this.markDataAsImported();
      
      console.log('Location data import completed successfully');
      return { 
        success: true, 
        message: `Imported ${provincesData.length} provinces and ${wardsData.length} wards` 
      };
    } catch (error) {
      console.error('Error importing location data:', error);
      return { success: false, error: error.message };
    }
  }

  // Kiểm tra xem đã import dữ liệu chưa (sử dụng AsyncStorage)
  async isDataImported() {
    try {
      const value = await AsyncStorage.getItem('location_data_imported');
      return value === 'true';
    } catch (error) {
      console.error('Error checking import status:', error);
      return false;
    }
  }

  // Đánh dấu đã import dữ liệu (sử dụng AsyncStorage)
  async markDataAsImported() {
    try {
      await AsyncStorage.setItem('location_data_imported', 'true');
      console.log('Data import flag set to true in AsyncStorage');
    } catch (error) {
      console.error('Error marking data as imported:', error);
      throw error;
    }
  }

  // Load dữ liệu provinces từ JSON file
  async loadProvincesData() {
    try {
      // Import JSON file
      const provincesModule = require('../assets/province.json');
      console.log(`Loaded ${provincesModule.length} provinces from JSON`);
      return provincesModule;
    } catch (error) {
      console.error('Error loading provinces data:', error);
      throw new Error('Failed to load provinces data');
    }
  }

  // Load dữ liệu wards từ JSON file
  async loadWardsData() {
    try {
      // Import JSON file
      const wardsModule = require('../assets/ward.json');
      console.log(`Loaded ${wardsModule.length} wards from JSON`);
      return wardsModule;
    } catch (error) {
      console.error('Error loading wards data:', error);
      throw new Error('Failed to load wards data');
    }
  }

  // Kiểm tra trạng thái import
  async checkImportStatus() {
    try {
      const isImported = await this.isDataImported();
      if (isImported) {
        // Đảm bảo database được khởi tạo trước khi truy vấn
        await this.ensureDatabaseInitialized();
        const provinces = await databaseService.getAllProvinces();
        return {
          imported: true,
          provincesCount: provinces.length,
          message: `Data imported with ${provinces.length} provinces`
        };
      } else {
        return {
          imported: false,
          message: 'Data not imported yet'
        };
      }
    } catch (error) {
      console.error('Error checking import status:', error);
      return {
        imported: false,
        error: error.message
      };
    }
  }

  // Reset import status (để test)
  async resetImportStatus() {
    try {
      await AsyncStorage.removeItem('location_data_imported');
      console.log('Import status reset successfully in AsyncStorage');
      return { success: true };
    } catch (error) {
      console.error('Error resetting import status:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new DataImporter(); 