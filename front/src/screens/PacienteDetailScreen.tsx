import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, Alert, ActivityIndicator, Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getPacienteById, getTurnosByPaciente, updateTurno, deleteTurno, PacienteFront, TurnoFront } from '../services/api';

// Tipo de paciente — en producción vendrá del backend
export type PacienteParams = {
  id: number;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono?: string;
  email?: string;
  fecha_nacimiento?: string;
  notas?: string;
};



const ESTADO_COLOR: Record<string, string> = {
  atendido: '#2e7d32', cancelado: '#b71c1c', programado: '#1a6fb5', ausente: '#ef6c00'
};

type DataRowProps = { label: string; value?: string; icon: string };
function DataRow({ label, value, icon }: DataRowProps) {
  if (!value) return null;
  return (
    <View style={styles.dataRow}>
      <Ionicons name={icon as any} size={24} color={colors.primary} style={{ marginTop: 2, marginRight: 14 }} />
      <View style={styles.dataBody}>
        <Text style={styles.dataLabel}>{label}</Text>
        <Text style={styles.dataValue}>{value}</Text>
      </View>
    </View>
  );
}

function calcularEdad(fechaDDMMYYYY?: string): string | null {
  if (!fechaDDMMYYYY) return null;
  const [d, m, y] = fechaDDMMYYYY.split('/').map(Number);
  if (!d || !m || !y) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - y;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) edad--;
  return `${edad} años`;
}

// ─── Componente Modal de Estado ───
function StatusModal({
  visible,
  currentStatus,
  onClose,
  onChange
}: {
  visible: boolean;
  currentStatus: string;
  onClose: () => void;
  onChange: (status: string) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Cambiar estado</Text>
          <Text style={styles.modalSub}>Seleccioná el nuevo estado para el turno:</Text>
          
          <View style={styles.modalOptions}>
            <View style={styles.modalMainOptions}>
              <TouchableOpacity 
                style={styles.modalBtn} 
                onPress={() => onChange('atendido')}
              >
                <Text style={[styles.modalBtnText, { color: '#2e7d32' }]}>ATENDIDO</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalBtn} 
                onPress={() => onChange('ausente')}
              >
                <Text style={[styles.modalBtnText, { color: '#ef6c00' }]}>AUSENTE</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalBtn} 
                onPress={() => onChange('cancelado')}
              >
                <Text style={[styles.modalBtnText, { color: '#d32f2f' }]}>CANCELADO</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.modalBtn, { marginLeft: 'auto' }]} 
              onPress={onClose}
            >
              <Text style={[styles.modalBtnText, { color: '#666' }]}>VOLVER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function PacienteDetailScreen({ route, navigation }: any) {
  const [paciente, setPaciente] = useState<PacienteFront>(route.params?.paciente ?? {
    id: 0, nombres: 'Desconocido', apellidos: '', dni: '—',
  });

  const [historial, setHistorial] = useState<TurnoFront[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Estado para el Modal de Estado
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedTurno, setSelectedTurno] = useState<TurnoFront | null>(null);

  const fetchPacienteData = () => {
    if (paciente.id > 0) {
      getPacienteById(paciente.id).then(setPaciente).catch(e => console.error("Error paciente:", e));
      
      setLoadingHistorial(true);
      getTurnosByPaciente(paciente.id)
        .then(data => {
          setHistorial(data.sort((a,b) => new Date(b.inicio||'').getTime() - new Date(a.inicio||'').getTime()));
        })
        .catch(e => console.error("Error historial:", e))
        .finally(() => setLoadingHistorial(false));
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPacienteData();
    });
    return unsubscribe;
  }, [navigation, paciente.id]);

  const handleEditTurno = (t: TurnoFront) => {
    navigation.navigate('NuevoTurno', { turno: t });
  };

  const changeStatus = async (id: number, nuevoEstado: string) => {
    try {
      setLoadingHistorial(true);
      await updateTurno(id, { estado: nuevoEstado });
      setStatusModalVisible(false);
      fetchPacienteData();
    } catch (e: any) {
      setLoadingHistorial(false);
      Alert.alert('Error', e.message || 'Error al actualizar el estado');
    }
  };

  const handleStatusTurno = (t: TurnoFront) => {
    setSelectedTurno(t);
    setStatusModalVisible(true);
  };

  const handleDeleteTurno = (t: TurnoFront) => {
    Alert.alert(
      "Eliminar Turno",
      "¿Seguro que querés eliminar el turno?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar", style: "destructive",
          onPress: async () => {
            try {
              setLoadingHistorial(true);
              await deleteTurno(t.id);
              fetchPacienteData();
            } catch (e: any) {
              setLoadingHistorial(false);
              Alert.alert('Error', e.message || 'No se pudo borrar');
            }
          }
        }
      ]
    );
  };

  const iniciales = `${paciente.nombres.charAt(0)}${paciente.apellidos.charAt(0)}`;
  const edad = calcularEdad(paciente.fecha_nacimiento);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

      <StatusModal 
        visible={statusModalVisible}
        currentStatus={selectedTurno?.estado || ''}
        onClose={() => setStatusModalVisible(false)}
        onChange={(status) => selectedTurno && changeStatus(selectedTurno.id, status)}
      />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Credencial ── */}
        <View style={styles.credencial}>
          {/* Fondo decorativo */}
          <View style={styles.credencialBg} />

          <View style={styles.credencialContent}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{iniciales}</Text>
            </View>

            {/* Nombre y DNI */}
            <Text style={styles.credNombre}>
              {paciente.apellidos}, {paciente.nombres}
            </Text>
            <View style={styles.credBadges}>
              <View style={styles.credDniBadge}>
                <Text style={styles.credDniLabel}>DNI</Text>
                <Text style={styles.credDniValue}>{paciente.dni}</Text>
              </View>
              {edad ? (
                <View style={styles.credDniBadge}>
                  <Text style={styles.credDniLabel}>Edad</Text>
                  <Text style={styles.credDniValue}>{edad}</Text>
                </View>
              ) : null}
            </View>

            {/* Acciones rápidas */}
            <View style={styles.credActions}>
              <TouchableOpacity
                style={styles.credBtn}
                onPress={() => navigation.navigate('NuevoTurno', { paciente })}
              >
                <Ionicons name="calendar-outline" size={20} color="#fff" />
                <Text style={styles.credBtnLabel}>Nuevo Turno</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.credBtn}
                onPress={() => navigation.navigate('NuevoPaciente', { paciente })}
              >
                <Ionicons name="pencil-outline" size={20} color="#fff" />
                <Text style={styles.credBtnLabel}>Editar datos</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Datos personales ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos Personales</Text>
          <DataRow icon="call-outline" label="Teléfono"          value={paciente.telefono} />
          <DataRow icon="mail-outline" label="Email"              value={paciente.email} />
          <DataRow icon="gift-outline" label="Fecha de nacimiento" value={paciente.fecha_nacimiento} />
          {!paciente.telefono && !paciente.email && !paciente.fecha_nacimiento && (
            <Text style={styles.emptySection}>Sin datos de contacto registrados.</Text>
          )}
        </View>

        {/* ── Observaciones ── */}
        {paciente.notas ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observaciones</Text>
            <View style={styles.notasBox}>
              <Text style={styles.notasText}>{paciente.notas}</Text>
            </View>
          </View>
        ) : null}

        {/* ── Historial de turnos ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Historial de Turnos</Text>
            <Text style={styles.sectionCount}>{historial.length} visita{historial.length !== 1 ? 's' : ''}</Text>
          </View>

          {loadingHistorial ? (
            <ActivityIndicator style={{ margin: 20 }} color={colors.primary} />
          ) : historial.length === 0 ? (
            <Text style={styles.emptySection}>Sin turnos registrados.</Text>
          ) : (
            historial.map((h, i) => (
              <View key={i} style={[styles.histItem, i < historial.length - 1 && styles.histItemBorder]}>
                <View style={[styles.histDot, { backgroundColor: ESTADO_COLOR[h.estado] ?? '#888' }]} />
                <View style={styles.histBody}>
                  <View style={styles.histTop}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="calendar-outline" size={13} color="#888" style={{ marginRight: 4 }} />
                      <Text style={[styles.histFecha, { marginRight: 8 }]}>{h.fecha}</Text>
                      <Ionicons name="time-outline" size={13} color="#888" style={{ marginRight: 4 }} />
                      <Text style={styles.histFecha}>{h.hora} hs</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: ESTADO_COLOR[h.estado] ? ESTADO_COLOR[h.estado] + '33' : '#eee', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }]}>
                       <Text style={[styles.histEstado, { color: ESTADO_COLOR[h.estado] ?? '#888', marginTop: 0 }]}>{h.estado}</Text>
                    </View>
                  </View>
                  <Text style={styles.histMotivo}>{h.motivo}</Text>
                  {h.notas ? (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, backgroundColor: '#f9f9f9', padding: 8, borderRadius: 8 }}>
                      <Ionicons name="chatbubble-ellipses-outline" size={14} color="#888" style={{ marginRight: 6, marginTop: 2 }} />
                      <Text style={[styles.histNotas, { marginTop: 0, flex: 1, color: '#444' }]}>{h.notas}</Text>
                    </View>
                  ) : null}

                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusTurno(h)}>
                      <Ionicons name="checkmark-done-circle-outline" size={16} color="#1a6fb5" />
                      <Text style={[styles.actionBtnText, { color: '#1a6fb5' }]}>Estado</Text>
                    </TouchableOpacity>

                    <View style={styles.rightActions}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditTurno(h)}>
                        <Ionicons name="pencil" size={14} color="#f57c00" />
                        <Text style={[styles.actionBtnText, { color: '#f57c00' }]}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtnDelete} onPress={() => handleDeleteTurno(h)}>
                        <Ionicons name="trash" size={16} color="#d32f2f" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },

  // Credencial
  credencial: { backgroundColor: colors.primary, paddingBottom: 24 },
  credencialBg: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 32,
    backgroundColor: '#f2f2f2', borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  credencialContent: { alignItems: 'center', paddingTop: 16, paddingBottom: 8, paddingHorizontal: 20 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: '800' },
  credNombre: {
    color: '#fff', fontSize: 22, fontWeight: '800',
    textAlign: 'center', marginBottom: 8,
  },
  credDniBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  credBadges: {
    flexDirection: 'row', gap: 10, marginBottom: 24,
  },
  credDniLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },
  credDniValue: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  credActions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  credBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  credBtnIcon: { fontSize: 20 },
  credBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Secciones
  section: {
    backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16,
    marginBottom: 12, padding: 16,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  sectionCount: { fontSize: 14, color: '#bbb', fontWeight: '600' },
  emptySection: { color: '#999', fontSize: 15, fontStyle: 'italic', paddingVertical: 10 },

  // Filas de datos
  dataRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  dataIcon: { fontSize: 20, marginRight: 12, marginTop: 1 },
  dataBody: { flex: 1 },
  dataLabel: { fontSize: 13, color: '#aaa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  dataValue: { fontSize: 17, color: '#121212', fontWeight: '500', marginTop: 2 },

  // Notas
  notasBox: {
    backgroundColor: '#fafafa', borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  notasText: { fontSize: 16, color: '#444', lineHeight: 20 },

  // Historial
  histItem: { flexDirection: 'row', paddingVertical: 10 },
  histItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  histDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, marginRight: 12 },
  histBody: { flex: 1 },
  histTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  histFecha: { fontSize: 13, color: '#888' },
  histEstado: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  histMotivo: { fontSize: 16, fontWeight: '600', color: '#222', marginTop: 3 },
  histNotas: { fontSize: 14, color: '#888', fontStyle: 'italic', marginTop: 4 },

  cardActions: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#f0f0f0', 
    paddingTop: 8 
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 12, paddingVertical: 4 },
  actionBtnText: { fontSize: 13, fontWeight: '600', marginLeft: 4 },
  actionBtnDelete: { padding: 4, marginLeft: 4 },

  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121212',
    marginBottom: 8
  },
  modalSub: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24
  },
  modalOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  modalMainOptions: {
    flexDirection: 'row',
    gap: 16
  },
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  badge: {
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 13, fontWeight: '700' },
});
