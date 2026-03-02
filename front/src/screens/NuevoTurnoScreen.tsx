import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, StatusBar, Alert, Modal, FlatList, Platform, ActivityIndicator
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getTurnos, getPacientes, getPacienteById, getTurnosByPaciente, createTurno, updateTurno, PacienteFront, TurnoFront } from '../services/api';

const ESTADOS_COLOR: Record<string, string> = {
  atendido: '#2e7d32', cancelado: '#b71c1c', programado: '#1a6fb5', ausente: '#ef6c00'
};

function formatHistFecha(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatHora(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─── Modal selector de paciente ───────────────────────────────────────────────
function PacienteSelector({
  visible, onSelect, onClose, onNewPaciente
}: { visible: boolean; onSelect: (p: PacienteFront) => void; onClose: () => void; onNewPaciente: () => void }) {
  const [q, setQ] = useState('');
  const [pacientes, setPacientes] = useState<PacienteFront[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      getPacientes()
        .then(setPacientes)
        .catch(e => Alert.alert('Error', e.message || 'Error cargando pacientes'))
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const filtered = pacientes.filter(p =>
    `${p.nombres} ${p.apellidos} ${p.dni || ''}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Seleccionar Paciente</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={26} color="#999" /></TouchableOpacity>
          </View>

          <View style={modal.searchBox}>
            <Ionicons name="search" size={20} color="#888" style={{ marginRight: 8 }} />
            <TextInput
              style={modal.searchInput}
              placeholder="Buscar por nombre o DNI..."
              placeholderTextColor="#bbb"
              value={q}
              onChangeText={setQ}
              autoFocus
            />
          </View>

          <TouchableOpacity style={modal.newPatientBtn} onPress={onNewPaciente}>
            <Ionicons name="add" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={modal.newPatientBtnText}>Crear Nuevo Paciente</Text>
          </TouchableOpacity>

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
              ListEmptyComponent={<Text style={modal.empty}>No se encontró ningún paciente</Text>}
            />
          )}
          <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
            <Text style={modal.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Helpers de formato ───────────────────────────────────────────────────────
function formatDate(d: Date) {
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function NuevoTurnoScreen({ route, navigation }: any) {
  const turnoExistente: TurnoFront | undefined = route.params?.turno;
  const isEdit = !!turnoExistente;
  const pacientePrecargado: PacienteFront | null = route.params?.paciente ?? null;

  const [paciente, setPaciente] = useState<PacienteFront | null>(pacientePrecargado);
  const [historial, setHistorial] = useState<TurnoFront[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const [selectorVisible, setSelectorVisible] = useState(false);

  const [fecha, setFecha] = useState<Date>(
    turnoExistente && turnoExistente.inicio ? new Date(turnoExistente.inicio) : new Date()
  );
  const [hora, setHora] = useState<Date>(
    turnoExistente && turnoExistente.inicio ? new Date(turnoExistente.inicio) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [motivo, setMotivo] = useState(turnoExistente?.motivo || '');
  const [notas, setNotas] = useState(turnoExistente?.notas || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      navigation.setOptions({ title: 'Editar Turno' });
      if (!paciente && turnoExistente?.paciente_id) {
        getPacienteById(turnoExistente.paciente_id).then(setPaciente).catch(console.error);
      }
    }
  }, [isEdit, navigation, paciente, turnoExistente]);

  // Cargar historial si hay paciente seleccionado
  useEffect(() => {
    if (paciente) {
      setLoadingHistorial(true);
      getTurnosByPaciente(paciente.id)
        .then(setHistorial)
        .catch(e => console.error("Error cargando historial", e))
        .finally(() => setLoadingHistorial(false));
    } else {
      setHistorial([]);
    }
  }, [paciente]);

  async function handleGuardar() {
    if (!paciente) {
      Alert.alert('Paciente requerido', 'Seleccioná el paciente para el turno.');
      return;
    }
    if (!motivo.trim()) {
      Alert.alert('Motivo requerido', 'Ingresá el motivo de la consulta.');
      return;
    }

    try {
      setLoading(true);

      // Formatear fechas para API:
      // fecha: YYYY-MM-DD
      const dateStr = fecha.toISOString().split('T')[0];
      // hora: HH:mm
      const hours = hora.getHours().toString().padStart(2, '0');
      const mins = hora.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${mins}`;

      if (isEdit && turnoExistente) {
        await updateTurno(turnoExistente.id, {
          fecha: dateStr,
          hora: timeStr,
          motivo: motivo.trim(),
          notas: notas.trim() || undefined
        });

        Alert.alert(
          'Turno actualizado ✅',
          `Los cambios en el turno de ${paciente.nombres} han sido guardados.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        await createTurno({
          paciente_id: paciente.id,
          fecha: dateStr,
          hora: timeStr,
          motivo: motivo.trim(),
          estado: 'programado',
          notas: notas.trim() || undefined
        });

        Alert.alert(
          'Turno agendado 📅',
          `Paciente: ${paciente.nombres} ${paciente.apellidos}\nFecha: ${formatDate(fecha)}\nHora: ${formatTime(hora)}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al agendar el turno');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

      <PacienteSelector
        visible={selectorVisible}
        onSelect={setPaciente}
        onClose={() => setSelectorVisible(false)}
        onNewPaciente={() => {
          setSelectorVisible(false);
          navigation.navigate('NuevoPaciente');
        }}
      />

      {/* Date picker nativo */}
      {showDatePicker && (
        <DateTimePicker
          value={fecha}
          mode="date"
          display="calendar"
          minimumDate={new Date()}
          onChange={(_e, selected) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selected) setFecha(selected);
          }}
        />
      )}

      {/* Time picker nativo */}
      {showTimePicker && (
        <DateTimePicker
          value={hora}
          mode="time"
          is24Hour
          display="spinner"
          onChange={(_e, selected) => {
            setShowTimePicker(Platform.OS === 'ios');
            if (selected) setHora(selected);
          }}
        />
      )}

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraHeight={120}
        extraScrollHeight={120}
      >
        {/* ── TARJETA 1: Paciente ── */}
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Paciente <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={[styles.selector, paciente && styles.selectorSelected]}
              onPress={() => !isEdit && setSelectorVisible(true)}
              activeOpacity={isEdit ? 1 : 0.7}
            >
              {paciente ? (
                <View style={styles.selectorContent}>
                  <View style={styles.miniAvatar}>
                    <Text style={styles.miniAvatarText}>{(paciente.nombres||'')[0]}{(paciente.apellidos||'')[0]}</Text>
                  </View>
                  <View>
                    <Text style={styles.selectorName}>{paciente.apellidos}, {paciente.nombres}</Text>
                    <Text style={styles.selectorDni}>DNI: {paciente.dni}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>Tocar para buscar paciente...</Text>
              )}
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
            {!paciente && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Ionicons name="information-circle" size={16} color="#888" style={{ marginRight: 4 }} />
                <Text style={[styles.hint, { marginTop: 0 }]}>Si no existe, crealo desde Pacientes.</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── TARJETA 2: Fecha y Hora ── */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 8, marginBottom: 0 }]}>
              <Text style={styles.label}>Fecha <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateBtnText}>{formatDate(fecha)}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8, marginBottom: 0 }]}>
              <Text style={styles.label}>Hora <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateBtnText}>{formatTime(hora)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── TARJETA 3: Detalles Médicos ── */}
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Motivo de consulta <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Control general, receta, dolor..."
              placeholderTextColor="#bbb"
              value={motivo}
              onChangeText={setMotivo}
            />
          </View>

          <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
            <Text style={styles.label}>Notas para el turno</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Estudios previos, derivación..."
              placeholderTextColor="#bbb"
              value={notas}
              onChangeText={setNotas}
              multiline
            />
          </View>
        </View>

        {/* ── TARJETA 4: Historial (Abajo del todo) ── */}
        {paciente && (() => {
          return (
            <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
              <View style={[styles.historialHeader, { padding: 16, backgroundColor: '#fcfcfc', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 0 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="clipboard-outline" size={18} color="#444" style={{ marginRight: 6 }} />
                  <Text style={styles.historialTitle}>Historial de Turnos</Text>
                </View>
                <Text style={styles.historialCount}>{historial.length} visita{historial.length !== 1 ? 's' : ''}</Text>
              </View>
              
              <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                {loadingHistorial ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
                ) : historial.length === 0 ? (
                  <Text style={styles.historialEmpty}>Sin turnos anteriores registrados.</Text>
                ) : (
                  historial.map((h, i) => (
                    <View key={h.id} style={[
                      styles.historialItem,
                      i < historial.length - 1 && styles.historialItemBorder,
                    ]}>
                      <View style={styles.historialItemLeft}>
                        <View style={[styles.historialDot, { backgroundColor: ESTADOS_COLOR[h.estado] ?? '#888' }]} />
                      </View>
                      <View style={styles.historialItemBody}>
                        <View style={styles.historialItemRow}>
                          <Text style={styles.historialFecha}>{formatHistFecha(h.inicio)} a las {formatHora(h.inicio)}</Text>
                          <Text style={[styles.historialEstado, { color: ESTADOS_COLOR[h.estado] ?? '#888' }]}>{h.estado}</Text>
                        </View>
                        <Text style={styles.historialMotivo}>{h.motivo}</Text>
                        {h.notas ? (
                          <View style={{ flexDirection: 'row', marginTop: 4, backgroundColor: '#f9f9f9', padding: 6, borderRadius: 6 }}>
                             <Ionicons name="chatbubble-ellipses-outline" size={15} color="#666" style={{ marginRight: 6 }} />
                             <Text style={[styles.historialNotas, { marginTop: 0, padding: 0, flex: 1 }]}>{h.notas}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          );
        })()}

      </KeyboardAwareScrollView>

      {/* ── Botonera ── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleGuardar}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Guardar Cambios' : 'Agendar Turno'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 20 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#e8e8e8', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 8 },
  required: { color: colors.primary },
  hint: { fontSize: 13, color: '#aaa', marginTop: 4, fontStyle: 'italic' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },

  input: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: '#121212', borderWidth: 1, borderColor: '#e0e0e0',
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },

  selector: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  selectorSelected: { borderColor: colors.primary, backgroundColor: '#f5f9ff', borderWidth: 1.5 },
  selectorPlaceholder: { color: '#999', fontSize: 16 },
  selectorArrow: { fontSize: 22, color: '#ccc' },
  selectorContent: { flexDirection: 'row', alignItems: 'center' },
  miniAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  miniAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  selectorName: { fontWeight: '700', fontSize: 16, color: '#121212' },
  selectorDni: { fontSize: 13, color: '#777', marginTop: 2 },

  dateBtn: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e0e0e0', alignItems: 'center',
  },
  dateBtnText: { fontSize: 16, color: '#121212', fontWeight: '500' },
  historialHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historialTitle: { fontWeight: '700', fontSize: 16, color: '#444' },
  historialCount: { fontSize: 14, color: '#888', backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  historialEmpty: { fontSize: 15, color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },
  historialItem: { flexDirection: 'row', paddingVertical: 10 },
  historialItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  historialItemLeft: { width: 14, alignItems: 'center', paddingTop: 6 },
  historialDot: { width: 8, height: 8, borderRadius: 4 },
  historialItemBody: { flex: 1, paddingLeft: 8 },
  historialItemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  historialFecha: { fontSize: 14, fontWeight: '600', color: '#555' },
  historialEstado: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  historialMotivo: { fontSize: 16, color: '#121212', marginTop: 3 },
  historialNotas: { fontSize: 14, color: '#666', marginTop: 4, fontStyle: 'italic', backgroundColor: '#f9f9f9', padding: 6, borderRadius: 6 },

  footer: { flexDirection: 'row', padding: 16, gap: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  cancelBtnText: { fontSize: 17, fontWeight: '600', color: '#666' },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#f8f8f8', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, height: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#121212' },
  close: { fontSize: 26, color: '#999', padding: 4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, height: 44, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 17 },
  newPatientBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3f0fb',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10,
    marginBottom: 12, borderWidth: 1, borderColor: '#b3d4f0', justifyContent: 'center'
  },
  newPatientIcon: { fontSize: 20, color: colors.primary, marginRight: 8, fontWeight: 'bold' },
  newPatientBtnText: { color: colors.primary, fontWeight: '700', fontSize: 17 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 8, elevation: 1 },
  itemAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  itemName: { fontWeight: '700', fontSize: 17, color: '#121212' },
  itemDni: { fontSize: 14, color: '#777', marginTop: 2 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 17 },
  cancelBtn: { marginTop: 16, padding: 14, backgroundColor: '#ddd', borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#444' },
});
