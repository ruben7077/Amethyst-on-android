package com.rubenamethyst.app

object AmethystNativeBridge {
    init {
        System.loadLibrary("amethyst_loader")
    }

    fun ensureLoaded() {
        // Dispara el bloque init para cargar libamethyst_loader.so
    }

    external fun nativeBootstrapMods(
        mcNativeDir: String,
        runtimeSoPath: String,
        modSoPaths: Array<String>,
        mcVersion: String
    ): String
}
