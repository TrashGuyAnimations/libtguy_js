cmake_minimum_required(VERSION 3.23)

include(cmake/GetVersionFromFile.cmake)
get_version_from_file(
    OUTPUT TGUY_WASM_VERSION
    FILE "${CMAKE_CURRENT_SOURCE_DIR}/libtguy.js"
    DECLARATOR_PREFIX "const"
    DECLARATOR_SUFFIX "="
    PREFIX TGUY_WASM_VER_
    VERSIONS MAJOR MINOR PATCH
)

project(TGuy_wasm LANGUAGES C VERSION "${TGUY_WASM_VERSION}")

option(TGUY_WASM_ONLY_BINDINGS "Only include methods which are used by the bindings" OFF)

if (NOT EMSCRIPTEN)
    message(FATAL_ERROR "Emscripten toolchain is required to build the library")
endif ()

set(dummy ${CMAKE_CURRENT_BINARY_DIR}/emsdkdummy.c)
file(WRITE "${dummy}" "")
add_executable(${PROJECT_NAME} "${dummy}")

include(FetchContent)
find_package(TGuy 0.18.1 CONFIG QUIET)
if (NOT TGuy_FOUND)
    include(FetchContent)
    FetchContent_Declare(
        TGuy
        GIT_REPOSITORY https://github.com/Wirtos/libtguy
        GIT_TAG 0.18.1
    )
    set(BUILD_SHARED_LIBS OFF)
    FetchContent_MakeAvailable(TGuy)
    unset(BUILD_SHARED_LIBS)
    if (NOT TGUY_WASM_ONLY_BINDINGS)
        # export all the functions in libtguy and not those explicitly defined in EXPORTED_FUNCTIONS
        target_compile_definitions(TGuy PRIVATE LIBTGUY_EXPORT=__attribute__\(\(used\)\))
    endif ()
endif ()

target_link_libraries(${PROJECT_NAME} PRIVATE TGuy::TGuy)

target_link_options(${PROJECT_NAME}
    PRIVATE
    -Wclosure
    -sFILESYSTEM=0
    -sTEXTDECODER=2 # supported pretty much on every browser for ages, we don't need a fallback
    -sMALLOC=emmalloc
    -sENVIRONMENT=web

    -sMODULARIZE=1
    -sEXPORT_NAME=TGuyModule

    -sEXPORTED_RUNTIME_METHODS=[cwrap,lengthBytesUTF8,stringToUTF8,UTF8ToString,setValue,getValue,POINTER_SIZE,stackSave,stackRestore,stackAlloc]
    -sEXPORTED_FUNCTIONS=[_tguy_from_utf8_ex,_tguy_from_cstr_arr_ex,_tguy_set_frame,_tguy_get_string,_tguy_free,_tguy_get_frames_count,_tguy_get_arr,_tguy_get_version,_tguy_set_pos,_tguy_get_frame_state]

    --closure=$<IF:$<CONFIG:Debug>,0,1>
    --post-js "${CMAKE_CURRENT_SOURCE_DIR}/libtguy.js"
)

# trigger target linking if js bindings file changes
set_target_properties(${PROJECT_NAME} PROPERTIES
    LINK_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/libtguy.js"
    OUTPUT_NAME "libtguy"
)

# cmake (or emscripten toolchain) is dumb and doesn't know executable can emit few files so install them manually
install(
    TARGETS ${PROJECT_NAME}
    COMPONENT wasm
)

install(
    FILES "${CMAKE_CURRENT_BINARY_DIR}/libtguy.wasm"
    DESTINATION "${CMAKE_INSTALL_BINDIR}"
    COMPONENT wasm
)