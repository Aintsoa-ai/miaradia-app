package expo.modules.smsgateway

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import android.provider.Telephony
import android.util.Log
import androidx.core.app.NotificationCompat
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

class SmsForegroundService : Service() {
    private var smsReceiver: BroadcastReceiver? = null
    private val client = OkHttpClient()

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        val notification: Notification = NotificationCompat.Builder(this, "SmsGatewayChannel")
            .setContentTitle("Passerelle SMS Miara-Dia")
            .setContentText("Écoute des SMS Mobile Money en arrière-plan...")
            .setSmallIcon(android.R.drawable.ic_dialog_info) // Fallback icon
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(1, notification)
        }

        registerSmsReceiver()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val supabaseUrl = intent?.getStringExtra("SUPABASE_URL")
        val supabaseKey = intent?.getStringExtra("SUPABASE_KEY")

        if (supabaseUrl != null && supabaseKey != null) {
            val prefs = getSharedPreferences("SmsGatewayPrefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("SUPABASE_URL", supabaseUrl)
                .putString("SUPABASE_KEY", supabaseKey)
                .apply()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        smsReceiver?.let {
            unregisterReceiver(it)
        }
    }

    private fun registerSmsReceiver() {
        smsReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
                    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
                    for (sms in messages) {
                        val body = sms.displayMessageBody
                        val sender = sms.originatingAddress ?: continue
                        Log.d("SmsGatewayService", "SMS Received: $body")
                        processSms(sender, body)
                    }
                }
            }
        }

        val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)
        filter.priority = 999

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(smsReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(smsReceiver, filter)
        }
    }

    private fun processSms(sender: String, body: String) {
        val reference = extractReference(body)
        val amount = extractAmount(body)

        // On envoie toujours au webhook, le webhook fera le filtrage si ce n'est pas un SMS MVola
        sendToSupabase(sender, body, reference, amount)
    }

    private fun extractAmount(body: String): Double? {
        val regex = Regex("([\\d][\\d\\s]*[\\d])\\s*(?:Ar|Ariary|MGA)", RegexOption.IGNORE_CASE)
        val match = regex.find(body)
        return match?.groupValues?.get(1)?.replace("\\s+".toRegex(), "")?.toDoubleOrNull()
    }

    private fun extractReference(body: String): String? {
        val regex = Regex("(?:Ref|Reference|ID|Txn)\\s*:?\\s*([A-Z0-9]{4,20})", RegexOption.IGNORE_CASE)
        val match = regex.find(body)
        return match?.groupValues?.get(1)
    }

    private fun sendToSupabase(sender: String, body: String, reference: String?, amount: Double?) {
        val prefs = getSharedPreferences("SmsGatewayPrefs", Context.MODE_PRIVATE)
        val supabaseUrl = prefs.getString("SUPABASE_URL", null)
        val supabaseKey = prefs.getString("SUPABASE_KEY", null)

        if (supabaseUrl == null || supabaseKey == null) {
            Log.e("SmsGatewayService", "Supabase credentials missing")
            return
        }

        // URL directe vers la Edge Function ou l'API REST de Supabase
        val url = "$supabaseUrl/functions/v1/sms-webhook"

        val json = JSONObject().apply {
            put("sender", sender)
            put("body", body)
            put("reference", reference ?: JSONObject.NULL)
            put("amount", amount ?: JSONObject.NULL)
        }

        val requestBody = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())

        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .addHeader("apikey", supabaseKey)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("SmsGatewayService", "Failed to send SMS to Supabase", e)
            }

            override fun onResponse(call: Call, response: Response) {
                Log.d("SmsGatewayService", "Supabase Response: ${response.code}")
                response.close()
            }
        })
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "SmsGatewayChannel",
                "Passerelle SMS",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }
}
