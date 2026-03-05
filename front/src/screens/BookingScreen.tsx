import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { getPublicSlots, createReservation, PublicSlot } from '../services/api';
import dayjs from 'dayjs';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';

export default function BookingScreen() {
    const route = useRoute();
    const { slug } = route.params as { slug: string };

    const [slotsData, setSlotsData] = useState<PublicSlot[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    // Formulario de Reserva 
    const [nombres, setNombres] = useState('');
    const [apellidos, setApellidos] = useState('');
    const [email, setEmail] = useState('');
    const [dni, setDni] = useState('');
    const [telefono, setTelefono] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // Cargar Slots para los próximos 30 días
        const loadSlots = async () => {
             setLoading(true);
             try {
                const start = dayjs().format('YYYY-MM-DD');
                const end = dayjs().add(30, 'day').format('YYYY-MM-DD');
                const res = await getPublicSlots(slug, start, end);
                setSlotsData(res);
                if(res.length > 0) setSelectedDate(res[0].date); // Autoselect primer dia con turnos
             } catch(err: any) {
                 Alert.alert('Error', err.message);
             } finally {
                 setLoading(false);
             }
        };
        loadSlots();
    }, [slug]);

    const handleAbonarYReservar = async () => {
         if(!selectedDate || !selectedTime || !nombres || !apellidos || !email || !dni) {
             Alert.alert('Aviso', 'Completa los datos requeridos');
             return;
         }

         setSubmitting(true);
         try {
             const res = await createReservation(slug, {
                 nombres, apellidos, email, dni, telefono,
                 date: selectedDate, time: selectedTime
             });
             
             // Si el servidor nos dio el link de pago (init_point), lo abrimos
             if(res.init_point) {
                  Linking.openURL(res.init_point);
             } else {
                 Alert.alert('Éxito', '¡Turno Agendado con éxito!');
             }
         } catch(error: any) {
             Alert.alert('No se pudo reservar', error.message);
         } finally {
             setSubmitting(false);
         }
    };

    if(loading) {
       return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    const availableSlotsForSelectedDate = slotsData.find(s => s.date === selectedDate)?.slots || [];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.header}>Reserva de Turno</Text>
            <Text style={styles.subHeader}>Completa los datos para asistir con {slug}</Text>

            {/* SELECCION DE FECHA (Horizontal Scroll) */}
            <View style={styles.section}>
                 <Text style={styles.label}>1. Elige tu fecha</Text>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                      {slotsData.map(s => {
                          const dt = dayjs(s.date);
                          const isSelected = selectedDate === s.date;
                          return (
                              <TouchableOpacity 
                                 key={s.date} 
                                 style={[styles.dateCard, isSelected && styles.dateCardActive]}
                                 onPress={() => { setSelectedDate(s.date); setSelectedTime(null); }}
                              >
                                  <Text style={[styles.dateDay, isSelected && styles.textWhite]}>{dt.format('ddd')}</Text>
                                  <Text style={[styles.dateNumber, isSelected && styles.textWhite]}>{dt.format('DD')}</Text>
                                  <Text style={[styles.dateMonth, isSelected && styles.textWhite]}>{dt.format('MMM')}</Text>
                              </TouchableOpacity>
                          )
                      })}
                 </ScrollView>
                 {slotsData.length === 0 && <Text style={{color: '#666', marginTop: 10}}>No hay disponibilidad este mes.</Text>}
            </View>

            {/* SELECCION DE HORA */}
            {selectedDate && (
                <View style={styles.section}>
                    <Text style={styles.label}>2. Elige la hora</Text>
                    {availableSlotsForSelectedDate.length === 0 ? (
                        <Text style={{color: colors.gray300}}>No hay turnos disponibles para esta fecha.</Text>
                    ) : (
                        <View style={styles.timeGrid}>
                            {availableSlotsForSelectedDate.map(time => {
                                 const isSelected = selectedTime === time;
                                 return (
                                     <TouchableOpacity 
                                         key={time} 
                                         style={[styles.timeSlot, isSelected && styles.timeSlotActive]}
                                         onPress={() => setSelectedTime(time)}
                                     >
                                         <Text style={[styles.timeText, isSelected && styles.textWhite]}>{time}</Text>
                                     </TouchableOpacity>
                                 )
                            })}
                        </View>
                    )}
                </View>
            )}

            {/* FORMULARIO PACIENTE */}
            {selectedTime && (
                <View style={styles.sectionForm}>
                     <Text style={styles.label}>3. Ingresa tus Datos Personales</Text>
                     
                     <TextInput style={styles.input} placeholder="Nombres" value={nombres} onChangeText={setNombres} />
                     <TextInput style={styles.input} placeholder="Apellidos" value={apellidos} onChangeText={setApellidos} />
                     <TextInput style={styles.input} placeholder="DNI" value={dni} onChangeText={setDni} keyboardType="numeric" />
                     <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                     <TextInput style={styles.input} placeholder="Teléfono" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />

                     <View style={styles.disclaimerBox}>
                          <Ionicons name="shield-checkmark" size={24} color={colors.accent} />
                          <Text style={styles.disclaimerText}>Tu reserva está protegida. Serás redirigido a MercadoPago para abonar la seña (50% del valor total de la consulta).</Text>
                     </View>

                     <TouchableOpacity 
                         style={[styles.submitBtn, submitting && {opacity: 0.7}]} 
                         onPress={handleAbonarYReservar} 
                         disabled={submitting}
                     >
                         <Text style={styles.submitText}>{submitting ? 'Procesando...' : 'Pagar Seña y Agendar'}</Text>
                     </TouchableOpacity>
                </View>
            )}
            <View style={{height: 100}}/>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
    container: { flex: 1, backgroundColor: colors.gray100},
    content: { padding: 20, paddingTop: Platform.OS === 'web' ? 40 : 20 },
    header: { fontSize: 28, fontWeight: 'bold', color: colors.primary, marginBottom: 5 },
    subHeader: { fontSize: 16, color: colors.gray300, marginBottom: 25 },
    
    section: { marginBottom: 30 },
    label: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 15 },
    
    hScroll: { paddingBottom: 10 },
    dateCard: { 
        width: 70, height: 90, backgroundColor: '#fff', 
        borderRadius: 12, alignItems: 'center', justifyContent: 'center', 
        marginRight: 10, borderWidth: 1, borderColor: colors.gray200, elevation: 1
    },
    dateCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    dateDay: { fontSize: 12, color: colors.gray300, textTransform: 'uppercase', fontWeight: 'bold' },
    dateNumber: { fontSize: 24, fontWeight: '800', color: colors.text, marginVertical: 2 },
    dateMonth: { fontSize: 13, color: colors.gray400 },
    textWhite: { color: '#fff' },

    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    timeSlot: { 
        width: '30%', paddingVertical: 12, backgroundColor: '#fff', 
        borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.gray200 
    },
    timeSlotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    timeText: { fontSize: 16, fontWeight: '600', color: colors.text },

    sectionForm: { backgroundColor: '#fff', padding: 20, borderRadius: 12, elevation: 2 },
    input: { backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200, borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 12 },
    
    disclaimerBox: { flexDirection: 'row', backgroundColor: colors.gray100, padding: 15, borderRadius: 8, marginTop: 10, marginBottom: 20, alignItems: 'center'},
    disclaimerText: { flex: 1, fontSize: 13, color: '#666', marginLeft: 10, lineHeight: 18 },

    submitBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 10, alignItems: 'center'},
    submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
