#!/bin/bash
# 构建后脚本：替换自动生成的 robots.txt

echo "Replacing robots.txt with custom version..."
cp public/robots.txt dist/robots.txt
echo "✓ Custom robots.txt deployed"
