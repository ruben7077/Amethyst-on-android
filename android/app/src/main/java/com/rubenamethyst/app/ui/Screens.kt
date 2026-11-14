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
    onLaunchGame: () -> Unit
) {
    val active = state.activeProfile
    Column(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Amethyst Launcher", style = MaterialTheme.typography.headlineMedium)
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(active?.name ?: "Sin perfil", style = MaterialTheme.typography.titleLarge)
                Text("MCBE ${active?.mcVersion ?: "-"} · ${active?.runtimeId ?: "-"} · ${state.activeMods.size} mods")
                Button(onClick = onLaunchGame, modifier = Modifier.fillMaxWidth()) {
                    Text("Iniciar Minecraft")
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
    onImportClick: () -> Unit
) {
    val activeIds = state.activeProfile?.modIds ?: emptyList()
    Column(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Mods (.so)", style = MaterialTheme.typography.headlineMedium)
            Button(onClick = onImportClick) { Text("Importar") }
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(state.mods) { mod ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(mod.name, style = MaterialTheme.typography.titleMedium)
                            Text("${mod.libraryFile} · ${mod.abi} · v${mod.version}")
                        }
                        Switch(checked = activeIds.contains(mod.id), onCheckedChange = { onToggleMod(mod.id) })
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsScreen(
    config: AndroidPortConfig,
    onUpdateConfig: (AndroidPortConfig) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Ajustes Android", style = MaterialTheme.typography.headlineMedium)
        Text("Application ID: com.rubenamethyst.app")
        Text("Paquete objetivo: ${config.packageName}")
        Text("Ruta scoped: ${config.storagePath}")
        Text("ABI: ${config.targetAbi}")
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Verificar ABI antes de iniciar")
            Switch(
                checked = config.verifyAbiOnLaunch,
                onCheckedChange = { onUpdateConfig(config.copy(verifyAbiOnLaunch = it)) }
            )
        }
    }
}
