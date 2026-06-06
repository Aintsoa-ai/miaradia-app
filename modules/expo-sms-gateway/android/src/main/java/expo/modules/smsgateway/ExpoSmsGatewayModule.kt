package expo.modules.smsgateway

import android.content.Context
import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoSmsGatewayModule : Module() {
  private var isListening = false

  override fun definition() = ModuleDefinition {
    Name("ExpoSmsGateway")

    Function("startListening") { supabaseUrl: String, supabaseKey: String ->
      if (isListening) return@Function true
      
      val context = appContext.reactContext ?: return@Function false
      
      val intent = Intent(context, SmsForegroundService::class.java).apply {
        putExtra("SUPABASE_URL", supabaseUrl)
        putExtra("SUPABASE_KEY", supabaseKey)
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
      
      isListening = true
      return@Function true
    }

    Function("stopListening") {
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(context, SmsForegroundService::class.java)
      context.stopService(intent)
      isListening = false
      return@Function true
    }
    
    Function("isListening") {
      return@Function isListening
    }
  }
}
