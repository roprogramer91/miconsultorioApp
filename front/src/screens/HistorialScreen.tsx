import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, StatusBar, Modal, FlatList, ActivityIndicator, Alert
} from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { getPacientes, getTurnos, deleteTurno, updateTurno, PacienteFront, TurnoFront } from '../services/api';

const ESTADOS_CONF: Record<string, { label: string; color: string; bg: string }> = {
  atendido:  { label: 'Atendido',  color: '#2e7d32', bg: '#e8f5e9' },
  ausente:   { label: 'Ausente',   color: '#ef6c00', bg: '#fff3e0' },
  cancelado: { label: 'Cancelado', color: '#b71c1c', bg: '#fdecea' },
  programado:{ label: 'Programado',color: '#1a6fb5', bg: '#e3f0fb' },
};

function formatFecha(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function formatHora(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
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

// ─── Modal selector de paciente ───────────────────────────────────────────────
function PacientePickerModal({
  visible, onSelect, onClose, pacientes, loading
}: { visible: boolean; onSelect: (p: PacienteFront | null) => void; onClose: () => void; pacientes: PacienteFront[]; loading: boolean }) {
  const [q, setQ] = useState('');
  
  const filtered = pacientes.filter(p =>
    `${p.nombres} ${p.apellidos} ${p.dni || ''}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Filtrar por Paciente</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#555" /></TouchableOpacity>
          </View>

          <View style={modal.searchBox}>
            <Ionicons name="search" size={20} color="#888" style={{ marginRight: 8 }} />
            <TextInput
              style={modal.searchInput}
              placeholder="Buscar paciente..."
              placeholderTextColor="#bbb"
              value={q}
              onChangeText={setQ}
            />
          </View>

          {/* Opción "Todos" */}
          <TouchableOpacity style={modal.item} onPress={() => { onSelect(null); onClose(); }}>
            <View style={[modal.itemAvatar, { backgroundColor: '#888' }]}>
              <Ionicons name="people" size={24} color="#fff" />
            </View>
            <View>
              <Text style={modal.itemName}>Todos los pacientes</Text>
              <Text style={modal.itemDni}>Ver historial completo</Text>
            </View>
          </TouchableOpacity>

          <View style={modal.divider} />

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={modal.item} onPress={() => { onSelect(item); onClose(); }}>
                  <View style={modal.itemAvatar}>
                    <Text style={modal.itemAvatarText}>{(item.nombres||'')[0]}{(item.apellidos||'')[0]}</Text>
                  </View>
                  <View>
                    <Text style={modal.itemName}>{item.apellidos}, {item.nombres}</Text>
                    <Text style={modal.itemDni}>DNI: {item.dni || 'No registrado'}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={modal.empty}>No se encontraron pacientes</Text>}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Pantalla Principal ───────────────────────────────────────────────────────
export default function HistorialScreen({ navigation }: any) {
  const [filtro, setFiltro] = useState<PacienteFront | null>(null); // null = Todos
  const [pickerVisible, setPickerVisible] = useState(false);
  
  const [turnos, setTurnos] = useState<TurnoFront[]>([]);
  const [pacientes, setPacientes] = useState<PacienteFront[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para el Modal de Estado
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedTurno, setSelectedTurno] = useState<TurnoFront | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pacData, turnData] = await Promise.all([
        getPacientes(),
        getTurnos()
      ]);
      setPacientes(pacData);
      setTurnos(turnData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  const registros = turnos
    .filter(r => filtro === null || r.paciente_id === filtro.id)
    .sort((a, b) => new Date(b.inicio || '').getTime() - new Date(a.inicio || '').getTime()); // más reciente primero

  const handleEdit = (r: TurnoFront) => {
    navigation.navigate('NuevoTurno', { turno: r });
  };

  const changeStatus = async (id: number, nuevoEstado: string) => {
    try {
      setLoading(true);
      await updateTurno(id, { estado: nuevoEstado });
      setStatusModalVisible(false);
      fetchData();
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e.message || 'Error al actualizar el estado');
    }
  };

  const handleStatus = (r: TurnoFront) => {
    setSelectedTurno(r);
    setStatusModalVisible(true);
  };

  const handleDelete = (r: TurnoFront) => {
    Alert.alert(
      "Eliminar Registro",
      "¿Estás seguro de que deseas eliminar este registro del historial?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar", style: "destructive",
          onPress: async () => {
             try {
               setLoading(true);
               await deleteTurno(r.id);
               fetchData();
             } catch (e: any) {
               setLoading(false);
               Alert.alert("Error", e.message || "No se pudo eliminar el registro");
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
        visible={statusModalVisible}
        currentStatus={selectedTurno?.estado || ''}
        onClose={() => setStatusModalVisible(false)}
        onChange={(status) => selectedTurno && changeStatus(selectedTurno.id, status)}
      />

      <PacientePickerModal
        visible={pickerVisible}
        onSelect={setFiltro}
        onClose={() => setPickerVisible(false)}
        pacientes={pacientes}
        loading={loading}
      />

      {/* ── Barra de filtro ── */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterBtn, filtro === null && styles.filterBtnActive]}
          onPress={() => setPickerVisible(true)}
        >
          {filtro ? (
            <>
              <View style={styles.filterAvatar}>
                <Text style={styles.filterAvatarText}>{(filtro.nombres||'')[0]}{(filtro.apellidos||'')[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterName} numberOfLines={1}>
                  {filtro.apellidos}, {filtro.nombres}
                </Text>
                <Text style={styles.filterSub}>Toca para cambiar</Text>
              </View>
            </>
          ) : (
            <>
              <Ionicons name="people" size={22} color="#fff" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.filterAllText}>Todos los pacientes</Text>
                <Text style={styles.filterSub}>Toca para filtrar por paciente</Text>
              </View>
            </>
          )}
          <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {filtro && (
          <TouchableOpacity style={styles.clearFilter} onPress={() => setFiltro(null)}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Lista de registros ── */}
      <FlatList
        data={registros}
        keyExtractor={item => String(item.id)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text style={styles.count}>
              {registros.length} registro{registros.length !== 1 ? 's' : ''}
              {filtro ? ` de ${filtro.nombres} ${filtro.apellidos}` : ' en total'}
            </Text>
            {loading && <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="clipboard-outline" size={64} color="#ccc" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No hay registros disponibles</Text>
            </View>
          ) : null
        }
        renderItem={({ item: r }) => {
          const pacObj = pacientes.find(p => p.id === r.paciente_id);
          const pacName = pacObj ? `${pacObj.apellidos}, ${pacObj.nombres}` : `ID: ${r.paciente_id}`;
          const est = ESTADOS_CONF[r.estado] ?? ESTADOS_CONF.programado;

          return (
            <View style={styles.card}>
              <View style={[styles.cardStripe, { backgroundColor: est.color }]} />

              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  {filtro === null && (
                    <Text style={styles.cardPaciente}>{pacName}</Text>
                  )}
                  <View style={[styles.badge, { backgroundColor: est.bg }]}>
                    <Text style={[styles.badgeText, { color: est.color }]}>{est.label}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="calendar-outline" size={14} color="#888" style={{ marginRight: 4 }} />
                  <Text style={[styles.cardFecha, { marginBottom: 0 }]}>{formatFecha(r.inicio)}</Text>
                  <Ionicons name="time-outline" size={14} color="#888" style={{ marginLeft: 12, marginRight: 4 }} />
                  <Text style={[styles.cardFecha, { marginBottom: 0 }]}>{formatHora(r.inicio)} hs</Text>
                </View>
                <Text style={styles.cardMotivo}>{r.motivo}</Text>

                  {r.notas ? (
                  <View style={styles.notasBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <Ionicons name="chatbubble-ellipses-outline" size={15} color="#666" style={{ marginRight: 6, marginTop: 2 }} />
                      <Text style={[styles.notasText, { flex: 1 }]}>{r.notas}</Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatus(r)}>
                    <Ionicons name="checkmark-done-circle-outline" size={18} color="#1a6fb5" />
                    <Text style={[styles.actionBtnText, { color: '#1a6fb5' }]}>Estado</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.rightActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(r)}>
                      <Ionicons name="pencil" size={16} color="#f57c00" />
                      <Text style={[styles.actionBtnText, { color: '#f57c00' }]}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnDelete} onPress={() => handleDelete(r)}>
                      <Ionicons name="trash" size={16} color="#d32f2f" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },

  filterBar: {
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  filterBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  filterBtnActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  filterAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  filterAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  filterAllIcon: { fontSize: 22 },
  filterAllText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  filterName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  filterSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 1 },
  filterArrow: { color: 'rgba(255,255,255,0.7)', fontSize: 20 },
  clearFilter: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  clearFilterText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  list: { flex: 1 },
  listContent: { padding: 16 },
  count: {
    fontSize: 14, color: '#888', fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 10,
    flexDirection: 'row', overflow: 'hidden',
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
  },
  cardStripe: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardPaciente: { fontWeight: '700', fontSize: 16, color: '#121212', flex: 1, marginRight: 8 },
  cardFecha: { fontSize: 14, color: '#888', marginBottom: 4 },
  cardMotivo: { fontSize: 16, fontWeight: '600', color: '#333' },
  notasBox: {
    backgroundColor: '#f5f5f5', borderRadius: 8, padding: 10, marginTop: 10,
    borderLeftWidth: 3, borderLeftColor: '#ccc',
  },
  notasText: { fontSize: 14, color: '#444', lineHeight: 20 },

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
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 13, fontWeight: '700' },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyText: { fontSize: 17, color: '#888' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', paddingBottom: 24,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title: { fontWeight: '700', fontSize: 18, color: '#121212' },
  close: { fontSize: 20, color: '#aaa', padding: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, height: 44,
  },
  searchIcon: { fontSize: 17, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#121212' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 16, marginBottom: 4 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  itemAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  itemAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  itemName: { fontWeight: '600', fontSize: 16, color: '#121212' },
  itemDni: { fontSize: 14, color: '#888', marginTop: 1 },
  empty: { textAlign: 'center', color: '#aaa', padding: 24 },
});
