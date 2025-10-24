cmake_minimum_required(VERSION 3.20)
project(CodeAIHubLauncher VERSION 0.1.0 LANGUAGES C CXX OBJC OBJCXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

if(NOT DEFINED CEF_ROOT)
  message(FATAL_ERROR "CEF_ROOT must point to the extracted CEF binary distribution")
endif()

if(NOT EXISTS "${CEF_ROOT}/cmake/cef_macros.cmake")
  message(FATAL_ERROR "cef_macros.cmake not found under ${CEF_ROOT}/cmake")
endif()

list(PREPEND CMAKE_MODULE_PATH "${CEF_ROOT}/cmake")

find_package(CEF REQUIRED)

include(cef_macros)
include(cef_variables)

set(VERSION_SHORT "${PROJECT_VERSION}")
if(NOT VERSION_SHORT)
  set(VERSION_SHORT "0.1.0")
endif()

set(CEF_BINARY_DIR "${CEF_ROOT}/Release")
set(CEF_RESOURCE_DIR "${CEF_ROOT}/Resources")
set(CEF_INCLUDE_DIR "${CEF_ROOT}/include")

if(NOT EXISTS "${CEF_INCLUDE_DIR}/cef_app.h")
  message(FATAL_ERROR "CEF include directory not found at ${CEF_INCLUDE_DIR}")
endif()

add_subdirectory("${CEF_ROOT}/libcef_dll" libcef_dll_wrapper_build)

add_library(codeai_hub_libcef_wrapper ALIAS libcef_dll_wrapper)

set(COMMON_SOURCES
  src/launcher_app.cc
  src/launcher_app.h
  src/launcher_handler.cc
  src/launcher_handler.h
)

set(OUTPUT_ROOT "${CMAKE_BINARY_DIR}/out")
set(CEF_TARGET_OUT_DIR "${OUTPUT_ROOT}")

if(APPLE)
  set(PLATFORM_SOURCES
    src/platform/mac/app_main_mac.mm
    src/platform/mac/launcher_handler_mac.mm
  )
  set(MAC_HELPER_SOURCES
    src/platform/mac/process_helper_mac.cc
  )

  add_executable(CodeAIHubLauncher MACOSX_BUNDLE ${COMMON_SOURCES} ${PLATFORM_SOURCES})
  SET_EXECUTABLE_TARGET_PROPERTIES(CodeAIHubLauncher)
  target_link_libraries(CodeAIHubLauncher PRIVATE codeai_hub_libcef_wrapper ${CEF_STANDARD_LIBS}
    "-framework AppKit"
    "-framework Cocoa"
    "-framework CoreFoundation"
  )
  set_source_files_properties(src/platform/mac/app_main_mac.mm PROPERTIES
    COMPILE_FLAGS "-fobjc-arc"
  )
  set_source_files_properties(src/platform/mac/launcher_handler_mac.mm PROPERTIES
    COMPILE_FLAGS "-fobjc-arc"
  )
  set_target_properties(CodeAIHubLauncher PROPERTIES
    MACOSX_BUNDLE_INFO_PLIST "${CMAKE_SOURCE_DIR}/resources/mac/Info.plist"
    RUNTIME_OUTPUT_DIRECTORY "${OUTPUT_ROOT}"
    RUNTIME_OUTPUT_DIRECTORY_RELEASE "${OUTPUT_ROOT}"
    RUNTIME_OUTPUT_DIRECTORY_DEBUG "${OUTPUT_ROOT}"
  )

  if(NOT EXISTS "${CEF_TARGET_OUT_DIR}")
    file(MAKE_DIRECTORY "${CEF_TARGET_OUT_DIR}")
  endif()

  set(APP_BUNDLE_PATH "${OUTPUT_ROOT}/CodeAIHubLauncher.app")
  COPY_MAC_FRAMEWORK("CodeAIHubLauncher" "${CEF_BINARY_DIR}" "${APP_BUNDLE_PATH}")

  foreach(_suffix_list ${CEF_HELPER_APP_SUFFIXES})
    string(REPLACE ":" ";" _suffix_list ${_suffix_list})
    list(GET _suffix_list 0 _name_suffix)
    list(GET _suffix_list 1 _target_suffix)
    list(GET _suffix_list 2 _plist_suffix)

    set(_helper_target "CodeAIHubLauncher_Helper${_target_suffix}")
    set(_helper_output_name "CodeAIHubLauncher Helper${_name_suffix}")

    set(_helper_info_plist "${CMAKE_CURRENT_BINARY_DIR}/helper-Info${_target_suffix}.plist")
    file(READ "${CMAKE_SOURCE_DIR}/resources/mac/helper-Info.plist.in" _helper_plist_contents)
    string(REPLACE "\${EXECUTABLE_NAME}" "${_helper_output_name}" _helper_plist_contents ${_helper_plist_contents})
    string(REPLACE "\${PRODUCT_NAME}" "${_helper_output_name}" _helper_plist_contents ${_helper_plist_contents})
    string(REPLACE "\${BUNDLE_ID_SUFFIX}" "${_plist_suffix}" _helper_plist_contents ${_helper_plist_contents})
    string(REPLACE "\${VERSION_SHORT}" "${VERSION_SHORT}" _helper_plist_contents ${_helper_plist_contents})
    file(WRITE ${_helper_info_plist} ${_helper_plist_contents})

    add_executable(${_helper_target} MACOSX_BUNDLE ${MAC_HELPER_SOURCES})
    SET_EXECUTABLE_TARGET_PROPERTIES(${_helper_target})
    add_dependencies(${_helper_target} libcef_dll_wrapper)
    target_link_libraries(${_helper_target} PRIVATE codeai_hub_libcef_wrapper ${CEF_STANDARD_LIBS})
    target_include_directories(${_helper_target}
      PRIVATE
        ${CEF_INCLUDE_DIR}
        ${CEF_ROOT}
        ${CEF_ROOT}/libcef_dll
    )
    target_compile_definitions(${_helper_target} PRIVATE
      __STDC_CONSTANT_MACROS
      __STDC_FORMAT_MACROS
    )
    set_target_properties(${_helper_target} PROPERTIES
      MACOSX_BUNDLE_INFO_PLIST ${_helper_info_plist}
      OUTPUT_NAME "${_helper_output_name}"
      RUNTIME_OUTPUT_DIRECTORY "${OUTPUT_ROOT}"
      RUNTIME_OUTPUT_DIRECTORY_RELEASE "${OUTPUT_ROOT}"
      RUNTIME_OUTPUT_DIRECTORY_DEBUG "${OUTPUT_ROOT}"
    )

    add_dependencies(CodeAIHubLauncher "${_helper_target}")

    add_custom_command(
      TARGET CodeAIHubLauncher
      POST_BUILD
      COMMAND ${CMAKE_COMMAND} -E copy_directory
              "${OUTPUT_ROOT}/${_helper_output_name}.app"
              "${APP_BUNDLE_PATH}/Contents/Frameworks/${_helper_output_name}.app"
      VERBATIM
    )
  endforeach()
elseif(WIN32)
  set(PLATFORM_SOURCES
    src/platform/win/app_main_win.cc
    src/platform/win/launcher_handler_win.cc
    src/platform/win/resource.h
  )
  add_executable(CodeAIHubLauncher WIN32 ${COMMON_SOURCES} ${PLATFORM_SOURCES})
  set_target_properties(CodeAIHubLauncher PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${OUTPUT_ROOT}"
    RUNTIME_OUTPUT_DIRECTORY_RELEASE "${OUTPUT_ROOT}"
    RUNTIME_OUTPUT_DIRECTORY_DEBUG "${OUTPUT_ROOT}"
  )
else()
  set(PLATFORM_SOURCES
    src/platform/linux/app_main_linux.cc
    src/platform/linux/launcher_handler_linux.cc
  )
  add_executable(CodeAIHubLauncher ${COMMON_SOURCES} ${PLATFORM_SOURCES})
  set_target_properties(CodeAIHubLauncher PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${OUTPUT_ROOT}"
    RUNTIME_OUTPUT_DIRECTORY_RELEASE "${OUTPUT_ROOT}"
    RUNTIME_OUTPUT_DIRECTORY_DEBUG "${OUTPUT_ROOT}"
  )
endif()

target_include_directories(CodeAIHubLauncher
  PRIVATE
    ${CEF_INCLUDE_DIR}
    ${CEF_ROOT}
    ${CEF_ROOT}/libcef_dll
    ${CMAKE_SOURCE_DIR}/src
)

target_compile_definitions(CodeAIHubLauncher PRIVATE
  __STDC_CONSTANT_MACROS
  __STDC_FORMAT_MACROS
)

add_dependencies(CodeAIHubLauncher libcef_dll_wrapper)

if(NOT APPLE)
  target_link_libraries(CodeAIHubLauncher PRIVATE codeai_hub_libcef_wrapper)
endif()
