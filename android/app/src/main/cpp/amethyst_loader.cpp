#include <jni.h>
#include <dlfcn.h>
#include <android/log.h>
#include <sstream>
#include <string>
#include <vector>

#define LOG_TAG "AmethystLoader"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace amethyst::android {

using AmethystModInitFn = void (*)(const char* mcVersion, void* libMinecraftHandle);

std::string TryLoadElf(const std::string& path, void** outHandle) {
    if (path.empty()) {
        return "ruta vacía";
    }
    void* handle = dlopen(path.c_str(), RTLD_NOW | RTLD_GLOBAL);
    if (!handle) {
        const char* err = dlerror();
        std::string msg = err ? err : "error desconocido en dlopen";
        LOGE("Error cargando %s: %s", path.c_str(), msg.c_str());
        return msg;
    }
    *outHandle = handle;
    LOGI("Libreria ELF cargada: %s", path.c_str());
    return "";
}

} // namespace amethyst::android

extern "C" JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* /*vm*/, void* /*reserved*/) {
    LOGI("AmethystLoader (com.rubenamethyst.app) inicializado en Android");
    return JNI_VERSION_1_6;
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_rubenamethyst_app_AmethystNativeBridge_nativeBootstrapMods(
    JNIEnv* env,
    jobject /*thiz*/,
    jstring jMcNativeDir,
    jstring jRuntimeSoPath,
    jobjectArray jModSoPaths,
    jstring jMcVersion
) {
    const char* mcDirChars = env->GetStringUTFChars(jMcNativeDir, nullptr);
    const char* runtimeChars = env->GetStringUTFChars(jRuntimeSoPath, nullptr);
    const char* mcVerChars = env->GetStringUTFChars(jMcVersion, nullptr);

    std::string mcNativeDir = mcDirChars ? mcDirChars : "";
    std::string runtimeSoPath = runtimeChars ? runtimeChars : "";
    std::string mcVersion = mcVerChars ? mcVerChars : "1.21.0.3";

    if (mcDirChars) env->ReleaseStringUTFChars(jMcNativeDir, mcDirChars);
    if (runtimeChars) env->ReleaseStringUTFChars(jRuntimeSoPath, runtimeChars);
    if (mcVerChars) env->ReleaseStringUTFChars(jMcVersion, mcVerChars);

    std::ostringstream report;

    // 1. Intentar pre-enlazar libminecraftpe.so desde el directorio nativo detectado
    void* mcHandle = dlopen("libminecraftpe.so", RTLD_NOLOAD);
    if (!mcHandle && !mcNativeDir.empty()) {
        void* cppHandle = nullptr;
        amethyst::android::TryLoadElf(mcNativeDir + "/libc++_shared.so", &cppHandle);
        void* fmodHandle = nullptr;
        amethyst::android::TryLoadElf(mcNativeDir + "/libfmod.so", &fmodHandle);

        std::string mcErr = amethyst::android::TryLoadElf(mcNativeDir + "/libminecraftpe.so", &mcHandle);
        if (mcHandle) {
            report << "[MC_OK] libminecraftpe.so cargada desde " << mcNativeDir << "\n";
        } else {
            report << "[MC_WARN] No se pudo enlazar libminecraftpe.so directamente: " << mcErr << "\n";
        }
    } else if (mcHandle) {
        report << "[MC_OK] libminecraftpe.so ya presente en memoria\n";
    } else {
        report << "[MC_WARN] Directorio nativo de Minecraft no disponible en este dispositivo\n";
    }

    // 2. Cargar AmethystRuntime (.so)
    if (runtimeSoPath.empty()) {
        report << "[RUNTIME_MISSING] No has importado libamethyst_runtime.so para Android.\n";
    } else {
        void* runtimeHandle = nullptr;
        std::string rtErr = amethyst::android::TryLoadElf(runtimeSoPath, &runtimeHandle);
        if (runtimeHandle) {
            report << "[RUNTIME_OK] " << runtimeSoPath << "\n";
        } else {
            report << "[RUNTIME_ERROR] " << runtimeSoPath << " -> " << rtErr << "\n";
        }
    }

    // 3. Cargar cada mod .so extraído de .amethyst / .so
    jsize modCount = jModSoPaths ? env->GetArrayLength(jModSoPaths) : 0;
    if (modCount == 0) {
        report << "[MODS_EMPTY] No hay mods .amethyst / .so activados en este perfil.\n";
    } else {
        for (jsize i = 0; i < modCount; ++i) {
            auto jPath = static_cast<jstring>(env->GetObjectArrayElement(jModSoPaths, i));
            const char* pathChars = env->GetStringUTFChars(jPath, nullptr);
            std::string modPath = pathChars ? pathChars : "";
            if (pathChars) env->ReleaseStringUTFChars(jPath, pathChars);
            env->DeleteLocalRef(jPath);

            void* modHandle = nullptr;
            std::string modErr = amethyst::android::TryLoadElf(modPath, &modHandle);
            if (!modHandle) {
                report << "[MOD_ERROR] " << modPath << " -> " << modErr << "\n";
                continue;
            }

            auto initFn = reinterpret_cast<amethyst::android::AmethystModInitFn>(
                dlsym(modHandle, "Initialize")
            );
            if (initFn && mcHandle) {
                initFn(mcVersion.c_str(), mcHandle);
                report << "[MOD_OK] Initialize() ejecutado en " << modPath << "\n";
            } else if (initFn) {
                report << "[MOD_LOADED] " << modPath << " cargado (Initialize pendiente de libminecraftpe.so)\n";
            } else {
                report << "[MOD_LOADED] " << modPath << " cargado sin simbolo Initialize()\n";
            }
        }
    }

    return env->NewStringUTF(report.str().c_str());
}
