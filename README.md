# Dataset Builder (Web B)

Hệ thống thu thập bộ câu hỏi – câu trả lời chuẩn (golden dataset) cho chatbot y tế. Bác sĩ tạo câu hỏi theo phân loại, viết câu trả lời chuẩn theo cấu trúc 4 phần và trích dẫn trực tiếp từ guideline đồng bộ từ hệ thống quản lý tài liệu (Web A).

## Kiến trúc tổng quan

Web B gồm 3 thành phần chính chạy bằng Docker Compose:

- **Frontend** (`:8090`): React 18 + TypeScript + Vite, phục vụ qua nginx.
- **Backend** (`:8020`): FastAPI (Python 3.12) + SQLAlchemy async + asyncpg.
- **PostgreSQL** (`:5438` trên host, `golden_dataset` trong container).

Luồng dữ liệu:

1. Web A (PostgreSQL `guideline_management`) xuất guideline qua user read-only `web_b_readonly`.
2. Backend Web B kết nối qua network `chatbot-db` và đồng bộ tài liệu, chunk về database của mình.
3. Frontend gọi REST API của backend để hiển thị guideline và cho phép bác sĩ tạo câu hỏi, trích dẫn, xuất dataset.

## Yêu cầu trước khi chạy

- Docker Desktop
- Web A đang chạy với database `guideline_management`
- Container DB của Web A nằm trong network ngoài `chatbot-db` (hostname `guideline-db`)
- User read-only `web_b_readonly` đã được tạo trên Web A (`backend/scripts/setup_web_b_user.sql`)

## Quick start

```powershell
docker compose up -d --build
```

| Dịch vụ | URL |
|---|---|
| Giao diện | http://localhost:8090 |
| API | http://localhost:8020/api/v1 |
| API docs | http://localhost:8020/docs |
| PostgreSQL | `localhost:5438` — user/pass/db: `golden` |

Tài khoản admin mặc định: `admin@example.com` / `ChangeMe123!`

Bác sĩ demo: `huy@gmail.com` / `111111`

### Cấu hình Docker qua `.env`

File `.env` đặt ở thư mục gốc, cùng cấp với `docker-compose.yml`. Các cổng host có thể đổi mà không cần sửa Compose:

```env
PUBLIC_HOST=localhost
BACKEND_HOST_PORT=8020
FRONTEND_HOST_PORT=8090
POSTGRES_HOST_PORT=5438
```

Ví dụ, nếu `8020` bị chiếm, chỉ cần đổi `BACKEND_HOST_PORT=8021` rồi chạy lại `docker compose up -d --build`. Frontend API URL và CORS sẽ tự cập nhật theo cổng mới.

## Cấu trúc thư mục

```
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── api/        # FastAPI routers
│   │   ├── core/       # Config, database, auth, exceptions
│   │   ├── models/     # SQLAlchemy ORM models
│   │   ├── schemas/    # Pydantic models
│   │   ├── services/   # Business logic
│   │   ├── seed/       # Seed taxonomy + admin
│   │   └── sync/       # Đồng bộ dữ liệu từ Web A
│   └── scripts/        # Utility scripts (sync, seed, setup user)
└── frontend/
    └── src/
        ├── api/        # API clients
        ├── components/ # UI components
        ├── lib/        # Types, helpers
        └── pages/      # Route pages
```

## Chức năng chính

### Dành cho bác sĩ

- **Workspace**: tạo câu hỏi theo nhóm/phân nhóm taxonomy.
- **Câu trả lời chuẩn 4 phần** (mỗi phần 20–200 từ):
  - **Dữ kiện** (Evidence)
  - **Phát hiện** (Finding)
  - **Ấn tượng lâm sàng** (Impression)
  - **Kết luận** (Conclusion)
- **Trích dẫn guideline**: chọn tài liệu → chọn đoạn (chunk) làm trích dẫn Bắt buộc/Bổ trợ, hỗ trợ tìm kiếm.
- **Khảo sát** dành cho bác sĩ.

### Dành cho admin

- Quản lý tài khoản bác sĩ.
- Theo dõi tiến độ thu thập.
- Đồng bộ guideline thủ công: `POST /api/v1/admin/sync`.
- Xuất golden dataset: CSV / JSON / XLSX qua `GET /api/v1/export`.

## Đồng bộ từ Web A

- Một chiều: Web A → Web B, read-only.
- Tự động chạy mỗi `GUIDELINE_SYNC_INTERVAL_MINUTES` (mặc định 60 phút).
- Idempotent: upsert theo `external_document_id` / `external_chunk_id`, chạy lại không tạo trùng.
- **Tài liệu bị xóa ở Web A** → soft-delete (`status='deleted'`) trên Web B, chunks vẫn giữ để trích dẫn cũ không mất.
- **Chunk bị xóa ở Web A** → reconcile, xóa tương ứng trên Web B.

Chạy sync thủ công:

```powershell
docker exec -w /app dataset-builder-backend python scripts/run_sync_once.py
```

## Biến môi trường quan trọng

| Biến | Mô tả | Mặc định |
|---|---|---|
| `BACKEND_HOST_PORT` | Cổng host của API Web B | `8020` |
| `FRONTEND_HOST_PORT` | Cổng host của giao diện Web B | `8090` |
| `POSTGRES_HOST_PORT` | Cổng host của PostgreSQL Web B | `5438` |
| `PUBLIC_HOST` | Host dùng trong URL frontend/API | `localhost` |
| `DB_*` | Kết nối PostgreSQL Web B | `postgres:5432/golden_dataset` |
| `GUIDELINE_SYNC_DB_*` | Kết nối read-only Web A | `guideline-db:5432/guideline_management` |
| `GUIDELINE_SYNC_ENABLED` | Bật/tắt sync tự động | `true` |
| `GUIDELINE_SYNC_INTERVAL_MINUTES` | Chu kỳ sync tính bằng phút | `60` (file `.env` hiện tại: `2`) |
| `JWT_SECRET_KEY` | Khóa ký JWT (đổi khi deploy) | `change-this-secret` |
| `AUTO_CREATE_TABLES` | Tự tạo bảng khi khởi động | `true` |
| `SEED_TAXONOMY` | Tự seed taxonomy khi khởi động | `true` |
| `DEFAULT_ADMIN_*` | Tài khoản admin mặc định | `admin@example.com` |

Lưu ý: cổng host của DB Web B là `5438` vì `5437` từng bị chiếm trên Windows.

## Lệnh Docker thường dùng

```powershell
# Khởi động / build lại
docker compose up -d --build

# Build riêng 1 service
docker compose up -d --build backend
docker compose up -d --build frontend

# Dừng (giữ dữ liệu)
docker compose down

# Dừng + xóa dữ liệu database (cẩn thận!)
docker compose down -v

# Trạng thái

docker compose ps

# Logs

docker logs dataset-builder-backend -f
docker logs dataset-builder-backend --tail 100
docker compose logs -f

# Chạy lệnh trong container
docker exec -it dataset-builder-backend bash
docker exec -w /app dataset-builder-backend python scripts/run_sync_once.py
docker exec -it dataset-builder-db psql -U golden -d golden_dataset

# Network Web A
docker network ls | Select-String chatbot-db
docker network create chatbot-db          # nếu chưa tồn tại

# Backup / restore
docker exec dataset-builder-db pg_dump -U golden golden_dataset > backup.sql
Get-Content backup.sql | docker exec -i dataset-builder-db psql -U golden -d golden_dataset
```

## Xử lý sự cố thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Bind for 0.0.0.0:5438 failed: port is already allocated` | Cổng host bị chiếm | Đổi cổng DB trong `docker-compose.yml`, rồi `down` + `up -d` |
| `network chatbot-db not found` | Web A chưa chạy / thiếu network | Khởi động Web A hoặc `docker network create chatbot-db` |
| `Connection refused` khi sync | Sai host/port Web A | `GUIDELINE_SYNC_DB_HOST=guideline-db`, `GUIDELINE_SYNC_DB_PORT=5432` (cổng nội bộ container) |
| Sửa code không có tác dụng | Image cũ | `docker compose up -d --build` |
| Backend không kết nối được DB | DB chưa healthy | `docker compose ps`, chờ `dataset-builder-db` healthy |

## Phát triển cục bộ (không Docker)

Backend:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Cấu hình backend cục bộ qua `backend/.env` (xem các biến ở bảng trên; `DB_PORT=5438` khi trỏ tới container postgres của Web B).

## Seed dữ liệu demo

```powershell
# Tài khoản bác sĩ demo + 120 câu hỏi mẫu
docker exec -w /app dataset-builder-backend python scripts/seed_demo_doctor.py
```
