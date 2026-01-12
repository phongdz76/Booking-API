# Booking API - Google Calendar Integration

API tích hợp Google Calendar cho hệ thống booking nội bộ. Tạo lịch hẹn qua API và tự động hiển thị trên Google Calendar.

## Công nghệ

- Express.js + TypeScript
- Google Calendar API
- OAuth2 Authentication

## Cài đặt

### 1. Clone và cài đặt

```bash
git clone <repository-url>
cd Booking-API
npm install
```

### 2. Cấu hình môi trường

Copy file `.env.example` thành `.env` và điền thông tin:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URL=http://localhost:8080/google/callback
PORT=8080
```

### 3. Lấy Google Credentials

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới
3. Bật Google Calendar API
4. Tạo OAuth 2.0 Client ID
5. Thêm redirect URI: `http://localhost:8080/google/callback`
6. Copy Client ID và Secret vào `.env`

### 4. Chạy server

```bash
npm run dev
```

Server chạy tại: `http://localhost:8080`

## API Endpoints

### 1. Xác thực Google

**Bước 1:** Mở trình duyệt, truy cập:
```
GET http://localhost:8080/google/auth
```

Đăng nhập Google và cho phép quyền truy cập Calendar.

**Bước 2:** Sau khi xác thực thành công, bạn nhận được message:
```json
{
  "message": "Successfully authenticated with Google Calendar"
}
```

### 2. Tạo Event

```
POST http://localhost:8080/google/create-event
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "Team Meeting",
  "description": "Discuss Q1 goals",
  "location": "Meeting Room A",
  "startTime": "2026-01-20T14:00:00+07:00",
  "endTime": "2026-01-20T15:00:00+07:00",
  "participants": ["user1@example.com", "user2@example.com"],
  "needMeetLink": true
}
```

**Các trường bắt buộc:**
- `title`: Tiêu đề sự kiện
- `description`: Mô tả
- `location`: Địa điểm
- `startTime`: Thời gian bắt đầu (ISO 8601)
- `endTime`: Thời gian kết thúc (ISO 8601)

**Các trường tùy chọn:**
- `participants`: Mảng email người tham gia
- `needMeetLink`: true nếu cần Google Meet link

**Response thành công:**

```json
{
  "message": "Event created successfully",
  "eventId": "abc123xyz",
  "eventLink": "https://calendar.google.com/event?eid=...",
  "meetLink": "https://meet.google.com/xxx-yyyy-zzz"
}
```

## Sử dụng với Postman

1. Xác thực:
   - Mở browser: `http://localhost:8080/google/auth`
   - Đăng nhập Google
   
2. Tạo event:
   - Method: POST
   - URL: `http://localhost:8080/google/create-event`
   - Body: JSON như ví dụ trên
   - Send

3. Kiểm tra Google Calendar

## Validation

- Email phải đúng format: `user@domain.com`
- DateTime phải đúng format ISO 8601
- `endTime` phải sau `startTime`
- `startTime` không được trong quá khứ


## Cấu trúc project

```
Booking-API/
├── index.ts           # Main file
├── .env              # Environment variables (không commit)
├── .env.example      # Template
├── package.json
└── README.md
```
