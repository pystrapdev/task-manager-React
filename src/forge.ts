 import { ForgeClient, createForgeAuth } from '@cweb-app/forge';

// Must be the endpoint of the Forge app where you registered this site's origin
export const endpoint = 'https://daymark-react.forge.cweb.app/v1/';
export const redirectUri = window.location.origin + '/auth/callback';

export const forgeReady = createForgeAuth({
  endpoint,
  redirectUri,
  onLoad: 'login-required',
}).then(auth => ({
  auth,
  forge: new ForgeClient({ endpoint, token: auth.token }),
}));