import React from 'react';
import { View } from 'react-native';

// Fallback vacío para la app móvil nativa (No usa @react-oauth/google porque ya tiene el suyo)
export function GoogleOAuthWebProvider({ children, clientId }: any) {
  return <>{children}</>;
}

export function WebGoogleLoginButton(props: any) {
  return <View />;
}
