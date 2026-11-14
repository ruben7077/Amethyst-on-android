cmake_minimum_required(VERSION 3.22.1)
project("amethyst_loader" LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_library(log-lib log)
find_library(android-lib android)

add_library(amethyst_runtime SHARED
    amethyst_runtime.cpp
)

target_link_libraries(amethyst_runtime
    ${log-lib}
    ${android-lib}
    dl
)

add_library(amethyst_loader SHARED
    amethyst_loader.cpp
)

target_link_libraries(amethyst_loader
    ${log-lib}
    ${android-lib}
    amethyst_runtime
    dl
)

function(add_amethyst_mod target_name mod_display_name mod_ver)
    add_library(${target_name} SHARED
        amethyst_mods.cpp
    )
    target_compile_definitions(${target_name} PRIVATE
        AMETHYST_MOD_NAME="${mod_display_name}"
        AMETHYST_MOD_VERSION="${mod_ver}"
    )
    target_link_libraries(${target_name}
        ${log-lib}
        amethyst_runtime
    )
endfunction()

add_amethyst_mod(amethyst_dev_overlay "Amethyst Dev Overlay" "1.4.0")
add_amethyst_mod(dynamic_fov "Dynamic FOV & Camera" "2.1.0")
add_amethyst_mod(chunk_borders "Chunk Border Renderer" "1.1.2")
add_amethyst_mod(create_bridge "Create Android Bridge" "0.1.1")
