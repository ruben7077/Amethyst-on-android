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
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.rubenamethyst.app.ui.AmethystTheme

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

        val nativeReport = AmethystNativeBridge.nativeBootstrapMods(
            mcNativeDir = mcNativeDir,
            runtimeSoPath = runtimeSoPath,
            modSoPaths = modSoPaths,
            mcVersion = mcVersion,
            hasPackMods = packNotices.isNotEmpty()
        )
        val packSection = if (packNotices.isNotEmpty()) {
            "\n" + packNotices.joinToString("\n") { "[PACK_ONLY] $it" }
        } else {
            ""
        }
        val report = nativeReport + packSection

        val runtimeOk = nativeReport.contains("RUNTIME_OK")
        val mcOk = nativeReport.contains("MC_OK")
        val hasModErrors = nativeReport.contains("MOD_ERROR")
        val hasAndroidSoMods = modSoPaths.isNotEmpty()
        val canLaunchModded = runtimeOk && mcOk && !hasModErrors && hasAndroidSoMods

        setContent {
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
                                Text(
                                    text = report,
                                    fontFamily = FontFamily.Monospace,
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }

                        if (packNotices.isNotEmpty() && !hasAndroidSoMods) {
                            Text(
                                text = "Los mods activos en este perfil solo contienen packs (.amethyst de Windows con .dll) sin librerías ELF (.so) para Android arm64-v8a. Sus resource/behavior packs ya fueron extraídos, pero los hooks C++ requieren un mod .amethyst compilado para Android.",
                                style = MaterialTheme.typography.bodySmall
                            )
                        } else if (!canLaunchModded) {
                            Text(
                                text = "Amethyst mantuvo abierta esta pantalla para no abrir Minecraft normal sin mods. Revisa el diagnóstico arriba (enlace nativo de libminecraftpe.so o compatibilidad .so del mod).",
                                style = MaterialTheme.typography.bodySmall
                            )
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
