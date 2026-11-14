#include <jni.h>
#include <dlfcn.h>
#include <dirent.h>
#include <android/log.h>
#include <algorithm>
#include <set>
#include <sstream>
#include <string>
#include <vector>

#define LOG_TAG "AmethystLoader"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace amethyst::android {

using AmethystModInitFn = void (*)(const char* mcVersion, void* libMinecraftHandle);
using AmethystRuntimeInitFn = void (*)(const char* mcVersion, void* mcHandle);
using AmethystRegisterModFn = void (*)(const char* modPath);
using AmethystRuntimeVerFn = const char* (*)();

std::string TryLoadElf(const std::string& path, void** outHandle, int flags = RTLD_NOW | RTLD_GLOBAL) {
    if (path.empty()) {
        return "ruta vacía";
    }
    void* handle = dlopen(path.c_str(), flags);
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

bool EndsWithSo(const std::string& name) {
    return name.size() > 3 && name.compare(name.size() - 3, 3, ".so") == 0;
}

void PreloadSiblingLibraries(const std::string& mcNativeDir, std::ostringstream& report) {
    DIR* dir = opendir(mcNativeDir.c_str());
    if (!dir) {
        return;
    }

    std::vector<std::string> allLibs;
    struct dirent* ent = nullptr;
    while ((ent = readdir(dir)) != nullptr) {
        std::string name = ent->d_name;
        if (EndsWithSo(name) && name != "libminecraftpe.so") {
            allLibs.push_back(name);
        }
    }
    closedir(dir);

    // Orden prioritario para resolver dependencias de namespace clns-* antes de libminecraftpe.so
    const std::vector<std::string> priority = {
        "libc++_shared.so",
        "libfmod.so",
        "libmaesdk.so",
        "libMediaDecoders_Android.so",
        "libpairipcore.so"
    };

    std::vector<std::string> ordered;
    for (const auto& p : priority) {
        if (std::find(allLibs.begin(), allLibs.end(), p) != allLibs.end()) {
            ordered.push_back(p);
        }
    }
    std::sort(allLibs.begin(), allLibs.end());
    for (const auto& lib : allLibs) {
        if (std::find(ordered.begin(), ordered.end(), lib) == ordered.end()) {
            ordered.push_back(lib);
        }
    }

    std::set<std::string> loaded;
    for (int pass = 0; pass < 2; ++pass) {
        bool progress = false;
        for (const auto& lib : ordered) {
            if (loaded.count(lib)) continue;
            void* handle = nullptr;
            std::string fullPath = mcNativeDir + "/" + lib;
            std::string err = TryLoadElf(fullPath, &handle, RTLD_LAZY | RTLD_GLOBAL);
            if (handle) {
                loaded.insert(lib);
                progress = true;
            } else if (pass == 1 && lib == "libpairipcore.so") {
                report << "[MC_DEP_WARN] " << lib << ": " << err << "\n";
            }
        }
        if (!progress) break;
    }

    if (!loaded.empty()) {
        report << "[MC_DEPS] " << loaded.size() << " librerías base pre-enlazadas desde " << mcNativeDir << "\n";
    }
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
    jstring jMcVersion,
    jboolean jHasPackMods
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

    // 1. Pre-cargar dependencias nativas (incluida libpairipcore.so) y luego libminecraftpe.so
    void* mcHandle = dlopen("libminecraftpe.so", RTLD_NOLOAD);
    if (!mcHandle && !mcNativeDir.empty()) {
        amethyst::android::PreloadSiblingLibraries(mcNativeDir, report);

        std::string mcErr = amethyst::android::TryLoadElf(
            mcNativeDir + "/libminecraftpe.so",
            &mcHandle,
            RTLD_LAZY | RTLD_GLOBAL
        );
        if (mcHandle) {
            report << "[MC_OK] libminecraftpe.so enlazada desde " << mcNativeDir << "\n";
        } else {
            report << "[MC_WARN] No se pudo enlazar libminecraftpe.so directamente: " << mcErr << "\n";
        }
    } else if (mcHandle) {
        report << "[MC_OK] libminecraftpe.so ya presente en memoria\n";
    } else {
        report << "[MC_WARN] Directorio nativo de Minecraft no disponible en este dispositivo\n";
    }

    // 2. Cargar AmethystRuntime (.so externo si se importó, o libamethyst_runtime.so integrado en el APK)
    void* runtimeHandle = nullptr;
    if (runtimeSoPath.empty()) {
        std::string bundledErr = amethyst::android::TryLoadElf("libamethyst_runtime.so", &runtimeHandle);
        if (runtimeHandle) {
            auto verFn = reinterpret_cast<amethyst::android::AmethystRuntimeVerFn>(
                dlsym(runtimeHandle, "Amethyst_GetRuntimeVersion")
            );
            const char* ver = verFn ? verFn() : "integrated";
            report << "[RUNTIME_OK] libamethyst_runtime.so integrado (" << ver << ")\n";
        } else {
            report << "[RUNTIME_ERROR] No se pudo cargar libamethyst_runtime.so integrado: " << bundledErr << "\n";
        }
    } else {
        std::string rtErr = amethyst::android::TryLoadElf(runtimeSoPath, &runtimeHandle);
        if (runtimeHandle) {
            report << "[RUNTIME_OK] Runtime externo: " << runtimeSoPath << "\n";
        } else {
            report << "[RUNTIME_ERROR] " << runtimeSoPath << " -> " << rtErr << "\n";
        }
    }

    if (runtimeHandle) {
        auto initRt = reinterpret_cast<amethyst::android::AmethystRuntimeInitFn>(
            dlsym(runtimeHandle, "Amethyst_InitRuntime")
        );
        if (initRt) {
            initRt(mcVersion.c_str(), mcHandle);
        }
    }

    // 3. Cargar cada mod .so nativo para Android
    jsize modCount = jModSoPaths ? env->GetArrayLength(jModSoPaths) : 0;
    if (modCount == 0) {
        if (!jHasPackMods) {
            report << "[MODS_EMPTY] No hay mods .amethyst / .so activados en este perfil.\n";
        } else {
            report << "[MOD_SO_NONE] 0 librerías ELF (.so) de Android en los mods activos.\n";
        }
    } else {
        auto registerFn = runtimeHandle
            ? reinterpret_cast<amethyst::android::AmethystRegisterModFn>(
                dlsym(runtimeHandle, "Amethyst_RegisterMod")
              )
            : nullptr;

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

            if (registerFn) {
                registerFn(modPath.c_str());
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
