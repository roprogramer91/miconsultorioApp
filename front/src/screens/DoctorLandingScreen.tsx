import React from 'react';
import { View, Text, StyleSheet, Platform, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

// URL base del backend (Railway en prod, localhost en dev)
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace('/api', '');

export default function DoctorLandingScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const rawSlug = (route.params as any)?.slug;
  const slug = (rawSlug && rawSlug !== 'undefined') ? rawSlug : null;

  // Sin slug → pantalla de error
  if (!slug) {
     return (
        <View style={styles.center}>
           <Ionicons name="medical-outline" size={60} color="#6B7280" />
           <Text style={styles.errorTitle}>Perfil no especificado</Text>
           <Text style={styles.errorSubtitle}>Accedé desde el link que te compartió tu médico.</Text>
        </View>
     );
  }

  const landingUrl = `${API_BASE}/${slug}`;

  const handleReservar = () => {
    // Navegación interna de Expo — NO sale del app, NO hace redirect
    navigation.navigate('Booking', { slug });
  };

  // WEB: iframe con el EJS de Railway + botones nativos de Expo superpuestos
  if (Platform.OS === 'web') {
      return (
        <View style={{ flex: 1 }}>
            {/* @ts-ignore */}
            <iframe
                src={landingUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title={`Consultorio de ${slug}`}
            />
            {/* FAB Reservar — centrado abajo */}
            {/* @ts-ignore */}
            <TouchableOpacity style={styles.fab} onPress={handleReservar}>
                <Ionicons name="calendar" size={20} color="#fff" />
                <Text style={styles.fabText}>Reservar Turno</Text>
            </TouchableOpacity>
            {/* Link Acceso Médico — esquina inferior derecha */}
            <TouchableOpacity style={styles.accesoBtn} onPress={() => navigation.navigate('Login' as never)}>
                <Ionicons name="lock-closed-outline" size={14} color="#6B7280" />
                <Text style={styles.accesoText}>Acceso Médico</Text>
            </TouchableOpacity>
        </View>
      );
  }

  // MÓVIL: WebView con botones flotantes
  const { WebView } = require('react-native-webview');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <WebView
            source={{ uri: landingUrl }}
            style={{ flex: 1 }}
            startInLoadingState={true}
        />
        <View style={styles.floatingBar}>
            <TouchableOpacity style={styles.reservarBtn} onPress={handleReservar}>
                <Ionicons name="calendar" size={20} color="#fff" />
                <Text style={styles.reservarText}>Reservar Turno</Text>
            </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.accesoBtn} onPress={() => navigation.navigate('Login' as never)}>
            <Ionicons name="lock-closed-outline" size={14} color="#6B7280" />
            <Text style={styles.accesoText}>Acceso Médico</Text>
        </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FFFFFF', padding: 20
  },
  errorTitle: {
    fontSize: 24, fontWeight: 'bold', marginTop: 15,
    textAlign: 'center', color: '#111827'
  },
  errorSubtitle: {
    fontSize: 15, color: '#6B7280', marginTop: 8,
    textAlign: 'center', lineHeight: 22
  },
  // Barra fija abajo con el botón de reserva nativo de Expo (SOLO MOBILE)
  floatingBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  reservarBtn: {
    backgroundColor: colors.primary || '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  reservarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // FAB (Floating Action Button) — solo web, esquina inferior derecha
  fab: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    transform: [{ translateX: -85 }],  // centrado horizontal (aprox mitad del ancho del botón)
    backgroundColor: colors.primary || '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 50,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Link discreto "Acceso Médico" — esquina inferior derecha
  accesoBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  accesoText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
});
