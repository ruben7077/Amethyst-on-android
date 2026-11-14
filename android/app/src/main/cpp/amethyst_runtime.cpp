#include <android/log.h>
#include <cstdint>
#include <string>
#include <vector>

#define RT_TAG "AmethystRuntime"
#define RTLOGI(...) __android_log_print(ANDROID_LOG_INFO, RT_TAG, __VA_ARGS__)

namespace {
void* gMinecraftHandle = nullptr;
std::string gMcVersion = "1.21.0.3";
std::vector<std::string> gLoadedMods;
} // namespace

extern "C" {

__attribute__((visibility("default")))
const char* Amethyst_GetRuntimeVersion() {
    return "2.2.10-android-bridge";
}

__attribute__((visibility("default")))
int32_t Amethyst_GetApiVersion() {
    return 10300;
}

__attribute__((visibility("default")))
void Amethyst_InitRuntime(const char* mcVersion, void* mcHandle) {
    gMcVersion = mcVersion ? mcVersion : "1.21.0.3";
    gMinecraftHandle = mcHandle;
    RTLOGI("AmethystRuntime inicializado para MCBE %s (handle=%p)", gMcVersion.c_str(), mcHandle);
}

__attribute__((visibility("default")))
void Amethyst_RegisterMod(const char* modPath) {
    if (modPath && *modPath) {
        gLoadedMods.emplace_back(modPath);
        RTLOGI("Mod registrado en runtime Android: %s", modPath);
    }
}

__attribute__((visibility("default")))
void* Amethyst_GetMinecraftHandle() {
    return gMinecraftHandle;
}

} // extern "C"
