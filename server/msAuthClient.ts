import * as msal from '@azure/msal-node';

interface MSAuthConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
  scopes: string[];
}

export class MSAuthClient {
  private cca: msal.ConfidentialClientApplication | null = null;
  private config: MSAuthConfig;

  constructor() {
    this.config = {
      clientId: process.env.MS_CLIENT_ID || '',
      clientSecret: process.env.MS_CLIENT_SECRET || '',
      tenantId: process.env.MS_TENANT_ID || '',
      redirectUri: process.env.MS_REDIRECT_URI || '',
      scopes: (process.env.MS_GRAPH_SCOPES || 'user.read,mail.read,files.read,calendars.readwrite,offline_access').split(','),
    };

    if (this.config.clientId && this.config.clientSecret && this.config.tenantId && this.config.redirectUri) {
      const msalConfig: msal.Configuration = {
        auth: {
          clientId: this.config.clientId,
          authority: `https://login.microsoftonline.com/${this.config.tenantId}`,
          clientSecret: this.config.clientSecret,
        },
      };
      this.cca = new msal.ConfidentialClientApplication(msalConfig);
      console.log('[MS Auth] Initialized Microsoft authentication client');
    } else {
      console.warn('[MS Auth] Microsoft credentials not configured - features disabled');
    }
  }

  isConfigured(): boolean {
    return this.cca !== null;
  }

  async getAuthCodeUrl(state?: string): Promise<string> {
    if (!this.cca) {
      throw new Error('Microsoft Auth not configured. Please set MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT_ID in secrets');
    }

    const authCodeUrlParameters: msal.AuthorizationUrlRequest = {
      scopes: this.config.scopes,
      redirectUri: this.config.redirectUri,
      state: state,
    };

    return await this.cca.getAuthCodeUrl(authCodeUrlParameters);
  }

  async acquireTokenByCode(code: string): Promise<msal.AuthenticationResult> {
    if (!this.cca) {
      throw new Error('Microsoft Auth not configured');
    }

    const tokenRequest: msal.AuthorizationCodeRequest = {
      code: code,
      scopes: this.config.scopes,
      redirectUri: this.config.redirectUri,
    };

    return await this.cca.acquireTokenByCode(tokenRequest);
  }

  async acquireTokenByRefreshToken(refreshToken: string): Promise<msal.AuthenticationResult> {
    if (!this.cca) {
      throw new Error('Microsoft Auth not configured');
    }

    const refreshTokenRequest: msal.RefreshTokenRequest = {
      refreshToken: refreshToken,
      scopes: this.config.scopes,
    };

    return await this.cca.acquireTokenByRefreshToken(refreshTokenRequest);
  }

  async acquireTokenSilent(account: msal.AccountInfo): Promise<msal.AuthenticationResult> {
    if (!this.cca) {
      throw new Error('Microsoft Auth not configured');
    }

    const silentRequest: msal.SilentFlowRequest = {
      account: account,
      scopes: this.config.scopes,
    };

    return await this.cca.acquireTokenSilent(silentRequest);
  }
}

export const msAuthClient = new MSAuthClient();
