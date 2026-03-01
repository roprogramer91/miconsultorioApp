import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getTurnos, deleteTurno, updateTurno, TurnoFront, PacienteFront, getPacientes } from '../services/api';

const ESTADOS: Record<string, { label: string; color: string; bg: string }> = {
  programado: { label: 'Programado', color: '#1a6fb5', bg: '#e3f0fb' },
  atendido:   { label: 'Atendido',   color: '#2e7d32', bg: '#e8f5e9' },
  cancelado:  { label: 'Cancelado',  color: '#b71c1c', bg: '#fdecea' },
};

function formatHora(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function formatFechaCompleta(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function TurnoDetailScreen({ route, navigation }: any) {
  // Manejamos dos casos: podemos recibir el objeto 'turno' completo o solo 'id' (desde notificaciones)
  const { turno: routeTurno, id: routeId } = route.params || {};

  const [turno, setTurno] = useState<TurnoFront | null>(routeTurno || null);
  const [paciente, setPaciente] = useState<PacienteFront | null>(null);
  const [loading, setLoading] = useState(!routeTurno);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let currentTurno = turno;
        
        // Si no tenemos el turno pero sí el ID, lo buscamos
        if (!currentTurno && routeId) {
          const turnos = await getTurnos();
          const t = turnos.find(x => x.id === Number(routeId));
          if (t) {
            currentTurno = t;
            setTurno(t);
          } else {
            Alert.alert('Error', 'Turno no encontrado');
            navigation.goBack();
            return;
          }
        }

        // Buscar paciente
        if (currentTurno) {
          const pacientes = await getPacientes();
          const p = pacientes.find(x => x.id === currentTurno!.paciente_id);
          if (p) {
            setPaciente(p);
          }
        }
      } catch (error) {
        console.error("Error fetching turno details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!paciente || !turno) {
      fetchData();
    }
  }, [routeId, turno]);

  const changeStatus = async (nuevoEstado: string) => {
    if (!turno) return;
    try {
      setLoading(true);
      await updateTurno(turno.id, { estado: nuevoEstado });
      setTurno({ ...turno, estado: nuevoEstado });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error al actualizar el estado');
    } finally {
      setLoading(false);
    }
  };

  const confirmarEstado = (estado: string) => {
    Alert.alert(
      "Confirmar",
      `¿Cambiar el estado a ${estado}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Aceptar", onPress: () => changeStatus(estado) }
      ]
    );
  };

  if (loading || !turno) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const est = ESTADOS[turno.estado] || ESTADOS.programado;
  const nombrePaciente = paciente ? `${paciente.nombres} ${paciente.apellidos}` : `Paciente ID: ${turno.paciente_id}`;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del Turno</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('NuevoTurno', { turno })}>
          <Ionicons name="pencil" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* TARJETA PRINCIPAL DEL PACIENTE */}
        <TouchableOpacity 
          style={styles.pacienteCard} 
          activeOpacity={paciente ? 0.7 : 1}
          onPress={() => paciente && navigation.navigate('PacienteDetail', { paciente })}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {paciente ? `${paciente.nombres[0]}${paciente.apellidos[0]}` : <Ionicons name="person" size={24} color="#fff" />}
            </Text>
          </View>
          <View style={styles.pacienteInfo}>
            <Text style={styles.pacienteName}>{nombrePaciente}</Text>
            {paciente?.dni && <Text style={styles.pacienteSub}>DNI: {paciente.dni}</Text>}
            <Text style={styles.pacienteLink}>Ver Ficha Completa <Ionicons name="chevron-forward" size={12} /></Text>
          </View>
        </TouchableOpacity>

        {/* DETALLE DEL TURNO */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.detailDate}>{formatFechaCompleta(turno.inicio)}</Text>
              <Text style={styles.detailTime}>{formatHora(turno.inicio)} hrs</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: est.bg }]}>
              <Text style={[styles.badgeText, { color: est.color }]}>{est.label}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.label}>Motivo de la consulta</Text>
            <Text style={styles.value}>{turno.motivo || 'No especificado'}</Text>
          </View>

          {turno.notas && (
             <View style={styles.section}>
               <Text style={styles.label}>Notas adicionales</Text>
               <Text style={styles.value}>{turno.notas}</Text>
             </View>
          )}
        </View>

        {/* ACCIONES DE ESTADO */}
        <Text style={styles.sectionTitle}>Actualizar Estado</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionBtn, turno.estado === 'programado' && styles.actionBtnActive, { borderColor: '#1a6fb5' }]} 
            onPress={() => confirmarEstado('programado')}
          >
            <Ionicons name="time-outline" size={24} color="#1a6fb5" style={{ marginBottom: 4}} />
            <Text style={[styles.actionBtnText, { color: '#1a6fb5' }]}>Pendiente</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, turno.estado === 'atendido' && styles.actionBtnActive, { borderColor: '#2e7d32' }]} 
            onPress={() => confirmarEstado('atendido')}
          >
            <Ionicons name="checkmark-circle-outline" size={24} color="#2e7d32" style={{ marginBottom: 4}} />
            <Text style={[styles.actionBtnText, { color: '#2e7d32' }]}>Atendido</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionBtn, turno.estado === 'cancelado' && styles.actionBtnActive, { borderColor: '#d32f2f' }]} 
            onPress={() => confirmarEstado('cancelado')}
          >
            <Ionicons name="close-circle-outline" size={24} color="#d32f2f" style={{ marginBottom: 4}} />
            <Text style={[styles.actionBtnText, { color: '#d32f2f' }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  backBtn: { padding: 4 },
  editBtn: { padding: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },

  pacienteCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center',
    marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  pacienteInfo: { flex: 1 },
  pacienteName: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  pacienteSub: { fontSize: 14, color: '#666', marginBottom: 4 },
  pacienteLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  detailCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  detailDate: { fontSize: 16, color: '#666', textTransform: 'capitalize', marginBottom: 4 },
  detailTime: { fontSize: 28, fontWeight: '900', color: colors.primary },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeText: { fontSize: 14, fontWeight: '700' },
  
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  
  section: { marginBottom: 16 },
  label: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', fontWeight: '700', marginBottom: 6 },
  value: { fontSize: 16, color: '#333', lineHeight: 24 },

  sectionTitle: { fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5, color: '#888', fontWeight: '700', marginBottom: 12, marginLeft: 4 },
  actionsContainer: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, backgroundColor: '#fff', borderWidth: 2, borderRadius: 12,
    padding: 16, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed'
  },
  actionBtnActive: { borderStyle: 'solid', backgroundColor: '#f9f9f9' },
  actionBtnText: { fontSize: 14, fontWeight: '700', marginTop: 8 },
});
