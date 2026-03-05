import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { View, ActivityIndicator } from 'react-native';

// Implementación real expuesta SOLO cuando el empaquetador procesa plataforma: web
export function GoogleOAuthWebProvider({ children, clientId }: any) {
    return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}

export function WebGoogleLoginButton({ onSuccess, onError, isSigningIn }: any) {
    return (
        <View style={{ alignItems: 'center', marginBottom: 24, minHeight: 48, justifyContent: 'center' }}>
            <View style={{ pointerEvents: isSigningIn ? 'none' : 'auto', opacity: isSigningIn ? 0.5 : 1 }}>
               <GoogleLogin onSuccess={onSuccess} onError={onError} useOneTap text="signin_with" />
            </View>
            {isSigningIn && <ActivityIndicator style={{marginTop: 10}} color="#757575" />}
        </View>
    );
}
