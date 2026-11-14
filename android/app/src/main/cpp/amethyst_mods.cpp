#include <android/log.h>

#define MOD_LOG_TAG "AmethystMods"
#define MOD_LOGI(...) __android_log_print(ANDROID_LOG_INFO, MOD_LOG_TAG, __VA_ARGS__)

extern "C" void Amethyst_RegisterMod(const char* modPath);

#ifndef AMETHYST_MOD_NAME
#define AMETHYST_MOD_NAME "amethyst_mod"
#endif

#ifndef AMETHYST_MOD_VERSION
#define AMETHYST_MOD_VERSION "1.0.0"
#endif

extern "C" {

__attribute__((visibility("default")))
const char* Amethyst_GetModName() {
    return AMETHYST_MOD_NAME;
}

__attribute__((visibility("default")))
const char* Amethyst_GetModVersion() {
    return AMETHYST_MOD_VERSION;
}

__attribute__((visibility("default")))
void Initialize(const char* mcVersion, void* libMinecraftHandle) {
    MOD_LOGI(
        "Mod nativo [%s v%s] inicializado para MCBE %s (mcHandle=%p)",
        AMETHYST_MOD_NAME,
        AMETHYST_MOD_VERSION,
        mcVersion ? mcVersion : "unknown",
        libMinecraftHandle
    );
    Amethyst_RegisterMod(AMETHYST_MOD_NAME);
}

} // extern "C"
