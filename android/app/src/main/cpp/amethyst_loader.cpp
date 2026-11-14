#include <jni.h>
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
