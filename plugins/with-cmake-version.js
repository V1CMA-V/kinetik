// Builds the native (C++) code with a newer CMake than the Android Gradle Plugin default.
// The default CMake 3.22.1 ships ninja 1.10, which fails on Windows when a build path is
// longer than 260 characters (it happens with react-native-gesture-handler's codegen).
// CMake 3.31's ninja 1.12 supports long paths (Windows "LongPathsEnabled" must be on).
// Only applied to local Windows builds: EAS Build runs on Linux, which has no path limit
// and doesn't ship CMake 3.31.6 (pinning it there fails with CXX1300).
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// with-cmake-version';

module.exports = function withCmakeVersion(config, { version = '3.31.6' } = {}) {
  if (process.platform !== 'win32') return config;

  return withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents = mod.modResults.contents.replace(
        /android\s*\{/,
        (match) =>
          `${match}\n    ${MARKER}\n    externalNativeBuild {\n        cmake {\n            version "${version}"\n        }\n    }\n`,
      );
    }
    return mod;
  });
};
