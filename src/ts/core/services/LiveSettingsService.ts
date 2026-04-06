import {
  ElementorSettingsHandler,
  elementorEditorLoaded,
} from "@arts/utilities";

type TCallback = (options: Record<string, string>) => Promise<void>;

/** Thin wrapper that attaches ElementorSettingsHandler only in the Elementor editor */
export class LiveSettingsService {
  private readonly callback: TCallback;
  private readonly settingsMap: Record<string, unknown>;
  private handler: ElementorSettingsHandler | null = null;

  constructor(callback: TCallback, settingsMap: Record<string, unknown>) {
    this.callback = callback;
    this.settingsMap = settingsMap;
    void this.attach();
  }

  private async attach(): Promise<void> {
    const isEditor = await elementorEditorLoaded();
    if (isEditor) {
      this.handler = new ElementorSettingsHandler(
        this.callback,
        this.settingsMap,
      );
      this.handler.attach();
    }
  }

  detach(): void {
    if (this.handler) {
      this.handler.detach();
      this.handler = null;
    }
  }
}
