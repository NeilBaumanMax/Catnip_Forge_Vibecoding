import { configureCatnipUserDataPath } from './user-data-path';

configureCatnipUserDataPath();

// Deliberately load the application only after userData has been redirected.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./index');
