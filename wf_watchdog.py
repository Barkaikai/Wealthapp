# WealthForge watchdog — same self-healing pattern as Marketing Studio.
# Revives the WealthForge server (port 5000) in ~10s if it dies.
# Managed by the master watchdog; standalone-safe (lock file).

import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

WF = Path(r"C:\Users\Barkai Brinson\OneDrive\Desktop\WealthForge")
LOG = WF.parent / "jarvis_new" / "marketing_studio" / "watchdog.log"
LOCK = WF / ".wf_watchdog.lock"
URL = "http://localhost:5000/api/health"

PYTHONW = sys.executable.replace("python.exe", "pythonw.exe")
NODE = "node"


def log(msg):
    try:
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + "[WF] " + msg + "\n")
    except Exception:
        pass


def pid_alive(pid):
    try:
        import ctypes
        k32 = ctypes.windll.kernel32
        h = k32.OpenProcess(0x1000, False, pid)
        if not h:
            return False
        k32.CloseHandle(h)
        return True
    except Exception:
        return True


def acquire_lock():
    if LOCK.exists():
        try:
            old = int(LOCK.read_text().strip())
            if pid_alive(old):
                return False
        except Exception:
            pass
    try:
        LOCK.write_text(str(os.getpid()))
        return True
    except Exception:
        return True


def wf_alive():
    # Probe a DB-backed endpoint: a wedged PGlite returns 500 on /api/tasks,
    # which must NOT count as alive (a plain TCP/404 check once masked
    # corruption for hours).
    try:
        import http.cookiejar
        cj = http.cookiejar.CookieJar()
        op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
        op.open("http://localhost:5000/api/login", timeout=5)
        op.open("http://localhost:5000/api/tasks", timeout=5)
        return True
    except urllib.error.HTTPError as e:
        return False  # 4xx/5xx from a DB-backed route = not healthy
    except Exception:
        return False


def start_wf():
    log("WealthForge down — restarting")
    env = dict(os.environ)
    env.update({
        "USE_PGLITE": "1", "NODE_ENV": "development", "LOCAL_DEV_AUTH": "1",
        "QUIET_STARTUP": "1", "FAST_STARTUP": "1", "PORT": "5000",
        "PGLITE_DATA_DIR": r"C:\Users\Barkai Brinson\AppData\Local\WealthForge\pglite-fast",
        "DATABASE_URL": "",
    })
    # Ensure schema exists — if the DB dir was recreated after corruption,
    # the server boots with zero tables and every API call 500s.
    try:
        import shutil
        npx = shutil.which("npx") or "npx.cmd"
        r = subprocess.run(
            [npx, "drizzle-kit", "push", "--force"],
            cwd=str(WF), env=env, capture_output=True, timeout=240,
        )
        log(f"schema push rc={r.returncode}")
    except Exception as e:
        log(f"schema push failed: {e}")
    try:
        subprocess.Popen(
            [NODE, "dist/index.js"], cwd=str(WF), env=env,
            creationflags=subprocess.CREATE_NO_WINDOW,
            stdout=open(WF / "wf_server.log", "ab"),
            stderr=subprocess.STDOUT,
        )
    except Exception as e:
        log(f"WF restart failed: {e}")


def main():
    if not acquire_lock():
        log("another WF watchdog owns the lock — exiting")
        return
    log(f"WealthForge watchdog started (pid {os.getpid()})")
    while True:
        try:
            if not wf_alive():
                start_wf()
                # WF takes up to ~60s to boot with PGlite
                for _ in range(24):
                    time.sleep(5)
                    if wf_alive():
                        log("WealthForge recovered")
                        break
                else:
                    log("WealthForge FAILED to recover this cycle — retrying next")
        except Exception as e:
            log(f"WF watchdog cycle error: {e}")
        time.sleep(30)


if __name__ == "__main__":
    main()
