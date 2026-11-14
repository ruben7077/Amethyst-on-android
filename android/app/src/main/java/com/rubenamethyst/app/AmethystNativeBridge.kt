package com.rubenamethyst.app

object AmethystNativeBridge {
    init {
        System.loadLibrary("amethyst_runtime")
        System.loadLibrary("amethyst_loader")
    }

    fun ensureLoaded() {
        // Dispara el bloque init para cargar libamethyst_runtime.so y libamethyst_loader.so
    }

    external fun nativeBootstrapMods(
        mcNativeDir: String,
        runtimeSoPath: String,
        modSoPaths: Array<String>,
        mcVersion: String,
        hasPackMods: Boolean
    ): String
}
