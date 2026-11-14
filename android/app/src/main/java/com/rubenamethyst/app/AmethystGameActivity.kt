package com.rubenamethyst.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.rubenamethyst.app.ui.AmethystTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AmethystGameActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        val profileName = intent.getStringExtra("amethyst_profile_name") ?: "Amethyst"
        val mcVersion = intent.getStringExtra("amethyst_mc_version") ?: "1.21.0.3"
        val mcPackage = intent.getStringExtra("amethyst_mc_package") ?: "com.mojang.minecraftpe"
        val mcNativeDir = intent.getStringExtra("amethyst_mc_native_dir") ?: ""
        val runtimeSoPath = intent.getStringExtra("amethyst_runtime_so") ?: ""
        val modSoPaths = intent.getStringArrayExtra("amethyst_mod_paths") ?: emptyArray()
        val packNotices = intent.getStringArrayExtra("amethyst_pack_notices") ?: emptyArray()

        setContent {
            var isLoading by remember { mutableStateOf(true) }
            var nativeReport by remember { mutableStateOf("") }

            LaunchedEffect(Unit) {
                nativeReport = withContext(Dispatchers.IO) {
                    runCatching {
                        AmethystNativeBridge.ensureLoaded()
                        AmethystNativeBridge.nativeBootstrapMods(
                            mcNativeDir = mcNativeDir,
                            runtimeSoPath = runtimeSoPath,
                            modSoPaths = modSoPaths,
                            mcVersion = mcVersion,
                            hasPackMods = packNotices.isNotEmpty()
                        )
                    }.getOrElse { err ->
                        "[JNI_ERROR] Error en puente nativo: ${err.message ?: err::class.java.simpleName}"
                    }
                }
                isLoading = false
            }

            val packSection = if (packNotices.isNotEmpty()) {
                "\n" + packNotices.joinToString("\n") { "[PACK_ONLY] $it" }
            } else {
                ""
            }
            val fullReport = nativeReport + packSection

            val runtimeOk = nativeReport.contains("RUNTIME_OK")
            val mcOk = nativeReport.contains("MC_OK")
            val hasPairIp = nativeReport.contains("MC_PAIRIP")
            val hasModErrors = nativeReport.contains("MOD_ERROR")
            val hasAndroidSoMods = modSoPaths.isNotEmpty()
            val canLaunchModded = !isLoading && runtimeOk && mcOk && !hasModErrors && hasAndroidSoMods

            AmethystTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .safeDrawingPadding()
                            .padding(horizontal = 20.dp, vertical = 16.dp)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Text(
                            text = "Amethyst Host · $profileName",
                            style = MaterialTheme.typography.headlineSmall
                        )
                        Text(
                            text = "MCBE $mcVersion · Paquete base: $mcPackage",
                            style = MaterialTheme.typography.bodyMedium
                        )

                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "Diagnóstico nativo (dlopen / JNI)",
                                    style = MaterialTheme.typography.titleMedium
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                if (isLoading) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                                        Text(
                                            text = "Verificando runtime y librerías ELF...",
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    }
                                } else {
                                    Text(
                                        text = fullReport,
                                        fontFamily = FontFamily.Monospace,
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                            }
                        }

                        if (!isLoading) {
                            if (hasPairIp) {
                                Text(
                                    text = "Tu instalación de Minecraft ($mcPackage) incluye protección PairIP (libpairipcore.so). Android impide cargar su binario desde otra app sin un APK parcheado o módulo LSPosed/Zygisk.",
                                    style = MaterialTheme.typography.bodySmall
                                )
                            } else if (packNotices.isNotEmpty() && !hasAndroidSoMods) {
                                Text(
                                    text = "Los mods activos en este perfil solo contienen packs (.amethyst de Windows con .dll) sin librerías ELF (.so) para Android arm64-v8a. Sus resource/behavior packs ya fueron extraídos.",
                                    style = MaterialTheme.typography.bodySmall
                                )
                            } else if (!canLaunchModded) {
                                Text(
                                    text = "Amethyst mantuvo abierta esta pantalla para no iniciar Minecraft normal sin mods.",
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }

                        if (canLaunchModded) {
                            Button(
                                onClick = {
                                    val launchIntent = packageManager.getLaunchIntentForPackage(mcPackage)
                                        ?: Intent().apply {
                                            setClassName(mcPackage, "com.mojang.minecraftpe.MainActivity")
                                        }
                                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                    startActivity(launchIntent)
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Continuar al cliente Minecraft parcheado")
                            }
                        }

                        OutlinedButton(
                            onClick = { finish() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Volver al Launcher")
                        }
                    }
                }
            }
        }
    }
}
