# Backend

FastAPI + PostgreSQL (local install, no Docker).

## Setup

```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

In `.env`, set `DATABASE_URL` and a long random `SECRET_KEY` (used to sign admin login tokens).

Create the database once, then put the real password in `.env`:

```powershell
psql -U postgres -c "CREATE DATABASE production_dashboard"
```

## Run

```powershell
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

`python -m app.seed` creates the superadmin and the workshops "Workshop 5" and "Workshop 6" (existing ones are kept). Credentials come from, in order: `--username` and `--password` arguments, `SEED_ADMIN_USERNAME` and `SEED_ADMIN_PASSWORD` in `.env`, then a prompt. Password minimum is 8 characters. Running it again resets that user's password.

```powershell
python -m app.seed --username admin --password "ganti-dengan-password-kuat"
```

Reset the database from scratch (drops every table, then rebuilds them):

```powershell
alembic downgrade base
alembic upgrade head
```

If the database itself was deleted, recreate it with the `CREATE DATABASE` command above, then run `alembic upgrade head`.

After changing a model, generate a new migration with `alembic revision --autogenerate -m "describe change"` and review it before applying.

Docs: http://localhost:8000/docs, health check: http://localhost:8000/api/health

## TeamTalk

TeamTalk defaults to disabled. On a personal PC, use `TEAMTALK_ENABLED=false` in `.env`; the backend skips TeamTalk delivery and its reminder scheduler, and does not need `httpx` to import the application.

To enable it on the office PC, install the dependencies from `requirements.txt`, set `TEAMTALK_ENABLED=true` and `TEAMTALK_WEBHOOK_URL` to the office webhook URL, then restart the backend. The reminder scheduler only starts when both settings are configured.

## API

- `POST /api/auth/login`, `GET /api/auth/me`: login for the superadmin (username) and for employees (NIK as username). The initial employee password is the NIK, and `mustChangePassword` stays true until `POST /api/auth/change-password` succeeds. Employees with `mustChangePassword` can only call `/auth/me` and `/auth/change-password`. Login is limited to 5 wrong attempts per IP and username, then locked for 5 minutes (in memory, per process).
- `GET /api/lines`: lines the logged-in account may see on the admin dashboard tab. Admin gets all, member and leader get their own active line, supervisor gets none until the scope is decided. Non-admins see only the Dashboard tab of the admin panel; the TV boards stay public and need no login.
- `GET /api/lines/{line_id}/board`: a member or leader only reaches their own active line, the admin reaches every line, supervisors are refused until their scope is decided.
- Employees pick their supervisor by `supervisorId`, which must point to an active employee with role `supervisor` (optional, never required). Register supervisors first. A supervisor who still has people under them cannot be deleted or changed to another role. TV boards show the supervisor's current name, so renaming a supervisor updates every board. Old free-text supervisors stay as a fallback until a real supervisor is chosen.
- `POST /api/admin/employees/{id}/reset-password`: sets the password back to the NIK (or to a given `password`) and forces a change at the next login.
- `GET /api/public/boards`, `GET /api/public/boards/{slug}`: no login, used by the TV dashboards.
- `/api/admin/...`: workshops, lines, team members, and MPV history. Requires the superadmin token.
- `GET|PUT|DELETE /api/admin/lines/{id}/mpv[/{YYYY-MM}]`: one MPV per line per month. The public board shows the previous month's MPV (October shows September), or the latest earlier month if that one is empty.

Every line owns exactly one board. The board slug is its public link, `/dm-dashboard/{slug}` on the frontend.

## Face ID (DM Meeting attendance)

Leaders take attendance by scanning faces on the DM Meeting page. The server finds who is in front of the camera, checks that it is a live face, and writes the attendance row.

How it works:

- **Enrollment.** The profile photo uploaded in the admin Pengguna form is turned into a face template (512 numbers, not an image) and stored in `face_templates`. Only active employees are matched.
- **Scan.** The browser sends one or more camera frames. The server picks the largest face, matches it against every enrolled employee (cosine similarity in memory), and refuses the scan when the best match is below `FACE_MATCH_THRESHOLD` or too close to the second best person (`FACE_MATCH_MARGIN`).
- **Liveness.** A head-movement challenge (`FACE_LIVENESS_*`) and a single-frame anti-spoofing model (MiniFASNetV2 + V1SE, `FACE_ANTISPOOF_*`) reject photos and screens.
- **Joint meetings.** Anyone can be scanned in any line's session. When the person belongs to another line, a mirror attendance row is also written to their own line's session with the same date, shift and session number, so their leader sees them as present.
- **Learning.** A scan scoring above `FACE_UPDATE_THRESHOLD` adds a `camera` template (at most 3 per employee). The enrollment `photo` template is never overwritten by a scan.

### First start

`insightface` downloads the `buffalo_l` model (about 300 MB) into `~/.insightface/models` the first time the backend starts, so the first start needs internet and takes a while. The anti-spoofing models are kept in the repo under `models/anti_spoof/` (source, license and checksums in that folder's README). Without them the backend does not start while `FACE_ANTISPOOF_ENABLED` is true. Inference runs on CPU through `onnxruntime`.

### Settings

Every value below is optional in `.env` and falls back to the default shown.

| Variable | Default | Meaning |
| --- | --- | --- |
| `FACE_MATCH_THRESHOLD` | `0.45` | Minimum similarity to accept a match |
| `FACE_MATCH_MARGIN` | `0.05` | Minimum gap to the best *other* person, so look-alikes are refused instead of guessed |
| `FACE_UPDATE_THRESHOLD` | `0.65` | Minimum similarity before a scan may add a `camera` template |
| `FACE_CROWD_RATIO` | `0.6` | The scan is refused when a second face is bigger than this fraction of the largest one |
| `FACE_LIVENESS_ENABLED` | `true` | Head-movement challenge. `false` takes one frame with no challenge; anti-spoofing still runs |
| `FACE_LIVENESS_MODE` | `motion` | `motion` = any head movement, `turn` = random left or right |
| `FACE_MIN_MOTION` | `8.0` | Degrees of movement required in `motion` mode |
| `FACE_MIN_YAW_DELTA` | `15.0` | Degrees of turning required in `turn` mode |
| `FACE_LEFT_YAW_SIGN` | `1` | Set to `-1` if left and right are swapped on your camera |
| `FACE_CHALLENGE_SECONDS` | `30` | How long a challenge token stays valid (single use, tied to the session) |
| `FACE_LIVENESS_SAME_PERSON` | `0.3` | Minimum similarity between the frames of one scan |
| `FACE_ANTISPOOF_ENABLED` | `true` | Reject faces shown from a screen or print |
| `FACE_ANTISPOOF_MIN_REAL` | `0.5` | Minimum "real" score from the anti-spoofing models |

All thresholds are starting points. On one test webcam real faces scored 0.91 to 0.99 and a phone video scored 0.00, but the values depend on camera and lighting, so measure again at each site. The backend logs a line like `antispoof real=0.912 yaw=3.1 min=0.50` for every scan that reaches that check. To measure without rejecting anyone, set `FACE_ANTISPOOF_MIN_REAL=0.0`, scan real faces and the fakes you want to block, then set the threshold between the two groups.

### Enrolling faces

- **Admin form.** Upload a clear, front-facing photo with one face in the Pengguna form. The template is created on save and replaced when the photo is replaced. Removing the photo deletes every template of that employee. If the photo cannot be used (no face, several faces, low quality) the user is still saved and the form shows why Face ID is not active. The Face ID column in the user list shows the state.
- **Existing photos.** `python -m app.enroll_photos` enrolls every active employee who has a photo but no template yet. Restart the backend afterwards.
- **By hand.** `POST /api/face/enroll/{employeeId}` (multipart field `photo`, superadmin only), `GET /api/face/status/{employeeId}` and `DELETE /api/face/{employeeId}`.

### Endpoints

- `POST /api/meetings/sessions/{id}/challenge`: starts a scan and returns a single-use token (and a direction in `turn` mode).
- `POST /api/meetings/sessions/{id}/scan`: multipart `frames` (1 to 4 images) and `token`. Returns who was recognized, or why not. Leaders only.
- `POST /api/meetings/sessions/{id}/presensi/close`: records the NIKs that did not scan as absent.
- `PUT /api/meetings/sessions/{id}/absence-notes`: reason per absent member (`represented`, `permit`, `sick`, `none`) with a note. An attendee who already scanned is never changed. Who filled it and when are stored in `note_by_id` and `note_at`.
- `GET /api/meetings/employees/{nik}/photo`: the profile photo of a scanned guest, fetched once per person by the frontend.

### Camera access

Browsers only allow the camera on `localhost` or over HTTPS. A kiosk that opens the dashboard through a LAN address over plain HTTP gets no camera. Use HTTPS with a certificate the kiosk trusts. For a quick test, start Chrome with `--unsafely-treat-insecure-origin-as-secure=http://<server>:3000 --user-data-dir=<any folder>`; this must be set on every kiosk.

### Data and privacy

The face template cannot be turned back into a photo, but it identifies a person, so treat it as biometric data: collect consent, keep the server local, and delete a template when someone leaves (`DELETE /api/face/{employeeId}`; deleting the employee removes it too). The profile photo itself is a separate field (`employees.photo_url`) and is not deleted by that call.

## Meeting per lini dan gabungan DM

Admin membuat Workshop, menambahkan DM di dalam workshop, lalu membuat lini dalam DM dan mengatur tim/leader tiap lini. DM yang masih memiliki lini tidak dapat dihapus. Penempatan lini dan DM disimpan dalam satu transaksi.

Di halaman DM Meeting, leader memilih lini penugasannya lalu memilih `Lini Saya` atau `Gabungan DM` sebelum membuka presensi. Meeting gabungan memakai jadwal sesi dari lini yang dipilih. Satu leader mengelola sesi tersebut; lini lain dalam DM menerima sesi dan presensi yang tersinkron. Anggota yang terdaftar di beberapa lini hanya perlu scan sekali. Rekap admin tetap memisahkan hasil per lini.

Saat presensi dibuka, daftar peserta dan asal lini disimpan sebagai snapshot. Perpindahan tim atau leader minggu berikutnya tidak mengubah snapshot meeting sebelumnya. Mode dan peserta dikunci selama sesi, dan meeting gabungan ditolak jika salah satu lini sudah membuka sesi pada tanggal, shift, dan nomor sesi yang sama.

Jalankan `alembic upgrade head` sebelum menggunakan perubahan ini (migrasi `0017`). Di PC lain, jalankan migrasi setelah menarik kode terbaru, lalu restart backend.

Tes integrasi PostgreSQL: `.venv/bin/python -m unittest discover -s tests -v`. Tes memerlukan izin membuat schema sementara; semua data tes di-rollback dan tidak memakai tabel operasional.
