import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotificationsAsync } from './src/services/pushNotificationService';

const prefix = Linking.createURL('/');

const RAILWAY_URL = 'https://miconsultorioapp-production.up.railway.app';

const linking = {
  // Maneja deep links móviles y URL webs a la vez
  prefixes: [prefix, 'miconsultorio://', RAILWAY_URL],
  config: {
    screens: {
      // Rutas Públicas e Iniciales
      RootLanding: '',
      Login: 'login',
      SuperAdmin: 'superadmin',
      Booking: 'booking/:slug',        // ← /booking/cosmefulano → BookingScreen + {slug}
      DoctorLanding: ':slug',           // ← /cosmefulano → DoctorLanding + {slug}
      
      // Rutas SaaS (Requieren Auth JWT subyacente del Stack)
      Home: 'dashboard',
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

import { GoogleOAuthWebProvider } from './src/components/WebGoogleAuth';

const GOOGLE_CLIENT_ID = '274672585034-hs6h77joqv9b20tu2mbk3ri0c88carn0.apps.googleusercontent.com';

export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <GoogleOAuthWebProvider clientId={GOOGLE_CLIENT_ID}>
       <NavigationContainer linking={linking}>
         <AppNavigator />
       </NavigationContainer>
    </GoogleOAuthWebProvider>
  );
}
