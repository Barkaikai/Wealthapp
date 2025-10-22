#!/bin/bash
# Wrapper script to run npm dev with garbage collection enabled
export NODE_OPTIONS="--expose-gc"
exec npm run dev
