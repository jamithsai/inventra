import * as signalR from '@microsoft/signalr';
import type {
  InventoryUpdateEvent,
  InventoryTransaction,
  AuditLog,
  PresenceUpdateEvent,
  FileUpdateEvent,
} from '../types';

type InventoryUpdateListener = (evt: InventoryUpdateEvent) => void;
type TransactionListener = (tx: InventoryTransaction) => void;
type AuditLogListener = (log: AuditLog) => void;
type PresenceListener = (presence: PresenceUpdateEvent) => void;
type FileUpdateListener = (evt: FileUpdateEvent) => void;
type ConnectionStatusListener = (connected: boolean, status: string) => void;

class SignalRService {
  private hubConnection: signalR.HubConnection | null = null;
  private currentToken: string = '';
  private currentTenantId: string = '';
  private isConnecting: boolean = false;

  private inventoryListeners: InventoryUpdateListener[] = [];
  private transactionListeners: TransactionListener[] = [];
  private auditListeners: AuditLogListener[] = [];
  private presenceListeners: PresenceListener[] = [];
  private fileListeners: FileUpdateListener[] = [];
  private statusListeners: ConnectionStatusListener[] = [];

  private getHubUrl(): string {
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const baseUrl = rawUrl.replace(/\/api\/?$/, '');
    return `${baseUrl}/hubs/inventory`;
  }

  public async start(token: string, tenantId: string): Promise<void> {
    if (!token || !tenantId) return;

    // If already connected with same token and tenant, nothing to do
    if (
      this.hubConnection &&
      this.hubConnection.state === signalR.HubConnectionState.Connected &&
      this.currentToken === token &&
      this.currentTenantId === tenantId
    ) {
      return;
    }

    // If already connected with same token but different tenant, switch workspace group
    if (
      this.hubConnection &&
      this.hubConnection.state === signalR.HubConnectionState.Connected &&
      this.currentToken === token &&
      this.currentTenantId !== tenantId
    ) {
      await this.switchTenant(tenantId);
      return;
    }

    // Stop existing connection if token changed
    if (this.hubConnection) {
      await this.stop();
    }

    if (this.isConnecting) return;
    this.isConnecting = true;
    this.currentToken = token;
    this.currentTenantId = tenantId;

    try {
      const hubUrl = `${this.getHubUrl()}?tenantId=${encodeURIComponent(tenantId)}`;

      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => this.currentToken,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
          skipNegotiation: false,
        })
        .withAutomaticReconnect([0, 1000, 3000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Register event handlers
      this.hubConnection.on('ReceiveInventoryUpdate', (evt: InventoryUpdateEvent) => {
        this.inventoryListeners.forEach((fn) => fn(evt));
      });

      this.hubConnection.on('ReceiveTransaction', (tx: InventoryTransaction) => {
        this.transactionListeners.forEach((fn) => fn(tx));
      });

      this.hubConnection.on('ReceiveAuditLog', (log: AuditLog) => {
        this.auditListeners.forEach((fn) => fn(log));
      });

      this.hubConnection.on('ReceivePresenceUpdate', (presence: PresenceUpdateEvent) => {
        this.presenceListeners.forEach((fn) => fn(presence));
      });

      this.hubConnection.on('ReceiveFileUpdate', (evt: FileUpdateEvent) => {
        this.fileListeners.forEach((fn) => fn(evt));
      });

      this.hubConnection.onreconnecting((error) => {
        console.warn('[SignalR] Reconnecting...', error);
        this.notifyStatus(false, 'Reconnecting...');
      });

      this.hubConnection.onreconnected((connectionId) => {
        console.log('[SignalR] Reconnected. Connection ID:', connectionId);
        this.notifyStatus(true, 'Connected');
      });

      this.hubConnection.onclose((error) => {
        console.warn('[SignalR] Connection closed.', error);
        this.notifyStatus(false, 'Disconnected');
      });

      await this.hubConnection.start();
      console.log('[SignalR] Connected successfully to /hubs/inventory for tenant:', tenantId);
      this.notifyStatus(true, 'Connected');
    } catch (err) {
      console.error('[SignalR] Connection failed:', err);
      this.notifyStatus(false, 'Connection Failed');
    } finally {
      this.isConnecting = false;
    }
  }

  public async switchTenant(newTenantId: string): Promise<void> {
    if (!newTenantId || this.currentTenantId === newTenantId) return;
    this.currentTenantId = newTenantId;

    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('SwitchTenantWorkspace', newTenantId);
        console.log('[SignalR] Switched workspace group to:', newTenantId);
      } catch (err) {
        console.error('[SignalR] Error switching tenant group, reconnecting:', err);
        await this.start(this.currentToken, newTenantId);
      }
    } else if (this.currentToken) {
      await this.start(this.currentToken, newTenantId);
    }
  }

  public async stop(): Promise<void> {
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
      } catch (err) {
        console.error('[SignalR] Error stopping connection:', err);
      }
      this.hubConnection = null;
      this.notifyStatus(false, 'Disconnected');
    }
  }

  public isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  // Listener subscriptions
  public onInventoryUpdate(listener: InventoryUpdateListener): () => void {
    this.inventoryListeners.push(listener);
    return () => {
      this.inventoryListeners = this.inventoryListeners.filter((fn) => fn !== listener);
    };
  }

  public onTransaction(listener: TransactionListener): () => void {
    this.transactionListeners.push(listener);
    return () => {
      this.transactionListeners = this.transactionListeners.filter((fn) => fn !== listener);
    };
  }

  public onAuditLog(listener: AuditLogListener): () => void {
    this.auditListeners.push(listener);
    return () => {
      this.auditListeners = this.auditListeners.filter((fn) => fn !== listener);
    };
  }

  public onPresence(listener: PresenceListener): () => void {
    this.presenceListeners.push(listener);
    return () => {
      this.presenceListeners = this.presenceListeners.filter((fn) => fn !== listener);
    };
  }

  public onFileUpdate(listener: FileUpdateListener): () => void {
    this.fileListeners.push(listener);
    return () => {
      this.fileListeners = this.fileListeners.filter((fn) => fn !== listener);
    };
  }

  public onConnectionStatus(listener: ConnectionStatusListener): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter((fn) => fn !== listener);
    };
  }

  private notifyStatus(connected: boolean, status: string) {
    this.statusListeners.forEach((fn) => fn(connected, status));
  }
}

export const realtimeService = new SignalRService();
