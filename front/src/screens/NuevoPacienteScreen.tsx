import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, StatusBar, Alert, ActivityIndicator
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { colors } from '../theme/colors';
import { createPaciente, updatePaciente, PacienteFront } from '../services/api';

type FormField = {
  label: string;
  key: keyof PacienteFront;
  placeholder: string;
  keyboard?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  required?: boolean;
};

const FIELDS: FormField[] = [
  { label: 'Nombres', key: 'nombres', placeholder: 'Ej: María Eugenia', required: true },
  { label: 'Apellidos', key: 'apellidos', placeholder: 'Ej: González', required: true },
  { label: 'DNI', key: 'dni', placeholder: 'Ej: 28456789', keyboard: 'numeric' },
  { label: 'Fecha de nacimiento', key: 'fecha_nacimiento', placeholder: 'DD/MM/AAAA', keyboard: 'numeric' },
  { label: 'Teléfono', key: 'telefono', placeholder: 'Ej: 11-2345-6789', keyboard: 'phone-pad' },
  { label: 'Email', key: 'email', placeholder: 'Ej: paciente@email.com', keyboard: 'email-address' },
  { label: 'Notas / Observaciones', key: 'notas', placeholder: 'Información adicional...' },
];

export default function NuevoPacienteScreen({ route, navigation }: any) {
  // Si viene un paciente en los parámteros, estamos en modo Edición
  const pacienteExistente: PacienteFront | undefined = route.params?.paciente;
  const isEdit = !!pacienteExistente;

  const [form, setForm] = useState<Partial<PacienteFront>>(pacienteExistente || {});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && pacienteExistente) {
      navigation.setOptions({ title: 'Editar Paciente' });
      setForm(pacienteExistente);
    }
  }, [isEdit, pacienteExistente, navigation]);

  function setField(key: keyof PacienteFront, value: string) {
    let finalValue = value;
    if (key === 'fecha_nacimiento') {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length > 0) {
        let formatted = cleaned;
        if (cleaned.length > 2) {
          formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
        }
        if (cleaned.length > 4) {
          formatted = formatted.substring(0, 5) + '/' + cleaned.substring(4, 8);
        }
        finalValue = formatted;
      }
    }
    setForm(prev => ({ ...prev, [key]: finalValue }));
  }

  async function handleGuardar() {
    if (!form.nombres?.trim() || !form.apellidos?.trim()) {
      Alert.alert('Campos requeridos', 'Por favor completá Nombres y Apellidos antes de guardar.');
      return;
    }

    try {
      setLoading(true);
      if (isEdit && form.id) {
        await updatePaciente(form.id, form);
        Alert.alert('Éxito', 'Los datos del paciente han sido actualizados.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await createPaciente(form as Omit<PacienteFront, 'id'>);
        Alert.alert('Paciente registrado', `${form.nombres} ${form.apellidos} fue dado de alta correctamente.`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Ocurrió un error al guardar el paciente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraHeight={120}
        extraScrollHeight={120}
      >
        <Text style={styles.sectionTitle}>
          {isEdit ? 'Editar Datos' : 'Datos del Paciente'}
        </Text>

        {FIELDS.map(field => (
          <View key={field.key} style={styles.fieldGroup}>
            <Text style={styles.label}>
              {field.label}{field.required ? <Text style={styles.required}> *</Text> : ''}
            </Text>
            <TextInput
              style={[
                styles.input,
                field.key === 'notas' && styles.inputMultiline,
              ]}
              placeholder={field.placeholder}
              placeholderTextColor="#bbb"
              keyboardType={field.keyboard || 'default'}
              value={(form[field.key] as string) || ''}
              onChangeText={v => setField(field.key, v)}
              multiline={field.key === 'notas'}
              numberOfLines={field.key === 'notas' ? 3 : 1}
              autoCapitalize={field.keyboard === 'email-address' ? 'none' : 'words'}
              editable={!loading}
            />
          </View>
        ))}

        <Text style={styles.hint}>* Campos obligatorios</Text>
      </KeyboardAwareScrollView>

      {/* Botón guardar */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.cancelBtn} 
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleGuardar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{isEdit ? 'Actualizar Paciente' : 'Guardar Paciente'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 8 },

  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
  },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 15, fontWeight: '600', color: '#444', marginBottom: 6 },
  required: { color: colors.primary },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    color: '#121212',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  hint: { fontSize: 14, color: '#aaa', marginTop: 4, marginBottom: 16 },

  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#ddd', alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 17, fontWeight: '600', color: '#666' },
  saveBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 10,
    backgroundColor: colors.primary, alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
