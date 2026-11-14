package com.rubenamethyst.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.rubenamethyst.app.AndroidPortConfig
import com.rubenamethyst.app.LauncherUiState
import com.rubenamethyst.app.ProfileEntry

private val AmethystColors = darkColorScheme(
    primary = Color(0xFF8B5CF6),
    background = Color(0xFF0B0A10),
    surface = Color(0xFF13111C),
    onPrimary = Color.White,
    onBackground = Color(0xFFEDE9F6),
    onSurface = Color(0xFFEDE9F6)
)

@Composable
fun AmethystTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = AmethystColors, content = content)
}

@Composable
fun LauncherScreen(
    state: LauncherUiState,
    onSelectProfile: (String) -> Unit,
    onLaunchGame: () -> Unit,
    onDismissStatus: () -> Unit
) {
    val active = state.activeProfile
    val isVanilla = active?.runtimeId == "vanilla"
    Column(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Amethyst Launcher", style = MaterialTheme.typography.headlineMedium)

        state.statusMessage?.let { msg ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(msg, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                    TextButton(onClick = onDismissStatus) { Text("OK") }
                }
            }
        }

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(active?.name ?: "Sin perfil", style = MaterialTheme.typography.titleLarge)
                Text("MCBE ${active?.mcVersion ?: "-"} · ${active?.runtimeId ?: "-"} · ${state.activeMods.size} mods")
                if (!isVanilla && state.config.runtimePath.isBlank()) {
                    Text(
                        "Runtime pendiente: importa libamethyst_runtime.so en Mods o Ajustes.",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                Button(onClick = onLaunchGame, modifier = Modifier.fillMaxWidth()) {
                    Text(if (isVanilla) "Iniciar Minecraft (Vanilla)" else "Iniciar Amethyst Moddeado")
                }
            }
        }
        Text("Cambiar perfil rápido", style = MaterialTheme.typography.titleSmall)
        state.profiles.forEach { profile ->
            OutlinedButton(
                onClick = { onSelectProfile(profile.id) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("${profile.name} (${profile.mcVersion})")
            }
        }
    }
}

@Composable
fun ProfilesScreen(
    state: LauncherUiState,
    onSelectProfile: (String) -> Unit,
    onSaveProfile: (ProfileEntry) -> Unit,
    onDeleteProfile: (String) -> Unit
) {
    var newName by remember { mutableStateOf("") }
    Column(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Perfiles", style = MaterialTheme.typography.headlineMedium)
        OutlinedTextField(
            value = newName,
            onValueChange = { newName = it },
            label = { Text("Nuevo perfil") },
            modifier = Modifier.fillMaxWidth()
        )
        Button(
            onClick = {
                if (newName.isNotBlank()) {
                    onSaveProfile(ProfileEntry("profile-${System.currentTimeMillis()}", newName.trim(), "1.21.0.3", "amethyst-1.3.1", emptyList()))
                    newName = ""
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Crear Perfil")
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(state.profiles) { profile ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column {
                            Text(profile.name, style = MaterialTheme.typography.titleMedium)
                            Text("MCBE ${profile.mcVersion} · ${profile.runtimeId}")
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            TextButton(onClick = { onSelectProfile(profile.id) }) { Text("Usar") }
                            TextButton(onClick = { onDeleteProfile(profile.id) }) { Text("Eliminar") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ModsScreen(
    state: LauncherUiState,
    onToggleMod: (String) -> Unit,
    onImportClick: () -> Unit,
    onImportRuntimeClick: () -> Unit,
    onDismissStatus: () -> Unit
) {
    val activeIds = state.activeProfile?.modIds ?: emptyList()
    Column(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Mods (.amethyst / .so)", style = MaterialTheme.typography.titleLarge)
            Button(onClick = onImportClick) { Text("Importar Mod") }
        }
        OutlinedButton(onClick = onImportRuntimeClick, modifier = Modifier.fillMaxWidth()) {
            Text(
                if (state.config.runtimePath.isBlank()) "Importar libamethyst_runtime.so"
                else "Runtime: ${state.config.runtimePath.substringAfterLast('/')}"
            )
        }
        state.statusMessage?.let { msg ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(msg, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                    TextButton(onClick = onDismissStatus) { Text("OK") }
                }
            }
        }
        if (state.mods.isEmpty()) {
            Text(
                "No hay mods importados todavía. Pulsa \"Importar Mod\" para cargar un archivo .amethyst, .so o .zip.",
                style = MaterialTheme.typography.bodyMedium
            )
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(state.mods) { mod ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(mod.name, style = MaterialTheme.typography.titleMedium)
                                Text("${mod.sourceFormat} · ${mod.libraryFile} · ${mod.abi} · v${mod.version}")
                            }
                            Switch(checked = activeIds.contains(mod.id), onCheckedChange = { onToggleMod(mod.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsScreen(
    config: AndroidPortConfig,
    onUpdateConfig: (AndroidPortConfig) -> Unit,
    onImportRuntimeClick: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Ajustes Android", style = MaterialTheme.typography.headlineMedium)
        Text("Application ID: com.rubenamethyst.app")
        Text("Paquete objetivo: ${config.packageName}")
        Text("Ruta scoped: ${config.storagePath}")
        Text("ABI: ${config.targetAbi}")
        Text("Runtime .so: ${config.runtimePath.ifBlank { "No importado" }}")
        Button(onClick = onImportRuntimeClick, modifier = Modifier.fillMaxWidth()) {
            Text("Seleccionar libamethyst_runtime.so")
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Verificar ABI antes de iniciar")
            Switch(
                checked = config.verifyAbiOnLaunch,
                onCheckedChange = { onUpdateConfig(config.copy(verifyAbiOnLaunch = it)) }
            )
        }
    }
}
