
from auth.password_security import verify_password

with open('/tmp/stored_hash.txt') as f:

    stored = f.read().strip()

print('Match:', verify_password('Lqop0*7yhJKs8!', stored))

print('Hash length:', len(stored))

print('Last 5 chars:', repr(stored[-5:]))

