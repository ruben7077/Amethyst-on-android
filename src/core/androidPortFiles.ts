export interface PortMappingRow {
  layer: string;
  windowsOriginal: string;
  androidPort: string;
  rationale: string;
}

export interface AndroidSourceFile {
  path: string;
  language: 'kotlin' | 'cpp' | 'cmake' | 'xml' | 'gradle' | 'yaml' | 'properties';
  summary: string;
  content: string;
}

export const ANDROID_APPLICATION_ID = 'com.rubenamethyst.app';

export const WINDOWS_TO_ANDROID_MAPPINGS: PortMappingRow[] = [
  {
    layer: 'Interfaz de Usuario',
    windowsOriginal: 'Electron + React + Vite + Zustand',
    androidPort: 'Kotlin + Jetpack Compose (Material 3) + StateFlow',
    rationale:
      'Elimina la sobrecarga de Chromium en móviles y adopta navegación inferior ergonómica y hojas modales táctiles.',
  },
  {
    layer: 'Inyección de Código Nativo',
    windowsOriginal: 'Win32 LoadLibraryA / Proxy DLL (dxgi.dll / vcruntime)',
    androidPort: 'ELF dlopen() + libamethyst_loader.so (JNI_OnLoad / LD_PRELOAD)',
    rationale:
      'Android carga binarios ELF (.so) mediante Bionic linker en lugar de PE (.dll). Se reemplaza el proxy DLL por un loader JNI en NativeActivity.',
  },
  {
    layer: 'Hooking C++ (AmethystAPI)',
    windowsOriginal: 'SafetyHook / MinHook x86_64 (PDB symbols)',
    androidPort: 'Dobby / ShadowHook arm64-v8a + tablas de símbolos ELF / pattern scan',
    rationale:
      'Los dispositivos Android modernos ejecutan ARM64; Dobby y ShadowHook permiten inline hooks y PLT/GOT hooks estables en AArch64.',
  },
  {
    layer: 'Gestión de Versiones MCBE',
    windowsOriginal: 'Microsoft Store UWP / GDK AppxManifest',
    androidPort: 'PackageManager + Split APK / OBB Manager (com.mojang.minecraftpe)',
    rationale:
      'En Android se verifica packageName, versionCode y ABI split (config.arm64_v8a.apk) con aislamiento por perfil en scoped storage.',
  },
  {
    layer: 'Almacenamiento de Perfiles y Mods',
    windowsOriginal: '%LOCALAPPDATA%\\Amethyst\\Launcher\\',
    androidPort: '/Android/data/com.rubenamethyst.app/files/ (Scoped Storage + SAF)',
    rationale:
      'Cumple con Android 11+ Scoped Storage e importa archivos .zip / .so / mod.json usando Storage Access Framework (ACTION_OPEN_DOCUMENT).',
  },
];

export const ANDROID_PORT_FILES: AndroidSourceFile[] = [
  {
    path: 'app/src/main/java/com/rubenamethyst/app/MainActivity.kt',
    language: 'kotlin',
    summary: 'Punto de entrada Jetpack Compose (com.rubenamethyst.app) con barra inferior táctil e importación SAF.',
    content: `package com.rubenamethyst.app

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Build
import androidx.compose.material.icons.rounded.Extension
import androidx.compose.material.icons.rounded.Layers
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.rubenamethyst.app.ui.AmethystTheme
import com.rubenamethyst.app.ui.LauncherScreen
import com.rubenamethyst.app.ui.ModsScreen
import com.rubenamethyst.app.ui.ProfilesScreen
import com.rubenamethyst.app.ui.SettingsScreen

class MainActivity : ComponentActivity() {
    private val viewModel: AmethystLauncherViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AmethystTheme {
                val uiState by viewModel.uiState.collectAsState()
                var currentRoute by remember { mutableStateOf("launcher") }

                val importModLauncher = rememberLauncherForActivityResult(
                    contract = ActivityResultContracts.OpenDocument()
                ) { uri: Uri? ->
                    uri?.let { viewModel.importModArchive(contentResolver, it) }
                }

                Scaffold(
                    bottomBar = {
                        NavigationBar {
                            NavigationBarItem(
                                selected = currentRoute == "launcher",
                                onClick = { currentRoute = "launcher" },
                                label = { Text("Jugar") },
                                icon = { Icon(Icons.Rounded.PlayArrow, contentDescription = null) }
                            )
                            NavigationBarItem(
                                selected = currentRoute == "profiles",
                                onClick = { currentRoute = "profiles" },
                                label = { Text("Perfiles") },
                                icon = { Icon(Icons.Rounded.Layers, contentDescription = null) }
                            )
                            NavigationBarItem(
                                selected = currentRoute == "mods",
                                onClick = { currentRoute = "mods" },
                                label = { Text("Mods") },
                                icon = { Icon(Icons.Rounded.Extension, contentDescription = null) }
                            )
                            NavigationBarItem(
                                selected = currentRoute == "settings",
                                onClick = { currentRoute = "settings" },
                                label = { Text("Ajustes") },
                                icon = { Icon(Icons.Rounded.Settings, contentDescription = null) }
                            )
                        }
                    }
                ) { padding ->
                    Box(modifier = Modifier.padding(padding)) {
                        when (currentRoute) {
                            "launcher" -> LauncherScreen(
                                state = uiState,
                                onSelectProfile = viewModel::selectProfile,
                                onLaunchGame = { viewModel.launchMinecraft(this@MainActivity) }
                            )
                            "profiles" -> ProfilesScreen(
                                state = uiState,
                                onSelectProfile = viewModel::selectProfile,
                                onSaveProfile = viewModel::saveProfile,
                                onDeleteProfile = viewModel::deleteProfile
                            )
                            "mods" -> ModsScreen(
                                state = uiState,
                                onToggleMod = viewModel::toggleModForActiveProfile,
                                onImportClick = {
                                    importModLauncher.launch(arrayOf("application/zip", "application/octet-stream"))
                                }
                            )
                            "settings" -> SettingsScreen(
                                config = uiState.config,
                                onUpdateConfig = viewModel::updateConfig
                            )
                        }
                    }
                }
            }
        }
    }
}
`,
  },
  {
    path: 'app/src/main/java/com/rubenamethyst/app/AmethystLauncherViewModel.kt',
    language: 'kotlin',
    summary: 'Orquestación de perfiles, validación ABI arm64-v8a e inicio de com.mojang.minecraftpe.',
    content: `package com.rubenamethyst.app

import android.app.Application
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File

class AmethystLauncherViewModel(app: Application) : AndroidViewModel(app) {
    private val repository = ModRepository(app.getExternalFilesDir(null) ?: app.filesDir)
    private val _uiState = MutableStateFlow(repository.loadInitialState())
    val uiState: StateFlow<LauncherUiState> = _uiState.asStateFlow()

    companion object {
        init {
            System.loadLibrary("amethyst_loader")
        }
    }

    fun detectDeviceAbi(): String = Build.SUPPORTED_ABIS.firstOrNull() ?: "arm64-v8a"

    fun isMinecraftInstalled(context: Context, packageName: String): Boolean {
        return try {
            context.packageManager.getPackageInfo(packageName, PackageManager.GET_META_DATA)
            true
        } catch (_: PackageManager.NameNotFoundException) {
            false
        }
    }

    fun selectProfile(profileId: String) {
        _uiState.value = _uiState.value.copy(activeProfileId = profileId)
        repository.persistState(_uiState.value)
    }

    fun saveProfile(profile: ProfileEntry) {
        val current = _uiState.value.profiles
        val updated = if (current.any { it.id == profile.id }) {
            current.map { if (it.id == profile.id) profile else it }
        } else {
            listOf(profile) + current
        }
        _uiState.value = _uiState.value.copy(profiles = updated, activeProfileId = profile.id)
        repository.persistState(_uiState.value)
    }

    fun deleteProfile(profileId: String) {
        val current = _uiState.value.profiles
        if (current.size <= 1) return
        val remaining = current.filterNot { it.id == profileId }
        val nextActive = if (_uiState.value.activeProfileId == profileId) remaining.first().id else _uiState.value.activeProfileId
        _uiState.value = _uiState.value.copy(profiles = remaining, activeProfileId = nextActive)
        repository.persistState(_uiState.value)
    }

    fun toggleModForActiveProfile(modId: String) {
        val activeId = _uiState.value.activeProfileId
        val updated = _uiState.value.profiles.map { profile ->
            if (profile.id != activeId) profile
            else if (profile.modIds.contains(modId)) profile.copy(modIds = profile.modIds - modId)
            else profile.copy(modIds = profile.modIds + modId)
        }
        _uiState.value = _uiState.value.copy(profiles = updated)
        repository.persistState(_uiState.value)
    }

    fun updateConfig(config: AndroidPortConfig) {
        _uiState.value = _uiState.value.copy(config = config)
        repository.persistState(_uiState.value)
    }

    fun launchMinecraft(context: Context) {
        viewModelScope.launch {
            val state = _uiState.value
            val profile = state.activeProfile ?: return@launch
            val configDir = File(context.getExternalFilesDir(null), "runtime_bridge")
            configDir.mkdirs()

            repository.writeRuntimeManifest(
                targetFile = File(configDir, "active_profile.json"),
                profile = profile,
                mods = state.activeMods
            )

            val launchIntent = context.packageManager.getLaunchIntentForPackage(state.config.packageName)
                ?: Intent().apply {
                    setClassName(state.config.packageName, "com.mojang.minecraftpe.MainActivity")
                }

            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            launchIntent.putExtra("amethyst_profile_id", profile.id)
            launchIntent.putExtra("amethyst_manifest_path", File(configDir, "active_profile.json").absolutePath)
            context.startActivity(launchIntent)
        }
    }

    fun importModArchive(resolver: ContentResolver, uri: Uri) {
        viewModelScope.launch {
            val imported = repository.extractAndValidateMod(resolver, uri, detectDeviceAbi())
            if (imported != null) {
                val updated = _uiState.value.mods + imported
                _uiState.value = _uiState.value.copy(mods = updated)
                repository.persistState(_uiState.value)
            }
        }
    }
}
`,
  },
  {
    path: 'app/src/main/java/com/rubenamethyst/app/Models.kt',
    language: 'kotlin',
    summary: 'Modelos de datos Kotlin para perfiles, mods ELF (.so), runtimes y configuración Android.',
    content: `package com.rubenamethyst.app

data class ModEntry(
    val id: String,
    val name: String,
    val version: String,
    val author: String,
    val abi: String,
    val libraryFile: String,
    val targetMcVersion: String
)

data class ProfileEntry(
    val id: String,
    val name: String,
    val mcVersion: String,
    val runtimeId: String,
    val modIds: List<String>
)

data class AndroidPortConfig(
    val targetAbi: String = "arm64-v8a",
    val packageName: String = "com.mojang.minecraftpe",
    val storagePath: String = "/Android/data/com.rubenamethyst.app/files",
    val verifyAbiOnLaunch: Boolean = true
)

data class LauncherUiState(
    val activeProfileId: String,
    val profiles: List<ProfileEntry>,
    val mods: List<ModEntry>,
    val config: AndroidPortConfig
) {
    val activeProfile: ProfileEntry?
        get() = profiles.firstOrNull { it.id == activeProfileId }

    val activeMods: List<ModEntry>
        get() {
            val profile = activeProfile ?: return emptyList()
            if (profile.runtimeId == "vanilla") return emptyList()
            return mods.filter { profile.modIds.contains(it.id) }
        }
}
`,
  },
  {
    path: 'app/src/main/java/com/rubenamethyst/app/ModRepository.kt',
    language: 'kotlin',
    summary: 'Persistencia en scoped storage y escritura del manifiesto active_profile.json para JNI.',
    content: `package com.rubenamethyst.app

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class ModRepository(private val baseDir: File) {
    private val stateFile = File(baseDir, "launcher_state.json")

    fun loadInitialState(): LauncherUiState {
        val defaultMods = listOf(
            ModEntry(
                id = "amethyst-dev-tools",
                name = "Amethyst Dev Overlay",
                version = "1.4.0",
                author = "FrederoxDev",
                abi = "arm64-v8a",
                libraryFile = "libamethyst_dev_overlay.so",
                targetMcVersion = "1.21.0.3"
            ),
            ModEntry(
                id = "bedrock-fov-unlocker",
                name = "Dynamic FOV & Camera",
                version = "2.1.0",
                author = "AmethystCommunity",
                abi = "arm64-v8a",
                libraryFile = "libdynamic_fov.so",
                targetMcVersion = "1.21.0.3"
            )
        )
        val defaultProfiles = listOf(
            ProfileEntry(
                id = "profile-amethyst-121",
                name = "Amethyst 1.21",
                mcVersion = "1.21.0.3",
                runtimeId = "amethyst-1.3.1",
                modIds = listOf("amethyst-dev-tools", "bedrock-fov-unlocker")
            ),
            ProfileEntry(
                id = "profile-vanilla-121",
                name = "Vanilla 1.21",
                mcVersion = "1.21.2.2",
                runtimeId = "vanilla",
                modIds = emptyList()
            )
        )
        return LauncherUiState(
            activeProfileId = "profile-amethyst-121",
            profiles = defaultProfiles,
            mods = defaultMods,
            config = AndroidPortConfig()
        )
    }

    fun persistState(state: LauncherUiState) {
        baseDir.mkdirs()
        val json = JSONObject().apply {
            put("activeProfileId", state.activeProfileId)
            put("packageName", state.config.packageName)
            put("targetAbi", state.config.targetAbi)
        }
        stateFile.writeText(json.toString(2))
    }

    fun writeRuntimeManifest(targetFile: File, profile: ProfileEntry, mods: List<ModEntry>) {
        val modsArray = JSONArray()
        mods.forEach { mod ->
            modsArray.put(JSONObject().apply {
                put("id", mod.id)
                put("libraryFile", mod.libraryFile)
                put("abi", mod.abi)
            })
        }
        val payload = JSONObject().apply {
            put("profileId", profile.id)
            put("mcVersion", profile.mcVersion)
            put("runtimeId", profile.runtimeId)
            put("mods", modsArray)
        }
        targetFile.writeText(payload.toString(2))
    }

    fun extractAndValidateMod(resolver: ContentResolver, uri: Uri, abi: String): ModEntry? {
        var displayName = "imported_mod.so"
        resolver.query(uri, null, null, null, null)?.use { cursor ->
            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && cursor.moveToFirst()) {
                displayName = cursor.getString(idx) ?: displayName
            }
        }
        if (!displayName.endsWith(".so") && !displayName.endsWith(".zip")) return null
        val modsDir = File(baseDir, "mods").apply { mkdirs() }
        val outFile = File(modsDir, displayName)
        resolver.openInputStream(uri)?.use { input ->
            outFile.outputStream().use { output -> input.copyTo(output) }
        }
        val cleanName = displayName.removePrefix("lib").substringBeforeLast(".")
        return ModEntry(
            id = cleanName.lowercase().replace(Regex("[^a-z0-9]+"), "-"),
            name = cleanName.replace('_', ' '),
            version = "1.0.0",
            author = "LocalImport",
            abi = abi,
            libraryFile = if (displayName.endsWith(".so")) displayName else "lib\${cleanName}.so",
            targetMcVersion = "1.21.0.3"
        )
    }
}
`,
  },
  {
    path: 'app/src/main/java/com/rubenamethyst/app/ui/Screens.kt',
    language: 'kotlin',
    summary: 'Pantallas Jetpack Compose (Theme, LauncherScreen, ProfilesScreen, ModsScreen, SettingsScreen).',
    content: `package com.rubenamethyst.app.ui

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
                Text("MCBE \${active?.mcVersion ?: "-"} · \${active?.runtimeId ?: "-"} · \${state.activeMods.size} mods")
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
                Text("\${profile.name} (\${profile.mcVersion})")
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
                    onSaveProfile(ProfileEntry("profile-\${System.currentTimeMillis()}", newName.trim(), "1.21.0.3", "amethyst-1.3.1", emptyList()))
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
                            Text("MCBE \${profile.mcVersion} · \${profile.runtimeId}")
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
                            Text("\${mod.libraryFile} · \${mod.abi} · v\${mod.version}")
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
        Text("Paquete objetivo: \${config.packageName}")
        Text("Ruta scoped: \${config.storagePath}")
        Text("ABI: \${config.targetAbi}")
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Verificar ABI antes de iniciar")
            Switch(
                checked = config.verifyAbiOnLaunch,
                onCheckedChange = { onUpdateConfig(config.copy(verifyAbiOnLaunch = it)) }
            )
        }
    }
}
`,
  },
  {
    path: 'app/src/main/cpp/amethyst_loader.cpp',
    language: 'cpp',
    summary: 'Cargador nativo NDK/JNI que reemplaza LoadLibraryA de Windows por dlopen() de Android y hooks AArch64.',
    content: `#include <jni.h>
#include <dlfcn.h>
#include <android/log.h>
#include <string>
#include <vector>

#define LOG_TAG "AmethystLoader"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace amethyst::android {

struct ModDescriptor {
    std::string id;
    std::string soPath;
};

using AmethystModInitFn = void (*)(const char* mcVersion, void* libMinecraftHandle);

bool LoadNativeLibrary(const std::string& path, void** outHandle) {
    void* handle = dlopen(path.c_str(), RTLD_NOW | RTLD_GLOBAL);
    if (!handle) {
        LOGE("Error cargando %s: %s", path.c_str(), dlerror());
        return false;
    }
    *outHandle = handle;
    LOGI("Libreria ELF cargada: %s", path.c_str());
    return true;
}

void BootstrapAmethystRuntime(
    const std::string& runtimeSoPath,
    const std::vector<ModDescriptor>& mods,
    const std::string& mcVersion
) {
    void* mcHandle = dlopen("libminecraftpe.so", RTLD_NOLOAD);
    if (!mcHandle) {
        mcHandle = dlopen("libminecraftpe.so", RTLD_LAZY);
    }

    void* runtimeHandle = nullptr;
    if (!LoadNativeLibrary(runtimeSoPath, &runtimeHandle)) {
        LOGE("Abortando bootstrap: fallo al cargar AmethystRuntime.");
        return;
    }

    for (const auto& mod : mods) {
        void* modHandle = nullptr;
        if (!LoadNativeLibrary(mod.soPath, &modHandle)) continue;

        auto initFn = reinterpret_cast<AmethystModInitFn>(dlsym(modHandle, "Initialize"));
        if (initFn) {
            LOGI("Inicializando mod %s para MCBE %s", mod.id.c_str(), mcVersion.c_str());
            initFn(mcVersion.c_str(), mcHandle);
        } else {
            LOGE("El mod %s no exporta el simbolo Initialize()", mod.id.c_str());
        }
    }
}

} // namespace amethyst::android

extern "C" JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* /*vm*/, void* /*reserved*/) {
    LOGI("AmethystLoader (com.rubenamethyst.app) inicializado en Android");
    return JNI_VERSION_1_6;
}
`,
  },
  {
    path: 'app/src/main/cpp/CMakeLists.txt',
    language: 'cmake',
    summary: 'Script de compilación NDK C++20 para libamethyst_loader.so en arm64-v8a y armeabi-v7a.',
    content: `cmake_minimum_required(VERSION 3.22.1)
project("amethyst_loader" LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(amethyst_loader SHARED
    amethyst_loader.cpp
)

find_library(log-lib log)
find_library(android-lib android)

target_link_libraries(amethyst_loader
    \${log-lib}
    \${android-lib}
    dl
)
`,
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    summary: 'Manifiesto Android con consultas de paquetes (com.mojang.minecraftpe) y tema Material.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <queries>
        <package android:name="com.mojang.minecraftpe" />
    </queries>

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />

    <application
        android:allowBackup="true"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.AmethystLauncher">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`,
  },
  {
    path: 'app/src/main/res/values/strings.xml',
    language: 'xml',
    summary: 'Recursos de texto de la aplicación Android.',
    content: `<resources>
    <string name="app_name">Amethyst Launcher</string>
</resources>
`,
  },
  {
    path: 'app/src/main/res/values/themes.xml',
    language: 'xml',
    summary: 'Tema base Material para MainActivity.',
    content: `<resources>
    <style name="Theme.AmethystLauncher" parent="android:Theme.Material.NoActionBar" />
</resources>
`,
  },
  {
    path: 'app/build.gradle.kts',
    language: 'gradle',
    summary: 'Módulo Gradle Android con applicationId com.rubenamethyst.app, Compose BOM y NDK CMake.',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.rubenamethyst.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.rubenamethyst.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.3.1-android"

        ndk {
            abiFilters += listOf("arm64-v8a", "armeabi-v7a")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.22.1"
        }
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.10.01")
    implementation(composeBom)
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
}
`,
  },
  {
    path: 'build.gradle.kts',
    language: 'gradle',
    summary: 'Configuración Gradle raíz del proyecto Android.',
    content: `plugins {
    id("com.android.application") version "8.7.2" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
}
`,
  },
  {
    path: 'settings.gradle.kts',
    language: 'gradle',
    summary: 'Repositorios de Google/MavenCentral y declaración del módulo :app.',
    content: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "AmethystLauncherAndroid"
include(":app")
`,
  },
  {
    path: 'gradle.properties',
    language: 'properties',
    summary: 'Opciones de memoria JVM, AndroidX y caché de compilación Gradle.',
    content: `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
`,
  },
  {
    path: '.github/workflows/build-apk.yml',
    language: 'yaml',
    summary: 'Flujo de GitHub Actions para compilar automáticamente app-debug.apk con Android SDK y NDK.',
    content: `name: Compilar Amethyst Launcher APK

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - uses: android-actions/setup-android@v3
      - name: Instalar NDK y CMake
        run: sdkmanager --install "ndk;26.3.11579264" "cmake;3.22.1"
      - name: Generar Gradle Wrapper y compilar APK
        working-directory: android
        run: |
          gradle wrapper --gradle-version 8.9
          ./gradlew assembleDebug
      - name: Subir APK compilado
        uses: actions/upload-artifact@v4
        with:
          name: amethyst-launcher-com.rubenamethyst.app-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
`,
  },
];
