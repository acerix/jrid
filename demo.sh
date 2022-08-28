#!/usr/bin/env bash
set -euxo pipefail

yarn build
(sleep 1 && nohup xdg-open 'http://0.0.0.0:8080/demo.html' >&/dev/null) &
darkhttpd . --mimetypes extramime
