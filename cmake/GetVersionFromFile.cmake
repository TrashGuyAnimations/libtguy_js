#[[
This function looks for version number macros and sets them as cmake variables
Example :
get_version_from_js(
    OUTPUT TGUY_VERSION
    FILE libtguy.js
    PREFIX TGUY_VER_
    VERSIONS MAJOR MINOR PATCH
)

This will result in function searching HEADER file for such macros:
const TGUY_VER_MAJOR 0;
const TGUY_VER_MINOR 1;
const TGUY_VER_PATCH 2;

After the function returns, variables prefixed as OUTPUT will be set:
TGUY_VERSION = "0.1.2"
TGUY_VERSION_MAJOR = "0"
TGUY_VERSION_MINOR = "1"
TGUY_VERSION_PATCH = "2"
]]
function(get_version_from_file)
    set(options)
    set(oneValueArgs OUTPUT PREFIX FILE DECLARATOR_PREFIX DECLARATOR_SUFFIX)
    set(multiValueArgs VERSIONS)
    cmake_parse_arguments(_args
        "${options}"
        "${oneValueArgs}"
        "${multiValueArgs}"
        ${ARGN})

    foreach (arg IN ITEMS OUTPUT PREFIX FILE)
        if (NOT DEFINED _args_${arg})
            message(FATAL_ERROR "${arg} not provided")
        endif ()
    endforeach ()

    if (NOT DEFINED _args_VERSIONS)
        message(STATUS "VERSIONS not provided, using default: MAJOR MINOR PATCH")
        set(_args_VERSIONS MAJOR MINOR PATCH)
    endif ()

    set(FILE_VER)
    foreach (version IN ITEMS ${_args_VERSIONS})
        set(version_name ${version})
        # find #define line
        set(macrostr "${_args_DECLARATOR_PREFIX}[ \\t]*${_args_PREFIX}${version_name}")
        file(STRINGS "${_args_FILE}" version REGEX "${macrostr}")
        # match number in the line
        string(REGEX MATCH "${macrostr}[ \\t]*${_args_DECLARATOR_SUFFIX}[ \\t]*([0-9]+)" version "${version}")
        if ("${CMAKE_MATCH_1}" STREQUAL "")
            message(FATAL_ERROR "\"${_args_DECLARATOR_PREFIX} ${_args_PREFIX}${version_name} ${_args_DECLARATOR_SUFFIX}  <num>\" not found in ${_args_FILE}")
        endif ()
        message(STATUS "Setting ${_args_OUTPUT}_${version_name}")
        set(${_args_OUTPUT}_${version_name} "${CMAKE_MATCH_1}" PARENT_SCOPE)
        list(APPEND FILE_VER "${CMAKE_MATCH_1}")
    endforeach ()

    string(JOIN "." FILE_VER ${FILE_VER})
    set(${_args_OUTPUT} ${FILE_VER} PARENT_SCOPE)
endfunction()