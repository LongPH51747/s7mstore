import SQLite from 'react-native-sqlite-storage';

// Cấu hình SQLite
SQLite.DEBUG(true);
SQLite.enablePromise(true);

class DatabaseService {
  constructor() {
    this.database = null;
    this.initializing = false;
  }

  // Khởi tạo database
  async initDatabase() {
    // Nếu đang khởi tạo, đợi
    if (this.initializing) {
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.database;
    }

    // Nếu đã khởi tạo, trả về
    if (this.database) {
      return this.database;
    }

    try {
      this.initializing = true;
      this.database = await SQLite.openDatabase({
        name: 's7mstore.db',
        location: 'default',
      });
      
      console.log('Database initialized successfully');
      await this.createTables();
      return this.database;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  // Tạo các bảng cần thiết
  async createTables() {
    try {
      // Bảng provinces (tỉnh/thành phố)
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS provinces (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL
        );
      `);

      // Bảng wards (quận/huyện/xã/phường)
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS wards (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          id_province TEXT NOT NULL,
          FOREIGN KEY (id_province) REFERENCES provinces (id)
        );
      `);

      console.log('Tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  // Import dữ liệu provinces
  async importProvinces(provincesData) {
    try {
      await this.database.executeSql('BEGIN TRANSACTION');
      
      for (const province of provincesData) {
        await this.database.executeSql(
          'INSERT OR REPLACE INTO provinces (id, name, type) VALUES (?, ?, ?)',
          [province.id, province.name, province.type]
        );
      }
      
      await this.database.executeSql('COMMIT');
      console.log(`Imported ${provincesData.length} provinces successfully`);
    } catch (error) {
      await this.database.executeSql('ROLLBACK');
      console.error('Error importing provinces:', error);
      throw error;
    }
  }

  // Import dữ liệu wards
  async importWards(wardsData) {
    try {
      await this.database.executeSql('BEGIN TRANSACTION');
      
      for (const ward of wardsData) {
        await this.database.executeSql(
          'INSERT OR REPLACE INTO wards (id, name, type, id_province) VALUES (?, ?, ?, ?)',
          [ward.id, ward.name, ward.type, ward.id_province]
        );
      }
      
      await this.database.executeSql('COMMIT');
      console.log(`Imported ${wardsData.length} wards successfully`);
    } catch (error) {
      await this.database.executeSql('ROLLBACK');
      console.error('Error importing wards:', error);
      throw error;
    }
  }

  // Lấy tất cả provinces
  async getAllProvinces() {
    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM provinces ORDER BY name'
      );
      
      const provinces = [];
      for (let i = 0; i < results.rows.length; i++) {
        provinces.push(results.rows.item(i));
      }
      
      return provinces;
    } catch (error) {
      console.error('Error getting provinces:', error);
      throw error;
    }
  }

  // Lấy wards theo province
  async getWardsByProvince(provinceId) {
    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM wards WHERE id_province = ? ORDER BY name',
        [provinceId]
      );
      
      const wards = [];
      for (let i = 0; i < results.rows.length; i++) {
        wards.push(results.rows.item(i));
      }
      
      return wards;
    } catch (error) {
      console.error('Error getting wards by province:', error);
      throw error;
    }
  }

  // Đóng database
  async closeDatabase() {
    try {
      if (this.database) {
        await this.database.close();
        this.database = null;
        console.log('Database closed successfully');
      }
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
}

export default new DatabaseService(); 