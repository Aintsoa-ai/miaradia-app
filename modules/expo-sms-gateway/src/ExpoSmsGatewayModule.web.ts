import { registerWebModule, NativeModule } from 'expo';

class ExpoSmsGatewayModule extends NativeModule<{}> {}

export default registerWebModule(ExpoSmsGatewayModule, 'ExpoSmsGatewayModule');
