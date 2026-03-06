import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
        // 1. RUTAS PÚBLICAS Y LOGIN (Sin JWT)
        <Stack.Group>
          {/* La primera pantalla de este grupo es la que carga por defecto cuando no hay sesión */}
          <Stack.Screen 
            name="RootLanding" 
            component={DoctorLandingScreen} 
            options={{ headerShown: false, title: 'Consultorio' }} 
          />
          <Stack.Screen 
            name="SuperAdmin" 
            component={SuperAdminScreen} 
            options={{ headerShown: false, title: 'Super Administrador' }} 
          />
          <Stack.Screen 
            name="DoctorLanding" 
            component={DoctorLandingScreen} 
            options={{ headerShown: false, title: 'Consultorio' }} 
          />
          <Stack.Screen 
            name="Booking" 
            component={BookingScreen} 
            options={{ headerShown: true, title: 'Agendar Turno' }} 
          />
          <Stack.Screen name="Login" options={{ headerShown: false, title: 'Ingreso Doctores' }}>
            {(props) => <LoginScreen {...props} onSignIn={(token: string, user: any) => {
              setUserToken(token);
              setUserData(user);
            }} />}
          </Stack.Screen>
        </Stack.Group>
      ) : (
        // 2. RUTAS PROTEGIDAS (SaaS del Doctor)
        <Stack.Group>
          {/* Al entrar al modo logueado, Home es la primera y se carga por defecto */}
          <Stack.Screen 
            name="Home" 
            options={{ headerShown: false, title: 'Dashboard' }} 
          >
            {(props) => <HomeScreen {...props} userName={userData?.nombres || 'Doctor'} onLogout={() => {
              setUserToken(null);
              setUserData(null);
            }} />}
          </Stack.Screen>
          <Stack.Screen 
            name="Pacientes" 
            component={PacientesScreen} 
            options={{ title: 'Pacientes' }} 
          />
          <Stack.Screen 
            name="Turnos" 
            component={TurnosScreen} 
            options={{ title: 'Turnos' }} 
          />
          <Stack.Screen 
            name="NuevoPaciente" 
            component={NuevoPacienteScreen} 
            options={{ title: 'Nuevo Paciente' }} 
          />
          <Stack.Screen 
            name="NuevoTurno" 
            component={NuevoTurnoScreen} 
            options={{ title: 'Nuevo Turno' }} 
          />
          <Stack.Screen 
            name="Historial" 
            component={HistorialScreen} 
            options={{ title: 'Historial de Turnos' }} 
          />
          <Stack.Screen 
            name="PacienteDetail" 
            component={PacienteDetailScreen} 
            options={{ title: 'Ficha del Paciente' }} 
          />
          <Stack.Screen 
            name="TurnoDetail" 
            component={TurnoDetailScreen} 
            options={{ headerShown: false }} 
          />
          {/* Permitir ver la landing y reservar incluso estando logueado, pero debajo del flujo principal */}
          <Stack.Screen 
            name="RootLandingLogueado" 
            component={DoctorLandingScreen} 
            options={{ headerShown: false, title: 'Consultorio' }} 
          />
          <Stack.Screen 
            name="DoctorLandingLogueado" 
            component={DoctorLandingScreen} 
            options={{ headerShown: false, title: 'Consultorio' }} 
          />
          <Stack.Screen 
            name="BookingLogueado" 
            component={BookingScreen} 
            options={{ headerShown: true, title: 'Agendar Turno' }} 
          />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
