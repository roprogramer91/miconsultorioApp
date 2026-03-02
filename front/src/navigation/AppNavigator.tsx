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
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for token when app starts
    const bootstrapAsync = async () => {
      let token;
      try {
        token = await AsyncStorage.getItem('userToken');
      } catch (e) {
        // Restoring token failed
      }
      setUserToken(token || null);
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
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.textLight,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {userToken == null ? (
        // No token found, user isn't signed in
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
          initialParams={{ onSignIn: (token: string) => setUserToken(token) }}
        />
      ) : (
        // User is signed in
        <>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ headerShown: false }} 
          />
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
        </>
      )}
    </Stack.Navigator>
  );
}
