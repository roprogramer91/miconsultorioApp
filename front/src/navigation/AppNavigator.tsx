import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
  return (
    <Stack.Navigator
      initialRouteName="Home"
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
    </Stack.Navigator>
  );
}
