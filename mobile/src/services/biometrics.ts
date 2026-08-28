import * as LocalAuthentication from 'expo-local-authentication';

export async function unlockWithBiometrics() {
  const available = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!available || !enrolled) return true;
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Desbloquear Ninho', fallbackLabel: 'Usar senha do aparelho' });
  return result.success;
}
