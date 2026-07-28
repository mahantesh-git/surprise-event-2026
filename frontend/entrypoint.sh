#!/bin/sh
set -eu

mkdir -p /app/dist

node <<'NODE'
const fs = require('fs');

const env = process.env;
const runtimeEnv = {
  API_URL: env.VITE_API_URL || '',
  FEATURE_X: env.VITE_FEATURE_X || 'false',
  APP_ENV: env.VITE_APP_ENV || 'production',
  TURN_SERVER_URL: env.VITE_TURN_SERVER_URL || '',
  TURN_SERVER_URL_ALT: env.VITE_TURN_SERVER_URL_ALT || '',
  TURN_SERVER_USERNAME: env.VITE_TURN_SERVER_USERNAME || '',
  TURN_SERVER_CREDENTIAL: env.VITE_TURN_SERVER_CREDENTIAL || '',
  BACKGROUND_IMAGE_URL: env.VITE_BACKGROUND_IMAGE_URL || '',
  SOLVER_EXIT_KEY: env.VITE_SOLVER_EXIT_KEY || '',
};

fs.writeFileSync('/app/dist/env-config.js', `window._env_ = ${JSON.stringify(runtimeEnv, null, 2)};\n`);
NODE

exec serve -s /app/dist -l 3000
