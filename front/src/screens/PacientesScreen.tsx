import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getPacientes, deletePaciente, PacienteFront } from '../services/api';

function PacienteCard({
  paciente, onPress, onEdit, onDelete,
}: { paciente: PacienteFront; onPress: () => void; onEdit: (p: PacienteFront) => void; onDelete: (p: PacienteFront) => void }) {
  const initialA = paciente.nombres ? paciente.nombres.charAt(0).toUpperCase() : '';
  const initialB = paciente.apellidos ? paciente.apellidos.charAt(0).toUpperCase() : '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardAvatar}>
        <Text style={styles.cardAvatarText}>
          {initialA}{initialB}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{paciente.apellidos}, {paciente.nombres}</Text>
        <Text style={styles.cardSub}>DNI: {paciente.dni || 'No registrado'}</Text>
        <Text style={styles.cardSub}>📞 {paciente.telefono || 'Sin teléfono'}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={e => { e.stopPropagation?.(); onEdit(paciente); }}>
          <Ionicons name="pencil" size={20} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={e => { e.stopPropagation?.(); onDelete(paciente); }}>
          <Ionicons name="trash" size={20} color="#d32f2f" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function PacientesScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [pacientes, setPacientes] = useState<PacienteFront[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPacientes = async () => {
    try {
      setLoading(true);
      const data = await getPacientes();
      setPacientes(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudieron cargar los pacientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPacientes();
    });
    return unsubscribe;
  }, [navigation]);

  const filtered = pacientes.filter(p =>
    `${p.nombres} ${p.apellidos} ${p.dni || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (p: PacienteFront) => {
    Alert.alert(
      "Eliminar paciente",
      `¿Estás seguro de que deseas eliminar a ${p.nombres} ${p.apellidos}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deletePaciente(p.id);
              fetchPacientes();
            } catch (e: any) {
              setLoading(false);
              Alert.alert('Error', e.message || 'Error al eliminar');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} style="light" />

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o DNI..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={22} color="#999" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Lista */}
      <View style={styles.list}>
        <Text style={[styles.count, { marginHorizontal: 16, marginTop: 16 }]}>
          {filtered.length} paciente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </Text>
        
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people" size={64} color="#ccc" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No se encontraron pacientes</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <PacienteCard
                paciente={item}
                onPress={() => navigation.navigate('PacienteDetail', { paciente: item })}
                onEdit={() => navigation.navigate('NuevoPaciente', { paciente: item })}
                onDelete={handleDelete}
              />
            )}
          />
        )}
      </View>

      {/* FAB - Nuevo Paciente */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NuevoPaciente')}
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
    paddingBottom: 18,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
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
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4,
  },
  cardAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  cardAvatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  cardInfo: { flex: 1 },
  cardName: { fontWeight: '700', fontSize: 17, color: '#121212' },
  cardSub: { fontSize: 14, color: '#777', marginTop: 2 },
  cardActions: { gap: 6, flexDirection: 'row' },
  actionBtn: {
    width: 34, height: 34, borderRadius: 8, backgroundColor: '#f0f0f0',
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnDanger: { backgroundColor: '#fff0f0', marginLeft: 6 },
  actionBtnText: { fontSize: 17 },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyText: { fontSize: 17, color: '#888' },

  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 6,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 34 },
});
