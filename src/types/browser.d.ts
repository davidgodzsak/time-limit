/**
 * WebExtensions API global
 */
declare const browser: {
  runtime: {
    onMessage: {
      addListener(callback: (message: unknown) => void): void;
      removeListener(callback: (message: unknown) => void): void;
    };
    sendMessage(message: unknown): Promise<unknown>;
    openOptionsPage(): Promise<void>;
    getURL(path: string): string;
  };
  tabs: {
    get(tabId: number): Promise<{ id?: number; url?: string }>;
    query(options: Record<string, unknown>): Promise<Array<{ id?: number; url?: string }>>;
    update(tabId: number, updateProperties: Record<string, unknown>): Promise<unknown>;
    create(options: Record<string, unknown>): Promise<{ id?: number; url?: string }>;
    onActivated: {
      addListener(callback: (activeInfo: { tabId: number }) => void): void;
    };
    onUpdated: {
      addListener(callback: (tabId: number, changeInfo: Record<string, unknown>, tab: { id?: number; url?: string }) => void): void;
    };
  };
  windows: {
    getCurrent(): Promise<{ focused?: boolean }>;
    onFocusChanged: {
      addListener(callback: (windowId: number) => void): void;
    };
    WINDOW_ID_NONE: number;
  };
  alarms: {
    get(name: string): Promise<unknown>;
    create(name: string, alarmInfo: Record<string, unknown>): Promise<void>;
    clear(name: string): Promise<void>;
    onAlarm: {
      addListener(callback: (alarm: { name: string; scheduledTime?: number }) => void): void;
    };
  };
  webNavigation: {
    onBeforeNavigate: {
      addListener(callback: (details: { tabId: number; url: string; frameId: number }) => void): void;
    };
  };
  storage: {
    local: {
      get(keys?: string | string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
  action: {
    onClicked: {
      addListener(callback: (tab: { id?: number; url?: string }) => void): void;
    };
  };
  notifications: {
    create(options: Record<string, unknown>): Promise<unknown>;
  };
  extension: {
    getViews(): unknown[];
  };
};
