import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getRules, createRule, deleteRule, getExceptions, createException, deleteException, Rule, Exception } from '../services/api';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function AvailabilityScreen() {
    const [rules, setRules] = useState<Rule[]>([]);
    const [exceptions, setExceptions] = useState<Exception[]>([]);
    const [loading, setLoading] = useState(false);

    // Formulario Nueva Regla
    const [newRuleDay, setNewRuleDay] = useState('0'); // 0=Lunes
    const [newRuleStart, setNewRuleStart] = useState('09:00');
    const [newRuleEnd, setNewRuleEnd] = useState('17:00');

    // Formulario Nueva Excepción
    const [newExcDate, setNewExcDate] = useState('');
    const [newExcType, setNewExcType] = useState('BLOCK'); // BLOCK, EXTRA
    const [newExcStart, setNewExcStart] = useState('');
    const [newExcEnd, setNewExcEnd] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [r, e] = await Promise.all([getRules(), getExceptions()]);
            setRules(r);
            setExceptions(e);
        } catch (error: any) {
             Alert.alert('Error', error.message || 'Error cargando disponibilidad');
        } finally {
            setLoading(false);
        }
    };

    const handleCrearRegla = async () => {
        try {
            await createRule({
                dayOfWeek: Number(newRuleDay),
                startTime: newRuleStart,
                endTime: newRuleEnd
            });
            Alert.alert('Éxito', 'Regla de horario creada.');
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleBorrarRegla = async (id: number) => {
         try {
             await deleteRule(id);
             loadData();
         } catch(error: any) {
             Alert.alert('Error', error.message);
         }
    };

    const handleCrearException = async () => {
        try {
             await createException({
                 date: newExcDate,
                 type: newExcType,
                 startTime: newExcStart || null,
                 endTime: newExcEnd || null,
                 description: null
             });
             Alert.alert('Éxito', 'Excepción agendada.');
             loadData();
        } catch(error: any) {
            Alert.alert('Error', error.message);
        }
    }

    const handleBorrarExcepcion = async (id: number) => {
        try {
            await deleteException(id);
            loadData();
        } catch(error: any) {
            Alert.alert('Error', error.message);
        }
   };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

    return (
        <ScrollView style={styles.container}>
            {/* ZONA 1: REGLAS REGULARES */}
            <View style={styles.section}>
                <Text style={styles.title}>Horarios Regulares</Text>
                
                <View style={styles.formCard}>
                     <Text style={styles.formTitle}>Agregar Día de Atención</Text>
                     <View style={styles.row}>
                        <View style={{flex: 1, marginRight: 10}}>
                             <Text style={styles.label}>Día (0=Lun, 6=Dom)</Text>
                             <TextInput style={styles.input} value={newRuleDay} onChangeText={setNewRuleDay} keyboardType="numeric" />
                        </View>
                        <View style={{flex: 1, marginRight: 10}}>
                             <Text style={styles.label}>Inicio</Text>
                             <TextInput style={styles.input} value={newRuleStart} onChangeText={setNewRuleStart} placeholder="09:00" />
                        </View>
                        <View style={{flex: 1}}>
                             <Text style={styles.label}>Fin</Text>
                             <TextInput style={styles.input} value={newRuleEnd} onChangeText={setNewRuleEnd} placeholder="17:00" />
                        </View>
                     </View>
                     <TouchableOpacity style={styles.btnSecondary} onPress={handleCrearRegla}>
                         <Text style={styles.btnTextSecondary}>Agregar Regla</Text>
                     </TouchableOpacity>
                </View>

                {rules.map(r => (
                    <View key={r.id} style={styles.itemRow}>
                        <Text style={styles.itemText}>{DIAS[r.dayOfWeek]}: {r.startTime} a {r.endTime}</Text>
                        <TouchableOpacity onPress={() => handleBorrarRegla(r.id)}>
                            <Ionicons name="trash" size={20} color={colors.danger} />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            {/* ZONA 2: EXCEPCIONES */}
            <View style={styles.section}>
                <Text style={styles.title}>Bloqueos o Días Extra</Text>
                <Text style={styles.desc}>Usa esto para bloquear un feriado, vacación, o agregar un turno especial en un día que normalmente no atiendes.</Text>
                
                <View style={styles.formCard}>
                     <Text style={styles.formTitle}>Agregar Fecha Específica</Text>
                     
                     <Text style={styles.label}>Fecha (YYYY-MM-DD)</Text>
                     <TextInput style={styles.input} value={newExcDate} onChangeText={setNewExcDate} placeholder="2024-12-25" />
                     
                     <View style={styles.row}>
                        <View style={{flex: 1, marginRight: 10}}>
                             <Text style={styles.label}>Tipo (BLOCK / EXTRA)</Text>
                             <TextInput style={styles.input} value={newExcType} onChangeText={setNewExcType} autoCapitalize="characters" />
                        </View>
                        <View style={{flex: 1, marginRight: 10}}>
                             <Text style={styles.label}>Inicio (Opcional)</Text>
                             <TextInput style={styles.input} value={newExcStart} onChangeText={setNewExcStart} placeholder="09:00" />
                        </View>
                        <View style={{flex: 1}}>
                             <Text style={styles.label}>Fin (Opcional)</Text>
                             <TextInput style={styles.input} value={newExcEnd} onChangeText={setNewExcEnd} placeholder="17:00" />
                        </View>
                     </View>
                     <TouchableOpacity style={styles.btnSecondary} onPress={handleCrearException}>
                         <Text style={styles.btnTextSecondary}>Agendar Excepción</Text>
                     </TouchableOpacity>
                </View>

                {exceptions.map(e => (
                    <View key={e.id} style={styles.itemRow}>
                        <Text style={[styles.itemText, { color: e.type==='BLOCK' ? colors.danger : colors.primary }]}>
                           [{e.type}] {new Date(e.date).toLocaleDateString()} {e.startTime ? `(${e.startTime} - ${e.endTime})` : '(Todo el día)'}
                        </Text>
                        <TouchableOpacity onPress={() => handleBorrarExcepcion(e.id)}>
                            <Ionicons name="trash" size={20} color={colors.danger} />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
   container: { flex: 1, backgroundColor: colors.gray100, padding: 15 },
   section: { marginBottom: 30 },
   title: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
   desc: { fontSize: 13, color: colors.gray300, marginBottom: 15 },
   formCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
   formTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
   row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 15 },
   label: { fontSize: 12, color: colors.gray300, marginBottom: 5 },
   input: { backgroundColor: colors.gray100, padding: 10, borderRadius: 8, fontSize: 14 },
   btnSecondary: { backgroundColor: colors.gray200, padding: 12, borderRadius: 8, alignItems: 'center' },
   btnTextSecondary: { color: colors.primary, fontWeight: 'bold' },
   itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 8, elevation: 1 },
   itemText: { fontSize: 15, fontWeight: '500', color: colors.text }
});
