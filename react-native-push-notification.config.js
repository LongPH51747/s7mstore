module.exports = {
  // (optional) default: true
  // false: default to register, true: default to unregister
  popInitialNotification: true,

  /**
   * (optional) default: true
   * - false: schedules the local notification, will show when the app is in foreground
   * - true: schedules the local notification, will show when the app is in foreground or background
   */
  foregroundPresentationOptions: {
    alert: true,
    badge: true,
    sound: true,
  },

  /**
   * (optional) default: true
   * - false: schedules the local notification, will show when the app is in foreground
   * - true: schedules the local notification, will show when the app is in foreground or background
   */
  requestPermissions: true,
};
