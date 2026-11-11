"""First deployment only. Run as root after checking this exact VPS and domain."""
from pathlib import Path
import datetime, hashlib, os, shutil, subprocess, tempfile

project = Path(__file__).resolve().parents[1]
root_config = Path('/etc/caddy/Caddyfile')
site_config = Path('/etc/caddy/start90.caddy')
site_root = Path('/var/www/start90')
original = root_config.read_bytes()
if b'tgt.myvelum.com' in original or b'import /etc/caddy/start90.caddy' in original or site_config.exists() or site_root.exists():
    raise SystemExit('Existing Start90 deployment found; inspect before updating, do not overwrite.')
release_name = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
release = site_root / 'releases' / release_name
release.mkdir(parents=True, mode=0o755)
for src in (project / 'dist').iterdir():
    if not src.is_file():
        raise SystemExit('Unexpected directory in static output.')
    dst = release / src.name
    shutil.copyfile(src, dst)
    dst.chmod(0o644)
    assert hashlib.sha256(src.read_bytes()).digest() == hashlib.sha256(dst.read_bytes()).digest()
os.symlink(release, site_root / 'current')
site_config.write_bytes((project / 'deploy.Caddyfile').read_bytes())
site_config.chmod(0o644)
backup_dir = Path('/var/backups/start90-caddy')
backup_dir.mkdir(mode=0o700, exist_ok=True)
backup = backup_dir / (release_name + '.Caddyfile')
backup.write_bytes(original)
backup.chmod(0o600)
new = original.rstrip(b'\n') + b'\n\n# Start90: isolated static demo\nimport /etc/caddy/start90.caddy\n'
fd, candidate_name = tempfile.mkstemp(prefix='start90-candidate-', dir='/etc/caddy')
candidate = Path(candidate_name)
try:
    with os.fdopen(fd, 'wb') as f:
        f.write(new)
    candidate.chmod(root_config.stat().st_mode & 0o777)
    subprocess.run(['caddy','validate','--config',str(candidate),'--adapter','caddyfile'], check=True)
    if root_config.read_bytes() != original:
        raise RuntimeError('Caddyfile changed concurrently; stopped before replacing.')
    os.replace(candidate,root_config)
    try:
        subprocess.run(['systemctl','reload','caddy'],check=True)
    except Exception:
        root_config.write_bytes(original)
        subprocess.run(['systemctl','reload','caddy'],check=False)
        raise
finally:
    if candidate.exists(): candidate.unlink()
print('Release:', release)
print('Original Caddyfile preserved in:', backup)
print('Only added Start90 import. Existing site blocks unchanged. Graceful reload completed.')
