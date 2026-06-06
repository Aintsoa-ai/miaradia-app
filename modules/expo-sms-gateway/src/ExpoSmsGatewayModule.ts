import { NativeModule, requireNativeModule } from 'expo';

type ExpoSmsGatewayModuleEvents = {
  onSmsReceived: (event: { sender: string; body: string }) => void;
};

declare class ExpoSmsGatewayModule extends NativeModule<ExpoSmsGatewayModuleEvents> {
  startListening(supabaseUrl: string, supabaseKey: string): boolean;
  stopListening(): boolean;
  isListening(): boolean;
}

export default requireNativeModule<ExpoSmsGatewayModule>('ExpoSmsGateway');
