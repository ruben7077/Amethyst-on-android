package com.rubenamethyst.app

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
