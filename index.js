/**
 * @format
 */

import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import App from './App';
import ProfileScreen from './screens/ProfileScreen';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
