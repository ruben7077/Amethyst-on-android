package com.rubenamethyst.app

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
