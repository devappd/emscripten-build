#!/bin/bash

echo -e "
########################################################################
# tests\examples-linux.sh
#
# For each example project, install emscripten-build, then build,
# then check if *.js and *.wasm exist in ./dist
########################################################################
"

if [ -n "$APPVEYOR" ]; then
    commit="$APPVEYOR_REPO_COMMIT"
else
    commit="$TRAVIS_COMMIT"
fi

# Assumes package.json value https://github.com/devappd/emscripten-build-npm/archive/main.tar.gz
EMSCRIPTEN_BUILD_SEARCH="#main"
EMSCRIPTEN_BUILD_REPLACE="#$commit"

echo -e "
########################################################################
# Setting up tests...
########################################################################
"

failed=0
passCount=0

declare -a examples=(
    "Example-01-HelloWorld"
    "Example-02-Make"
    "Example-03-CMake"
    "Example-04-Autotools"
    "Example-05-Library"
    "Example-06-SDL-OpenGL"
)

cd ~

git clone https://github.com/devappd/emscripten-npm-examples ./emscripten-npm-examples

cd ./emscripten-npm-examples
testRepoRoot=$PWD

for example in "${examples[@]}"
do

    echo -e "
########################################################################
# BUILD TEST - $example
########################################################################
"

    cd "$testRepoRoot/$example"

    # Replace dependency in package.json
    # -i.bak makes this call compatible with both Mac and Linux
    sed -i.bak "s@${EMSCRIPTEN_BUILD_SEARCH}@${EMSCRIPTEN_BUILD_REPLACE}@" "$testRepoRoot/$example/package.json"

    # Clean the committed build output folder
    rm -rf ./dist/*
    
    # Setup environment
    npm install
    npm run build

    # Count build outputs
    # https://stackoverflow.com/a/33891876
    cd ./dist
    countJs=$(ls 2>/dev/null -Ubad1 -- *.js | wc -l)
    countWasm=$(ls 2>/dev/null -Ubad1 -- *.wasm | wc -l)

    echo ""
    echo "Build Output"
    ls

    if [ $countJs -eq 1 ] && [ $countWasm -eq 1 ]
    then
        message="BUILD PASSED!"
        let passCount++
    else
        message="BUILD FAILED!"
        let failed++
    fi

echo -e "
########################################################################
# $message $example
########################################################################
"

done

if [ $failed -gt 0 ]; then

    echo -e "
########################################################################
# BUILD FAILED! (PASSED: $passCount/${#examples[@]})
# Check above to see which build failed.
########################################################################
"

    # Fail the Travis build
    return 1

else

    echo -e "
########################################################################
# ALL BUILDS PASSED! ($passCount/${#examples[@]})
########################################################################
"

    return 0
fi