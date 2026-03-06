import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { colors } from '../theme/colors';
import { getRules, createRule, deleteRule, getExceptions, createException, deleteException, Rule, Exception } from '../services/api';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Genera un bloque de opciones de horario cada 30 min (ej. "08:00", "08:30")
function generarOpcionesHora() {
    const horas = [];
    for (let h = 6; h <= 23; h++) {
        const hh = h.toString().padStart(2, '0');
        horas.push(`${hh}:00`);
        horas.push(`${hh}:30`);
    }
    return horas;
}

const OPCIONES_HORA = generarOpcionesHora();

export default function AvailabilityScreen() {
    const [rules, setRules] = useState<Rule[]>([]);
    const [exceptions, setExceptions] = useState<Exception[]>([]);
    const [loading, setLoading] = useState(false);

    // Formulario Nueva Regla (Valores iniciales)
    const [newRuleDay, setNewRuleDay] = useState('0'); // 0=Lunes
    const [newRuleStart, setNewRuleStart] = useState('09:00');
    const [newRuleEnd, setNewRuleEnd] = useState('17:00');

    // Efecto cascada: Si Start cambia y End queda antes, autoposicionar End
    useEffect(() => {
        const startIndex = OPCIONES_HORA.indexOf(newRuleStart);
        const endIndex = OPCIONES_HORA.indexOf(newRuleEnd);
        if (startIndex >= endIndex && startIndex + 2 < OPCIONES_HORA.length) {
            setNewRuleEnd(OPCIONES_HORA[startIndex + 2]); // ej: default 1 hora despues
        }
    }, [newRuleStart]);

    // Opciones de fin (Solo muestra las horas estrictamente posteriores a Start)
    const endHourOptions = useMemo(() => {
        const startIndex = OPCIONES_HORA.indexOf(newRuleStart);
        return OPCIONES_HORA.slice(startIndex + 1);
    }, [newRuleStart]);

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
                
                <View style={[styles.formCard, { borderWidth: 1, borderColor: '#e1e8ed' }]}>
                     <Text style={styles.formTitle}>Añadir Rango Horario</Text>
                     <Text style={styles.desc}>Puedes agregar múltiples rangos de horas para un mismo día si tienes un descanso intermedio.</Text>
                     
                     <Text style={[styles.label, { marginTop: 10 }]}>Día de la semana</Text>
                     <View style={styles.pickerContainer}>
                         <Picker
                             selectedValue={newRuleDay}
                             onValueChange={(itemValue) => setNewRuleDay(itemValue)}
                             style={styles.picker}
                         >
                             {DIAS.map((dia, index) => (
                                 <Picker.Item key={index} label={dia} value={index.toString()} />
                             ))}
                         </Picker>
                     </View>

                     <View style={[styles.row, { marginTop: 15 }]}>
                        <View style={{flex: 1, marginRight: 10}}>
                             <Text style={styles.label}>Inicia a las</Text>
                             <View style={styles.pickerContainer}>
                                 <Picker
                                     selectedValue={newRuleStart}
                                     onValueChange={(itemValue) => setNewRuleStart(itemValue)}
                                     style={styles.picker}
                                 >
                                     {OPCIONES_HORA.map((hora) => (
                                         <Picker.Item key={hora} label={hora} value={hora} />
                                     ))}
                                 </Picker>
                             </View>
                        </View>
                        
                        <View style={{flex: 1}}>
                             <Text style={styles.label}>Finaliza a las</Text>
                             <View style={styles.pickerContainer}>
                                 <Picker
                                     selectedValue={newRuleEnd}
                                     onValueChange={(itemValue) => setNewRuleEnd(itemValue)}
                                     style={styles.picker}
                                     enabled={endHourOptions.length > 0}
                                 >
                                     {endHourOptions.map((hora) => (
                                         <Picker.Item key={hora} label={hora} value={hora} />
                                     ))}
                                 </Picker>
                             </View>
                        </View>
                     </View>
                     <TouchableOpacity style={[styles.btnSecondary, { marginTop: 10, flexDirection: 'row', justifyContent: 'center' }]} onPress={handleCrearRegla}>
                         <Ionicons name="add-circle" size={20} color={colors.primary} style={{ marginRight: 6 }} />
                         <Text style={styles.btnTextSecondary}>Agregar Rango Horario</Text>
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
   label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
   input: { backgroundColor: colors.gray100, padding: 10, borderRadius: 8, fontSize: 14, borderWidth: 1, borderColor: '#eee' },
   pickerContainer: {
        backgroundColor: colors.gray100,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
        overflow: 'hidden',
        height: 48,
        justifyContent: 'center',
   },
   picker: {
        width: '100%',
        backgroundColor: 'transparent',
        borderWidth: 0,
        height: 48,
   },
   btnSecondary: { backgroundColor: 'rgba(26,111,181,0.1)', padding: 14, borderRadius: 10, alignItems: 'center' },
   btnTextSecondary: { color: colors.primary, fontWeight: 'bold' },
   itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 8, elevation: 1 },
   itemText: { fontSize: 15, fontWeight: '500', color: colors.text }
});
