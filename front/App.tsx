import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotificationsAsync } from './src/services/pushNotificationService';

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix, 'miconsultorio://'],
  config: {
    screens: {
      Turnos: 'turnos',
      PacienteDetail: 'paciente/:id', 
      TurnoDetail: 'turno/:id',
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url != null) return url;
    
    const response = await Notifications.getLastNotificationResponseAsync();
    const data = response?.notification.request.content.data;
    if (data) {
      if (data.screen === 'TurnoDetail' && data.turnoId) {
        return `${prefix}turno/${data.turnoId}`; 
      }
      if (data.screen === 'Turnos') {
        return `${prefix}turnos`;
      }
    }
  },
  subscribe(listener: (url: string) => void) {
    const onReceiveURL = ({ url }: { url: string }) => listener(url);
    const linkingSubscription = Linking.addEventListener('url', onReceiveURL);
    
    // Captura notificaciones presionadas mientras la app está abierta o en background
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data) {
        if (data.screen === 'TurnoDetail' && data.turnoId) {
          listener(`${prefix}turno/${data.turnoId}`);
        } else if (data.screen === 'Turnos' || data.screen === 'TurnoDetail') {
          // Fallback a 'turnos' si se pidió detalle sin ID o si dice Turnos explícitamente
          listener(`${prefix}turnos`);
        }
      }
    });

    return () => {
      linkingSubscription.remove();
      subscription.remove();
    };
  },
};

export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <NavigationContainer linking={linking}>
      <AppNavigator />
    </NavigationContainer>
  );
}
