cmake_minimum_required(VERSION 3.22.1)
project("amethyst_loader" LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(amethyst_loader SHARED
    amethyst_loader.cpp
)

find_library(log-lib log)
find_library(android-lib android)

target_link_libraries(amethyst_loader
    ${log-lib}
    ${android-lib}
    dl
)
