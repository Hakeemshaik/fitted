#!/usr/bin/env bash
# Walks the chain LM Studio -> model -> ngrok -> public URL and says which link is broken.
# Usage: ./check_llm.sh [domain.ngrok-free.dev] [model-id] [port]
DOMAIN="${1:-}"; MODEL="${2:-}"; PORT="${3:-1234}"
ok()  { printf '\033[32m[ OK ]\033[0m %s\n' "$1"; }
bad() { printf '\033[31m[FAIL]\033[0m %s\n' "$1"; }
info(){ printf '       %s\n' "$1"; }

models=$(curl -s -m 8 "http://127.0.0.1:$PORT/v1/models") || true
if [ -z "$models" ]; then bad "LM Studio server not answering on port $PORT."; info "LM Studio -> Developer -> Start server."; exit 1; fi
ids=$(printf '%s' "$models" | grep -o '"id": *"[^"]*"' | sed 's/.*"id": *"\([^"]*\)"/\1/' | paste -sd, -)
ok "LM Studio answers on $PORT. Loaded: $ids"
if [ -n "$MODEL" ]; then
  case ",$ids," in *",$MODEL,"*) ok "Model '$MODEL' is loaded." ;; *) bad "Model '$MODEL' not loaded."; info "Use one of: $ids" ;; esac
fi

tunnels=$(curl -s -m 5 http://127.0.0.1:4040/api/tunnels) || true
if [ -z "$tunnels" ]; then bad "ngrok agent not running."; info "ngrok http $PORT --url=<domain>"
else
  ok "ngrok agent running."
  [ -z "$DOMAIN" ] && DOMAIN=$(printf '%s' "$tunnels" | grep -o '"public_url":"https://[^"]*"' | head -1 | sed 's/.*https:\/\///; s/"//')
fi

if [ -n "$DOMAIN" ]; then
  hdr=$(curl -s -m 20 -o /dev/null -D - -H "ngrok-skip-browser-warning: true" "https://$DOMAIN/v1/models")
  status=$(printf '%s' "$hdr" | head -1 | awk '{print $2}')
  code=$(printf '%s' "$hdr" | grep -i '^ngrok-error-code' | awk '{print $2}' | tr -d '\r')
  if [ "$status" = "200" ]; then ok "Public URL works: https://$DOMAIN/v1"
  else bad "Public URL failed (HTTP ${status:-none} ${code})."
    [ "$code" = "ERR_NGROK_3200" ] && info "ngrok isn't connected for this domain."
    [ "$code" = "ERR_NGROK_8012" ] && info "ngrok can't reach port $PORT."
  fi
fi
