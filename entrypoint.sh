#!/bin/sh
set -e
rm -f /tmp/.X99-lock
Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp &
export DISPLAY=:99
# wait for Xvfb to be ready (lock file appears when X server is up)
for i in $(seq 1 50); do
  if [ -e /tmp/.X99-lock ]; then break; fi
  sleep 0.1
done
exec "$@"
