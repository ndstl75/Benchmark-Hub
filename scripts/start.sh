#!/bin/sh
set -eu

export PORT="${PORT:-7860}"
export NODE_ENV="${NODE_ENV:-production}"

echo "Starting PharmDrugBench on port ${PORT}..."
exec node dist/index.cjs
