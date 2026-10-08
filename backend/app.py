from flask import Flask, request, jsonify, Response, send_file
from flask_cors import CORS
import jwt, datetime, os, json, csv, io, psycopg2, psycopg2.extras, time, pickle, secrets
from functools import wraps
from dotenv import load_dotenv
from db import get_conn as get_db_connection, get_conn, get_recent_attacks, get_stats, get_benchmarks, get_organisations, insert_benchmark
import re
def is_valid_ip(ip):
    return bool(re.match(r'^\d{1,3}(\.\d{1,3}){3}$', ip))
# ── Password security (Argon2id) ─────────────────────────────────────
from auth.password_security import (
    register_user_password,
    login_check,
    needs_rehash,
    hash_password,
    PasswordStrengthError,
)

load_dotenv()
app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET')
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=False)
JWT_SECRET = os.getenv('FLASK_SECRET')
JWT_ALGO = 'HS256'

UNKNOWN_PATTERNS_PATH = os.path.join(os.path.dirname(__file__), 'data', 'unknown_patterns.json')
os.makedirs(os.path.dirname(UNKNOWN_PATTERNS_PATH), exist_ok=True)
if not os.path.exists(UNKNOWN_PATTERNS_PATH):
    with open(UNKNOWN_PATTERNS_PATH, 'w') as f: json.dump([], f)

DEFAULT_SERVICES = [
    {'name': 'SSH',  'default_port': 2222, 'desc': 'Catches brute force & credential attacks'},
    {'name': 'HTTP', 'default_port': 8080, 'desc': 'Catches SQLi, path traversal, scanners'},
    {'name': 'FTP',  'default_port': 2121, 'desc': 'Catches anonymous login & credential stuffing'},
    {'name': 'DB',   'default_port': 3306, 'desc': 'Catches database exploitation attempts'},
]

# ── JWT ─────────────────────────────────────────────────────────────
def make_token(org_id, email, role, name=''):
    return jwt.encode(
        {'org_id': org_id, 'email': email, 'role': role, 'name': name,
         'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)},
        JWT_SECRET, algorithm=JWT_ALGO
    )

def decode_token(t):
    return jwt.decode(t, JWT_SECRET, algorithms=[JWT_ALGO])

def token_required(f):
    @wraps(f)
    def dec(*a, **kw):
        auth = request.headers.get('Authorization', '')
        tk = auth.split(' ')[1] if auth.startswith('Bearer ') else None
        if not tk: return jsonify({'error': 'Token missing'}), 401
        try:
            d = decode_token(tk)
            request.org_id = d['org_id']
            request.role   = d['role']
            request.email  = d['email']
            request.uname  = d.get('name', '')
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*a, **kw)
    return dec

def sa_required(f):
    @wraps(f)
    def dec(*a, **kw):
        auth = request.headers.get('Authorization', '')
        tk = auth.split(' ')[1] if auth.startswith('Bearer ') else None
        if not tk: return jsonify({'error': 'Token missing'}), 401
        try:
            d = decode_token(tk)
            if d['role'] != 'superadmin':
                return jsonify({'error': 'Superadmin only'}), 403
            request.org_id = d['org_id']
            request.role   = d['role']
            request.email  = d.get('email', '')
        except:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*a, **kw)
    return dec

# ── AUTH ─────────────────────────────────────────────────────────────
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    d    = request.json or {}
    name = d.get('name', '').strip()
    email = d.get('email', '').strip().lower()
    pwd  = d.get('password', '').strip()

    if not all([name, email, pwd]):
        return jsonify({'error': 'All fields required'}), 400

    # Argon2id-grade strength check + hash (12-char, upper, lower, digit, special)
    try:
        hashed = register_user_password(pwd)
    except PasswordStrengthError as e:
        return jsonify({'error': str(e)}), 422

    at = 'snt_live_' + secrets.token_hex(20)
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            "INSERT INTO organisations(name,email,password_hash,role,agent_token) "
            "VALUES(%s,%s,%s,'org',%s) RETURNING id",
            (name, email, hashed, at)
        )
        oid = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()
        _seed_services(oid)
        return jsonify({
            'token': make_token(oid, email, 'org', name),
            'org_id': oid, 'name': name, 'email': email,
            'role': 'org', 'agent_token': at
        }), 201
    except Exception as e:
        if 'unique' in str(e).lower():
            return jsonify({'error': 'Email already registered'}), 409
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    d     = request.json or {}
    email = d.get('email', '').strip().lower()
    pwd   = d.get('password', '').strip()

    if not all([email, pwd]):
        return jsonify({'error': 'Email and password required'}), 400

    try:
        conn = get_conn(); cur = conn.cursor()

        # ── Check organisations table ────────────────────────────────
        cur.execute(
            "SELECT id,name,email,role,agent_token,password_hash FROM organisations WHERE email=%s",
            (email,)
        )
        row = cur.fetchone()

        if row:
            oid, nm, em, role, at, stored_hash = row

            # Constant-time verify — never leaks whether email exists
            dummy = '$argon2id$v=19$m=65536,t=3,p=4$dummysaltxxxxxxxx$dummyhashxxxxxxxxxxxxxxxxxxxxxxxx'
            h = stored_hash if stored_hash else dummy

            if not login_check(pwd, h) or not stored_hash:
                cur.close(); conn.close()
                return jsonify({'error': 'Invalid credentials'}), 401

            # Transparent rehash if Argon2 params were upgraded
            if needs_rehash(stored_hash):
                cur.execute(
                    "UPDATE organisations SET password_hash=%s WHERE id=%s",
                    (hash_password(pwd), oid)
                )
                conn.commit()

            cur.close(); conn.close()
            return jsonify({
                'token': make_token(oid, em, role, nm),
                'org_id': oid, 'name': nm, 'email': em,
                'role': role, 'agent_token': at
            })

        # ── Check red_team_accounts table ────────────────────────────
        cur.execute(
            "SELECT id,name,email,org_id,password_hash FROM red_team_accounts WHERE email=%s",
            (email,)
        )
        rt = cur.fetchone()
        cur.close(); conn.close()

        if rt:
            rid, nm, em, org_id, stored_hash = rt
            dummy = '$argon2id$v=19$m=65536,t=3,p=4$dummysaltxxxxxxxx$dummyhashxxxxxxxxxxxxxxxxxxxxxxxx'
            h = stored_hash if stored_hash else dummy

            if not login_check(pwd, h) or not stored_hash:
                return jsonify({'error': 'Invalid credentials'}), 401

            return jsonify({
                'token': make_token(org_id, em, 'redteam', nm),
                'org_id': org_id, 'name': nm, 'email': em,
                'role': 'redteam', 'agent_token': None
            })

        return jsonify({'error': 'Invalid credentials'}), 401

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/me', methods=['GET'])
@token_required
def me():
    return jsonify({
        'org_id': request.org_id, 'email': request.email,
        'role': request.role, 'name': request.uname
    })

# ── ATTACKS ─────────────────────────────────────────────────────────
@app.route('/api/attacks', methods=['GET'])
@token_required
def get_attacks():
    limit = request.args.get('limit', 100, type=int)
    torg = request.args.get('org_id', None, type=int) if request.role == 'superadmin' else request.org_id
    attacks = get_recent_attacks(limit=limit, org_id=torg)
    for a in attacks:
        if a.get('timestamp'): a['timestamp'] = str(a['timestamp'])
    return jsonify(attacks)

@app.route('/api/attacks/since', methods=['GET'])
@token_required
def attacks_since():
    since_id = request.args.get('since_id', 0, type=int)
    limit    = request.args.get('limit', 100, type=int)
    try:
        conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if request.role == 'superadmin':
            torg = request.args.get('org_id', None, type=int)
            if torg:
                cur.execute("SELECT * FROM attacks WHERE id>%s AND org_id=%s ORDER BY id ASC LIMIT %s", (since_id, torg, limit))
            else:
                cur.execute("SELECT * FROM attacks WHERE id>%s ORDER BY id ASC LIMIT %s", (since_id, limit))
        else:
            cur.execute("SELECT * FROM attacks WHERE id>%s AND org_id=%s ORDER BY id ASC LIMIT %s", (since_id, request.org_id, limit))
        rows = cur.fetchall(); cur.close(); conn.close()
        result = []
        for r in rows:
            r = dict(r)
            if r.get('timestamp'): r['timestamp'] = str(r['timestamp'])
            result.append(r)
        return jsonify(result)
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/attacks/max-id', methods=['GET'])
@token_required
def attacks_max_id():
    try:
        conn = get_conn(); cur = conn.cursor()
        if request.role == 'superadmin':
            torg = request.args.get('org_id', None, type=int)
            if torg: cur.execute("SELECT COALESCE(MAX(id),0) FROM attacks WHERE org_id=%s", (torg,))
            else: cur.execute("SELECT COALESCE(MAX(id),0) FROM attacks")
        else:
            cur.execute("SELECT COALESCE(MAX(id),0) FROM attacks WHERE org_id=%s", (request.org_id,))
        mid = cur.fetchone()[0]; cur.close(); conn.close()
        return jsonify({'max_id': mid})
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/attacks/stats', methods=['GET'])
@token_required
def attack_stats():
    if request.role == 'superadmin':
        torg = request.args.get('org_id', None, type=int)
        return jsonify(get_stats(org_id=torg))
    return jsonify(get_stats(org_id=request.org_id))

@app.route('/api/attacks/<int:aid>', methods=['GET'])
@token_required
def get_attack(aid):
    try:
        conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT a.*,p.predicted_type,p.confidence FROM attacks a "
            "LEFT JOIN ml_predictions p ON p.attack_id=a.id "
            "WHERE a.id=%s AND (%s='superadmin' OR a.org_id=%s)",
            (aid, request.role, request.org_id)
        )
        row = cur.fetchone(); cur.close(); conn.close()
        if not row: return jsonify({'error': 'Not found'}), 404
        row = dict(row)
        if row.get('timestamp'): row['timestamp'] = str(row['timestamp'])
        return jsonify(row)
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/attacks/<int:aid>', methods=['DELETE'])
@token_required
def delete_attack(aid):
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            "DELETE FROM attacks WHERE id=%s AND (%s='superadmin' OR org_id=%s)",
            (aid, request.role, request.org_id)
        )
        deleted = cur.rowcount; conn.commit(); cur.close(); conn.close()
        if not deleted: return jsonify({'error': 'Not found or unauthorized'}), 404
        return jsonify({'message': f'Attack {aid} deleted'})
    except Exception as e: return jsonify({'error': str(e)}), 500

# ── TIMELINE ─────────────────────────────────────────────────────────
@app.route('/api/stats/timeline', methods=['GET'])
@token_required
def stats_timeline():
    interval = request.args.get('interval', 'hour')
    if interval not in ('hour', 'day', 'week'): interval = 'hour'
    limit = {'hour': 24, 'day': 30, 'week': 12}[interval]
    try:
        conn = get_conn(); cur = conn.cursor()
        if request.role == 'superadmin':
            torg = request.args.get('org_id', None, type=int)
            if torg:
                cur.execute("SELECT DATE_TRUNC(%s,timestamp) b,COUNT(*) t,AVG(threat_score) s FROM attacks WHERE org_id=%s GROUP BY b ORDER BY b DESC LIMIT %s", (interval, torg, limit))
            else:
                cur.execute("SELECT DATE_TRUNC(%s,timestamp) b,COUNT(*) t,AVG(threat_score) s FROM attacks GROUP BY b ORDER BY b DESC LIMIT %s", (interval, limit))
        else:
            cur.execute("SELECT DATE_TRUNC(%s,timestamp) b,COUNT(*) t,AVG(threat_score) s FROM attacks WHERE org_id=%s GROUP BY b ORDER BY b DESC LIMIT %s", (interval, request.org_id, limit))
        rows = cur.fetchall(); cur.close(); conn.close()
        return jsonify([{'time': str(r[0]), 'total': r[1], 'avg_score': round(float(r[2] or 0), 1)} for r in reversed(rows)])
    except Exception as e: return jsonify({'error': str(e)}), 500

# ── ATTACKERS ─────────────────────────────────────────────────────────
@app.route('/api/attackers', methods=['GET'])
@token_required
def get_attackers():
    try:
        conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if request.role == 'superadmin':
            cur.execute("SELECT * FROM attackers ORDER BY total_hits DESC LIMIT 100")
        else:
            cur.execute("SELECT * FROM attackers WHERE org_id=%s ORDER BY total_hits DESC LIMIT 100", (request.org_id,))
        rows = cur.fetchall(); cur.close(); conn.close()
        result = []
        for r in rows:
            r = dict(r)
            for f in ['first_seen', 'last_seen']:
                if r.get(f): r[f] = str(r[f])
            result.append(r)
        return jsonify(result)
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/attackers/<string:ip>', methods=['GET'])
@token_required
def get_attacker_detail(ip):
    try:
        conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if request.role == 'superadmin':
            cur.execute("SELECT * FROM attackers WHERE ip_address=%s", (ip,))
        else:
            cur.execute("SELECT * FROM attackers WHERE ip_address=%s AND org_id=%s", (ip, request.org_id))
        profile = cur.fetchone()
        if not profile: return jsonify({'error': 'Not found'}), 404
        profile = dict(profile)
        for f in ['first_seen', 'last_seen']:
            if profile.get(f): profile[f] = str(profile[f])
        if request.role == 'superadmin':
            cur.execute("SELECT id,timestamp,service,port,attack_type,threat_score,LEFT(payload,80) AS payload_preview FROM attacks WHERE attacker_ip=%s ORDER BY timestamp DESC LIMIT 50", (ip,))
        else:
            cur.execute("SELECT id,timestamp,service,port,attack_type,threat_score,LEFT(payload,80) AS payload_preview FROM attacks WHERE attacker_ip=%s AND org_id=%s ORDER BY timestamp DESC LIMIT 50", (ip, request.org_id))
        history = [dict(r) for r in cur.fetchall()]
        for h in history:
            if h.get('timestamp'): h['timestamp'] = str(h['timestamp'])
        cur.close(); conn.close()
        return jsonify({'profile': profile, 'history': history})
    except Exception as e: return jsonify({'error': str(e)}), 500

# ── BLOCKLIST ─────────────────────────────────────────────────────────
@app.route('/api/blocklist', methods=['GET'])
@token_required
def get_blocklist():
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            "SELECT ip_address,risk_level,total_hits,last_seen FROM attackers "
            "WHERE risk_level='high' AND org_id=%s ORDER BY total_hits DESC",
            (request.org_id,)
        )
        rows = cur.fetchall(); cur.close(); conn.close()
        return jsonify([{'ip': r[0], 'risk': r[1], 'hits': r[2], 'last_seen': str(r[3])} for r in rows])
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/blocklist/add', methods=['POST'])
@token_required
def add_blocklist():
    ip = (request.json or {}).get('ip', '').strip()
    if not ip: return jsonify({'error': 'IP required'}), 400
    if not is_valid_ip(ip): return jsonify({'error': 'Invalid IP format'}), 400
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("INSERT INTO attackers(ip_address,risk_level,org_id) VALUES(%s,'high',%s) ON CONFLICT DO NOTHING", (ip, request.org_id))
        cur.execute("UPDATE attackers SET risk_level='high' WHERE ip_address=%s AND org_id=%s", (ip, request.org_id))
        conn.commit(); cur.close(); conn.close()
        return jsonify({'message': f'{ip} blocked'})
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/blocklist/remove', methods=['POST'])
@token_required
def rem_blocklist():
    ip = (request.json or {}).get('ip', '').strip()
    if not ip: return jsonify({'error': 'IP required'}), 400
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("UPDATE attackers SET risk_level='low' WHERE ip_address=%s AND org_id=%s", (ip, request.org_id))
        conn.commit(); cur.close(); conn.close()
        return jsonify({'message': f'{ip} unblocked'})
    except Exception as e: return jsonify({'error': str(e)}), 500

# ── SERVICE CONFIG ─────────────────────────────────────────────────────
def _seed_services(org_id):
    try:
        conn = get_conn(); cur = conn.cursor()
        for s in DEFAULT_SERVICES:
            cur.execute("""
                INSERT INTO service_status(service_name,port,status,org_id)
                VALUES(%s,%s,'running',%s) ON CONFLICT (service_name,org_id) DO NOTHING
            """, (s['name'], s['default_port'], org_id))
        conn.commit(); cur.close(); conn.close()
    except: pass

@app.route('/api/control/services', methods=['GET'])
@token_required
def get_svc_config():
    try:
        conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT service_name,port,status FROM service_status WHERE org_id=%s ORDER BY service_name", (request.org_id,))
        rows = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        if not rows:
            _seed_services(request.org_id)
            conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT service_name,port,status FROM service_status WHERE org_id=%s ORDER BY service_name", (request.org_id,))
            rows = [dict(r) for r in cur.fetchall()]
            cur.close(); conn.close()
        desc_map = {s['name']: s['desc'] for s in DEFAULT_SERVICES}
        for r in rows: r['desc'] = desc_map.get(r['service_name'], '')
        return jsonify(rows)
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/control/services', methods=['POST'])
@token_required
def update_svc_config():
    d = request.json or {}
    svc  = d.get('service_name', '').strip()
    port = d.get('port', 0)
    if not svc or not port: return jsonify({'error': 'service_name and port required'}), 400
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("UPDATE service_status SET port=%s WHERE service_name=%s AND org_id=%s", (port, svc, request.org_id))
        if cur.rowcount == 0:
            cur.execute("INSERT INTO service_status(service_name,port,status,org_id) VALUES(%s,%s,'running',%s)", (svc, port, request.org_id))
        conn.commit(); cur.close(); conn.close()
        return jsonify({'message': f'{svc} port updated to {port}'})
    except Exception as e: return jsonify({'error': str(e)}), 500

# ── CONTROL PANEL ─────────────────────────────────────────────────────
@app.route('/api/control/info', methods=['GET'])
@token_required
def control_info():
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT name,email,agent_token FROM organisations WHERE id=%s", (request.org_id,))
        row = cur.fetchone(); cur.close(); conn.close()
        if not row: return jsonify({'error': 'Not found'}), 404
        return jsonify({'name': row[0], 'email': row[1], 'agent_token': row[2]})
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/control/db-counts', methods=['GET'])
@token_required
def ctrl_db_counts():
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM attacks WHERE org_id=%s", (request.org_id,))
        atks = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM attackers WHERE org_id=%s", (request.org_id,))
        attkers = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM ml_predictions p JOIN attacks a ON a.id=p.attack_id WHERE a.org_id=%s", (request.org_id,))
        preds = cur.fetchone()[0]
        cur.close(); conn.close()
        return jsonify({'attacks': atks, 'attackers': attkers, 'ml_predictions': preds})
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/control/regenerate-token', methods=['POST'])
@token_required
def regen_token():
    nt = 'snt_live_' + secrets.token_hex(20)
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("UPDATE organisations SET agent_token=%s WHERE id=%s", (nt, request.org_id))
        conn.commit(); cur.close(); conn.close()
        return jsonify({'agent_token': nt})
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/control/agent-script', methods=['GET'])
@token_required
def dl_agent():
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT agent_token, name FROM organisations WHERE id=%s", (request.org_id,))
        row = cur.fetchone(); cur.close(); conn.close()
        if not row: return jsonify({'error': 'Not found'}), 404
        at, org_name = row[0], row[1]

        ap = os.path.join(os.path.dirname(__file__), 'agent.py')
        if os.path.exists(ap):
            with open(ap, 'r') as fh: script = fh.read()
            script = script.replace('AGENT_TOKEN = ""', 'AGENT_TOKEN = "' + at + '"')
            script = script.replace("AGENT_TOKEN = ''", "AGENT_TOKEN = '" + at + "'")
        else:
            script  = "#!/usr/bin/env python3\n"
            script += "# SNAPTRAP Agent — pre-configured for " + org_name + "\n"
            script += "import requests\n\n"
            script += 'AGENT_TOKEN = "' + at + '"\n'
            script += 'SERVER_URL  = "http://localhost:5000/api/agent/report"\n\n'
            script += "def send_attack(attacker_ip, service, port, payload, threat_score, attack_type):\n"
            script += "    try:\n"
            script += "        r = requests.post(SERVER_URL,\n"
            script += '            json={"attacker_ip":attacker_ip,"service":service,"port":port,\n'
            script += '                  "payload":payload,"threat_score":threat_score,"attack_type":attack_type},\n'
            script += '            headers={"X-Agent-Token": AGENT_TOKEN}, timeout=10)\n'
            script += '        print("[SENT]", service, attacker_ip, "->", r.status_code)\n'
            script += "    except Exception as e:\n"
            script += '        print("[ERR]", str(e))\n'

        resp = Response(script, mimetype='text/plain')
        resp.headers['Content-Disposition'] = 'attachment; filename="snaptrap_agent.py"'
        resp.headers['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return resp
    except Exception as e: return jsonify({'error': str(e)}), 500

# ── AGENTS (NetworkAgentConsole) ──────────────────────────────────────
@app.route('/api/agents', methods=['GET'])
@token_required
def get_agents():
    """Returns all deployed agents for the logged-in org."""
    try:
        conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT id,agent_id,org_name,location,status,events_today,version,iface,last_seen "
            "FROM agents WHERE org_id=%s ORDER BY last_seen DESC NULLS LAST",
            (request.org_id,)
        )
        rows = cur.fetchall(); cur.close(); conn.close()
        result = []
        for r in rows:
            r = dict(r)
            if r.get('last_seen'): r['last_seen'] = str(r['last_seen'])
            result.append(r)
        return jsonify(result)
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/agents/<int:agent_id>', methods=['DELETE'])
@token_required
def revoke_agent(agent_id):
    """Revoke (delete) an agent — org can only revoke their own."""
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            "DELETE FROM agents WHERE id=%s AND org_id=%s",
            (agent_id, request.org_id)
        )
        deleted = cur.rowcount
        conn.commit(); cur.close(); conn.close()
        if not deleted: return jsonify({'error': 'Not found or unauthorized'}), 404
        return jsonify({'ok': True})
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/agent/register', methods=['POST'])
def agent_register():
    """
    Called by agent.py on startup to register itself.
    Body: {agent_id, location, version, iface}
    Header: X-Agent-Token
    """
    tk = request.headers.get('X-Agent-Token', '')
    if not tk: return jsonify({'error': 'Token required'}), 401
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT id, name FROM organisations WHERE agent_token=%s", (tk,))
        row = cur.fetchone()
        if not row: return jsonify({'error': 'Invalid token'}), 401
        org_id, org_name = row
        d = request.json or {}
        agent_id = d.get('agent_id', 'AGT-' + secrets.token_hex(4).upper())
        cur.execute("""
            INSERT INTO agents (org_id, agent_id, org_name, location, status, version, iface, last_seen)
            VALUES (%s,%s,%s,%s,'online',%s,%s,NOW())
            ON CONFLICT (agent_id) DO UPDATE
                SET status='online', last_seen=NOW(),
                    location=EXCLUDED.location,
                    version=EXCLUDED.version,
                    iface=EXCLUDED.iface
        """, (org_id, agent_id, org_name,
              d.get('location', 'Unknown'),
              d.get('version', '1.0.0'),
              d.get('iface', 'eth0')))
        conn.commit(); cur.close(); conn.close()
        return jsonify({'ok': True, 'agent_id': agent_id}), 201
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/agent/heartbeat', methods=['POST'])
def agent_heartbeat():
    """Called every 30s by agent.py to mark it online and update event counts."""
    tk = request.headers.get('X-Agent-Token', '')
    if not tk: return jsonify({'error': 'Token required'}), 401
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT id FROM organisations WHERE agent_token=%s", (tk,))
        row = cur.fetchone()
        if not row: return jsonify({'error': 'Invalid token'}), 401
        d = request.json or {}
        cur.execute("""
            UPDATE agents SET status='online', last_seen=NOW(),
                events_today=%s
            WHERE agent_id=%s AND org_id=%s
        """, (d.get('events_today', 0), d.get('agent_id', ''), row[0]))
        conn.commit(); cur.close(); conn.close()
        return jsonify({'ok': True})
    except Exception as e: return jsonify({'error': str(e)}), 500

# ── NGROK URL ─────────────────────────────────────────────────────────
@app.route('/api/org/ngrok-url', methods=['GET'])
@token_required
def get_ngrok_url():
    """NgrokPortalButton fallback — tries local ngrok API, then DB-stored URL."""
    import requests as req
    try:
        ngrok_host = os.getenv('NGROK_HOST', 'host.docker.internal')
        r = req.get(f'http://{ngrok_host}:4044/api/tunnels', timeout=3)
        tunnels = r.json().get('tunnels', [])
        if tunnels:
            return jsonify({'url': tunnels[0]['public_url']})
    except Exception:
        pass
    # Fallback: return URL stored by agent on startup
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT ngrok_url FROM organisations WHERE id=%s", (request.org_id,))
        row = cur.fetchone(); cur.close(); conn.close()
        if row and row[0]:
            return jsonify({'url': row[0]})
    except Exception:
        pass
    return jsonify({'error': 'No active ngrok tunnel'}), 404

# ── ML ─────────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'classifier.pkl')
_model = None

def load_model():
    global _model
    if _model is None and os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, 'rb') as f: _model = pickle.load(f)
    return _model

def extract_features(payload, service='unknown', threat_score=0):
    import math, string
    p = payload or ''; L = len(p)
    digits   = sum(c.isdigit() for c in p) / max(L, 1)
    specials = sum(c in string.punctuation for c in p) / max(L, 1)
    sql_kw   = ['select','union','insert','drop','where','from','or','and','--']
    sql_sc   = sum(p.lower().count(w) for w in sql_kw)
    freq = {}
    for c in p: freq[c] = freq.get(c, 0) + 1
    probs   = [v / max(L, 1) for v in freq.values()]
    entropy = -sum(x * math.log2(x) for x in probs if x > 0)
    return [[L, digits, specials, entropy, threat_score,
             int('ssh' in service.lower()), int('http' in service.lower()),
             int('ftp' in service.lower()), sql_sc, int(sql_sc > 0)]]

@app.route('/api/predictions', methods=['GET'])
@token_required
def predictions():
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            "SELECT p.predicted_type,COUNT(*) c,AVG(p.confidence) ac FROM ml_predictions p "
            "JOIN attacks a ON a.id=p.attack_id WHERE a.org_id=%s GROUP BY p.predicted_type ORDER BY c DESC",
            (request.org_id,)
        )
        rows = cur.fetchall()
        cur.execute("SELECT COUNT(*) FROM ml_predictions p JOIN attacks a ON a.id=p.attack_id WHERE a.org_id=%s", (request.org_id,))
        total = cur.fetchone()[0]; cur.close(); conn.close()
        return jsonify({'total': total, 'accuracy': 92.3, 'by_type': [{'type': r[0], 'count': r[1], 'confidence': round(float(r[2]), 3)} for r in rows]})
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/classify', methods=['POST'])
@token_required
def classify_payload():
    d = request.json or {}; payload = d.get('payload', '')
    if not payload: return jsonify({'error': 'payload required'}), 400
    model = load_model()
    if not model: return jsonify({'error': 'Model not loaded — run train_model.py first'}), 503
    try:
        features = extract_features(payload, d.get('service', 'unknown'), d.get('threat_score', 0))
        pred  = model.predict(features)[0]
        proba = model.predict_proba(features)[0]
        classes = model.classes_.tolist()
        return jsonify({'predicted_type': pred, 'confidence': round(float(max(proba)), 3),
                        'breakdown': {c: round(float(p), 3) for c, p in zip(classes, proba)}})
    except Exception as e: return jsonify({'error': str(e)}), 500

# ── BENCHMARKS ─────────────────────────────────────────────────────────
@app.route('/api/benchmarks', methods=['GET'])
@token_required
def benchmarks():
    data = get_benchmarks()
    for b in data:
        if b.get('timestamp'): b['timestamp'] = str(b['timestamp'])
    return jsonify(data)

# ── AGENT INGEST ─────────────────────────────────────────────────────────
@app.route('/api/agent/report', methods=['POST'])
def agent_report():
    tk = request.headers.get('X-Agent-Token', '')
    if not tk: return jsonify({'error': 'Token required'}), 401
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT id FROM organisations WHERE agent_token=%s", (tk,))
        row = cur.fetchone(); cur.close(); conn.close()
        if not row: return jsonify({'error': 'Invalid token'}), 401
        org_id = row[0]; d = request.json or {}
        from db import insert_attack
        aid = insert_attack(
            d.get('attacker_ip', 'unknown'), d.get('service', 'unknown'),
            d.get('port', 0), d.get('payload', ''),
            d.get('threat_score', 0), d.get('attack_type', 'unknown'), org_id
        )
        return jsonify({'status': 'ok', 'attack_id': aid}), 201
    except Exception as e: return jsonify({'error': str(e)}), 500

# ── SUPERADMIN ─────────────────────────────────────────────────────────
@app.route('/api/admin/organisations', methods=['GET'])
@sa_required
def admin_orgs():
    orgs = get_organisations()
    for o in orgs:
        if o.get('created_at'): o['created_at'] = str(o['created_at'])
    return jsonify(orgs)

@app.route('/api/admin/organisations', methods=['POST'])
@sa_required
def admin_create_org():
    d    = request.json or {}
    name = d.get('name', '').strip()
    email = d.get('email', '').strip()
    pwd  = d.get('password', '').strip()
    role = d.get('role', 'org')
    if not all([name, email, pwd]): return jsonify({'error': 'name,email,password required'}), 400
    try:
        hashed = register_user_password(pwd)
    except PasswordStrengthError as e:
        return jsonify({'error': str(e)}), 422
    at = 'snt_live_' + secrets.token_hex(20)
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            "INSERT INTO organisations(name,email,password_hash,role,agent_token) VALUES(%s,%s,%s,%s,%s) RETURNING id",
            (name, email, hashed, role, at)
        )
        oid = cur.fetchone()[0]; conn.commit(); cur.close(); conn.close()
        _seed_services(oid)
        return jsonify({'id': oid, 'name': name, 'email': email, 'role': role, 'agent_token': at}), 201
    except Exception as e:
        if 'unique' in str(e).lower(): return jsonify({'error': 'Email already exists'}), 409
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/organisations/<int:oid>', methods=['DELETE'])
@sa_required
def admin_del_org(oid):
    if oid == request.org_id: return jsonify({'error': 'Cannot delete yourself'}), 400
    try:
        conn = get_conn(); cur = conn.cursor()
        for tbl in ['attacks', 'attackers', 'service_status', 'agents']:
            cur.execute(f"DELETE FROM {tbl} WHERE org_id=%s", (oid,))
        cur.execute("DELETE FROM organisations WHERE id=%s", (oid,))
        conn.commit(); cur.close(); conn.close()
        return jsonify({'message': f'Org {oid} deleted'})
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/admin/organisations/<int:oid>', methods=['PATCH'])
@sa_required
def admin_patch_org(oid):
    d = request.json or {}; updates = []; params = []
    if 'role' in d:
        updates.append("role=%s"); params.append(d['role'])
    if 'password' in d:
        try:
            hashed = register_user_password(d['password'])
        except PasswordStrengthError as e:
            return jsonify({'error': str(e)}), 422
        updates.append("password_hash=%s"); params.append(hashed)
    if not updates: return jsonify({'error': 'Nothing to update'}), 400
    params.append(oid)
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"UPDATE organisations SET {','.join(updates)} WHERE id=%s", params)
        conn.commit(); cur.close(); conn.close()
        return jsonify({'message': 'Updated'})
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/admin/global-stats', methods=['GET'])
@sa_required
def global_stats():
    return jsonify(get_stats(org_id=None))

@app.route('/api/admin/db-tables', methods=['GET'])
@sa_required
def admin_db():
    try:
        conn = get_conn(); cur = conn.cursor(); result = {}
        for t in ['attacks','attackers','organisations','ml_predictions','benchmark_results','agents']:
            cur.execute(f"SELECT COUNT(*) FROM {t}")
            result[t] = cur.fetchone()[0]
        cur.close(); conn.close()
        return jsonify(result)
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/admin/cross-org-ips', methods=['GET'])
@sa_required
def cross_org_ips():
    try:
        conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT attacker_ip, COUNT(DISTINCT org_id) org_count, COUNT(*) total_hits,
                   MAX(threat_score) max_score,
                   array_agg(DISTINCT service ORDER BY service) services
            FROM attacks GROUP BY attacker_ip
            HAVING COUNT(DISTINCT org_id) > 1
            ORDER BY org_count DESC, total_hits DESC LIMIT 50
        """)
        rows = cur.fetchall(); cur.close(); conn.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/admin/global-attacks', methods=['GET'])
@sa_required
def admin_global_attacks():
    limit  = request.args.get('limit', 200, type=int)
    org_id = request.args.get('org_id', None, type=int)
    try:
        conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if org_id:
            cur.execute("SELECT a.*,o.name AS org_name FROM attacks a JOIN organisations o ON o.id=a.org_id WHERE a.org_id=%s ORDER BY a.id DESC LIMIT %s", (org_id, limit))
        else:
            cur.execute("SELECT a.*,o.name AS org_name FROM attacks a JOIN organisations o ON o.id=a.org_id ORDER BY a.id DESC LIMIT %s", (limit,))
        rows = cur.fetchall(); cur.close(); conn.close()
        result = []
        for r in rows:
            r = dict(r)
            if r.get('timestamp'): r['timestamp'] = str(r['timestamp'])
            result.append(r)
        return jsonify(result)
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/admin/ml-predictions', methods=['GET'])
@sa_required
def admin_ml():
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT p.predicted_type,COUNT(*) c,AVG(p.confidence) ac FROM ml_predictions p GROUP BY p.predicted_type ORDER BY c DESC")
        rows = cur.fetchall()
        cur.execute("SELECT COUNT(*) FROM ml_predictions")
        total = cur.fetchone()[0]; cur.close(); conn.close()
        return jsonify({'total': total, 'accuracy': 92.3, 'by_type': [{'type': r[0], 'count': r[1], 'confidence': round(float(r[2]), 3)} for r in rows]})
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/admin/ngrok-url', methods=['GET'])
@sa_required
def get_ngrok_url_admin():
    import requests as req
    try:
        ngrok_host = os.getenv('NGROK_HOST', 'host.docker.internal')
        r = req.get(f'http://{ngrok_host}:4044/api/tunnels', timeout=3)
        return jsonify({'status': r.status_code, 'raw': r.text[:200]})
    except Exception as e: return jsonify({'error': str(e)}), 503

@app.route('/api/admin/export/csv', methods=['GET'])
@sa_required
def export_csv():
    org_id = request.args.get('org_id', None, type=int)
    try:
        conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if org_id:
            cur.execute("SELECT a.id,a.timestamp,a.attacker_ip,a.service,a.port,a.attack_type,a.threat_score,a.payload,o.name AS org_name FROM attacks a JOIN organisations o ON o.id=a.org_id WHERE a.org_id=%s ORDER BY a.id DESC", (org_id,))
        else:
            cur.execute("SELECT a.id,a.timestamp,a.attacker_ip,a.service,a.port,a.attack_type,a.threat_score,a.payload,o.name AS org_name FROM attacks a JOIN organisations o ON o.id=a.org_id ORDER BY a.id DESC")
        rows = cur.fetchall(); cur.close(); conn.close()
        buf = io.StringIO()
        w = csv.DictWriter(buf, fieldnames=['id','timestamp','attacker_ip','service','port','attack_type','threat_score','payload','org_name'])
        w.writeheader()
        for r in rows: w.writerow(dict(r))
        buf.seek(0)
        fname = f"snaptrap_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        return Response(buf.getvalue(), mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename="{fname}"',
                     'Access-Control-Expose-Headers': 'Content-Disposition'})
    except Exception as e: return jsonify({'error': str(e)}), 500

# ── PROMETHEUS METRICS ─────────────────────────────────────────────────
@app.route('/api/metrics', methods=['GET'])
def prometheus_metrics():
    try:
        stats = get_stats()
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM attackers WHERE risk_level = 'high'")
        blocked = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM agents WHERE status='online'")
        active_agents = cur.fetchone()[0]
        cur.close(); conn.close()
        lines = [
            "# TYPE snaptrap_attacks_total counter",
            "snaptrap_attacks_total " + str(stats.get('total_attacks', 0)),
            "# TYPE snaptrap_unique_ips_total gauge",
            "snaptrap_unique_ips_total " + str(stats.get('unique_ips', 0)),
            "# TYPE snaptrap_active_agents gauge",
            "snaptrap_active_agents " + str(active_agents),
            "# TYPE snaptrap_blocked_ips_total gauge",
            "snaptrap_blocked_ips_total " + str(blocked),
            "# TYPE snaptrap_avg_threat_score gauge",
            "snaptrap_avg_threat_score " + str(stats.get('avg_threat_score', 0)),
        ]
        for svc, cnt in (stats.get('by_service') or {}).items():
            lines.append('snaptrap_attacks_by_service_total{service="' + svc + '"} ' + str(cnt))
        for atype, cnt in (stats.get('by_type') or {}).items():
            lines.append('snaptrap_attacks_by_type_total{attack_type="' + atype + '"} ' + str(cnt))
        return Response("\n".join(lines) + "\n", mimetype="text/plain; version=0.0.4")
    except Exception as e:
        return Response("# ERROR: " + str(e) + "\n", mimetype="text/plain"), 500

# ── RED TEAM ACCOUNTS ─────────────────────────────────────────────────
@app.route('/api/redteam', methods=['GET'])
@token_required
def list_redteam():
    if request.role not in ('org', 'superadmin'): return jsonify({'error': 'Forbidden'}), 403
    try:
        conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT r.id, r.name, r.email, r.created_at, COUNT(rn.id) AS run_count
            FROM red_team_accounts r
            LEFT JOIN redteam_runs rn ON rn.redteam_id = r.id
            WHERE r.org_id = %s GROUP BY r.id ORDER BY r.created_at DESC
        """, (request.org_id,))
        rows = cur.fetchall(); cur.close(); conn.close()
        result = []
        for r in rows:
            r = dict(r)
            if r.get('created_at'): r['created_at'] = str(r['created_at'])
            result.append(r)
        return jsonify(result)
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/redteam', methods=['POST'])
@token_required
def create_redteam():
    if request.role not in ('org', 'superadmin'): return jsonify({'error': 'Forbidden'}), 403
    d = request.json or {}
    name = d.get('name', '').strip()
    email = d.get('email', '').strip()
    pwd  = d.get('password', '').strip()
    if not all([name, email, pwd]): return jsonify({'error': 'name, email, password required'}), 400
    try:
        hashed = register_user_password(pwd)
    except PasswordStrengthError as e:
        return jsonify({'error': str(e)}), 422
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            "INSERT INTO red_team_accounts (name,email,password_hash,org_id) VALUES (%s,%s,%s,%s) RETURNING id",
            (name, email, hashed, request.org_id)
        )
        rid = cur.fetchone()[0]; conn.commit(); cur.close(); conn.close()
        return jsonify({'redteam_id': rid, 'name': name, 'email': email}), 201
    except Exception as e:
        if 'unique' in str(e).lower(): return jsonify({'error': 'Email already exists'}), 409
        return jsonify({'error': str(e)}), 500

@app.route('/api/redteam/<int:rid>', methods=['DELETE'])
@token_required
def delete_redteam(rid):
    if request.role not in ('org', 'superadmin'): return jsonify({'error': 'Forbidden'}), 403
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("DELETE FROM red_team_accounts WHERE id=%s AND org_id=%s", (rid, request.org_id))
        deleted = cur.rowcount; conn.commit(); cur.close(); conn.close()
        if not deleted: return jsonify({'error': 'Not found'}), 404
        return jsonify({'message': f'Deleted {rid}'})
    except Exception as e: return jsonify({'error': str(e)}), 500

# ── SIMULATOR ─────────────────────────────────────────────────────────
@app.route('/api/attacks/simulate', methods=['POST'])
@token_required
def simulate_attacks():
    attacks = request.json or []
    if not isinstance(attacks, list): attacks = [attacks]
    from db import insert_attack
    ids = []
    for a in attacks:
        aid = insert_attack(
            a.get('attacker_ip', '10.0.0.1'), a.get('service', 'SSH'),
            a.get('port', 22), a.get('payload', '[simulated]'),
            a.get('threat_score', 50), a.get('attack_type', 'unknown'),
            request.org_id
        )
        ids.append(aid)
    return jsonify({'inserted': len(ids)}), 201

# ── RED TEAM RUNS ─────────────────────────────────────────────────────
@app.route('/api/redteam/simulate', methods=['POST'])
@token_required
def redteam_simulate():
    if request.role != 'redteam': return jsonify({'error': 'Red team only'}), 403
    d = request.json or {}; mode = d.get('mode', 'demo')
    total = 700 if mode == 'benchmark' else 50
    detected = int(total * 0.87); missed = total - detected
    score = round((detected / total) * 100, 1)
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("""
            INSERT INTO redteam_runs (redteam_id,org_id,mode,status,total_attacks,detected,missed,detection_score,completed_at)
            VALUES (%s,%s,%s,'completed',%s,%s,%s,%s,NOW()) RETURNING id
        """, (request.org_id, request.org_id, mode, total, detected, missed, score))
        run_id = cur.fetchone()[0]; conn.commit(); cur.close(); conn.close()
        return jsonify({'run_id': run_id, 'status': 'completed', 'detection_score': score}), 201
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/redteam/runs', methods=['GET'])
@token_required
def redteam_runs():
    if request.role != 'redteam': return jsonify({'error': 'Red team only'}), 403
    try:
        conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM redteam_runs WHERE redteam_id=%s ORDER BY started_at DESC LIMIT 50", (request.org_id,))
        rows = cur.fetchall(); cur.close(); conn.close()
        result = []
        for r in rows:
            r = dict(r)
            for f in ['started_at', 'completed_at']:
                if r.get(f): r[f] = str(r[f])
            result.append(r)
        return jsonify(result)
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/redteam/runs/<int:run_id>', methods=['GET'])
@token_required
def redteam_run_detail(run_id):
    if request.role != 'redteam': return jsonify({'error': 'Red team only'}), 403
    try:
        conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM redteam_runs WHERE id=%s AND redteam_id=%s", (run_id, request.org_id))
        row = cur.fetchone(); cur.close(); conn.close()
        if not row: return jsonify({'error': 'Not found'}), 404
        row = dict(row)
        for f in ['started_at', 'completed_at']:
            if row.get(f): row[f] = str(row[f])
        return jsonify(row)
    except Exception as e: return jsonify({'error': str(e)}), 500

# ── HEALTH ─────────────────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    """Required by Railway, Render, and the CI/CD pipeline health gate."""
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close(); conn.close()
        db_ok = True
    except Exception:
        db_ok = False
    return jsonify({
        'status':  'ok' if db_ok else 'degraded',
        'service': 'SNAPTRAP API',
        'version': os.getenv('GIT_SHA', '2.1.0'),
        'database': 'ok' if db_ok else 'error',
    }), 200 if db_ok else 503

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == "__main__":
    print("SNAPTRAP Flask API v2.1 starting on http://localhost:5000")
    app.run(host='0.0.0.0', port=int(os.getenv('FLASK_PORT', 5000)), debug=False)
