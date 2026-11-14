package com.rubenamethyst.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.rubenamethyst.app.AndroidPortConfig
import com.rubenamethyst.app.LauncherUiState
import com.rubenamethyst.app.ProfileEntry

private val AmethystBg = Color(0xFF0B0A10)
private val AmethystSurface = Color(0xFF13111C)
private val AmethystSurfaceHi = Color(0xFF1A1628)
private val AmethystAccent = Color(0xFF8B5CF6)
private val AmethystAccentSoft = Color(0xFFA78BFA)
private val AmethystMuted = Color(0xFF9B8FB8)

private val AmethystColors = darkColorScheme(
    primary = AmethystAccent,
    secondary = AmethystAccentSoft,
    background = AmethystBg,
    surface = AmethystSurface,
    surfaceVariant = AmethystSurfaceHi,
    onPrimary = Color.White,
    onBackground = Color(0xFFEDE9F6),
    onSurface = Color(0xFFEDE9F6),
    onSurfaceVariant = AmethystMuted
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
    onOpenMods: () -> Unit,
    onDismissStatus: () -> Unit
) {
    val active = state.activeProfile
    val isVanilla = active?.runtimeId == "vanilla"
    val activeMods = state.activeMods

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp),
        contentPadding = PaddingValues(vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        "Amethyst Launcher",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "Minecraft Bedrock · ${state.config.targetAbi}",
                        style = MaterialTheme.typography.bodySmall,
                        color = AmethystMuted
                    )
                }
            }
        }

        state.statusMessage?.let { msg ->
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = AmethystSurfaceHi),
                    border = BorderStroke(1.dp, AmethystAccent.copy(alpha = 0.4f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(msg, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                        TextButton(onClick = onDismissStatus) { Text("OK") }
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = AmethystSurfaceHi),
                border = BorderStroke(1.dp, AmethystAccent.copy(alpha = 0.45f))
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        active?.name ?: "Sin perfil",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "MCBE ${active?.mcVersion ?: "-"} · ${if (isVanilla) "Vanilla" else "AmethystRuntime 2.2.10"} · ${activeMods.size} mods",
                        style = MaterialTheme.typography.bodyMedium,
                        color = AmethystMuted
                    )
                    if (!isVanilla) {
                        Text(
                            if (state.config.runtimePath.isBlank()) "Runtime: libamethyst_runtime.so integrado listo"
                            else "Runtime externo: ${state.config.runtimePath.substringAfterLast('/')}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF6EE7B7)
                        )
                    }
                    Button(
                        onClick = onLaunchGame,
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Rounded.PlayArrow, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text(
                            if (isVanilla) "Iniciar Minecraft (Vanilla)" else "Iniciar Amethyst Moddeado",
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }

        if (!isVanilla) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = AmethystSurface)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Mods activos (${activeMods.size})",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                            TextButton(onClick = onOpenMods) { Text("Gestionar") }
                        }
                        if (activeMods.isEmpty()) {
                            Text(
                                "No hay mods activados en este perfil. Pulsa Gestionar para activar mods .amethyst o .so.",
                                style = MaterialTheme.typography.bodySmall,
                                color = AmethystMuted
                            )
                        } else {
                            activeMods.forEach { mod ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            if (mod.isBonus) "${mod.name} (Bonus)" else mod.name,
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Medium,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Text(
                                            "${mod.libraryFile} · v${mod.version}",
                                            style = MaterialTheme.typography.bodySmall,
                                            fontFamily = FontFamily.Monospace,
                                            color = AmethystMuted
                                        )
                                    }
                                    Text(
                                        mod.sourceFormat,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = AmethystAccentSoft
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        item {
            Text(
                "Cambiar perfil rápido",
                style = MaterialTheme.typography.titleSmall,
                color = AmethystMuted
            )
        }

        items(state.profiles) { profile ->
            val selected = profile.id == state.activeProfileId
            OutlinedButton(
                onClick = { onSelectProfile(profile.id) },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(
                    width = if (selected) 1.5.dp else 1.dp,
                    color = if (selected) AmethystAccent else Color.White.copy(alpha = 0.14f)
                )
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("${profile.name} (${profile.mcVersion})")
                    Text(
                        if (selected) "Activo" else "${profile.modIds.size} mods",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (selected) AmethystAccentSoft else AmethystMuted
                    )
                }
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
    var useVanilla by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Perfiles", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        OutlinedTextField(
            value = newName,
            onValueChange = { newName = it },
            label = { Text("Nombre del nuevo perfil") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Modo Vanilla (sin mods)", style = MaterialTheme.typography.bodyMedium)
            Switch(checked = useVanilla, onCheckedChange = { useVanilla = it })
        }
        Button(
            onClick = {
                if (newName.isNotBlank()) {
                    onSaveProfile(
                        ProfileEntry(
                            id = "profile-${System.currentTimeMillis()}",
                            name = newName.trim(),
                            mcVersion = "1.21.0.3",
                            runtimeId = if (useVanilla) "vanilla" else "amethyst-1.3.1",
                            modIds = if (useVanilla) emptyList() else listOf("amethyst-dev-tools", "bedrock-fov-unlocker")
                        )
                    )
                    newName = ""
                }
            },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(Icons.Rounded.Add, contentDescription = null)
            Spacer(Modifier.width(6.dp))
            Text("Crear Perfil")
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(state.profiles) { profile ->
                val isActive = profile.id == state.activeProfileId
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    border = if (isActive) BorderStroke(1.dp, AmethystAccent) else null
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(profile.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Text(
                                "MCBE ${profile.mcVersion} · ${profile.runtimeId} · ${profile.modIds.size} mods",
                                style = MaterialTheme.typography.bodySmall,
                                color = AmethystMuted
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            TextButton(onClick = { onSelectProfile(profile.id) }) {
                                Text(if (isActive) "Activo" else "Usar")
                            }
                            if (state.profiles.size > 1) {
                                IconButton(onClick = { onDeleteProfile(profile.id) }) {
                                    Icon(Icons.Rounded.Delete, contentDescription = "Eliminar")
                                }
                            }
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
    onDeleteMod: (String) -> Unit,
    onImportClick: () -> Unit,
    onImportRuntimeClick: () -> Unit,
    onDismissStatus: () -> Unit
) {
    val activeIds = state.activeProfile?.modIds ?: emptyList()
    var search by remember { mutableStateOf("") }
    val filteredMods = remember(state.mods, search) {
        val q = search.trim().lowercase()
        if (q.isEmpty()) state.mods
        else state.mods.filter {
            it.name.lowercase().contains(q) ||
                it.author.lowercase().contains(q) ||
                it.libraryFile.lowercase().contains(q)
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Mods (.amethyst / .so)", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("${state.mods.size} disponibles · ${activeIds.size} activos", style = MaterialTheme.typography.bodySmall, color = AmethystMuted)
            }
            Button(onClick = onImportClick, shape = RoundedCornerShape(12.dp)) {
                Icon(Icons.Rounded.Add, contentDescription = null)
                Spacer(Modifier.width(4.dp))
                Text("Importar")
            }
        }

        OutlinedTextField(
            value = search,
            onValueChange = { search = it },
            placeholder = { Text("Buscar mod, autor o .so...") },
            singleLine = true,
            leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedButton(onClick = onImportRuntimeClick, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
            Text(
                if (state.config.runtimePath.isBlank()) "Runtime: integrado (reemplazar .so opcional)"
                else "Runtime externo: ${state.config.runtimePath.substringAfterLast('/')}"
            )
        }

        state.statusMessage?.let { msg ->
            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = AmethystSurfaceHi)) {
                Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(msg, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                    TextButton(onClick = onDismissStatus) { Text("OK") }
                }
            }
        }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(filteredMods) { mod ->
                val enabled = activeIds.contains(mod.id)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (mod.isBonus) AmethystSurfaceHi else AmethystSurface
                    ),
                    border = if (mod.isBonus) BorderStroke(1.dp, AmethystAccent.copy(alpha = 0.45f)) else null
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text(
                                if (mod.isBonus) "${mod.name} (Mod Bonus)" else mod.name,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                "${mod.sourceFormat} · ${mod.libraryFile} · v${mod.version}",
                                style = MaterialTheme.typography.bodySmall,
                                fontFamily = FontFamily.Monospace,
                                color = AmethystMuted
                            )
                            Text(
                                "${mod.author} · MCBE ${mod.targetMcVersion}",
                                style = MaterialTheme.typography.labelSmall,
                                color = AmethystAccentSoft
                            )
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (!mod.isBonus && mod.packDir.isNotBlank()) {
                                IconButton(onClick = { onDeleteMod(mod.id) }) {
                                    Icon(Icons.Rounded.Delete, contentDescription = "Eliminar mod")
                                }
                            }
                            Switch(checked = enabled, onCheckedChange = { onToggleMod(mod.id) })
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
    var packageDraft by remember(config.packageName) { mutableStateOf(config.packageName) }

    Column(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Ajustes", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp)) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Entorno Android", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text("Application ID: com.rubenamethyst.app", style = MaterialTheme.typography.bodySmall, fontFamily = FontFamily.Monospace)
                Text("Arquitectura ABI: ${config.targetAbi}", style = MaterialTheme.typography.bodySmall, fontFamily = FontFamily.Monospace)
                OutlinedTextField(
                    value = packageDraft,
                    onValueChange = {
                        packageDraft = it
                        onUpdateConfig(config.copy(packageName = it.trim().ifBlank { "com.mojang.minecraftpe" }))
                    },
                    label = { Text("Paquete de Minecraft") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
        Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp)) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Runtime Nativo", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(
                    config.runtimePath.ifBlank { "Integrado en APK (libamethyst_runtime.so 2.2.10)" },
                    style = MaterialTheme.typography.bodySmall,
                    color = AmethystMuted
                )
                Button(onClick = onImportRuntimeClick, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
                    Text("Reemplazar libamethyst_runtime.so (opcional)")
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Verificar ABI antes de iniciar", style = MaterialTheme.typography.bodyMedium)
                    Switch(
                        checked = config.verifyAbiOnLaunch,
                        onCheckedChange = { onUpdateConfig(config.copy(verifyAbiOnLaunch = it)) }
                    )
                }
            }
        }
    }
}
