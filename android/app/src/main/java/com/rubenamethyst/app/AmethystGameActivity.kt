package com.rubenamethyst.app

import android.content.ActivityNotFoundException
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
import androidx.core.content.FileProvider
import com.rubenamethyst.app.ui.AmethystTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

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
        val packDirs = intent.getStringArrayExtra("amethyst_pack_dirs")?.toList() ?: emptyList()

        setContent {
            var isLoading by remember { mutableStateOf(true) }
            var nativeReport by remember { mutableStateOf("") }
            var mcAddonFile by remember { mutableStateOf<File?>(null) }
            var actionFeedback by remember { mutableStateOf<String?>(null) }
            var showRawLog by remember { mutableStateOf(false) }

            LaunchedEffect(Unit) {
                val baseDir = getExternalFilesDir(null) ?: filesDir
                val result = withContext(Dispatchers.IO) {
                    val report = runCatching {
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
                    val addon = runCatching {
                        ModRepository(baseDir).buildMcAddonFromPacks(packDirs)
                    }.getOrNull()
                    Pair(report, addon)
                }
                nativeReport = result.first
                mcAddonFile = result.second
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
                            text = "MCBE $mcVersion · $mcPackage",
                            style = MaterialTheme.typography.bodyMedium
                        )

                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text(
                                    text = if (isLoading) "Preparando entorno Amethyst..." else "Estado de la sesión",
                                    style = MaterialTheme.typography.titleMedium
                                )

                                if (isLoading) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                                        Text(
                                            text = "Verificando runtime, librerías .so y packs .amethyst...",
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    }
                                } else {
                                    Text(
                                        text = if (runtimeOk) {
                                            "Runtime listo · ${modSoPaths.size} ${if (modSoPaths.size == 1) "mod nativo (.so)" else "mods nativos (.so)"} cargados"
                                        } else {
                                            "Runtime: error al inicializar"
                                        },
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                    if (mcAddonFile != null) {
                                        Text(
                                            text = "Packs de mods (.mcaddon) empaquetados para importar directamente en Minecraft.",
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    }
                                    if (hasPairIp) {
                                        Text(
                                            text = "Nota: tu APK de Play Store usa PairIP; para inyectar hooks en memoria usa un APK sin PairIP, o importa los packs .mcaddon en Minecraft.",
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    }

                                    TextButton(
                                        onClick = { showRawLog = !showRawLog },
                                        contentPadding = PaddingValues(0.dp)
                                    ) {
                                        Text(if (showRawLog) "Ocultar registro técnico (JNI)" else "Ver registro técnico (JNI / dlopen)")
                                    }

                                    if (showRawLog) {
                                        Text(
                                            text = fullReport,
                                            fontFamily = FontFamily.Monospace,
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    }
                                }
                            }
                        }

                        actionFeedback?.let { msg ->
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Text(
                                    text = msg,
                                    modifier = Modifier.padding(14.dp),
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }

                        if (!isLoading && mcAddonFile != null) {
                            Button(
                                onClick = {
                                    val addon = mcAddonFile ?: return@Button
                                    try {
                                        val uri = FileProvider.getUriForFile(
                                            this@AmethystGameActivity,
                                            "${packageName}.fileprovider",
                                            addon
                                        )
                                        val importIntent = Intent(Intent.ACTION_VIEW).apply {
                                            setDataAndType(uri, "application/octet-stream")
                                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                            setPackage(mcPackage)
                                        }
                                        startActivity(importIntent)
                                    } catch (_: ActivityNotFoundException) {
                                        try {
                                            val uri = FileProvider.getUriForFile(
                                                this@AmethystGameActivity,
                                                "${packageName}.fileprovider",
                                                addon
                                            )
                                            val chooser = Intent.createChooser(
                                                Intent(Intent.ACTION_VIEW).apply {
                                                    setDataAndType(uri, "*/*")
                                                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                                },
                                                "Abrir packs en Minecraft"
                                            )
                                            startActivity(chooser)
                                        } catch (e: Exception) {
                                            actionFeedback = "No se encontró aplicación para abrir .mcaddon: ${e.message}"
                                        }
                                    } catch (e: Exception) {
                                        actionFeedback = "Error al enviar .mcaddon a Minecraft: ${e.message}"
                                    }
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Importar Packs (.mcaddon) y Abrir Minecraft")
                            }
                        }

                        if (!isLoading) {
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
                            } else {
                                OutlinedButton(
                                    onClick = {
                                        val launchIntent = packageManager.getLaunchIntentForPackage(mcPackage)
                                        if (launchIntent != null) {
                                            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                            startActivity(launchIntent)
                                        } else {
                                            actionFeedback = "No se encontró $mcPackage instalado en el dispositivo."
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Abrir Minecraft ($mcPackage)")
                                }
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
