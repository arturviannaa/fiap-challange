cmake_minimum_required(VERSION 3.20)
project(anamnea_auth LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

# Duas dependencias de cabecalho unico, baixadas na configuracao.
if(POLICY CMP0135)
  cmake_policy(SET CMP0135 NEW)
endif()
include(FetchContent)
FetchContent_Declare(httplib
  URL https://github.com/yhirose/cpp-httplib/archive/refs/tags/v0.18.3.tar.gz)
FetchContent_Declare(json
  URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz)
set(HTTPLIB_USE_OPENSSL_IF_AVAILABLE OFF CACHE BOOL "" FORCE)
set(HTTPLIB_USE_ZLIB_IF_AVAILABLE OFF CACHE BOOL "" FORCE)
set(HTTPLIB_USE_BROTLI_IF_AVAILABLE OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(httplib json)

find_package(OpenSSL REQUIRED)
find_package(SQLite3 REQUIRED)
find_package(Threads REQUIRED)

add_library(auth_core
  src/cripto.cpp
  src/validacao.cpp
  src/banco.cpp
  src/contas.cpp
  src/recuperacao.cpp
)
target_include_directories(auth_core PUBLIC src)
target_link_libraries(auth_core PUBLIC OpenSSL::Crypto SQLite::SQLite3 nlohmann_json::nlohmann_json)
target_compile_options(auth_core PRIVATE -Wall -Wextra -Wpedantic)

add_executable(anamnea-auth src/main.cpp src/rotas.cpp)
target_link_libraries(anamnea-auth PRIVATE auth_core httplib::httplib Threads::Threads)
target_compile_options(anamnea-auth PRIVATE -Wall -Wextra)

enable_testing()
add_executable(testes tests/testes.cpp)
target_link_libraries(testes PRIVATE auth_core)
add_test(NAME testes COMMAND testes)
