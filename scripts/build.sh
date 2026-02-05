#/bin/sh

# TODO: Pass these in via args
NODE_RUNTIME_VERSION=v24.9.0
PLATFORM="darwin-arm64"
DEBUG_BUILD="true"

BUILD_DIR="tmp-build"
STATIC_DIR="./app-wrapper/static"
RESOURCES_DIR="./app-wrapper/resources"
APP_DIR="app"

rm -rf $BUILD_DIR
mkdir $BUILD_DIR
mkdir $BUILD_DIR/$APP_DIR

echo "Building Client"
pnpm --dir ./app/client build
cp -r ./app/client/dist/. ./$BUILD_DIR/$APP_DIR
cp -r ./app/client/public ./$BUILD_DIR/$APP_DIR/public

echo "Building Server"
pnpm --dir ./app/server build
cp -r ./app/server/dist/. ./$BUILD_DIR/$APP_DIR

echo "Installing Modules"
pnpm deploy --legacy --shamefully-hoist --prod --filter ./app/server ./$BUILD_DIR/$APP_DIR/deps
cp -r ./$BUILD_DIR/$APP_DIR/deps/node_modules ./$BUILD_DIR
rm -rf ./$BUILD_DIR/$APP_DIR/deps

echo "Building App Wrapper"
rm -rf $RESOURCES_DIR
cp -r $BUILD_DIR/. $RESOURCES_DIR
sh ./scripts/download-node.sh $PLATFORM $NODE_RUNTIME_VERSION
NODE_RUNTIME=$(find .cache/node-$NODE_RUNTIME_VERSION-$PLATFORM/bin -name node)
echo "Copying Node into build"
mkdir $RESOURCES_DIR/bin
cp $NODE_RUNTIME $RESOURCES_DIR/bin
cp -r $STATIC_DIR/. $RESOURCES_DIR

if [[ "$DEBUG_BUILD" == "true" ]]; then
    echo "Debug Build!"
    pnpm tauri build --debug
else
    echo "Production Build!"
    pnpm tauri build
fi

echo "Done ✨"
