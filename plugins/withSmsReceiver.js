// plugins/withSmsReceiver.js
// Plugin Expo natif : enregistre explicitement le BroadcastReceiver SMS
// compatible Android 13+ (android:exported="true" requis)
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withSmsReceiver(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    if (!application.receiver) {
      application.receiver = [];
    }

    // Vérifier si le receiver est déjà présent
    const alreadyAdded = application.receiver.some(
      (r) => r.$?.['android:name'] === 'com.aintsoa.miaradia.SmsReceiver'
    );

    if (!alreadyAdded) {
      application.receiver.push({
        $: {
          'android:name': 'com.centaurwarchief.smslistener.SmsReceiver',
          'android:exported': 'true',
          'android:permission': 'android.permission.BROADCAST_SMS',
        },
        'intent-filter': [
          {
            $: { 'android:priority': '999' },
            action: [
              { $: { 'android:name': 'android.provider.Telephony.SMS_RECEIVED' } },
            ],
          },
        ],
      });
    }

    return config;
  });
};
