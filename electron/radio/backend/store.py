"""Single-owner local storage. Never expose secrets through GET endpoints."""
import json
import os
import secrets
import sqlite3
from pathlib import Path

from cryptography.fernet import Fernet


class Store:
    def __init__(self, root: Path):
        root.mkdir(mode=0o700, parents=True, exist_ok=True)
        os.chmod(root, 0o700)
        self.db = root / 'radio.sqlite3'
        keyfile = root / 'vault.key'
        if not keyfile.exists():
            with keyfile.open('xb') as f:
                os.chmod(keyfile, 0o600)
                f.write(Fernet.generate_key())
        self.cipher = Fernet(keyfile.read_bytes())
        tokenfile = root / 'service.token'
        if not tokenfile.exists():
            with tokenfile.open('x') as f:
                os.chmod(tokenfile, 0o600)
                f.write(secrets.token_urlsafe(32))
        self.token = tokenfile.read_text().strip()
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
        os.chmod(self.db, 0o600)

    def connect(self):
        return sqlite3.connect(self.db)

    def get(self, key, default=None):
        with self.connect() as db:
            row = db.execute('SELECT value FROM settings WHERE key=?', (key,)).fetchone()
        return json.loads(self.cipher.decrypt(row[0].encode())) if row else default

    def put(self, key, value):
        encoded = self.cipher.encrypt(json.dumps(value, ensure_ascii=False).encode()).decode()
        with self.connect() as db:
            db.execute('INSERT OR REPLACE INTO settings VALUES (?,?)', (key, encoded))

    def secret(self):
        return os.getenv('ZHIHU_ACCESS_SECRET') or self.get('access_secret', '')

    def persona(self):
        return self.get('persona', {'name': '小智', 'persona': '', 'memory': '', 'interests': ''})
