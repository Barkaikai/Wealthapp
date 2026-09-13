# WealthForge guardian — power-cut-proof protective layer.
# 1. Health-checks the server (http://localhost:5000/api/tasks) every 45s
# 2. Revives it if dead (clears stale postmaster.pid first — power cuts leave it)
# 3. Hourly: exports assets/tasks/CRM to JSON backups in %LOCALAPPDATA%\WealthForge\backups\
#    (survives PGlite corruption — the failure that lost assets twice)
# 4. Daily: checkpoints DB files to a dated snapshot dir (keep 14)
# Same self-healing pattern as the Agent Board watchdog. Lock file prevents duplicates.

import json
import os
import shutil
import subprocess
import time
import urllib.request
from datetime import datetime
from pathlib import Path

WF = Path(r"C:\Users\Barkai Brinson\OneDrive\Desktop\WealthForge")
DATA = Path(os.environ.get("LOCALAPPDATA", r"C:\Users\Barkai Brinson\AppData\Local")) / "WealthForge"
PGLITE = DATA / "pglite-fast"
BACKUPS = DATA / "backups"
LOCK = DATA / ".wf_guardian.lock"
LOG = DATA / "guardian.log"
URL = "http://localhost:5000/api/tasks"
NODE = r"C:\Users\Barkai Brinson\AppData\Local\hermes\node\node.exe"

ENV = {
    **os.environ,
    "USE_PGLITE": "1",
    "NODE_ENV": "development",
    "NODE_OPTIONS": "--expose-gc",
    "LOCAL_DEV_AUTH": "1",
    "QUIET_STARTUP": "1",
    "FAST_STARTUP": "1",
    "PORT": "5000",
    "PGLITE_DATA_DIR": str(PGLITE),
    "DATABASE_URL": "",
}

BOOT_GRACE = 150  # seconds: node + PGlite need ~2min to load before we judge health

last_backup_hour = None
last_snapshot_day = None
booted_at = None  # when we (re)started the server ourselves
last_refresh = 0  # price refresh cadence: every 15 min


def log(msg):
    try:
        if LOG.exists() and LOG.stat().st_size > 400 * 1024:
            LOG.rename(LOG.with_suffix(".log.old"))
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
    try:
        urllib.request.urlopen(URL, timeout=8)
        return True
    except urllib.error.HTTPError:
        return True
    except Exception:
        return False


def api_json(path, timeout=15):
    try:
        return json.loads(urllib.request.urlopen(f"http://localhost:5000{path}", timeout=timeout).read())
    except Exception as e:
        return {"_error": str(e)[:120]}


def do_backup():
    """Export live data through the API — always consistent, immune to PGlite file corruption."""
    global last_backup_hour
    now = datetime.now()
    if last_backup_hour == now.strftime("%Y-%m-%d %H"):
        return
    try:
        data = {
            "assets": api_json("/api/assets"),
            "tasks": api_json("/api/tasks"),
            "crm_contacts": api_json("/api/crm/contacts"),
            "taken_at": now.isoformat(timespec="seconds"),
        }
        if isinstance(data["assets"], dict) and "_error" in data["assets"]:
            log(f"backup skipped — assets API error: {data['assets']['_error']}")
            return
        d = BACKUPS / now.strftime("%Y-%m-%d_%H%M")
        d.mkdir(parents=True, exist_ok=True)
        (d / "export.json").write_text(json.dumps(data, indent=1), encoding="utf-8")
        # rotate: keep the newest 50 hourly exports
        snaps = sorted([p for p in BACKUPS.iterdir() if p.is_dir() and (p / "export.json").exists()])
        for old in snaps[:-50]:
            shutil.rmtree(old, ignore_errors=True)
        last_backup_hour = now.strftime("%Y-%m-%d %H")
        n = len(data["assets"]) if isinstance(data["assets"], list) else "?"
        log(f"backup ok — {n} assets -> {d}")
    except Exception as e:
        log(f"backup failed: {e}")


def do_snapshot():
    """Daily file-level copy of the DB dir while the server is up (best-effort;
    the API export above is the authoritative recovery source)."""
    global last_snapshot_day
    today = datetime.now().strftime("%Y-%m-%d")
    if last_snapshot_day == today:
        return
    try:
        dst = DATA / "db-snapshots" / today
        if dst.exists():
            last_snapshot_day = today
            return
        dst.mkdir(parents=True, exist_ok=True)
        for item in PGLITE.iterdir():
            if item.is_dir():
                shutil.copytree(item, dst / item.name, dirs_exist_ok=True)
            else:
                shutil.copy2(item, dst / item.name)
        # keep 14 daily snapshots
        snaps = sorted((DATA / "db-snapshots").iterdir())
        for old in snaps[:-14]:
            shutil.rmtree(old, ignore_errors=True)
        last_snapshot_day = today
        log(f"db snapshot ok -> {dst}")
    except Exception as e:
        log(f"db snapshot failed: {e}")


def start_wf():
    global booted_at
    log("WealthForge down — restarting")
    # stale lock file from a power cut prevents PGlite boot
    pidfile = PGLITE / "postmaster.pid"
    if pidfile.exists():
        try:
            pidfile.unlink()
            log("cleared stale postmaster.pid")
        except Exception:
            pass
    # kill any zombie node instances bound to 5000
    try:
        subprocess.run(
            ["powershell", "-NoProfile", "-Command",
             "Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | "
             "Select-Object -ExpandProperty OwningProcess -Unique | "
             "ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"],
            capture_output=True, timeout=60)
    except Exception as e:
        log(f"port-clear failed: {e}")
    try:
        subprocess.Popen(
            [NODE, "dist/index.js"],
            cwd=str(WF), env=ENV,
            creationflags=subprocess.CREATE_NO_WINDOW,
            stdout=open(WF / "wf_server.log", "ab"),
            stderr=subprocess.STDOUT,
        )
        booted_at = time.time()
    except Exception as e:
        log(f"restart failed: {e}")


def db_corrupt():
    """True when the server is up but the DB behind it is dead (500 on data routes)."""
    r = api_json("/api/assets")
    return isinstance(r, dict) and "_error" in r


def recover_from_corruption():
    """Server answers but DB is trashed: quarantine dir, push fresh schema,
    then the next backup cycle repopulates from the last good export."""
    global booted_at
    log("DB corrupt — quarantining and rebuilding")
    try:
        subprocess.run(
            ["powershell", "-NoProfile", "-Command",
             "Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | "
             "Select-Object -ExpandProperty OwningProcess -Unique | "
             "ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"],
            capture_output=True, timeout=60)
        time.sleep(3)
        stamp = datetime.now().strftime("%Y%m%d%H%M%S")
        bad = DATA / f"pglite-fast.bad-{stamp}"
        shutil.move(str(PGLITE), str(bad))
        log(f"quarantined -> {bad.name}")
        env = dict(ENV)
        env["PGLITE_DATA_DIR"] = str(PGLITE)
        # fresh schema into the new empty dir
        r = subprocess.run(
            [NODE, "node_modules/drizzle-kit/bin.cjs", "push", "--force"],
            cwd=str(WF), env=env, capture_output=True, timeout=180,
        )
        log(f"drizzle push exit={r.returncode}")
        start_wf()
        # after the boot grace, the main loop confirms health; repopulate once up
        deadline = time.time() + BOOT_GRACE + 60
        while time.time() < deadline:
            time.sleep(20)
            if wf_alive() and not db_corrupt():
                restore_assets_from_backup()
                break
    except Exception as e:
        log(f"corruption recovery failed: {e}")


def restore_assets_from_backup():
    """Repopulate assets from the newest backup export via the API."""
    try:
        snaps = sorted([p for p in BACKUPS.iterdir() if (p / "export.json").exists()])
        if not snaps:
            log("restore: no backups found")
            return
        data = json.loads((snaps[-1] / "export.json").read_text(encoding="utf-8"))
        assets = data.get("assets")
        if not isinstance(assets, list) or not assets:
            log("restore: backup has no assets")
            return
        live = api_json("/api/assets")
        live_ids = {a["id"] for a in live} if isinstance(live, list) else set()
        added = 0
        for a in assets:
            if a.get("id") in live_ids:
                continue
            body = {k: a[k] for k in ("name", "symbol", "assetType", "value", "quantity", "source") if k in a}
            req = urllib.request.Request("http://localhost:5000/api/assets", method="POST",
                data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=15).read()
            added += 1
        log(f"restore: re-added {added} assets from {snaps[-1].name}")
    except Exception as e:
        log(f"restore failed: {e}")


def refresh_prices():
    """Ask WealthForge to pull live market prices every 15 minutes."""
    global last_refresh
    if time.time() - last_refresh < 900:
        return
    try:
        req = urllib.request.Request("http://localhost:5000/api/assets/refresh", method="POST", data=b"")
        urllib.request.urlopen(req, timeout=150).read()
        last_refresh = time.time()
        log("live prices refreshed")
    except Exception as e:
        log(f"price refresh failed: {e}")


def main():
    global booted_at
    if not acquire_lock():
        log("another guardian alive — exiting")
        return
    log("guardian started (health 45s / backup hourly / snapshot daily / prices 15min)")
    while True:
        try:
            if wf_alive():
                if db_corrupt():
                    recover_from_corruption()
                else:
                    do_backup()
                    do_snapshot()
                    refresh_prices()
            elif booted_at is not None and time.time() - booted_at < BOOT_GRACE:
                pass  # still booting — leave it alone
            else:
                start_wf()
        except Exception as e:
            log(f"loop error: {e}")
        time.sleep(45)


if __name__ == "__main__":
    main()
