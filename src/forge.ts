import {ForgeClient, createForgeAuth} from '@cweb-app/forge';

export const endpoint = 'https://daymark-app.forge.cweb.app/v1/';
export const redirectUri = window.location.origin + '/auth/callback';

export const forgeReady = createForgeAuth({
 endpoint,
 redirectUri,
 onLoad: 'login-required',
}).then(auth => ({
 auth,
 forge: new ForgeClient({endpoint, token: auth.token}),
}));