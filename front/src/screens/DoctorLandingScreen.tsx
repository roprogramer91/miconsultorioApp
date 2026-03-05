import React from 'react';
import { View, Text, StyleSheet, Platform, SafeAreaView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// BACKEND_URL lee de la misma variable de entorno que el resto del front
// En dev: http://localhost:3000, En prod: la URL de Railway (sin /api)
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace('/api', '');

export default function DoctorLandingScreen() {
  const route = useRoute();
  const rawSlug = (route.params as any)?.slug;
  const slug = (rawSlug && rawSlug !== 'undefined') ? rawSlug : null;

  if (!slug) {
     return (
        <View style={styles.center}>
           <Ionicons name="medical-outline" size={60} color="#6B7280" />
           <Text style={styles.errorTitle}>Perfil no especificado</Text>
        </View>
     );
  }

  const landingUrl = `${API_BASE}/${slug}`;


  // 1. Render para Navegador Web (React Native Web)
  if (Platform.OS === 'web') {
      return (
        <View style={{ flex: 1, backgroundColor: '#fff', height: '100%' }}>
            {/* @ts-ignore */}
            <iframe 
                src={landingUrl} 
                style={{ width: '100%', height: '100%', border: 'none' }} 
                title={`Landing de ${slug}`}
            />
        </View>
      );
  }

  // 2. Render para Móviles (Android / iOS app nativa)
  const { WebView } = require('react-native-webview');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <WebView 
            source={{ uri: landingUrl }} 
            style={{ flex: 1 }}
            startInLoadingState={true}
            renderLoading={() => (
                <View style={styles.centerAbsolute}>
                    <Text style={{color: '#6B7280'}}>Cargando portal médico...</Text>
                </View>
            )}
        />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20 },
  centerAbsolute: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  errorTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 15, textAlign: 'center', color: '#111827' },
});
