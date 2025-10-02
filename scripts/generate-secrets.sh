#!/bin/bash

echo "🔐 Generating secrets for your .env file"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "SESSION_SECRET (32 bytes):"
openssl rand -hex 32
echo ""

echo "CSRF_SECRET (48 bytes):"
openssl rand -hex 48
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Copy these values to your .env file"
echo ""
