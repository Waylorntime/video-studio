#!/bin/sh
# 低清预览一段，并拼一张缩略图总览，方便逐幕检查。
# 用法：sh scripts/preview.sh <名字> <起始帧> <结束帧> [每隔几帧取一张，默认 30]
cd "$(dirname "$0")/../studio" || exit 1
N=$1; A=$2; B=$3; STEP=${4:-30}
mkdir -p ../qa
npx remotion render src/index.ts Ep001 ../qa/$N.mp4 --frames=$A-$B --scale=0.5 --log=error
ffmpeg -loglevel error -y -i ../qa/$N.mp4 -vf "select='not(mod(n\,$STEP))',scale=480:-1,tile=4x6" -frames:v 1 ../qa/${N}_sheet.jpg && echo "ok qa/${N}_sheet.jpg"
