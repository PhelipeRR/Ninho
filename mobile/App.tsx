import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { clearNotificationUser, identifyNotificationUser, initializeNotifications, requestNotificationPermission } from './src/services/notifications';
import { unlockWithBiometrics } from './src/services/biometrics';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    initializeNotifications();
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) setUnlocked(await unlockWithBiometrics());
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) identifyNotificationUser(next.user.id);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn() {
    if (!email || !password) return Alert.alert('Preencha e-mail e senha.');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) Alert.alert('Não foi possível entrar', error.message);
    else await requestNotificationPermission();
  }

  async function signUp() {
    if (!email || !password) return Alert.alert('Preencha e-mail e senha.');
    setBusy(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) Alert.alert('Não foi possível criar a conta', error.message);
    else Alert.alert('Confira seu e-mail', 'Enviamos um link para confirmar sua conta.');
  }

  async function recoverPassword() {
    if (!email) return Alert.alert('Informe seu e-mail primeiro.');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) Alert.alert('Erro', error.message);
    else Alert.alert('E-mail enviado', 'Confira sua caixa de entrada.');
  }

  async function signOut() {
    await supabase.auth.signOut();
    clearNotificationUser();
    setUnlocked(false);
  }

  if (loading) return <Centered><ActivityIndicator size="large" color="#315c4b" /></Centered>;

  if (session && !unlocked) {
    return <Centered><Text style={styles.title}>Ninho</Text><Text style={styles.subtitle}>Confirme sua identidade para continuar.</Text><Button label="Desbloquear" onPress={async () => setUnlocked(await unlockWithBiometrics())} /><Button label="Sair" secondary onPress={signOut} /></Centered>;
  }

  if (session) {
    return <SafeAreaView style={styles.safe}><View style={styles.content}><Text style={styles.eyebrow}>BEM-VINDO AO</Text><Text style={styles.title}>Ninho</Text><Text style={styles.subtitle}>Seu espaço familiar, sincronizado e seguro.</Text><View style={styles.card}><Text style={styles.cardTitle}>Conta conectada</Text><Text style={styles.cardText}>{session.user.email}</Text><Text style={styles.cardHint}>A próxima etapa será configurar sua família.</Text></View><Button label="Sair" secondary onPress={signOut} /></View><StatusBar style="dark" /></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safe}><View style={styles.content}><Text style={styles.eyebrow}>ORGANIZAÇÃO FAMILIAR</Text><Text style={styles.title}>Ninho</Text><Text style={styles.subtitle}>Tudo que sua família precisa, em um só lugar.</Text><TextInput autoCapitalize="none" keyboardType="email-address" placeholder="E-mail" value={email} onChangeText={setEmail} style={styles.input} /><TextInput secureTextEntry placeholder="Senha" value={password} onChangeText={setPassword} style={styles.input} /><Button label={busy ? 'Entrando...' : 'Entrar'} onPress={signIn} disabled={busy} /><Button label="Criar conta" secondary onPress={signUp} disabled={busy} /><Pressable onPress={recoverPassword} style={styles.linkButton}><Text style={styles.link}>Esqueci minha senha</Text></Pressable></View><StatusBar style="dark" /></SafeAreaView>;
}

function Centered({ children }: { children: React.ReactNode }) { return <SafeAreaView style={styles.centered}>{children}<StatusBar style="dark" /></SafeAreaView>; }
function Button({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) { return <Pressable disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary, disabled && styles.disabled]}><Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f1e8' }, centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f5f1e8' }, content: { flex: 1, justifyContent: 'center', padding: 28 }, eyebrow: { color: '#7b6d58', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 10 }, title: { color: '#203a30', fontSize: 48, fontWeight: '800', letterSpacing: -1 }, subtitle: { color: '#6c665c', fontSize: 17, lineHeight: 25, marginBottom: 28, maxWidth: 330 }, input: { backgroundColor: '#fffdf8', borderColor: '#ded6c8', borderRadius: 14, borderWidth: 1, fontSize: 16, marginBottom: 12, padding: 16 }, button: { alignItems: 'center', backgroundColor: '#315c4b', borderRadius: 14, marginTop: 8, padding: 16, width: '100%' }, buttonSecondary: { backgroundColor: 'transparent', borderColor: '#315c4b', borderWidth: 1 }, buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }, buttonTextSecondary: { color: '#315c4b' }, disabled: { opacity: 0.6 }, linkButton: { alignItems: 'center', marginTop: 20 }, link: { color: '#315c4b', fontSize: 14, fontWeight: '600' }, card: { backgroundColor: '#fffdf8', borderRadius: 18, marginBottom: 24, padding: 20 }, cardTitle: { color: '#203a30', fontSize: 18, fontWeight: '700', marginBottom: 8 }, cardText: { color: '#4d4a43', fontSize: 16, marginBottom: 12 }, cardHint: { color: '#817b70', fontSize: 14, lineHeight: 20 },
});
