import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { request as apiRequest } from './api';

// Configurar cómo se comportan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    // Nota: Aunque estés en Expo Go, getExpoPushTokenAsync() sin configuración FCM/APNs extraída funcionará
    // en la medida que utilices el projectId válido. Expo se encarga si estás logueado en Expo CLI.
    // Usualmente se pasa: { projectId: Constants.expoConfig.extra.eas.projectId }
    // En este caso, usaremos el default o lo sacaremos del manifest si está configurado.
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Push Token (Expo):', token);
      
      // Registrar el token en el backend
      if (token) {
        await apiRequest('/notifications/register', {
          method: 'POST',
          body: JSON.stringify({ token })
        });
        console.log('Token successfully registered on backend');
      }
    } catch (error) {
      console.log('Error getting Expo push token:', error);
      try {
        // Fallback: intentar al menos obtener el device token
        // Esto permite guardar ALGO en desarrollo, aunque no sea un Expo push token válido para sus servidores
        // Ojo: getDevicePushTokenAsync() devuelve un device push token nativo (FCM/APNS)
        token = (await Notifications.getDevicePushTokenAsync()).data;
        console.log('Device Push Token (Fallback):', token);
      } catch (devError) {
        console.log('Tambien falló Device token:', devError);
      }
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
