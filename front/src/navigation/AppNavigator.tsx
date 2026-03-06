import React, { useState, useEffect, useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import PacientesScreen from '../screens/PacientesScreen';
import TurnosScreen from '../screens/TurnosScreen';
import NuevoPacienteScreen from '../screens/NuevoPacienteScreen';
import NuevoTurnoScreen from '../screens/NuevoTurnoScreen';
import HistorialScreen from '../screens/HistorialScreen';
import PacienteDetailScreen from '../screens/PacienteDetailScreen';
import TurnoDetailScreen from '../screens/TurnoDetailScreen';
import DoctorLandingScreen from '../screens/DoctorLandingScreen'; // Fase 6: Landing Pública Web/App
import SuperAdminScreen from '../screens/SuperAdminScreen'; // Fase 8: Generador de Landings
import BookingScreen from '../screens/BookingScreen';
import AvailabilityScreen from '../screens/AvailabilityScreen';
import { colors } from '../theme/colors';

// COMPONENTE INTERCEPTOR PARA WEB: Protege la ruta /login 
// Cuando el usuario recarga /login pero ya tiene token, el Stack protegido lo monta.
// Redirige silenciosamente a Home para limpiar la URL del navegador.
function LoginInterceptor({ navigation }: any) {
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        navigation.replace('Home');
      }, 100);
      return () => clearTimeout(timer);
    }, [navigation])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    // Check for token when app starts
    const bootstrapAsync = async () => {
      let token;
      let userStr;
      try {
        token = await AsyncStorage.getItem('userToken');
        userStr = await AsyncStorage.getItem('userData');
      } catch (e) {
        // Restoring token failed
      }
      setUserToken(token || null);
      setUserData(userStr ? JSON.parse(userStr) : null);
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textLight,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      {userToken == null ? (
        // 1. USUARIO NO LOGUEADO (El Default es RootLanding)
        <Stack.Group>
          <Stack.Screen name="RootLanding" component={DoctorLandingScreen} options={{ headerShown: false, title: 'Consultorio' }} />
          <Stack.Screen name="DoctorLanding" component={DoctorLandingScreen} options={{ headerShown: false, title: 'Consultorio' }} />
          <Stack.Screen name="Booking" component={BookingScreen} options={{ headerShown: true, title: 'Agendar Turno' }} />
          <Stack.Screen name="SuperAdmin" component={SuperAdminScreen} options={{ headerShown: false, title: 'Super Administrador' }} />
          
          <Stack.Screen name="Login" options={{ headerShown: false, title: 'Ingreso Doctores' }}>
            {(props) => <LoginScreen {...props} onSignIn={(token: string, user: any) => {
              setUserToken(token);
              setUserData(user);
            }} />}
          </Stack.Screen>
        </Stack.Group>
      ) : (
        // 2. USUARIO LOGUEADO (El Default es Home/Dashboard)
        <Stack.Group>
          {/* Al loguearse, como esta es la primera, cae acá por defecto */}
          <Stack.Screen name="Home" options={{ headerShown: false, title: 'Dashboard' }}>
            {(props) => <HomeScreen {...props} userName={userData?.nombres || 'Doctor'} onLogout={() => {
              setUserToken(null);
              setUserData(null);
            }} />}
          </Stack.Screen>

          {/* Rutas Privadas */}
          <Stack.Screen name="Pacientes" component={PacientesScreen} options={{ title: 'Pacientes' }} />
          <Stack.Screen name="Turnos" component={TurnosScreen} options={{ title: 'Turnos' }} />
          <Stack.Screen name="NuevoPaciente" component={NuevoPacienteScreen} options={{ title: 'Nuevo Paciente' }} />
          <Stack.Screen name="NuevoTurno" component={NuevoTurnoScreen} options={{ title: 'Nuevo Turno' }} />
          <Stack.Screen name="Historial" component={HistorialScreen} options={{ title: 'Historial de Turnos' }} />
          <Stack.Screen name="PacienteDetail" component={PacienteDetailScreen} options={{ title: 'Ficha del Paciente' }} />
          <Stack.Screen name="TurnoDetail" component={TurnoDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Availability" component={AvailabilityScreen} options={{ title: 'Horarios de Atención' }} />

          {/* Rutas Públicas Compartidas (Para que los deep links funcionen aun estando logueado) */}
          <Stack.Screen name="RootLanding" component={DoctorLandingScreen} options={{ headerShown: false, title: 'Consultorio' }} />
          <Stack.Screen name="DoctorLanding" component={DoctorLandingScreen} options={{ headerShown: false, title: 'Consultorio' }} />
          <Stack.Screen name="Booking" component={BookingScreen} options={{ headerShown: true, title: 'Agendar Turno' }} />
          <Stack.Screen name="SuperAdmin" component={SuperAdminScreen} options={{ headerShown: false, title: 'Super Administrador' }} />

          {/* Interceptar /login en Web: si el usuario recarga o termina el logueo, redirige suavementre al Home y limpia la URL */}
          <Stack.Screen name="Login" component={LoginInterceptor} options={{ headerShown: false }} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

