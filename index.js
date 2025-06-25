import { AppRegistry } from 'react-native';
import App from './App.tsx';
import { name as appName } from './app.json';
import { initializeSdks } from './src/utils/initializeSdks';

// Khởi tạo SDK ngay khi ứng dụng bắt đầu
initializeSdks();

AppRegistry.registerComponent(appName, () => App);