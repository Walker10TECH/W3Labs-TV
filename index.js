import { registerRootComponent } from 'expo';

import W3LabsTV from './W3LabsTV';

// registerRootComponent calls W3LabsTVRegistry.registerComponent('main', () => W3LabsTV);
// It also ensures that whether you load the W3LabsTV in Expo Go or in a native build,
// the environment is set up W3LabsTVropriately
registerRootComponent(W3LabsTV);
