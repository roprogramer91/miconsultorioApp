import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { request as apiRequest } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure Google Sign-in
// You will need to replace WEB_CLIENT_ID with your actual OAuth 2.0 Web Client ID from Google Cloud Console
GoogleSignin.configure({
  webClientId: '274672585034-hs6h77joqv9b20tu2mbk3ri0c88carn0.apps.googleusercontent.com', 
  offlineAccess: true,
});

export default function LoginScreen({ navigation, route, onSignIn }: any) {
  const insets = useSafeAreaInsets();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // El método de callback que AppNavigator nos pasa como prop para actualizar el estado global
  const handleLoginSuccess = onSignIn; 

  const signIn = async () => {
    try {
      setIsSigningIn(true);
      
      // 1. Iniciar el flujo de Google Sign In nativo
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        throw new Error('No pudimos obtener el ID Token de Google.');
      }

      // 2. Enviar el idToken a nuestro backend Node.js
      const response = await apiRequest<{token: string, usuario: any}>('/auth/google', {
        method: 'POST',
        // apiRequest ya setea Content-Type: application/json
        body: JSON.stringify({ idToken }),
      });

      // 3. Guardar el JWT (token interno) y datos del usuario en AsyncStorage
      if (response && response.token) {
        await AsyncStorage.setItem('userToken', response.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.usuario));
        
        // 4. Avisarle al Navigator que ya estamos logueados
        if (handleLoginSuccess) {
          handleLoginSuccess(response.token, response.usuario);
        }
      }

    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled the login flow');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Sign in is in progress already');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services no está disponible en este dispositivo.');
      } else {
        console.error('Error in Google Sign-In:', error);
        Alert.alert('Error de Autenticación', 'No pudimos verificar tu cuenta de Google con el servidor.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topSection}>
        <View style={styles.logoContainer}>
          <Ionicons name="medical" size={64} color={colors.primary} />
        </View>
        <Text style={styles.title}>MiConsultorio</Text>
        <Text style={styles.subtitle}>Gestión inteligente de pacientes y turnos médicos.</Text>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={styles.googleButton} 
          onPress={signIn}
          disabled={isSigningIn}
          activeOpacity={0.8}
        >
          {isSigningIn ? (
            <ActivityIndicator color="#757575" />
          ) : (
            <>
              <Ionicons name="logo-google" size={24} color="#DB4437" style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>Ingresar con Google</Text>
            </>
          )}
        </TouchableOpacity>
        
        <Text style={styles.footerText}>
          Acceso exclusivo para profesionales médicos registrados.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  bottomSection: {
    paddingBottom: 40,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 24,
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#757575',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
