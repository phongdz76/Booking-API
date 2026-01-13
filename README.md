# Booking API - Google Calendar & Microsoft Outlook Integration

API tích hợp Google Calendar và Microsoft Outlook Calendar cho hệ thống booking nội bộ. Tạo lịch hẹn qua API và tự động hiển thị trên Google Calendar hoặc Outlook Calendar.

## Công nghệ

- Express.js + TypeScript
- Google Calendar API
- Microsoft Graph API (Outlook Calendar)
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
# Google Calendar
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URL=http://localhost:8080/google/callback

# Microsoft Outlook
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URL=http://localhost:8080/microsoft/callback

PORT=8080
```

### 3. Lấy Google Credentials

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới
3. Bật Google Calendar API
4. Tạo OAuth 2.0 Client ID
5. Thêm redirect URI: `http://localhost:8080/google/callback`
6. Copy Client ID và Secret vào `.env`

### 4. Lấy Microsoft Credentials

1. Vào [Azure Portal](https://portal.azure.com/)
2. Tìm **App registrations** → **New registration**
3. Nhập thông tin:
   - Name: `Booking-API`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: Web - `http://localhost:8080/microsoft/callback`
4. Sau khi tạo:
   - Copy **Application (client) ID** → `MICROSOFT_CLIENT_ID`
   - Vào **Certificates & secrets** → **New client secret** → Copy value → `MICROSOFT_CLIENT_SECRET`
5. Vào **API permissions**:
   - Add permission → Microsoft Graph → Delegated permissions
   - Chọn: `Calendars.ReadWrite`
   - Grant admin consent (nếu cần)

### 5. Chạy server

```bash
npm run dev
```

Server chạy tại: `http://localhost:8080`

---

## API Endpoints

## 📅 Google Calendar

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

### 2. Tạo Google Calendar Event

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

**Response thành công:**

```json
{
  "message": "Event created successfully",
  "eventId": "abc123xyz",
  "eventLink": "https://calendar.google.com/event?eid=...",
  "meetLink": "https://meet.google.com/xxx-yyyy-zzz"
}
```

---

## 📧 Microsoft Outlook Calendar

### 1. Xác thực Microsoft

**Bước 1:** Mở trình duyệt, truy cập:
```
GET http://localhost:8080/microsoft/auth
```

Đăng nhập Microsoft (Outlook/Office 365) và cho phép quyền truy cập Calendar.

**Bước 2:** Sau khi xác thực thành công, bạn sẽ thấy trang HTML hiển thị:
- ✅ Access Token (copy token này)
- ⏰ Thời gian hết hạn
- 📋 Nút "Copy Token" để copy nhanh

**Response JSON (nếu test qua API):**
```json
{
  "message": "Successfully authenticated with Microsoft",
  "accessToken": "eyJ0eXAiOiJKV1QiLCJub25jZSI6...",
  "expiresOn": "2026-01-13T09:00:00.000Z"
}
```

⚠️ **Lưu ý:** Access token hết hạn sau ~1 giờ. Cần xác thực lại khi hết hạn.

### 2. Tạo Outlook Calendar Event

```
POST http://localhost:8080/microsoft/create-event
Content-Type: application/json
```

**Request Body:**

```json
{
  "accessToken": "eyJ0eXAiOiJKV1QiLCJub25jZSI6...",
  "title": "Client Presentation",
  "description": "Present Q1 results to client",
  "location": "Conference Room B",
  "startTime": "2026-01-20T10:00:00",
  "endTime": "2026-01-20T11:30:00",
  "participants": ["client@company.com", "manager@company.com"],
  "needMeetLink": true
}
```

**Các trường bắt buộc:**
- `accessToken`: Token nhận được từ `/microsoft/callback`
- `title`: Tiêu đề sự kiện
- `description`: Mô tả
- `location`: Địa điểm
- `startTime`: Thời gian bắt đầu (ISO 8601)
- `endTime`: Thời gian kết thúc (ISO 8601)

**Các trường tùy chọn:**
- `participants`: Mảng email người tham gia
- `needMeetLink`: true nếu cần Microsoft Teams meeting link

**Response thành công:**

```json
{
  "message": "Event created successfully",
  "eventId": "AAMkAGI2T...",
  "eventLink": "https://outlook.office365.com/calendar/...",
  "meetLink": "https://teams.microsoft.com/l/meetup-join/..."
}
```

---

## 🧪 Sử dụng với Postman

### Google Calendar Flow

1. **Xác thực:**
   - Mở browser: `http://localhost:8080/google/auth`
   - Đăng nhập Google
   
2. **Tạo event:**
   - Method: POST
   - URL: `http://localhost:8080/google/create-event`
   - Body: JSON (không cần token)
   - Send

3. Kiểm tra Google Calendar

### Microsoft Outlook Flow

1. **Xác thực:**
   - Mở browser: `http://localhost:8080/microsoft/auth`
   - Đăng nhập Microsoft
   - **Copy access token** từ trang hiển thị (hoặc response)

2. **Tạo event:**
   - Method: POST
   - URL: `http://localhost:8080/microsoft/create-event`
   - Headers: `Content-Type: application/json`
   - Body: JSON (bao gồm `accessToken`)
   - Send

3. Kiểm tra Outlook Calendar

⚠️ **Lưu ý quan trọng:**
- Google: Token được lưu tự động, không cần gửi lại
- Microsoft: Phải gửi `accessToken` trong mỗi request
- Authorization code chỉ valid trong ~10 phút, xử lý nhanh!

---

## ✅ Validation

API validate các điều kiện sau:

### Common (Cả Google & Microsoft)
- ✉️ Email phải đúng format: `user@domain.com`
- 📅 DateTime phải đúng format ISO 8601
- ⏰ `endTime` phải sau `startTime`
- 🚫 `startTime` không được trong quá khứ
- 📝 Các trường bắt buộc không được để trống
- 🔢 `needMeetLink` phải là boolean
- 👥 `participants` phải là array (nếu có)

### Microsoft specific
- 🔑 `accessToken` bắt buộc và phải là string
- ⏱️ Token hết hạn → status 401

---

## 📋 Ví dụ Request/Response

### Google Calendar - Event với Google Meet

**Request:**
```json
{
  "title": "Remote Standup",
  "description": "Daily team sync",
  "location": "Online",
  "startTime": "2026-01-21T09:00:00+07:00",
  "endTime": "2026-01-21T09:30:00+07:00",
  "participants": ["team@company.com"],
  "needMeetLink": true
}
```

**Response:**
```json
{
  "message": "Event created successfully",
  "eventId": "abc123",
  "eventLink": "https://calendar.google.com/event?eid=...",
  "meetLink": "https://meet.google.com/abc-defg-hij"
}
```

### Microsoft Outlook - Event với Teams Meeting

**Request:**
```json
{
  "accessToken": "eyJ0eXAiOiJKV1Qi...",
  "title": "All Hands Meeting",
  "description": "Company quarterly update",
  "location": "Virtual",
  "startTime": "2026-01-22T15:00:00",
  "endTime": "2026-01-22T16:00:00",
  "participants": ["everyone@company.com"],
  "needMeetLink": true
}
```


## Cấu trúc project

```
Booking-API/
├── index.ts           # Main file với tất cả routes
├── .env              # Environment variables (không commit)
├── .env.example      # Template
├── package.json
├── tsconfig.json
└── README.md
```
