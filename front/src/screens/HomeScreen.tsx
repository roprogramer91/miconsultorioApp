import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  FlatList,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import { getPacientes, PacienteFront, getTurnos, TurnoFront } from '../services/api';
import * as Notifications from 'expo-notifications';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavCardProps = {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
  accent?: boolean;
};

function NavCard({ title, subtitle, icon, onPress, accent }: NavCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, accent && styles.cardAccent]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.cardIcon, accent && styles.cardIconAccent]}>
        <Ionicons name={icon as any} size={28} color={accent ? '#fff' : colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, accent && styles.cardTitleAccent]}>{title}</Text>
        <Text style={[styles.cardSubtitle, accent && styles.cardSubtitleAccent]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={28} color={accent ? 'rgba(255,255,255,0.5)' : '#ccc'} />
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const insets = useSafeAreaInsets();
  const [pacientes, setPacientes] = useState<PacienteFront[]>([]);
  const [proximoTurno, setProximoTurno] = useState<TurnoFront | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [fabMenuVisible, setFabMenuVisible] = useState(false);

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      setLoading(true);
      Promise.all([getPacientes(), getTurnos()])
        .then(([pacientesData, turnosData]) => {
          pacientesData.sort((a, b) => b.id - a.id);
          setPacientes(pacientesData);

          const nowTime = new Date().getTime();
          const futuros = turnosData.filter(t => t.estado === 'programado' && t.inicio && new Date(t.inicio).getTime() >= nowTime - 15 * 60000);
          
          // Map patient info from `pacientesData` to ensure we have it locally just in case
          futuros.forEach(t => {
            if (!t.paciente) {
              const found = pacientesData.find(p => p.id === t.paciente_id);
              if (found) {
                t.paciente = { nombres: found.nombres, apellidos: found.apellidos, dni: found.dni };
              }
            }
          });

          futuros.sort((a, b) => new Date(a.inicio || '').getTime() - new Date(b.inicio || '').getTime());
          
          if (futuros.length > 0) {
            setProximoTurno(futuros[0]);
          } else {
            setProximoTurno(null);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    });
    return unsub;
  }, [navigation]);

  const pacientesFiltrados = pacientes.filter(p =>
    search.length === 0 ||
    `${p.nombres} ${p.apellidos} ${p.dni||''}`.toLowerCase().includes(search.toLowerCase())
  );

  function cerrarBusqueda() {
    Keyboard.dismiss();
    setSearchFocused(false);
    setSearch('');
  }

  function formatShortDate(iso?: string) {
    if (!iso) return '';
    const d = new Date(iso);
    const hoy = new Date();
    const mañana = new Date();
    mañana.setDate(hoy.getDate() + 1);

    if (d.toDateString() === hoy.toDateString()) return 'Hoy';
    if (d.toDateString() === mañana.toDateString()) return 'Mañana';
    
    return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function formatTime(iso?: string) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  const handleSignOut = async () => {
    try {
      // 1. Desconectar de Google nativamente
      await GoogleSignin.signOut();
      // 2. Borrar nuestro token JWT de la memoria del teléfono
      await AsyncStorage.removeItem('userToken');
      // 3. Forzar al navegador a ocultar el Home y volver a montar el Login.
      // Ya que AppNavigator depende del estado reactivo de userToken,
      // la forma más limpia es hacer un re-dispatch o reset:
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.headerGreeting}>Bienvenido</Text>
          <Text style={styles.headerTitle}>Consultorio</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={28} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
          <Ionicons name="search" size={20} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar paciente por nombre o DNI..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onFocus={() => setSearchFocused(true)}
          />
          {(search.length > 0 || searchFocused) && (
            <TouchableOpacity onPress={cerrarBusqueda} style={styles.searchClear}>
              <Ionicons name="close-circle" size={22} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdown de pacientes */}
        {searchFocused && (
          <View style={styles.dropdown}>
            <Text style={styles.dropdownLabel}>
              {search.length === 0 ? '🕒 Últimos agendados' : `${pacientesFiltrados.length} resultado${pacientesFiltrados.length !== 1 ? 's' : ''}`}
            </Text>
            {pacientesFiltrados.length === 0 ? (
              <Text style={styles.dropdownEmpty}>No se encontraron pacientes</Text>
            ) : (
              <FlatList
                data={pacientesFiltrados}
                keyExtractor={item => String(item.id)}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 220 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      cerrarBusqueda();
                      navigation.navigate('PacienteDetail', { paciente: item });
                    }}
                  >
                    <View style={styles.dropdownAvatar}>
                      <Text style={styles.dropdownAvatarText}>
                        {item.nombres[0]}{item.apellidos[0]}
                      </Text>
                    </View>
                    <View style={styles.dropdownInfo}>
                      <Text style={styles.dropdownName}>{item.apellidos}, {item.nombres}</Text>
                      <Text style={styles.dropdownSub}>DNI: {item.dni}  •  Última visita: {item.ultimaVisita}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#ccc" />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {proximoTurno && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.sectionLabel}>Próximo Turno</Text>
            <TouchableOpacity 
              style={styles.nextTurnoCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('TurnoDetail', { turno: proximoTurno })}
            >
              <View style={styles.nextTurnoHeader}>
                <View style={styles.nextTurnoAvatar}>
                  <Text style={styles.nextTurnoAvatarText}>
                    {proximoTurno.paciente?.nombres?.[0] || ''}{proximoTurno.paciente?.apellidos?.[0] || ''}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.nextTurnoName}>
                    {proximoTurno.paciente?.apellidos}, {proximoTurno.paciente?.nombres}
                  </Text>
                  <Text style={styles.nextTurnoMotivo} numberOfLines={1}>{proximoTurno.motivo}</Text>
                </View>
              </View>

              <View style={styles.nextTurnoBody}>
                <Ionicons name="calendar" size={26} color={colors.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextTurnoBigDateText}>
                    {formatShortDate(proximoTurno.inicio)} a las {formatTime(proximoTurno.inicio)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionLabel}>Gestión del Consultorio</Text>

        <NavCard
          title="Pacientes"
          subtitle="Registrar y administrar pacientes"
          icon="people"
          onPress={() => navigation.navigate('Pacientes')}
          accent
        />

        <NavCard
          title="Agenda de Turnos"
          subtitle="Ver y programar citas médicas"
          icon="calendar"
          onPress={() => navigation.navigate('Turnos')}
        />

        <Text style={styles.sectionLabel}>Acciones Rápidas</Text>

        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('NuevoTurno')}>
            <Ionicons name="add-circle" size={32} color={colors.primary} style={{ marginBottom: 4 }} />
            <Text style={styles.quickLabel}>Nuevo{'\n'}Turno</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('NuevoPaciente')}>
            <Ionicons name="person-add" size={30} color={colors.primary} style={{ marginBottom: 6 }} />
            <Text style={styles.quickLabel}>Nuevo{'\n'}Paciente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('Historial')}>
            <Ionicons name="time" size={30} color={colors.primary} style={{ marginBottom: 6 }} />
            <Text style={styles.quickLabel}>Historial</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Utilidades</Text>

        <View style={styles.utilRow}>
          {/* Reloj/Hora */}
          <View style={styles.utilCard}>
            <Text style={styles.utilSmallLabel}>Hora actual</Text>
            <Text style={styles.utilBigValue}>
              {now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </Text>
          </View>

          {/* Fecha */}
          <View style={styles.utilCard}>
            <Text style={styles.utilSmallLabel}>Hoy es</Text>
            <Text style={styles.utilBigDate}>
              {now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
            </Text>
            <Text style={styles.utilSubLabel}>
              {now.toLocaleDateString('es-AR', { weekday: 'long' })}
            </Text>
          </View>

          {/* Test de Notificación Local */}
          <TouchableOpacity 
            style={styles.utilCard}
            onPress={async () => {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Prueba Local',
                  body: proximoTurno 
                    ? `Notificación de prueba. Te llevará al turno de ${proximoTurno.paciente?.nombres}.`
                    : 'Al tocar esta notificación local, irás a Turnos.',
                  data: proximoTurno 
                    ? { screen: 'TurnoDetail', turnoId: String(proximoTurno.id) }
                    : { screen: 'Turnos' },
                },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
              });
              alert('Notificación programada para dentro de 5 segundos. Sal a la pantalla de inicio (pon la app en background) para verla aparecer y presionar sobre ella.');
            }}
          >
            <Ionicons name="notifications-outline" size={28} color={colors.primary} style={{ marginBottom: 4 }} />
            <Text style={styles.utilLabel}>Test Notificación{'\n'}(En 5 seg)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.utilRow}>
          {/* Próximamente: Clima */}
          <View style={[styles.utilCard, styles.utilCardSoon]}>
            <Ionicons name="partly-sunny-outline" size={28} color="#ccc" style={{ marginBottom: 4 }} />
            <Text style={styles.utilLabel}>Clima</Text>
            <Text style={styles.utilSoon}>Próximamente</Text>
          </View>

          {/* Próximamente: IMC */}
          <View style={[styles.utilCard, styles.utilCardSoon]}>
            <Ionicons name="scale-outline" size={28} color="#ccc" style={{ marginBottom: 4 }} />
            <Text style={styles.utilLabel}>IMC</Text>
            <Text style={styles.utilSoon}>Próximamente</Text>
          </View>

          {/* Próximamente: Notas */}
          <View style={[styles.utilCard, styles.utilCardSoon]}>
            <Ionicons name="document-text-outline" size={28} color="#ccc" style={{ marginBottom: 4 }} />
            <Text style={styles.utilLabel}>Notas</Text>
            <Text style={styles.utilSoon}>Próximamente</Text>
          </View>
        </View>

      </ScrollView>

      {/* FAB - Menú Options */}
      {fabMenuVisible && (
        <TouchableOpacity
          style={styles.fabOverlay}
          activeOpacity={1}
          onPress={() => setFabMenuVisible(false)}
        >
          <View style={styles.fabMenu}>
            <TouchableOpacity 
              style={styles.fabMenuItem} 
              onPress={() => { setFabMenuVisible(false); navigation.navigate('NuevoTurno'); }}
            >
              <Text style={styles.fabMenuItemText}>Agendar Turno</Text>
              <View style={styles.fabMenuItemIconBox}>
                <Ionicons name="calendar" size={26} color={colors.primary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.fabMenuItem} 
              onPress={() => { setFabMenuVisible(false); navigation.navigate('NuevoPaciente'); }}
            >
              <Text style={styles.fabMenuItemText}>Nuevo Paciente</Text>
              <View style={styles.fabMenuItemIconBox}>
                <Ionicons name="person-add" size={26} color={colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Botón Flotante Principal (+) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setFabMenuVisible(!fabMenuVisible)}
      >
        <Text style={[styles.fabText, fabMenuVisible && styles.fabTextActive]}>
          {fabMenuVisible ? '✕' : '+'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },

  // Header
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerGreeting: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    fontWeight: '500',
  },
  headerTitle: {
    color: colors.textLight,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  headerBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: { fontSize: 24 },
  logoutButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },

  // Search
  searchWrapper: {
    marginHorizontal: 16,
    marginTop: -18,
    zIndex: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  searchContainerFocused: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: colors.text,
  },
  searchClear: { padding: 4 },
  searchClearText: { color: '#999', fontSize: 17 },

  // Dropdown
  dropdown: {
    backgroundColor: colors.background,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  dropdownLabel: {
    fontSize: 13, fontWeight: '700', color: '#aaa',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  dropdownEmpty: { color: '#bbb', textAlign: 'center', padding: 16, fontSize: 15 },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  dropdownAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  dropdownAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  dropdownInfo: { flex: 1 },
  dropdownName: { fontWeight: '700', fontSize: 16, color: '#121212' },
  dropdownSub: { fontSize: 13, color: '#999', marginTop: 1 },
  dropdownArrow: { fontSize: 22, color: '#ccc' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 20 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },

  // Cards
  nextTurnoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e8f2fa',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  nextTurnoHeader: {
    backgroundColor: '#f5f9ff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#edf4fb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextTurnoBody: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextTurnoAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26,111,181,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextTurnoAvatarText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  nextTurnoInfo: {
    flex: 1,
  },
  nextTurnoName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#121212',
    marginBottom: 2,
  },
  nextTurnoMotivo: {
    fontSize: 14,
    color: '#666',
  },
  nextTurnoBigDateText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#121212',
  },

  card: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardAccent: {
    backgroundColor: colors.primary,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(176,11,44,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardIconAccent: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cardIconText: { fontSize: 24 },
  cardContent: { flex: 1 },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  cardTitleAccent: { color: colors.textLight },
  cardSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  cardSubtitleAccent: { color: 'rgba(255,255,255,0.7)' },
  cardArrow: {
    fontSize: 26,
    color: '#ccc',
    fontWeight: '300',
  },
  cardArrowAccent: { color: 'rgba(255,255,255,0.5)' },

  // Quick actions
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  quickIcon: { fontSize: 26, marginBottom: 8 },
  quickLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },

  // Utilidades
  utilRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  utilCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  utilCardSoon: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderStyle: 'dashed',
    elevation: 0,
    shadowOpacity: 0,
  },
  utilIcon: { fontSize: 24, marginBottom: 6 },
  utilLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  // Labels para tarjetas activas
  utilSmallLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginBottom: 4,
  },
  utilBigValue: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  utilBigDate: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
    textTransform: 'capitalize',
  },
  utilSubLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  utilValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  utilSoon: {
    fontSize: 11,
    fontWeight: '600',
    color: '#bbb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // FAB Menu
  fabOverlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999,
  },
  fabMenu: {
    position: 'absolute', right: 26, bottom: 100,
    alignItems: 'flex-end', gap: 14,
  },
  fabMenuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  fabMenuItemText: {
    backgroundColor: '#fff', color: '#121212', fontSize: 18, fontWeight: '700',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
    overflow: 'hidden',
  },
  fabMenuItemIconBox: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
  },
  fabMenuItemIcon: { fontSize: 28 },

  // Main FAB
  fab: {
    position: 'absolute', right: 20, bottom: 24, zIndex: 1000,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 6,
  },
  fabText: { color: '#fff', fontSize: 36, lineHeight: 38 },
  fabTextActive: { fontSize: 28, lineHeight: 30 },
});
