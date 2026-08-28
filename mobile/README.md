# Ninho Mobile

Aplicativo Android do Ninho, construído com Expo/React Native.

## Configuração local

1. Copie `.env.example` para `.env`.
2. Preencha as variáveis públicas do Supabase e os IDs do Google/OneSignal.
3. Instale as dependências com `npm install`.
4. Valide com `npm run typecheck`.

O OneSignal não funciona no Expo Go. Para testar push, use um development build:

```powershell
npx expo install expo-dev-client
npx eas login
npx eas build --profile development --platform android
```

As chaves privadas ficam somente no backend e não devem ser adicionadas ao `.env` do aplicativo.
