#!/bin/bash
set -e

echo "Running post-merge setup..."

# Install dependencies
npm install --legacy-peer-deps

echo "Post-merge setup complete."
