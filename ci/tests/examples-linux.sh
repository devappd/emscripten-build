#!/bin/bash

echo -e "
########################################################################
# tests\examples-linux.sh
#
# For each example project, install emscripten-build, then build,
# then check if *.js and *.wasm exist in ./dist
########################################################################
"

echo -e "
########################################################################
# Setting up tests...
########################################################################
"

failed=0
passCount=0

declare -a examples=(
    "Example-01-HelloWorld"
    "Example-04-CMake"
    "Example-05-Library"
)

cd ~

git clone https://github.com/devappd/emscripten-npm-examples ./emscripten-npm-examples

cd ./emscripten-npm-examples
repoRoot=$PWD

for example in "${examples[@]}"
do

    echo -e "
########################################################################
# BUILD TEST - $example
########################################################################
"

    cd "$repoRoot/$example"
    rm -rf ./dist/*
    
    npm install --emsdk="$HOME/emsdk"
    npm run build

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