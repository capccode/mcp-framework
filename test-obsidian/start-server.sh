#!/bin/bash
cd "$(dirname "$0")"  # Change to script directory
mkdir -p logs
node ./dist/index.js "$@"