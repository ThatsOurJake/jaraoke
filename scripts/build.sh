#/bin/sh

NODE_RUNTIME_VERSION=v24.9.0

BUILD_DIR="tmp-build"
RESOURCES_DIR="app-wrapper/resources"
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

# echo "Building App Wrapper"
# rm -rf $RESOURCES_DIR
# cp -r $BUILD_DIR/. $RESOURCES_DIR
# # Find node and cp into the resource dir

echo "Done ✨"
