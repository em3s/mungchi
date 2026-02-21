#!/bin/bash
# 뭉치 프로덕션 서버
# 포트 8080, 개발 서버(3000)와 별도로 운영

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$SCRIPT_DIR/mungchi.pid"
LOG_FILE="$SCRIPT_DIR/mungchi.log"

case "${1:-start}" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "이미 실행 중입니다 (PID: $(cat "$PID_FILE"))"
      exit 1
    fi

    echo "🍡 뭉치 프로덕션 서버 시작 (port 8080)..."
    cd "$PROJECT_DIR"
    PORT=8080 NODE_ENV=production nohup npx tsx server/index.ts > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2

    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "✅ 서버 시작 완료! http://localhost:8080"
      echo "   PID: $(cat "$PID_FILE")"
      echo "   로그: $LOG_FILE"
    else
      echo "❌ 서버 시작 실패. 로그를 확인하세요:"
      tail -20 "$LOG_FILE"
      rm -f "$PID_FILE"
      exit 1
    fi
    ;;

  stop)
    if [ ! -f "$PID_FILE" ]; then
      echo "실행 중인 서버가 없습니다."
      exit 0
    fi

    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo "서버 종료 중... (PID: $PID)"
      kill "$PID"
      rm -f "$PID_FILE"
      echo "✅ 서버 종료 완료"
    else
      echo "프로세스가 이미 종료되었습니다."
      rm -f "$PID_FILE"
    fi
    ;;

  restart)
    "$0" stop
    sleep 1
    "$0" start
    ;;

  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "🟢 실행 중 (PID: $(cat "$PID_FILE"), port 8080)"
    else
      echo "🔴 중지됨"
      rm -f "$PID_FILE" 2>/dev/null
    fi
    ;;

  log|logs)
    if [ -f "$LOG_FILE" ]; then
      tail -f "$LOG_FILE"
    else
      echo "로그 파일이 없습니다."
    fi
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
