package expo.modules.smsgateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsMessage
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoSmsGatewayModule : Module() {
  private var smsReceiver: BroadcastReceiver? = null
  private var isListening = false

  override fun definition() = ModuleDefinition {
    Name("ExpoSmsGateway")

    Events("onSmsReceived")

    Function("startListening") {
      if (isListening) return@Function true
      
      val context = appContext.reactContext ?: return@Function false
      
      smsReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
          if (intent?.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            for (sms in messages) {
              val body = sms.displayMessageBody
              val sender = sms.originatingAddress
              Log.d("ExpoSmsGateway", "Received SMS from $sender: $body")
              
              sendEvent("onSmsReceived", mapOf(
                "sender" to sender,
                "body" to body
              ))
            }
          }
        }
      }

      val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)
      filter.priority = 999
      
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        context.registerReceiver(smsReceiver, filter, Context.RECEIVER_EXPORTED)
      } else {
        context.registerReceiver(smsReceiver, filter)
      }
      
      isListening = true
      return@Function true
    }

    Function("stopListening") {
      if (!isListening) return@Function true
      
      val context = appContext.reactContext ?: return@Function false
      smsReceiver?.let {
        context.unregisterReceiver(it)
      }
      smsReceiver = null
      isListening = false
      return@Function true
    }
    
    Function("isListening") {
      return@Function isListening
    }
  }
}
