import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, StatusBar, Alert, ActivityIndicator, FlatList, Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getTurnos, getPacientes, deleteTurno, updateTurno, TurnoFront, PacienteFront } from '../services/api';

const ESTADOS: Record<string, { label: string; color: string; bg: string }> = {
  programado: { label: 'Programado', color: '#1a6fb5', bg: '#e3f0fb' },
  atendido:   { label: 'Atendido',   color: '#2e7d32', bg: '#e8f5e9' },
  ausente:    { label: 'Ausente',    color: '#ef6c00', bg: '#fff3e0' },
  cancelado:  { label: 'Cancelado',  color: '#b71c1c', bg: '#fdecea' },
};

function formatHora(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function formatFecha(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' });
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
          <Text style={styles.modalSub}>Seleccioná el nuevo estado para este turno:</Text>
          
          <View style={styles.modalOptions}>
            <TouchableOpacity 
              style={[styles.modalBtn, { backgroundColor: '#e3f0fb' }]} 
              onPress={() => onChange('programado')}
            >
              <Text style={[styles.modalBtnText, { color: '#1a6fb5' }]}>PENDIENTE</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalBtn, { backgroundColor: '#e8f5e9' }]} 
              onPress={() => onChange('atendido')}
            >
              <Text style={[styles.modalBtnText, { color: '#2e7d32' }]}>ATENDIDO</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalBtn, { backgroundColor: '#fff3e0' }]} 
              onPress={() => onChange('ausente')}
            >
              <Text style={[styles.modalBtnText, { color: '#ef6c00' }]}>AUSENTE</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalBtn, { backgroundColor: '#fdecea' }]} 
              onPress={() => onChange('cancelado')}
            >
              <Text style={[styles.modalBtnText, { color: '#d32f2f' }]}>CANCELADO</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalBtn, { backgroundColor: '#f5f5f5', marginTop: 12 }]} 
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

function TurnoCard({
  turno, pacientes,
  onEdit, onStatus, onDelete
}: {
  turno: TurnoFront;
  pacientes: PacienteFront[];
  onEdit: (t: TurnoFront, action: 'edit' | 'navigate_detail') => void;
  onStatus: () => void;
  onDelete: () => void;
}) {
  const est = ESTADOS[turno.estado] || ESTADOS.programado;
  
  // Extraemos el nombre completo del paciente buscando en la lista de pacientes
  const pacienteObj = pacientes.find(p => p.id === turno.paciente_id);
  const nombrePaciente = pacienteObj ? `${pacienteObj.apellidos}, ${pacienteObj.nombres}` : `Paciente ID: ${turno.paciente_id}`;

  return (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.7}
      // Navegamos pasando la info del turno para no tener que consultarlo de nuevo
      onPress={() => onEdit(turno, 'navigate_detail')} 
    >
      <View style={styles.cardTime}>
        <Text style={styles.cardHora}>{formatHora(turno.inicio)}</Text>
        <Text style={styles.cardFecha}>{formatFecha(turno.inicio)}</Text>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardBody}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.cardPaciente}>{nombrePaciente}</Text>
            <Text style={styles.cardMotivo}>{turno.motivo}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: est.bg }]}>
            <Text style={[styles.badgeText, { color: est.color }]}>{est.label}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onStatus}>
            <Ionicons name="checkmark-done-circle-outline" size={20} color="#1a6fb5" />
            <Text style={[styles.actionBtnText, { color: '#1a6fb5' }]}>Estado</Text>
          </TouchableOpacity>

          <View style={styles.rightActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(turno, 'edit')}>
              <Ionicons name="pencil" size={18} color="#f57c00" />
              <Text style={[styles.actionBtnText, { color: '#f57c00' }]}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnDelete} onPress={onDelete}>
              <Ionicons name="trash" size={18} color="#d32f2f" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TurnosScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [turnos, setTurnos] = useState<TurnoFront[]>([]);
  const [pacientes, setPacientes] = useState<PacienteFront[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para el Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTurno, setSelectedTurno] = useState<TurnoFront | null>(null);

  const fetchTurnos = async () => {
    try {
      setLoading(true);
      const [turnosData, pacData] = await Promise.all([
        getTurnos(),
        getPacientes()
      ]);
      setTurnos(turnosData);
      setPacientes(pacData);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudieron cargar los turnos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTurnos();
    });
    return unsubscribe;
  }, [navigation]);

  const filtered = turnos.filter(t => {
    const pacienteObj = pacientes.find(p => p.id === t.paciente_id);
    const nombre = pacienteObj ? `${pacienteObj.nombres} ${pacienteObj.apellidos}` : '';
    return `${nombre} ${t.motivo}`.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => {
    const now = new Date().getTime();
    const timeA = new Date(a.inicio || '').getTime();
    const timeB = new Date(b.inicio || '').getTime();
    // Prioritize future appointments over past appointments, and order nearest first.
    if (timeA > now && timeB < now) return -1;
    if (timeB > now && timeA < now) return 1;
    // Both future or both past -> sort by closest absolute difference
    return Math.abs(timeA - now) - Math.abs(timeB - now);
  });

  const handleEdit = (t: TurnoFront, action: 'edit' | 'navigate_detail' = 'edit') => {
    if (action === 'navigate_detail') {
      navigation.navigate('TurnoDetail', { turno: t });
    } else {
      navigation.navigate('NuevoTurno', { turno: t });
    }
  };

  const changeStatus = async (id: number, nuevoEstado: string) => {
    try {
      setLoading(true);
      await updateTurno(id, { estado: nuevoEstado });
      setModalVisible(false);
      fetchTurnos();
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e.message || 'Error al actualizar el estado');
    }
  };

  const handleStatus = (t: TurnoFront) => {
    setSelectedTurno(t);
    setModalVisible(true);
  };

  const handleDelete = (t: TurnoFront) => {
    Alert.alert(
      "Eliminar Turno",
      "¿Estás seguro de que deseas eliminar este turno?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar", style: "destructive",
          onPress: async () => {
             try {
               setLoading(true);
               await deleteTurno(t.id);
               fetchTurnos();
             } catch (e: any) {
               setLoading(false);
               Alert.alert("Error", e.message || "No se pudo eliminar el turno");
             }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

      <StatusModal 
        visible={modalVisible}
        currentStatus={selectedTurno?.estado || ''}
        onClose={() => setModalVisible(false)}
        onChange={(status) => selectedTurno && changeStatus(selectedTurno.id, status)}
      />

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por paciente o motivo..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={22} color="#999" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.list}>
        <Text style={[styles.count, { marginHorizontal: 16, marginTop: 16 }]}>
          {filtered.length} turno{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </Text>
        
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No hay turnos para mostrar</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TurnoCard
                turno={item}
                pacientes={pacientes}
                onEdit={handleEdit}
                onStatus={() => handleStatus(item)}
                onDelete={() => handleDelete(item)}
              />
            )}
          />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NuevoTurno')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },

  searchWrapper: {
    backgroundColor: colors.primary,
    paddingBottom: 18, paddingTop: 8, paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, height: 46,
  },
  searchIcon: { fontSize: 17, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#121212' },
  clearBtn: { color: '#999', fontSize: 18, paddingLeft: 8 },

  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },
  count: {
    fontSize: 14, color: '#888', fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
  },
  cardTime: { alignItems: 'center', minWidth: 60, paddingRight: 6 },
  cardHora: { fontWeight: '900', fontSize: 19, color: colors.primary },
  cardFecha: { fontSize: 14, color: '#555', marginTop: 4, textAlign: 'center', fontWeight: '700' },
  cardDivider: { width: 1, height: '80%', backgroundColor: '#eee', marginHorizontal: 12 },
  cardBody: { flex: 1 },
  cardPaciente: { fontWeight: '700', fontSize: 16, color: '#121212' },
  cardMotivo: { fontSize: 14, color: '#777', marginTop: 2 },
  badge: {
    alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8,
    paddingVertical: 3, marginTop: 6,
  },
  badgeText: { fontSize: 13, fontWeight: '700' },
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
    flexDirection: 'column',
    gap: 8,
  },
  modalBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8
  },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyText: { fontSize: 17, color: '#888' },

  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 34 },
});
