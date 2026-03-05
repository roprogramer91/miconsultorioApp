import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

// La URL se saca de entorno o hardcodeado según fallback
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// Componente híbrido: En Web usa <input type="color"> nativo del navegador, en móviles un simple cuadro.
const NativeColorPicker = ({ value, onChange }: { value: string, onChange: (color: string) => void }) => {
    if (Platform.OS === 'web') {
        return (
            <input 
                type="color" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                style={{ width: 35, height: 35, padding: 0, border: 'none', borderRadius: 6, cursor: 'pointer', marginRight: 10, backgroundColor: 'transparent' }}
            />
        );
    }
    // Fallback básico para móvil (el Admin suele ser Web)
    return <View style={{ width: 35, height: 35, borderRadius: 6, backgroundColor: value, marginRight: 10, borderWidth: 1, borderColor: '#ccc' }} />;
};

export default function SuperAdminScreen() {
    // Auth State
    const [authData, setAuthData] = useState({ username: '', password: '' });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // Form State
    const [form, setForm] = useState({
        slug: '',
        primaryColor: '#b00000',
        backgroundColor: '#f5f5f5',
        textColor: '#333333',
        heroTitle: 'Atención Profesional de Calidad',
        heroSubtitle: 'Especialista en Cardiología, Diabetología y Medicina Clínica',
        logoUrl: '',
        heroImageUrl: '',
        profileImageUrl: '',
        whatsappNumber: '',
        facebookUrl: '',
        instagramUrl: '',
        obrasSociales: [] as string[],
        especialidades: [] as { titulo: string; descripcion: string; items: string[] }[]
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleLogin = (e?: any) => {
        if (e) e.preventDefault();
        // Validación básica en front, luego se re-valida en back
        if (authData.username === 'ramirez91' && authData.password === 'Inicio24$') {
            setIsAuthenticated(true);
            setMessage({ type: '', text: '' });
        } else {
            setMessage({ type: 'error', text: 'Credenciales inválidas.' });
        }
    };

    const loadDoctorConfig = async () => {
        if (!form.slug) {
            setMessage({ type: 'error', text: 'Ingresa el slug del doctor primero.' });
            return;
        }
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await fetch(`${API_URL}/public/doctors/${form.slug}?admin=true`);
            const data = await res.json();
            
            if (res.ok && data.landingConfig) {
                setForm({
                    ...form,
                    primaryColor: data.landingConfig.primaryColor || '#b00000',
                    backgroundColor: data.landingConfig.backgroundColor || '#f5f5f5',
                    textColor: data.landingConfig.textColor || '#333333',
                    heroTitle: data.landingConfig.heroTitle || '',
                    heroSubtitle: data.landingConfig.heroSubtitle || '',
                    logoUrl: data.landingConfig.logoUrl || '',
                    heroImageUrl: data.landingConfig.heroImageUrl || '',
                    profileImageUrl: data.landingConfig.profileImageUrl || '',
                    whatsappNumber: data.landingConfig.whatsappNumber || '',
                    facebookUrl: data.landingConfig.facebookUrl || '',
                    instagramUrl: data.landingConfig.instagramUrl || '',
                    obrasSociales: data.landingConfig.obrasSociales || [],
                    especialidades: data.landingConfig.especialidades || []
                });
                setMessage({ type: 'success', text: `Configuración de ${data.nombres} cargada con éxito.` });
            } else if (res.ok) {
                 setMessage({ type: 'success', text: `Doctor ${data.nombres} encontrado. No tiene config, puedes crear una ahora.` });
            } else {
                setMessage({ type: 'error', text: data.error || 'Doctor no encontrado.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Error de red.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!form.slug) {
            setMessage({ type: 'error', text: 'Slug es requerido para guardar.' });
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/admin/landing-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: authData.username,
                    password: authData.password,
                    slug: form.slug,
                    config: form
                })
            });
            const data = await response.json();
            if (response.ok) {
                setMessage({ type: 'success', text: '¡Plantilla guardada y publicada en vivo!' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Hubo un problema al guardar.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error interno o de red.' });
        } finally {
            setLoading(false);
        }
    };

    const [activeTab, setActiveTab] = useState<'template' | 'create'>('create');
    const [newDoctor, setNewDoctor] = useState({ nombres: '', apellidos: '', email: '', slug: '' });

    const handleCreateDoctor = async () => {
        if (!newDoctor.email || !newDoctor.nombres || !newDoctor.slug) {
            setMessage({ type: 'error', text: 'Email, nombres y slug son obligatorios.' });
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/admin/doctors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: authData.username,
                    password: authData.password,
                    ...newDoctor
                })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: `¡Cuenta dada de alta! Ya puede iniciar sesión con ${newDoctor.email}` });
                setNewDoctor({ nombres: '', apellidos: '', email: '', slug: '' }); // Limpiar reseteo
            } else {
                setMessage({ type: 'error', text: data.error || 'Hubo un error al crear la cuenta' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Error de red.' });
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <View style={styles.authContainer}>
                <View style={styles.authCard}>
                    <Ionicons name="settings-outline" size={60} color={colors.primary} style={{marginBottom: 20}} />
                    <Text style={styles.authTitle}>SuperAdmin Console</Text>
                    <Text style={styles.authSub}>Constructor de Landings Privado</Text>
                    
                    {message.text ? <Text style={styles.errorText}>{message.text}</Text> : null}

                    <TextInput 
                        placeholder="Usuario" 
                        value={authData.username} 
                        onChangeText={(t) => setAuthData({...authData, username: t})} 
                        style={styles.input}
                        autoCapitalize="none"
                    />
                    <TextInput 
                        placeholder="Contraseña" 
                        secureTextEntry
                        value={authData.password} 
                        onChangeText={(t) => setAuthData({...authData, password: t})} 
                        style={styles.input}
                    />

                    <TouchableOpacity style={styles.button} onPress={handleLogin}>
                        <Text style={styles.buttonText}>Ingresar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.adminContainer}>
            <View style={styles.header}>
               <Text style={styles.headerTitle}>⚙️ Panel SuperAdmin SaaS</Text>
               <TouchableOpacity onPress={() => setIsAuthenticated(false)}>
                   <Text style={{color: '#666'}}>Cerrar Sesión</Text>
               </TouchableOpacity>
            </View>

            {/* TAB SELECTOR */}
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'create' && styles.activeTab]} 
                    onPress={() => { setActiveTab('create'); setMessage({type:'', text:''}); }}
                >
                    <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>1. Alta Doctor</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'template' && styles.activeTab]} 
                    onPress={() => { setActiveTab('template'); setMessage({type:'', text:''}); }}
                >
                    <Text style={[styles.tabText, activeTab === 'template' && styles.activeTabText]}>2. Plantilla Web</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.formCard}>
                
                {message.text ? (
                    <View style={[styles.messageBox, message.type === 'error' ? styles.messageError : styles.messageSuccess]}>
                        <Text style={{color: message.type==='error'?'#B91C1C':'#047857', fontWeight: 'bold'}}>{message.text}</Text>
                    </View>
                ) : null}

                {/* TAB CONTENIDO: CREAR DOCTOR */}
                {activeTab === 'create' && (
                    <View>
                        <Text style={styles.sectionHeader}>Registrar Nuevo Cliente SaaS</Text>
                        <Text style={{color:'#6B7280', marginBottom: 20}}>Crea la cuenta de tu cliente. Cuando inicie sesión con este correo (Google), ya tendrá acceso y su Link público generado.</Text>
                        
                        <View style={styles.rowGroup}>
                            <View style={{flex: 1}}>
                                <Text style={styles.label}>Nombres del Médico</Text>
                                <TextInput style={styles.input} placeholder="Ej: Juan Carlos" value={newDoctor.nombres} onChangeText={(t) => setNewDoctor({...newDoctor, nombres: t})} />
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.label}>Apellidos</Text>
                                <TextInput style={styles.input} placeholder="Ej: Martinez" value={newDoctor.apellidos} onChangeText={(t) => setNewDoctor({...newDoctor, apellidos: t})} />
                            </View>
                        </View>

                        <Text style={styles.label}>Correo Electrónico (Para Login por Google)</Text>
                        <TextInput style={styles.input} placeholder="ejemplo@gmail.com" autoCapitalize="none" value={newDoctor.email} onChangeText={(t) => setNewDoctor({...newDoctor, email: t.toLowerCase().trim()})} />

                        <Text style={styles.label}>URL Personalizada (Slug)</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15}}>
                            <Text style={{color: '#9CA3AF', marginRight: 5}}>miconsultorio.com/</Text>
                            <TextInput style={[styles.input, {flex: 1, marginBottom: 0}]} placeholder="juancarlosmartinez" autoCapitalize="none" value={newDoctor.slug} onChangeText={(t) => setNewDoctor({...newDoctor, slug: t.trim()})} />
                        </View>

                        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleCreateDoctor}>
                             {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Dar de Alta Médico</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                {/* TAB CONTENIDO: TEMPLATE LANDING */}
                {activeTab === 'template' && (
                    <View>
                        <Text style={styles.sectionHeader}>Modificar Diseño de Landing</Text>
                        <View style={styles.rowGroup}>
                            <View style={{flex: 1}}>
                                <Text style={styles.label}>ID Doctor Destino (Slug):</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Ej: RogerRamirez" 
                                    value={form.slug} 
                                    onChangeText={(t) => setForm({...form, slug: t})} 
                                    autoCapitalize="none"
                                />
                            </View>
                            <TouchableOpacity style={[styles.button, {marginTop: 25, backgroundColor: '#374151'}]} onPress={loadDoctorConfig}>
                                 {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cargar Info</Text>}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.sectionHeader}>Colores de Identidad</Text>
                        
                        <View style={[styles.rowGroup, {flexWrap: 'wrap', alignItems: 'flex-start'}]}>
                            <View style={styles.colorInputContainer}>
                                <Text style={styles.label}>Acento Principal</Text>
                                <View style={{flexDirection:'row', alignItems:'center', marginBottom: 10}}>
                                    <NativeColorPicker value={form.primaryColor} onChange={(c) => setForm({...form, primaryColor: c})} />
                                    <TextInput style={styles.inputColor} autoCapitalize="none" value={form.primaryColor} onChangeText={(t) => setForm({...form, primaryColor: t})} />
                                </View>
                                <View style={styles.paletteRow}>
                                    {['#b00000', '#2563EB', '#4F46E5', '#9333EA', '#10B981', '#E11D48'].map(c => (
                                        <TouchableOpacity key={c} style={[styles.paletteDot, { backgroundColor: c }]} onPress={() => setForm({...form, primaryColor: c})} />
                                    ))}
                                </View>
                            </View>
                            
                            <View style={styles.colorInputContainer}>
                                <Text style={styles.label}>Fondo Web</Text>
                                <View style={{flexDirection:'row', alignItems:'center', marginBottom: 10}}>
                                    <NativeColorPicker value={form.backgroundColor} onChange={(c) => setForm({...form, backgroundColor: c})} />
                                    <TextInput style={styles.inputColor} autoCapitalize="none" value={form.backgroundColor} onChangeText={(t) => setForm({...form, backgroundColor: t})} />
                                </View>
                                <View style={styles.paletteRow}>
                                    {['#ffffff', '#f5f5f5', '#F9FAFB', '#FFFBEB', '#F0FDF4', '#111827'].map(c => (
                                        <TouchableOpacity key={c} style={[styles.paletteDot, { backgroundColor: c, borderWidth: 1, borderColor: '#E5E7EB' }]} onPress={() => setForm({...form, backgroundColor: c})} />
                                    ))}
                                </View>
                            </View>

                            <View style={styles.colorInputContainer}>
                                <Text style={styles.label}>Color Texto Base</Text>
                                <View style={{flexDirection:'row', alignItems:'center', marginBottom: 10}}>
                                    <NativeColorPicker value={form.textColor} onChange={(c) => setForm({...form, textColor: c})} />
                                    <TextInput style={styles.inputColor} autoCapitalize="none" value={form.textColor} onChangeText={(t) => setForm({...form, textColor: t})} />
                                </View>
                                <View style={styles.paletteRow}>
                                    {['#333333', '#4a4a4a', '#111827', '#404040', '#1E3A8A', '#F3F4F6'].map(c => (
                                        <TouchableOpacity key={c} style={[styles.paletteDot, { backgroundColor: c, borderWidth: 1, borderColor: '#E5E7EB' }]} onPress={() => setForm({...form, textColor: c})} />
                                    ))}
                                </View>
                            </View>
                        </View>

                        <View style={styles.divider} />
                        
                        <Text style={styles.sectionHeader}>Copywriting (Hero)</Text>
                        <Text style={styles.label}>Título Principal H1</Text>
                        <TextInput style={styles.input} value={form.heroTitle} onChangeText={(t) => setForm({...form, heroTitle: t})} />

                        <Text style={styles.label}>Subtítulo Descriptivo</Text>
                        <TextInput style={[styles.input, { height: 80 }]} value={form.heroSubtitle} multiline onChangeText={(t) => setForm({...form, heroSubtitle: t})} />

                        <View style={styles.divider} />
                        
                        <Text style={styles.sectionHeader}>Contacto y Redes (Opcional)</Text>
                        <Text style={styles.label}>WhatsApp Profesional</Text>
                        <TextInput style={styles.input} placeholder="+5491100000000" keyboardType="phone-pad" value={form.whatsappNumber} onChangeText={(t) => setForm({...form, whatsappNumber: t})} />
                        
                        <View style={styles.rowGroup}>
                            <View style={{flex: 1}}>
                                <Text style={styles.label}>Enlace Facebook</Text>
                                <TextInput style={styles.input} placeholder="https://facebook.com/..." value={form.facebookUrl} onChangeText={(t) => setForm({...form, facebookUrl: t})} />
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.label}>Enlace Instagram</Text>
                                <TextInput style={styles.input} placeholder="https://instagram.com/..." value={form.instagramUrl} onChangeText={(t) => setForm({...form, instagramUrl: t})} />
                            </View>
                        </View>

                        <View style={styles.divider} />
                        
                        <Text style={styles.sectionHeader}>Archivos Multimedia</Text>
                        <Text style={styles.label}>Foto de Perfil Oficial (URL)</Text>
                        <TextInput style={styles.input} placeholder="https://..." value={form.profileImageUrl} onChangeText={(t) => setForm({...form, profileImageUrl: t})} />

                        <View style={styles.rowGroup}>
                            <View style={{flex: 1}}>
                                <Text style={styles.label}>URL Logo Clínico</Text>
                                <TextInput style={styles.input} placeholder="https://..." value={form.logoUrl} onChangeText={(t) => setForm({...form, logoUrl: t})} />
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.label}>Imagen Fondo Gigante</Text>
                                <TextInput style={styles.input} placeholder="https://..." value={form.heroImageUrl} onChangeText={(t) => setForm({...form, heroImageUrl: t})} />
                            </View>
                        </View>

                        <View style={styles.divider} />
                        
                        <Text style={styles.sectionHeader}>Obras Sociales Atendidas</Text>
                        {form.obrasSociales.map((obra: string, index: number) => (
                            <View key={index} style={[styles.rowGroup, {marginBottom: 10}]}>
                                <TextInput 
                                    style={[styles.input, {flex: 1, marginBottom: 0}]} 
                                    value={obra} 
                                    placeholder="Ej: OSDE"
                                    onChangeText={(text) => {
                                        const newArr = [...form.obrasSociales];
                                        newArr[index] = text;
                                        setForm({...form, obrasSociales: newArr});
                                    }} 
                                />
                                <TouchableOpacity onPress={() => setForm({...form, obrasSociales: form.obrasSociales.filter((_, i) => i !== index)})}>
                                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.outlineButton} onPress={() => setForm({...form, obrasSociales: [...form.obrasSociales, '']})}>
                            <Text style={styles.outlineButtonText}>+ Añadir Obra Social</Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <Text style={styles.sectionHeader}>Especialidades Médicas</Text>
                        {form.especialidades.map((esp, eIndex) => (
                            <View key={eIndex} style={styles.arrayCard}>
                                <View style={[styles.rowGroup, {justifyContent: 'space-between', marginBottom: 15}]}>
                                    <Text style={{fontWeight: 'bold', fontSize: 16}}>Especialidad #{eIndex + 1}</Text>
                                    <TouchableOpacity onPress={() => setForm({...form, especialidades: form.especialidades.filter((_, i) => i !== eIndex)})}>
                                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                                
                                <Text style={styles.label}>Título (Ej: Cardiología)</Text>
                                <TextInput style={styles.input} value={esp.titulo} onChangeText={(txt) => {
                                    const newEsp = [...form.especialidades];
                                    newEsp[eIndex].titulo = txt;
                                    setForm({...form, especialidades: newEsp});
                                }} />
                                
                                <Text style={styles.label}>Descripción corta</Text>
                                <TextInput style={styles.input} value={esp.descripcion} multiline onChangeText={(txt) => {
                                    const newEsp = [...form.especialidades];
                                    newEsp[eIndex].descripcion = txt;
                                    setForm({...form, especialidades: newEsp});
                                }} />

                                <Text style={styles.label}>Servicios / Checklist</Text>
                                {esp.items.map((item, iIndex) => (
                                    <View key={iIndex} style={[styles.rowGroup, {marginBottom: 10}]}>
                                        <TextInput 
                                            style={[styles.input, {flex: 1, marginBottom: 0, paddingVertical: 8}]} 
                                            value={item} 
                                            placeholder="Ej: Electrocardiograma"
                                            onChangeText={(txt) => {
                                                const newEsp = [...form.especialidades];
                                                newEsp[eIndex].items[iIndex] = txt;
                                                setForm({...form, especialidades: newEsp});
                                            }} 
                                        />
                                        <TouchableOpacity onPress={() => {
                                             const newEsp = [...form.especialidades];
                                             newEsp[eIndex].items = newEsp[eIndex].items.filter((_, idx) => idx !== iIndex);
                                             setForm({...form, especialidades: newEsp});
                                        }}>
                                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                <TouchableOpacity style={[styles.outlineButton, {paddingVertical: 8, marginTop: 5}]} onPress={() => {
                                      const newEsp = [...form.especialidades];
                                      newEsp[eIndex].items.push('');
                                      setForm({...form, especialidades: newEsp});
                                }}>
                                    <Text style={[styles.outlineButtonText, {fontSize: 13}]}>+ Añadir punto de checklist</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity style={[styles.outlineButton, {borderColor: colors.primary}]} onPress={() => setForm({...form, especialidades: [...form.especialidades, {titulo:'', descripcion:'', items:['']}]})}>
                            <Text style={[styles.outlineButtonText, {color: colors.primary}]}>+ Agregar Nueva Especialidad</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
                             {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar Plantilla en DB</Text>}
                        </TouchableOpacity>
                    </View>
                )}

            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    authContainer: { flex: 1, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', padding: 20 },
    authCard: { backgroundColor: '#fff', padding: 40, borderRadius: 16, width: '100%', maxWidth: 450, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, elevation: 10 },
    authTitle: { fontSize: 24, fontWeight: '800', marginBottom: 5, color: '#1F2937' },
    authSub: { fontSize: 14, color: '#6B7280', marginBottom: 30 },
    
    adminContainer: { flexGrow: 1, backgroundColor: '#F9FAFB', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 800, marginBottom: 20, alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
    
    formCard: { backgroundColor: '#fff', width: '100%', maxWidth: 800, borderRadius: 16, padding: 30, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
    
    tabContainer: { flexDirection: 'row', width: '100%', maxWidth: 800, marginBottom: 20, backgroundColor: '#E5E7EB', borderRadius: 8, padding: 4 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 6 },
    activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    tabText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
    activeTabText: { color: colors.primary, fontWeight: '700' },

    rowGroup: { flexDirection: 'row', gap: 15, alignItems: 'center' },
    label: { fontSize: 13, fontWeight: '700', color: '#4B5563', marginBottom: 6, textTransform: 'uppercase' },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 15, fontSize: 15, color: '#1F2937' },
    
    sectionHeader: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 15 },
    divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 25 },
    
    colorInputContainer: { flex: 1, minWidth: 200 },
    colorBox: { width: 35, height: 35, borderRadius: 6, marginRight: 10 },
    inputColor: { flex: 1, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
    paletteRow: { flexDirection: 'row', gap: 8, marginTop: 5 },
    paletteDot: { width: 24, height: 24, borderRadius: 12 },
    
    button: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    saveButton: { backgroundColor: '#10B981', marginTop: 20, paddingVertical: 18 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    errorText: { color: '#DC2626', marginBottom: 15, fontWeight: '600' },
    messageBox: { padding: 15, borderRadius: 8, marginBottom: 20 },
    messageError: { backgroundColor: '#FEF2F2', borderColor: '#F87171', borderWidth: 1 },
    messageSuccess: { backgroundColor: '#ECFDF5', borderColor: '#34D399', borderWidth: 1 },
    
    outlineButton: { borderWidth: 1, borderColor: '#D1D5DB', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, alignItems: 'center', backgroundColor: '#F9FAFB' },
    outlineButtonText: { color: '#4B5563', fontWeight: '600', fontSize: 14 },
    arrayCard: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 15, marginBottom: 15 }
});
