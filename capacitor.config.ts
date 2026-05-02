import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.medcompare.app',
  appName: 'MedCompare',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
}

export default config
