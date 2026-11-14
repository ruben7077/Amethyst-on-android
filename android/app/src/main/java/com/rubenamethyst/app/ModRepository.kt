package com.rubenamethyst.app

import android.content.ContentResolver
import android.content.res.AssetManager
import android.net.Uri
import android.provider.OpenableColumns
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream

class ModRepository(
    private val baseDir: File,
    private val appNativeLibDir: String = ""
) {
    private val stateFile = File(baseDir, "launcher_state.json")

    private fun builtInNativeMods(abi: String): List<ModEntry> {
        fun nativePath(soName: String): String {
            if (appNativeLibDir.isBlank()) return ""
            val candidate = File(appNativeLibDir, soName)
            return if (candidate.exists()) candidate.absolutePath else "$appNativeLibDir/$soName"
        }
        return listOf(
            ModEntry(
                id = "amethyst-dev-tools",
                name = "Amethyst Dev Overlay",
                version = "1.4.0",
                author = "FrederoxDev",
                abi = abi,
                libraryFile = "libamethyst_dev_overlay.so",
                targetMcVersion = "1.21.0.3",
                localPath = nativePath("libamethyst_dev_overlay.so"),
                sourceFormat = ".so",
                isBonus = false,
                hasAndroidBinary = true
            ),
            ModEntry(
                id = "bedrock-fov-unlocker",
                name = "Dynamic FOV & Camera",
                version = "2.1.0",
                author = "AmethystCommunity",
                abi = abi,
                libraryFile = "libdynamic_fov.so",
                targetMcVersion = "1.21.0.3",
                localPath = nativePath("libdynamic_fov.so"),
                sourceFormat = ".so",
                isBonus = false,
                hasAndroidBinary = true
            ),
            ModEntry(
                id = "chunk-border-renderer",
                name = "Chunk Border Renderer",
                version = "1.1.2",
                author = "VoxelPort",
                abi = abi,
                libraryFile = "libchunk_borders.so",
                targetMcVersion = "1.21.2.2",
                localPath = nativePath("libchunk_borders.so"),
                sourceFormat = ".so",
                isBonus = false,
                hasAndroidBinary = true
            )
        )
    }

    fun loadInitialState(assets: AssetManager? = null, deviceAbi: String = "arm64-v8a"): LauncherUiState {
        var loadedState: LauncherUiState? = null
        if (stateFile.exists()) {
            try {
                val root = JSONObject(stateFile.readText())
                val activeProfileId = root.optString("activeProfileId", "profile-amethyst-121")
                val cfgObj = root.optJSONObject("config")
                val config = if (cfgObj != null) {
                    AndroidPortConfig(
                        targetAbi = cfgObj.optString("targetAbi", deviceAbi),
                        packageName = cfgObj.optString("packageName", "com.mojang.minecraftpe"),
                        storagePath = cfgObj.optString("storagePath", "/Android/data/com.rubenamethyst.app/files"),
                        runtimePath = cfgObj.optString("runtimePath", ""),
                        verifyAbiOnLaunch = cfgObj.optBoolean("verifyAbiOnLaunch", true)
                    )
                } else {
                    AndroidPortConfig(targetAbi = deviceAbi)
                }

                val modsArr = root.optJSONArray("mods")
                val mods = mutableListOf<ModEntry>()
                if (modsArr != null) {
                    for (i in 0 until modsArr.length()) {
                        val obj = modsArr.getJSONObject(i)
                        mods.add(
                            ModEntry(
                                id = obj.getString("id"),
                                name = obj.getString("name"),
                                version = obj.optString("version", "1.0.0"),
                                author = obj.optString("author", "Desconocido"),
                                abi = obj.optString("abi", deviceAbi),
                                libraryFile = obj.optString("libraryFile", "libmod.so"),
                                targetMcVersion = obj.optString("targetMcVersion", "1.21.0.3"),
                                localPath = obj.optString("localPath", ""),
                                sourceFormat = obj.optString("sourceFormat", ".so"),
                                isBonus = obj.optBoolean("isBonus", false),
                                hasAndroidBinary = obj.optBoolean("hasAndroidBinary", true),
                                packDir = obj.optString("packDir", "")
                            )
                        )
                    }
                }

                val profArr = root.optJSONArray("profiles")
                val profiles = mutableListOf<ProfileEntry>()
                if (profArr != null) {
                    for (i in 0 until profArr.length()) {
                        val obj = profArr.getJSONObject(i)
                        val modIdsJson = obj.optJSONArray("modIds")
                        val modIds = mutableListOf<String>()
                        if (modIdsJson != null) {
                            for (j in 0 until modIdsJson.length()) {
                                modIds.add(modIdsJson.getString(j))
                            }
                        }
                        profiles.add(
                            ProfileEntry(
                                id = obj.getString("id"),
                                name = obj.getString("name"),
                                mcVersion = obj.optString("mcVersion", "1.21.0.3"),
                                runtimeId = obj.optString("runtimeId", "amethyst-1.3.1"),
                                modIds = modIds
                            )
                        )
                    }
                }

                if (profiles.isNotEmpty()) {
                    loadedState = LauncherUiState(
                        activeProfileId = activeProfileId,
                        profiles = profiles,
                        mods = mods,
                        config = config
                    )
                }
            } catch (_: Exception) {
                // Fallback a estado inicial si el JSON está corrupto
            }
        }

        val initialState = loadedState ?: LauncherUiState(
            activeProfileId = "profile-amethyst-121",
            profiles = listOf(
                ProfileEntry(
                    id = "profile-amethyst-121",
                    name = "Amethyst 1.21",
                    mcVersion = "1.21.0.3",
                    runtimeId = "amethyst-1.3.1",
                    modIds = listOf("amethyst-dev-tools", "bedrock-fov-unlocker", "create")
                ),
                ProfileEntry(
                    id = "profile-vanilla-121",
                    name = "Vanilla 1.21",
                    mcVersion = "1.21.2.2",
                    runtimeId = "vanilla",
                    modIds = emptyList()
                )
            ),
            mods = builtInNativeMods(deviceAbi),
            config = AndroidPortConfig(targetAbi = deviceAbi)
        )

        return ensureBuiltInAndBonusMods(initialState, assets)
    }

    private fun ensureBuiltInAndBonusMods(state: LauncherUiState, assets: AssetManager?): LauncherUiState {
        var changed = false
        val nativeDefaults = builtInNativeMods(state.config.targetAbi)
        val mergedMods = state.mods.toMutableList()

        for (nativeMod in nativeDefaults) {
            val existingIdx = mergedMods.indexOfFirst { it.id == nativeMod.id }
            if (existingIdx < 0) {
                mergedMods.add(nativeMod)
                changed = true
            } else if (mergedMods[existingIdx].localPath != nativeMod.localPath && nativeMod.localPath.isNotBlank()) {
                mergedMods[existingIdx] = mergedMods[existingIdx].copy(
                    localPath = nativeMod.localPath,
                    hasAndroidBinary = true
                )
                changed = true
            }
        }

        val staleCreate = mergedMods.firstOrNull {
            (it.id == "create-0-1-1" || it.name.startsWith("Create@")) && it.version == "1.0.0"
        }
        val createBridgePath = if (appNativeLibDir.isNotBlank()) {
            File(appNativeLibDir, "libcreate_bridge.so").absolutePath
        } else {
            ""
        }

        val existingCreate = mergedMods.firstOrNull { it.id == "create" }
        var updatedProfiles = state.profiles

        if (assets != null && (existingCreate == null || staleCreate != null || existingCreate.localPath.isBlank())) {
            val rawBytes = runCatching {
                assets.open("bonus_mods/Create@0.1.1.amethyst").use { it.readBytes() }
            }.getOrNull()

            if (rawBytes != null) {
                val extracted = extractAndValidateModBytes(
                    displayName = "Create@0.1.1.amethyst",
                    rawBytes = rawBytes,
                    abi = state.config.targetAbi,
                    isBonus = true
                ).getOrNull()

                if (extracted != null) {
                    val readyCreate = extracted.copy(
                        localPath = createBridgePath,
                        hasAndroidBinary = createBridgePath.isNotBlank(),
                        libraryFile = if (createBridgePath.isNotBlank()) "libcreate_bridge.so + packs" else extracted.libraryFile
                    )
                    mergedMods.removeAll { it.id == readyCreate.id || it.id == "create-0-1-1" || it.name.startsWith("Create@") }
                    mergedMods.add(0, readyCreate)
                    if (staleCreate != null) {
                        updatedProfiles = updatedProfiles.map { profile ->
                            if (profile.modIds.contains(staleCreate.id)) {
                                profile.copy(modIds = (profile.modIds - staleCreate.id + readyCreate.id).distinct())
                            } else {
                                profile
                            }
                        }
                    }
                    changed = true
                }
            }
        }

        // Asegurar que el perfil Amethyst principal tenga los mods nativos activos si estaba vacío al actualizar
        val mainProfile = updatedProfiles.firstOrNull { it.id == "profile-amethyst-121" }
        if (mainProfile != null && mainProfile.modIds.none { id -> nativeDefaults.any { it.id == id } }) {
            val defaultIds = listOf("amethyst-dev-tools", "bedrock-fov-unlocker", "create")
                .filter { id -> mergedMods.any { it.id == id } }
            updatedProfiles = updatedProfiles.map { p ->
                if (p.id == "profile-amethyst-121") {
                    p.copy(modIds = (p.modIds + defaultIds).distinct())
                } else {
                    p
                }
            }
            changed = true
        }

        val finalState = state.copy(mods = mergedMods, profiles = updatedProfiles)
        if (changed) {
            persistState(finalState)
        }
        return finalState
    }

    fun persistState(state: LauncherUiState) {
        baseDir.mkdirs()
        val modsArr = JSONArray()
        state.mods.forEach { mod ->
            modsArr.put(
                JSONObject().apply {
                    put("id", mod.id)
                    put("name", mod.name)
                    put("version", mod.version)
                    put("author", mod.author)
                    put("abi", mod.abi)
                    put("libraryFile", mod.libraryFile)
                    put("targetMcVersion", mod.targetMcVersion)
                    put("localPath", mod.localPath)
                    put("sourceFormat", mod.sourceFormat)
                    put("isBonus", mod.isBonus)
                    put("hasAndroidBinary", mod.hasAndroidBinary)
                    put("packDir", mod.packDir)
                }
            )
        }
        val profilesArr = JSONArray()
        state.profiles.forEach { p ->
            profilesArr.put(
                JSONObject().apply {
                    put("id", p.id)
                    put("name", p.name)
                    put("mcVersion", p.mcVersion)
                    put("runtimeId", p.runtimeId)
                    put("modIds", JSONArray(p.modIds))
                }
            )
        }
        val configObj = JSONObject().apply {
            put("targetAbi", state.config.targetAbi)
            put("packageName", state.config.packageName)
            put("storagePath", state.config.storagePath)
            put("runtimePath", state.config.runtimePath)
            put("verifyAbiOnLaunch", state.config.verifyAbiOnLaunch)
        }
        val root = JSONObject().apply {
            put("activeProfileId", state.activeProfileId)
            put("mods", modsArr)
            put("profiles", profilesArr)
            put("config", configObj)
        }
        stateFile.writeText(root.toString(2))
    }

    fun writeRuntimeManifest(targetFile: File, profile: ProfileEntry, mods: List<ModEntry>) {
        val modsArray = JSONArray()
        mods.forEach { mod ->
            modsArray.put(
                JSONObject().apply {
                    put("id", mod.id)
                    put("libraryFile", mod.libraryFile)
                    put("localPath", mod.localPath)
                    put("abi", mod.abi)
                    put("hasAndroidBinary", mod.hasAndroidBinary)
                    put("packDir", mod.packDir)
                }
            )
        }
        val payload = JSONObject().apply {
            put("profileId", profile.id)
            put("mcVersion", profile.mcVersion)
            put("runtimeId", profile.runtimeId)
            put("mods", modsArray)
        }
        targetFile.writeText(payload.toString(2))
    }

    data class McAddonBuildResult(
        val file: File,
        val synthesizedItems: Int,
        val synthesizedBlocks: Int
    )

    private fun bumpManifestJson(
        rawJson: String,
        newPatchVersion: Int,
        dependencyUuid: String? = null
    ): ByteArray {
        return try {
            val root = JSONObject(rawJson)
            val header = root.optJSONObject("header")
            var bumpedTuple = JSONArray().apply {
                put(1); put(0); put(newPatchVersion)
            }
            if (header != null) {
                val ver = header.optJSONArray("version")
                val major = ver?.optInt(0, 1) ?: 1
                val minor = ver?.optInt(1, 0) ?: 0
                val patch = (ver?.optInt(2, 0) ?: 0) + newPatchVersion
                bumpedTuple = JSONArray().apply {
                    put(major); put(minor); put(patch)
                }
                header.put("version", bumpedTuple)
            }
            val modules = root.optJSONArray("modules")
            if (modules != null) {
                for (i in 0 until modules.length()) {
                    val m = modules.optJSONObject(i) ?: continue
                    m.put("version", JSONArray(bumpedTuple.toString()))
                }
            }
            if (!dependencyUuid.isNullOrBlank()) {
                val deps = root.optJSONArray("dependencies") ?: JSONArray()
                var alreadyHas = false
                for (i in 0 until deps.length()) {
                    if (deps.optJSONObject(i)?.optString("uuid") == dependencyUuid) {
                        deps.optJSONObject(i)?.put("version", JSONArray(bumpedTuple.toString()))
                        alreadyHas = true
                    }
                }
                if (!alreadyHas) {
                    deps.put(
                        JSONObject().apply {
                            put("uuid", dependencyUuid)
                            put("version", JSONArray(bumpedTuple.toString()))
                        }
                    )
                }
                root.put("dependencies", deps)
            }
            root.toString(2).toByteArray(Charsets.UTF_8)
        } catch (_: Exception) {
            rawJson.toByteArray(Charsets.UTF_8)
        }
    }

    private fun parseLangEntries(langFile: File): Pair<Map<String, String>, Map<String, String>> {
        val items = linkedMapOf<String, String>()
        val tiles = linkedMapOf<String, String>()
        if (!langFile.exists()) return items to tiles
        langFile.forEachLine(Charsets.UTF_8) { line ->
            val trimmed = line.trim()
            if (trimmed.isEmpty() || trimmed.startsWith("#")) return@forEachLine
            val eqIdx = trimmed.indexOf('=')
            if (eqIdx <= 0) return@forEachLine
            val key = trimmed.substring(0, eqIdx).trim()
            val value = trimmed.substring(eqIdx + 1).trim()
            if (key.startsWith("item.") && key.endsWith(".name")) {
                val id = key.removePrefix("item.").removeSuffix(".name")
                if (id.contains(':')) items[id] = value
            } else if (key.startsWith("tile.") && key.endsWith(".name")) {
                val id = key.removePrefix("tile.").removeSuffix(".name")
                if (id.contains(':')) tiles[id] = value
            }
        }
        return items to tiles
    }

    private fun readTextureKeys(jsonFile: File): Set<String> {
        if (!jsonFile.exists()) return emptySet()
        return try {
            val root = JSONObject(jsonFile.readText(Charsets.UTF_8))
            val texData = root.optJSONObject("texture_data") ?: return emptySet()
            val keys = linkedSetOf<String>()
            val iter = texData.keys()
            while (iter.hasNext()) {
                keys.add(iter.next())
            }
            keys
        } catch (_: Exception) {
            emptySet()
        }
    }

    private fun humanizeIdentifier(id: String): String {
        return id.substringAfter(':')
            .split('_')
            .filter { it.isNotBlank() }
            .joinToString(" ") { part ->
                part.replaceFirstChar { ch -> if (ch.isLowerCase()) ch.titlecase() else ch.toString() }
            }
            .ifBlank { id }
    }

    private fun resolveItemTextureKey(id: String, itemTexKeys: Set<String>): String {
        if (id in itemTexKeys) return id
        val ns = id.substringBefore(':')
        val short = id.substringAfter(':')
        val noPlaceable = "$ns:${short.removeSuffix("_placeable")}"
        if (noPlaceable in itemTexKeys) return noPlaceable
        val base = "${id}_base"
        if (base in itemTexKeys) return base
        if ("package" in short) {
            val pkgKey = itemTexKeys.firstOrNull { "package" in it }
            if (pkgKey != null) return pkgKey
        }
        val tokens = short.split('_').filter { it.length >= 4 }
        for (token in tokens.reversed()) {
            val match = itemTexKeys.firstOrNull { it.endsWith(token) || token in it }
            if (match != null) return match
        }
        return itemTexKeys.firstOrNull { "andesite_alloy" in it }
            ?: itemTexKeys.firstOrNull()
            ?: "apple"
    }

    private fun resolveBlockTextureKey(id: String, terrainTexKeys: Set<String>): String {
        if (id in terrainTexKeys) return id
        val ns = id.substringBefore(':')
        val short = id.substringAfter(':')
        for (suffix in listOf("_side", "_top", "_front", "_base", "_bottom", "_on")) {
            val candidate = "$ns:$short$suffix"
            if (candidate in terrainTexKeys) return candidate
        }

        val stems = mutableListOf(short)
        for (dropSuffix in listOf(
            "_block", "_stairs", "_slab", "_wall", "_window_pane",
            "_pane", "_door", "_trapdoor", "_bars", "_ladder",
            "_scaffolding", "_table_cloth"
        )) {
            if (short.endsWith(dropSuffix) && short.length > dropSuffix.length) {
                stems.add(short.removeSuffix(dropSuffix))
            }
        }
        val colors = listOf(
            "light_blue_", "light_gray_", "black_", "blue_", "brown_",
            "cyan_", "gray_", "green_", "lime_", "magenta_",
            "orange_", "pink_", "purple_", "red_", "white_", "yellow_"
        )
        for (color in colors) {
            if (short.startsWith(color)) {
                val rest = short.removePrefix(color)
                val colorName = color.trimEnd('_')
                stems.add("${rest}_$colorName")
                stems.add(rest)
            }
        }

        for (stem in stems) {
            val exact = "$ns:$stem"
            if (exact in terrainTexKeys) return exact
            for (suffix in listOf("_side", "_top", "_front", "_base")) {
                val candidate = "$ns:$stem$suffix"
                if (candidate in terrainTexKeys) return candidate
            }
        }

        val tokens = short.split('_').filter { it.length >= 4 }
        for (token in tokens) {
            val match = terrainTexKeys.firstOrNull { token in it }
            if (match != null) return match
        }

        return terrainTexKeys.firstOrNull { "andesite_casing" in it }
            ?: terrainTexKeys.firstOrNull()
            ?: "stone"
    }

    private fun patchCreateInventoryUiJson(
        relPath: String,
        rawJson: String,
        primaryIconTexture: String,
        secondaryIconTexture: String
    ): ByteArray {
        return try {
            val root = JSONObject(rawJson)
            if (relPath == "ui/inventory_screen.json") {
                root.put(
                    "create_base_tab_icon",
                    JSONObject().apply {
                        put("type", "image")
                        put("texture", primaryIconTexture)
                        put("size", JSONArray().apply { put(16); put(16) })
                    }
                )
                root.put(
                    "create_palettes_tab_icon",
                    JSONObject().apply {
                        put("type", "image")
                        put("texture", secondaryIconTexture)
                        put("size", JSONArray().apply { put(16); put(16) })
                    }
                )
                val creativeLabel = root.optJSONObject("creative_label")
                if (creativeLabel != null) {
                    val cleanControls = JSONArray().apply {
                        put(
                            JSONObject().apply {
                                put(
                                    "create_base_tab_label@crafting.create_tab_label",
                                    JSONObject().apply {
                                        put("text", "itemGroup.create.base")
                                        put(
                                            "bindings",
                                            JSONArray().apply {
                                                put(
                                                    JSONObject().apply {
                                                        put("binding_type", "global")
                                                        put("binding_name", "#create_is_left_tab_base")
                                                        put("binding_name_override", "#visible")
                                                    }
                                                )
                                            }
                                        )
                                    }
                                )
                            }
                        )
                        put(
                            JSONObject().apply {
                                put(
                                    "create_android_hint@crafting.create_tab_label",
                                    JSONObject().apply {
                                        put("text", "Create (827 items/bloques) - Sin hook C++ usa Lupa: create")
                                        put("offset", JSONArray().apply { put(0); put(16) })
                                        put("font_scale_factor", 0.78)
                                        put(
                                            "bindings",
                                            JSONArray().apply {
                                                put(
                                                    JSONObject().apply {
                                                        put("binding_type", "global")
                                                        put("binding_name", "#create_is_left_tab_base")
                                                        put("binding_name_override", "#visible")
                                                    }
                                                )
                                            }
                                        )
                                    }
                                )
                            }
                        )
                    }
                    creativeLabel.put("controls", cleanControls)
                }
            } else if (relPath == "ui/inventory_screen_pocket.json") {
                // Dejar una sola pestaña dedicada de Create (sin solaparse con el cofre inferior)
                val panel = root.optJSONObject("create_left_tab_navigation_panel")
                val panelControls = panel?.optJSONArray("controls")
                if (panel != null && panelControls != null && panelControls.length() > 1) {
                    val singleTabOnly = JSONArray().apply { put(panelControls.get(0)) }
                    panel.put("controls", singleTabOnly)
                    panel.put("size", JSONArray().apply { put("100% + 4px"); put(29) })
                }
            }
            root.toString(2).toByteArray(Charsets.UTF_8)
        } catch (_: Exception) {
            rawJson.toByteArray(Charsets.UTF_8)
        }
    }

    fun buildMcAddonFromPacks(packDirs: List<String>): McAddonBuildResult? {
        if (packDirs.isEmpty()) return null
        val exportsDir = File(baseDir, "exports").apply { mkdirs() }
        val outFile = File(exportsDir, "amethyst_active_packs.mcaddon")
        var entriesWritten = 0
        var totalSynthesizedItems = 0
        var totalSynthesizedBlocks = 0

        ZipOutputStream(outFile.outputStream().buffered()).use { zos ->
            val seenPaths = mutableSetOf<String>()
            packDirs.forEachIndexed { index, dirPath ->
                val modDir = File(dirPath)
                if (!modDir.exists()) return@forEachIndexed
                val modSlug = modDir.name.ifBlank { "mod_$index" }

                val rpRoot = File(modDir, "resource_packs").listFiles()?.firstOrNull { it.isDirectory }
                val bpRoot = File(modDir, "behavior_packs").listFiles()?.firstOrNull { it.isDirectory }

                val rpUuid = rpRoot?.let { root ->
                    val mf = File(root, "manifest.json")
                    if (mf.exists()) {
                        runCatching { JSONObject(mf.readText()).optJSONObject("header")?.optString("uuid") }.getOrNull()
                    } else null
                }

                val itemTexKeys = rpRoot?.let { readTextureKeys(File(it, "textures/item_texture.json")) } ?: emptySet()
                val terrainTexKeys = rpRoot?.let { readTextureKeys(File(it, "textures/terrain_texture.json")) } ?: emptySet()
                val (langItems, langTiles) = rpRoot?.let { parseLangEntries(File(it, "texts/en_US.lang")) }
                    ?: (emptyMap<String, String>() to emptyMap())

                val hasNativeJsonItems = bpRoot?.let {
                    File(it, "items").let { dir -> dir.isDirectory && (dir.listFiles()?.any { f -> f.extension == "json" } == true) }
                } ?: false
                val hasNativeJsonBlocks = bpRoot?.let {
                    File(it, "blocks").let { dir -> dir.isDirectory && (dir.listFiles()?.any { f -> f.extension == "json" } == true) }
                } ?: false

                val needsSynthesis = bpRoot != null && !hasNativeJsonItems && !hasNativeJsonBlocks &&
                    (langItems.isNotEmpty() || langTiles.isNotEmpty() || itemTexKeys.isNotEmpty())

                val primaryTabTex = if (rpRoot != null && File(rpRoot, "textures/items/create/wrench.png").exists()) {
                    "textures/items/create/wrench"
                } else {
                    "textures/items/create/andesite_alloy"
                }
                val secondaryTabTex = if (rpRoot != null && File(rpRoot, "textures/items/create/brass_ingot.png").exists()) {
                    "textures/items/create/brass_ingot"
                } else {
                    primaryTabTex
                }

                listOf("behavior_packs", "resource_packs").forEach { packCategory ->
                    val categoryDir = File(modDir, packCategory)
                    if (!categoryDir.isDirectory) return@forEach
                    val subPacks = categoryDir.listFiles()?.filter { it.isDirectory } ?: emptyList()
                    subPacks.forEach { packRoot ->
                        val prefix = "${modSlug}_${packCategory.take(2)}_${packRoot.name}"
                        packRoot.walkTopDown().filter { it.isFile && it.name != ".gitkeep" }.forEach { file ->
                            val rel = file.relativeTo(packRoot).invariantSeparatorsPath

                            val zipPath = "$prefix/$rel"
                            if (seenPaths.add(zipPath)) {
                                zos.putNextEntry(ZipEntry(zipPath))
                                when {
                                    rel == "manifest.json" && needsSynthesis -> {
                                        val bytes = bumpManifestJson(
                                            rawJson = file.readText(Charsets.UTF_8),
                                            newPatchVersion = 4,
                                            dependencyUuid = if (packCategory == "behavior_packs") rpUuid else null
                                        )
                                        zos.write(bytes)
                                    }
                                    needsSynthesis && packCategory == "resource_packs" &&
                                        (rel == "ui/inventory_screen.json" || rel == "ui/inventory_screen_pocket.json") -> {
                                        val patchedUi = patchCreateInventoryUiJson(
                                            relPath = rel,
                                            rawJson = file.readText(Charsets.UTF_8),
                                            primaryIconTexture = primaryTabTex,
                                            secondaryIconTexture = secondaryTabTex
                                        )
                                        zos.write(patchedUi)
                                    }
                                    packCategory == "behavior_packs" && rel.startsWith("entities/") && rel.endsWith(".json") && needsSynthesis -> {
                                        val patched = file.readText(Charsets.UTF_8)
                                            .replace("\"format_version\": \"1.26.0\"", "\"format_version\": \"1.20.80\"")
                                        zos.write(patched.toByteArray(Charsets.UTF_8))
                                    }
                                    else -> {
                                        file.inputStream().use { it.copyTo(zos) }
                                    }
                                }
                                zos.closeEntry()
                                entriesWritten++
                            }
                        }

                        // Sintetizar items/*.json y blocks/*.json válidos para Bedrock 1.21 Android
                        if (needsSynthesis && packCategory == "behavior_packs") {
                            val generatedItemIds = mutableSetOf<String>()
                            val allItemIds = (langItems.keys + itemTexKeys).distinct()

                            allItemIds.forEach { itemId ->
                                if (!itemId.contains(':')) return@forEach
                                generatedItemIds.add(itemId)
                                val shortName = itemId.substringAfter(':').replace(Regex("[^a-zA-Z0-9._-]"), "_")
                                val zipPath = "$prefix/items/$shortName.json"
                                if (!seenPaths.add(zipPath)) return@forEach

                                val displayName = langItems[itemId] ?: humanizeIdentifier(itemId)
                                val texKey = resolveItemTextureKey(itemId, itemTexKeys)
                                val lowerId = itemId.lowercase()
                                val isEquipment = listOf(
                                    "wrench", "goggles", "grip", "shaper", "cannon",
                                    "backtank", "boots", "chestplate", "helmet", "leggings",
                                    "wand", "sandpaper", "sand_paper"
                                ).any { it in lowerId }
                                val isFood = listOf("chocolate", "tea", "roll", "cake", "apple", "berries")
                                    .any { it in lowerId }
                                val category = when {
                                    isEquipment -> "equipment"
                                    isFood -> "nature"
                                    else -> "items"
                                }

                                val itemJson = JSONObject().apply {
                                    put("format_version", "1.20.80")
                                    put(
                                        "minecraft:item",
                                        JSONObject().apply {
                                            put(
                                                "description",
                                                JSONObject().apply {
                                                    put("identifier", itemId)
                                                    put(
                                                        "menu_category",
                                                        JSONObject().apply {
                                                            put("category", category)
                                                        }
                                                    )
                                                }
                                            )
                                            put(
                                                "components",
                                                JSONObject().apply {
                                                    put(
                                                        "minecraft:icon",
                                                        JSONObject().apply {
                                                            put(
                                                                "textures",
                                                                JSONObject().apply {
                                                                    put("default", texKey)
                                                                }
                                                            )
                                                        }
                                                    )
                                                    put(
                                                        "minecraft:display_name",
                                                        JSONObject().apply {
                                                            put("value", displayName)
                                                        }
                                                    )
                                                    put("minecraft:max_stack_size", if (isEquipment) 1 else 64)
                                                }
                                            )
                                        }
                                    )
                                }

                                zos.putNextEntry(ZipEntry(zipPath))
                                zos.write(itemJson.toString(2).toByteArray(Charsets.UTF_8))
                                zos.closeEntry()
                                entriesWritten++
                                totalSynthesizedItems++
                            }

                            langTiles.forEach { (blockId, label) ->
                                if (!blockId.contains(':') || generatedItemIds.contains(blockId)) return@forEach
                                val shortName = blockId.substringAfter(':').replace(Regex("[^a-zA-Z0-9._-]"), "_")
                                val zipPath = "$prefix/blocks/$shortName.json"
                                if (!seenPaths.add(zipPath)) return@forEach

                                val texKey = resolveBlockTextureKey(blockId, terrainTexKeys)
                                val lowerId = blockId.lowercase()
                                val isCutout = listOf(
                                    "window", "glass", "bars", "ladder", "scaffolding",
                                    "door", "trapdoor", "rail", "track", "girder", "funnel"
                                ).any { it in lowerId }
                                val isNatureStone = listOf(
                                    "ore", "limestone", "asurine", "crimsite", "ochrum",
                                    "veridium", "scoria", "scorchia"
                                ).any { it in lowerId } && listOf("casing", "brick", "pillar", "stairs", "slab", "wall").none { it in lowerId }

                                val blockJson = JSONObject().apply {
                                    put("format_version", "1.20.80")
                                    put(
                                        "minecraft:block",
                                        JSONObject().apply {
                                            put(
                                                "description",
                                                JSONObject().apply {
                                                    put("identifier", blockId)
                                                    put(
                                                        "menu_category",
                                                        JSONObject().apply {
                                                            put("category", if (isNatureStone) "nature" else "construction")
                                                        }
                                                    )
                                                }
                                            )
                                            put(
                                                "components",
                                                JSONObject().apply {
                                                    put(
                                                        "minecraft:material_instances",
                                                        JSONObject().apply {
                                                            put(
                                                                "*",
                                                                JSONObject().apply {
                                                                    put("texture", texKey)
                                                                    put("render_method", if (isCutout) "alpha_test" else "opaque")
                                                                }
                                                            )
                                                        }
                                                    )
                                                    put("minecraft:display_name", label)
                                                    put(
                                                        "minecraft:destructible_by_mining",
                                                        JSONObject().apply {
                                                            put("seconds_to_destroy", 1.5)
                                                        }
                                                    )
                                                }
                                            )
                                        }
                                    )
                                }

                                zos.putNextEntry(ZipEntry(zipPath))
                                zos.write(blockJson.toString(2).toByteArray(Charsets.UTF_8))
                                zos.closeEntry()
                                entriesWritten++
                                totalSynthesizedBlocks++
                            }
                        }
                    }
                }
            }
        }

        return if (entriesWritten > 0) {
            McAddonBuildResult(
                file = outFile,
                synthesizedItems = totalSynthesizedItems,
                synthesizedBlocks = totalSynthesizedBlocks
            )
        } else {
            outFile.delete()
            null
        }
    }

    private fun resolveFileName(resolver: ContentResolver, uri: Uri): String {
        resolver.query(uri, null, null, null, null)?.use { cursor ->
            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && cursor.moveToFirst()) {
                val name = cursor.getString(idx)
                if (!name.isNullOrBlank()) return name
            }
        }
        return uri.lastPathSegment?.substringAfterLast('/') ?: "imported_mod.amethyst"
    }

    fun importRuntimeSo(resolver: ContentResolver, uri: Uri): Result<File> {
        return try {
            val fileName = resolveFileName(resolver, uri)
            val runtimesDir = File(baseDir, "runtimes").apply { mkdirs() }
            val dest = File(runtimesDir, if (fileName.endsWith(".so")) fileName else "libamethyst_runtime.so")
            resolver.openInputStream(uri)?.use { input ->
                dest.outputStream().use { output -> input.copyTo(output) }
            } ?: return Result.failure(IllegalStateException("No se pudo abrir el archivo de runtime."))
            dest.setReadable(true, false)
            dest.setExecutable(true, false)
            Result.success(dest)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun extractAndValidateMod(resolver: ContentResolver, uri: Uri, abi: String): Result<ModEntry> {
        return try {
            val displayName = resolveFileName(resolver, uri)
            val rawBytes = resolver.openInputStream(uri)?.use { it.readBytes() }
                ?: return Result.failure(IllegalStateException("No se pudo leer el archivo $displayName."))
            extractAndValidateModBytes(displayName, rawBytes, abi, isBonus = false)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun parseModMetadata(rawMeta: JSONObject?): Map<String, String> {
        if (rawMeta == null) return emptyMap()
        val metaObj = rawMeta.optJSONObject("meta") ?: rawMeta
        val map = mutableMapOf<String, String>()
        metaObj.optString("name").takeIf { it.isNotBlank() }?.let { map["name"] = it }
        metaObj.optString("version").takeIf { it.isNotBlank() }?.let { map["version"] = it }
        metaObj.optString("author").takeIf { it.isNotBlank() }?.let { map["author"] = it }
        metaObj.optString("namespace").takeIf { it.isNotBlank() }?.let { map["id"] = it }
        metaObj.optString("id").takeIf { it.isNotBlank() }?.let { map["id"] = it }
        metaObj.optString("targetMcVersion").takeIf { it.isNotBlank() }?.let { map["targetMcVersion"] = it }

        val header = rawMeta.optJSONObject("header")
        if (header != null) {
            if (!map.containsKey("name")) {
                header.optString("name").takeIf { it.isNotBlank() }?.let { map["name"] = it }
            }
            if (!map.containsKey("version")) {
                val verArr = header.optJSONArray("version")
                if (verArr != null && verArr.length() >= 3) {
                    map["version"] = "${verArr.optInt(0)}.${verArr.optInt(1)}.${verArr.optInt(2)}"
                }
            }
        }

        val platforms = metaObj.optJSONObject("platforms")
        val androidBuild = platforms?.optJSONObject("android-client")?.optJSONArray("game_builds")?.optJSONObject(0)
        val winBuild = platforms?.optJSONObject("win-client")?.optJSONArray("game_builds")?.optJSONObject(0)
        val mcVer = androidBuild?.optString("version")?.takeIf { it.isNotBlank() }
            ?: winBuild?.optString("version")?.takeIf { it.isNotBlank() }
        if (!mcVer.isNullOrBlank()) {
            map["targetMcVersion"] = mcVer
        }
        return map
    }

    fun extractAndValidateModBytes(
        displayName: String,
        rawBytes: ByteArray,
        abi: String,
        isBonus: Boolean = false
    ): Result<ModEntry> {
        return try {
            val lower = displayName.lowercase()
            if (
                !lower.endsWith(".amethyst") &&
                !lower.endsWith(".so") &&
                !lower.endsWith(".zip") &&
                !lower.endsWith(".json")
            ) {
                return Result.failure(
                    IllegalArgumentException("Formato no soportado ($displayName). Usa .amethyst, .so, .zip o mod.json.")
                )
            }

            if (rawBytes.isEmpty()) {
                return Result.failure(IllegalArgumentException("El archivo $displayName está vacío."))
            }

            val modsRoot = File(baseDir, "mods").apply { mkdirs() }
            val isZip = rawBytes.size >= 2 && rawBytes[0] == 0x50.toByte() && rawBytes[1] == 0x4B.toByte()
            val isElf = rawBytes.size >= 4 &&
                rawBytes[0] == 0x7F.toByte() &&
                rawBytes[1] == 'E'.code.toByte() &&
                rawBytes[2] == 'L'.code.toByte() &&
                rawBytes[3] == 'F'.code.toByte()

            val baseId = displayName
                .substringBeforeLast(".")
                .removePrefix("lib")
                .lowercase()
                .replace(Regex("[^a-z0-9]+"), "-")
                .trim('-')
                .ifBlank { "mod-${System.currentTimeMillis()}" }

            val modDir = File(modsRoot, baseId).apply { mkdirs() }

            if (isZip) {
                var modJsonObj: JSONObject? = null
                var fallbackManifestObj: JSONObject? = null
                var preferredSo: File? = null
                var fallbackSo: File? = null
                var dllFile: File? = null
                var hasPacks = false

                ZipInputStream(rawBytes.inputStream()).use { zis ->
                    var entry = zis.nextEntry
                    while (entry != null) {
                        val normalizedName = entry.name.replace('\\', '/')
                        if (!entry.isDirectory && !normalizedName.contains("..")) {
                            val safeRel = normalizedName.trimStart('/')
                            val fileName = safeRel.substringAfterLast('/')
                            val outFile = File(modDir, safeRel)
                            outFile.parentFile?.mkdirs()
                            outFile.outputStream().use { zis.copyTo(it) }

                            if (safeRel.startsWith("behavior_packs/") || safeRel.startsWith("resource_packs/")) {
                                hasPacks = true
                            }
                            if (fileName.equals("mod.json", ignoreCase = true)) {
                                val parsed = runCatching { JSONObject(outFile.readText()) }.getOrNull()
                                if (parsed != null && (modJsonObj == null || !safeRel.contains('/'))) {
                                    modJsonObj = parsed
                                }
                            } else if (fileName.equals("manifest.json", ignoreCase = true) && fallbackManifestObj == null) {
                                fallbackManifestObj = runCatching { JSONObject(outFile.readText()) }.getOrNull()
                            } else if (fileName.endsWith(".so", ignoreCase = true)) {
                                outFile.setReadable(true, false)
                                outFile.setExecutable(true, false)
                                if (normalizedName.contains(abi, ignoreCase = true)) {
                                    preferredSo = outFile
                                } else if (fallbackSo == null) {
                                    fallbackSo = outFile
                                }
                            } else if (fileName.endsWith(".dll", ignoreCase = true)) {
                                dllFile = outFile
                            }
                        }
                        zis.closeEntry()
                        entry = zis.nextEntry
                    }
                }

                val targetSo = preferredSo ?: fallbackSo
                if (targetSo == null && !hasPacks && dllFile == null) {
                    return Result.failure(
                        IllegalStateException("El paquete $displayName no contiene librerías (.so) ni packs válidos de Amethyst.")
                    )
                }

                val parsed = parseModMetadata(modJsonObj ?: fallbackManifestObj)
                val modName = parsed["name"] ?: displayName.substringBeforeLast(".").replace('_', ' ')
                val modVersion = parsed["version"] ?: "1.0.0"
                val modAuthor = parsed["author"] ?: "AmethystMod"
                val modTargetMc = parsed["targetMcVersion"] ?: "1.21.0.3"
                val modId = (parsed["id"] ?: baseId).lowercase().replace(Regex("[^a-z0-9-]+"), "-")

                val hasAndroidBinary = targetSo != null
                val libDisplay = targetSo?.name
                    ?: dllFile?.let { "${it.name} (Packs listos)" }
                    ?: "$baseId-packs"

                return Result.success(
                    ModEntry(
                        id = modId,
                        name = modName,
                        version = modVersion,
                        author = modAuthor,
                        abi = abi,
                        libraryFile = libDisplay,
                        targetMcVersion = modTargetMc,
                        localPath = targetSo?.absolutePath ?: "",
                        sourceFormat = if (lower.endsWith(".amethyst")) ".amethyst" else ".zip",
                        isBonus = isBonus,
                        hasAndroidBinary = hasAndroidBinary,
                        packDir = modDir.absolutePath
                    )
                )
            }

            if (isElf || lower.endsWith(".so")) {
                val soFileName = if (displayName.endsWith(".so")) displayName else "lib${baseId.replace('-', '_')}.so"
                val outSo = File(modDir, soFileName)
                outSo.writeBytes(rawBytes)
                outSo.setReadable(true, false)
                outSo.setExecutable(true, false)

                return Result.success(
                    ModEntry(
                        id = baseId,
                        name = displayName.substringBeforeLast(".").removePrefix("lib").replace('_', ' '),
                        version = "1.0.0",
                        author = "LocalELF",
                        abi = abi,
                        libraryFile = outSo.name,
                        targetMcVersion = "1.21.0.3",
                        localPath = outSo.absolutePath,
                        sourceFormat = if (lower.endsWith(".amethyst")) ".amethyst" else ".so",
                        isBonus = isBonus,
                        hasAndroidBinary = true,
                        packDir = modDir.absolutePath
                    )
                )
            }

            val rawJson = JSONObject(rawBytes.toString(Charsets.UTF_8))
            val parsed = parseModMetadata(rawJson)
            val modId = (parsed["id"] ?: baseId).lowercase().replace(Regex("[^a-z0-9-]+"), "-")
            val libName = rawJson.optString("libraryFile", "lib${modId.replace('-', '_')}.so")
            val placeholderSo = File(modDir, libName)
            return Result.success(
                ModEntry(
                    id = modId,
                    name = parsed["name"] ?: baseId,
                    version = parsed["version"] ?: "1.0.0",
                    author = parsed["author"] ?: "AmethystMod",
                    abi = rawJson.optString("abi", abi),
                    libraryFile = libName,
                    targetMcVersion = parsed["targetMcVersion"] ?: "1.21.0.3",
                    localPath = if (placeholderSo.exists()) placeholderSo.absolutePath else "",
                    sourceFormat = if (lower.endsWith(".amethyst")) ".amethyst" else ".json",
                    isBonus = isBonus,
                    hasAndroidBinary = placeholderSo.exists(),
                    packDir = modDir.absolutePath
                )
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
