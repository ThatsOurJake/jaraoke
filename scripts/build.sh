#/bin/sh

rm -rf tmp-build
mkdir tmp-build
mkdir tmp-build/app

echo "Building Client"
pnpm --dir ./app/client build
cp -r ./app/client/dist/. ./tmp-build/app
cp -r ./app/client/public ./tmp-build/app/public

echo "Building Server"
pnpm --dir ./app/server build
cp -r ./app/server/dist/. ./tmp-build/app

echo "Installing Modules"
pnpm deploy --legacy --shamefully-hoist --filter ./app/server ./tmp-build/app/deps
cp -r ./tmp-build/app/deps/node_modules ./tmp-build
rm -rf ./tmp-build/app/deps

echo "Done ✨"
