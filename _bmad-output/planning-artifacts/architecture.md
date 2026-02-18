# System Architecture Design
# Şehir İçi Reklam ve Direk Yönetim Sistemi

**Tarih:** 03 Şubat 2026  
**Versiyon:** 1.0  
**Hazırlayan:** Architecture Team

---

## 🏗️ System Overview

Pole Banner Management System (PBMS), 3-tier architecture pattern kullanarak geliştirilmiş bir web uygulamasıdır:

- **Presentation Layer:** React SPA (Single Page Application)
- **Application Layer:** Node.js + Express.js REST API
- **Data Layer:** PostgreSQL (PostGIS) + Redis

---

## 📐 High-Level Architecture

```mermaid
graph TB
    subgraph "Client Side"
        Web[React Web App<br/>Vite + React 18]
        Mobile[Mobile Browser<br/>Responsive UI]
    end
    
    subgraph "Application Server"
        API[Express.js API<br/>Port 3000]
        Auth[JWT Auth<br/>Middleware]
        Queue[Bull Queue<br/>Job Processing]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL<br/>+ PostGIS)]
        Redis[(Redis<br/>Cache + Queue)]
        Files[File Storage<br/>Local/Cloud]
    end
    
    subgraph "External Services"
        Email[Email Service<br/>Nodemailer]
        Geo[Geocoding API<br/>Nominatim]
    end
    
    Web --> API
    Mobile --> API
    API --> Auth
    API --> PG
    API --> Redis
    API --> Files
    Queue --> Email
    API --> Geo
    Queue --> Redis
```

---

## 🔐 Authentication & Authorization Flow

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API
    participant Auth
    participant DB
    
    User->>Client: Email + Password
    Client->>API: POST /api/auth/login
    API->>DB: Query user
    DB-->>API: User data
    API->>Auth: Verify password (bcrypt)
    Auth-->>API: Valid
    API->>Auth: Generate JWT token
    Auth-->>API: Token
    API-->>Client: {token, user, role}
    Client->>Client: Store token (localStorage)
    
    Note over Client,API: Subsequent requests
    Client->>API: GET /api/poles<br/>Header: Authorization: Bearer {token}
    API->>Auth: Verify JWT
    Auth->>Auth: Check role permissions
    Auth-->>API: Authorized
    API->>DB: Fetch poles
    DB-->>API: Poles data
    API-->>Client: Response
```

**JWT Token Payload:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "OPERATOR",
  "iat": 1612345678,
  "exp": 1612374478
}
```

**Token Expiration:** 8 saat  
**Token Secret:** Environment variable `JWT_SECRET`

---

## 🗄️ Database Schema (ERD)

### Entity Relationship Diagram

```mermaid
erDiagram
    Users ||--o{ Orders : creates
    Users ||--o{ Orders : assigned_printer
    Users ||--o{ Orders : assigned_field
    Poles ||--o{ Orders : has
    Orders ||--o{ WorkflowHistory : tracks
    Orders ||--o{ Files : contains
    Users ||--o{ WorkflowHistory : changes
    
    Users {
        UUID id PK
        String email UK
        String password
        Enum role
        String name
        String phone
        Boolean active
        DateTime created_at
        DateTime updated_at
    }
    
    Poles {
        UUID id PK
        String pole_code UK
        Float latitude
        Float longitude
        String city
        String district
        String neighborhood
        String street
        Int sequence_no
        Enum status
        DateTime created_at
        DateTime updated_at
    }
    
    Orders {
        UUID id PK
        UUID pole_id FK
        String client_name
        String client_contact
        Date start_date
        Date end_date
        Enum status
        String contract_file_url
        String ad_image_url
        UUID created_by FK
        UUID assigned_printer FK
        UUID assigned_field FK
        DateTime created_at
        DateTime updated_at
    }
    
    WorkflowHistory {
        UUID id PK
        UUID order_id FK
        String old_status
        String new_status
        UUID changed_by FK
        Text notes
        DateTime timestamp
    }
    
    PricingConfig {
        UUID id PK
        String key UK
        Decimal value
        String unit
        DateTime updated_at
    }
    
    Files {
        UUID id PK
        UUID order_id FK
        Enum file_type
        String file_url
        String original_name
        Int file_size
        UUID uploaded_by FK
        DateTime uploaded_at
    }
```

### Tables Detail

#### 1. Users Table
```sql
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'OPERATOR', 'PRINTER', 'FIELD');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- bcrypt hashed
    role user_role NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
```

#### 2. Poles Table
```sql
CREATE TYPE pole_status AS ENUM ('AVAILABLE', 'OCCUPIED');

CREATE TABLE poles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pole_code VARCHAR(50) UNIQUE NOT NULL, -- TOGUBBC4
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    city VARCHAR(100),
    district VARCHAR(100),
    neighborhood VARCHAR(100),
    street VARCHAR(255),
    sequence_no INTEGER,
    status pole_status DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- PostGIS spatial index
CREATE INDEX idx_poles_location ON poles USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);
CREATE INDEX idx_poles_status ON poles(status);
CREATE INDEX idx_poles_code ON poles(pole_code);
```

#### 3. Orders Table
```sql
CREATE TYPE order_status AS ENUM (
    'PENDING', 
    'PRINTING', 
    'AWAITING_MOUNT', 
    'LIVE', 
    'EXPIRED', 
    'COMPLETED'
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pole_id UUID NOT NULL REFERENCES poles(id) ON DELETE RESTRICT,
    client_name VARCHAR(255) NOT NULL,
    client_contact VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status order_status DEFAULT 'PENDING',
    contract_file_url VARCHAR(500),
    ad_image_url VARCHAR(500),
    created_by UUID NOT NULL REFERENCES users(id),
    assigned_printer UUID REFERENCES users(id),
    assigned_field UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_orders_pole ON orders(pole_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_dates ON orders(start_date, end_date);
CREATE INDEX idx_orders_printer ON orders(assigned_printer);
CREATE INDEX idx_orders_field ON orders(assigned_field);

-- Prevent overlapping reservations
CREATE UNIQUE INDEX idx_orders_no_overlap ON orders (pole_id, daterange(start_date, end_date))
WHERE status NOT IN ('COMPLETED', 'EXPIRED');
```

#### 4. WorkflowHistory Table
```sql
CREATE TABLE workflow_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status order_status,
    new_status order_status NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workflow_order ON workflow_history(order_id);
CREATE INDEX idx_workflow_timestamp ON workflow_history(timestamp DESC);
```

#### 5. PricingConfig Table
```sql
CREATE TABLE pricing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL, -- 'print_price', 'mount_price' etc.
    value DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20), -- 'TL', '%'
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default values
INSERT INTO pricing_config (key, value, unit) VALUES
    ('print_price', 500.00, 'TL'),
    ('mount_price', 200.00, 'TL'),
    ('dismount_price', 150.00, 'TL'),
    ('vat_rate', 20.00, '%');
```

#### 6. Files Table
```sql
CREATE TYPE file_type AS ENUM ('CONTRACT', 'AD_IMAGE', 'PROOF_MOUNT', 'PROOF_DISMOUNT');

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    file_type file_type NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500), -- Added for mobile optimization
    original_name VARCHAR(255),
    file_size INTEGER, -- bytes
    uploaded_by UUID NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMP, -- Added for soft delete
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_files_order ON files(order_id);
CREATE INDEX idx_files_type ON files(file_type);
CREATE INDEX idx_files_deleted ON files(deleted_at);
```

#### 7. Password Reset Tokens Table
```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_reset_user ON password_reset_tokens(user_id);
```

#### 8. Notification Logs Table
```sql
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID,
    type VARCHAR(50) NOT NULL, -- 'EMAIL', 'SMS'
    template VARCHAR(100),
    subject VARCHAR(255),
    content TEXT,
    status VARCHAR(50) NOT NULL, -- 'SENT', 'FAILED', 'PENDING'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notif_user ON notification_logs(user_id);
CREATE INDEX idx_notif_status ON notification_logs(status);
CREATE INDEX idx_notif_created ON notification_logs(created_at DESC);
```

#### 9. User Notification Preferences Table
```sql
CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    new_order_enabled BOOLEAN DEFAULT true,
    status_change_enabled BOOLEAN DEFAULT true,
    assignment_enabled BOOLEAN DEFAULT true,
    reminder_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notif_prefs_user ON user_notification_preferences(user_id);
```

#### 10. Pricing History Table
```sql
CREATE TABLE pricing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pricing_key VARCHAR(100) NOT NULL REFERENCES pricing_config(key),
    old_value DECIMAL(10, 2) NOT NULL,
    new_value DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20),
    changed_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pricing_history_key ON pricing_history(pricing_key);
CREATE INDEX idx_pricing_history_date ON pricing_history(created_at DESC);
```

#### 11. Login Attempts Table
```sql
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    success BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_login_email ON login_attempts(email);
CREATE INDEX idx_login_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_created ON login_attempts(created_at);
```

#### 12. Reports Table
```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- 'PRINTER', 'FIELD', 'FINANCIAL'
    title VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'PDF', 'EXCEL', 'CSV'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    generated_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_generated ON reports(generated_by);
CREATE INDEX idx_reports_created ON reports(created_at DESC);
```

---

## 🔌 API Endpoint Design

### Base URL: `/api`

#### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | User login | No |
| POST | `/auth/register` | User registration (admin only) | Yes (SUPER_ADMIN) |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |
| GET | `/auth/me` | Get current user info | Yes |
| POST | `/auth/logout` | Logout (optional) | Yes |

#### User Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users` | List all users | SUPER_ADMIN, OPERATOR |
| GET | `/users/:id` | Get user by ID | SUPER_ADMIN |
| POST | `/users` | Create user | SUPER_ADMIN |
| PATCH | `/users/:id` | Update user | SUPER_ADMIN |
| DELETE | `/users/:id` | Soft delete user | SUPER_ADMIN |
| GET | `/users/printers` | List all printers | OPERATOR, SUPER_ADMIN |
| GET | `/users/field-teams` | List all field teams | OPERATOR, SUPER_ADMIN |

#### Pole Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/poles` | List all poles | All authenticated |
| GET | `/poles/:id` | Get pole by ID | All authenticated |
| POST | `/poles` | Create new pole | OPERATOR, SUPER_ADMIN |
| PATCH | `/poles/:id` | Update pole | OPERATOR, SUPER_ADMIN |
| DELETE | `/poles/:id` | Soft delete pole | SUPER_ADMIN |
| GET | `/poles/available` | List available poles | OPERATOR |
| GET | `/poles/nearby?lat=&lng=&radius=` | Find nearby poles | All authenticated |

#### Order Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/orders` | List orders (filtered by role) | All authenticated |
| GET | `/orders/:id` | Get order details | All authenticated |
| POST | `/orders` | Create new order | OPERATOR, SUPER_ADMIN |
| PATCH | `/orders/:id` | Update order | OPERATOR, SUPER_ADMIN |
| DELETE | `/orders/:id` | Cancel order | SUPER_ADMIN |
| POST | `/orders/:id/transition` | Change order status | Role-based |
| POST | `/orders/:id/assign-printer` | Assign printer | SUPER_ADMIN |
| POST | `/orders/:id/assign-field` | Assign field team | PRINTER, SUPER_ADMIN |
| GET | `/orders/my-tasks` | Tasks for current user | PRINTER, FIELD |

#### File Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/files/upload` | Upload file | All authenticated |
| GET | `/files/:id` | Download file | All authenticated |
| DELETE | `/files/:id` | Delete file | SUPER_ADMIN |
| GET | `/orders/:id/files` | List order files | All authenticated |

#### Workflow Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/workflow/:orderId/history` | Get workflow history | All authenticated |
| POST | `/workflow/:orderId/rollback` | Rollback status | SUPER_ADMIN |

#### Pricing Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/pricing` | Get all pricing config | All authenticated |
| PATCH | `/pricing/:key` | Update pricing value | SUPER_ADMIN |
| GET | `/pricing/history` | Get pricing change history | SUPER_ADMIN |

#### Reporting Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/reports/printer` | Generate printer report (PDF/Excel) | SUPER_ADMIN |
| POST | `/reports/field` | Generate field team report | SUPER_ADMIN |
| POST | `/reports/financial` | Generate financial summary | SUPER_ADMIN |
| GET | `/reports/:id/download` | Download generated report | SUPER_ADMIN |

#### Dashboard Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/dashboard/stats` | Role-specific dashboard stats | All authenticated |
| GET | `/dashboard/recent-orders` | Recent orders | All authenticated |

---

## 📦 File Storage Architecture

### Local Storage (MVP)

**Directory Structure:**
```
project-root/
└── public/
    └── uploads/
        └── {orderId}/
            ├── contracts/
            │   └── {timestamp}_{filename}.pdf
            ├── ad-images/
            │   └── {timestamp}_{filename}.jpg
            └── proof-photos/
                ├── mount/
                │   └── {timestamp}_{filename}.jpg
                └── dismount/
                    └── {timestamp}_{filename}.jpg
```

**File Naming Convention:**
```
{timestamp}_{original_filename}
Example: 1675438293847_contract.pdf
```

**Multer Configuration:**
```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const orderId = req.body.orderId;
    const fileType = req.body.fileType; // 'contract' | 'ad-image' | 'proof'
    const path = `public/uploads/${orderId}/${fileType}s/`;
    cb(null, path);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type'));
  }
});
```

**Phase 2: Cloud Migration:**
- Cloudinary (images) veya AWS S3 (all files)
- Thumbnail generation için Sharp library
- CDN integration

---

## 📧 Notification System Architecture

### Bull Queue Setup

```javascript
// queue/emailQueue.js
const Queue = require('bull');
const emailQueue = new Queue('email', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

// Add job
emailQueue.add('send-notification', {
  to: 'printer@example.com',
  subject: 'New Print Job Assigned',
  template: 'new-print-job',
  data: {
    orderId: '...',
    clientName: '...',
    poleId: '...'
  }
}, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000
  }
});

// Process job
emailQueue.process('send-notification', async (job) => {
  const { to, subject, template, data } = job.data;
  await sendEmail(to, subject, template, data);
});
```

### Email Templates

**Template Structure:**
```
templates/
├── new-print-job.html
├── print-completed.html
├── mount-assigned.html
├── dismount-reminder.html
└── order-created.html
```

**Example Template (Handlebars):**
```html
<!DOCTYPE html>
<html>
<body>
  <h2>Yeni Baskı İşi Atandı</h2>
  <p>Merhaba {{printerName}},</p>
  <p>Size yeni bir baskı işi atandı:</p>
  <ul>
    <li>Sipariş ID: {{orderId}}</li>
    <li>Müşteri: {{clientName}}</li>
    <li>Direk: {{poleId}}</li>
  </ul>
  <a href="{{dashboardUrl}}">Sisteme Git</a>
</body>
</html>
```

---

## 🔄 Workflow State Machine

### State Transition Rules

```javascript
const WORKFLOW_TRANSITIONS = {
  PENDING: {
    allowedNextStates: ['PRINTING'],
    requiredRole: ['SUPER_ADMIN'],
    requiredData: ['assigned_printer']
  },
  PRINTING: {
    allowedNextStates: ['AWAITING_MOUNT'],
    requiredRole: ['PRINTER', 'SUPER_ADMIN'],
    requiredData: ['assigned_field']
  },
  AWAITING_MOUNT: {
    allowedNextStates: ['LIVE'],
    requiredRole: ['FIELD', 'SUPER_ADMIN'],
    requiredData: ['proof_photo']
  },
  LIVE: {
    allowedNextStates: ['EXPIRED'], // Auto transition on end_date
    requiredRole: ['SYSTEM'], // Cron job
    requiredData: []
  },
  EXPIRED: {
    allowedNextStates: ['COMPLETED'],
    requiredRole: ['FIELD', 'SUPER_ADMIN'],
    requiredData: ['dismount_proof_photo']
  },
  COMPLETED: {
    allowedNextStates: [], // Terminal state
    requiredRole: [],
    requiredData: []
  }
};
```

### Workflow Middleware
```javascript
async function validateTransition(orderId, newStatus, userId) {
  const order = await Order.findById(orderId);
  const user = await User.findById(userId);
  
  const currentState = order.status;
  const rules = WORKFLOW_TRANSITIONS[currentState];
  
  // Check if transition is allowed
  if (!rules.allowedNextStates.includes(newStatus)) {
    throw new Error(`Cannot transition from ${currentState} to ${newStatus}`);
  }
  
  // Check user role
  if (!rules.requiredRole.includes(user.role)) {
    throw new Error('Unauthorized');
  }
  
  // Check required data
  for (const field of rules.requiredData) {
    if (!order[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  return true;
}
```

---

## 🚀 Deployment Architecture

### Development Environment
```
Local Machine
├── PostgreSQL (Docker)
├── Redis (Docker)
├── Backend (localhost:3000)
└── Frontend (localhost:5173)
```

### Production Environment (Railway.app / Render.com)

```mermaid
graph TB
    subgraph "Railway / Render"
        FE[Frontend Service<br/>Vite Build]
        BE[Backend Service<br/>Node.js]
        DB[(PostgreSQL<br/>+ PostGIS)]
        RD[(Redis)]
    end
    
    Internet[Internet / Users] --> CDN[CDN<br/>Cloudflare - Optional]
    CDN --> FE
    FE --> BE
    BE --> DB
    BE --> RD
```

**Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRATION=8h

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# File Upload
MAX_FILE_SIZE=20971520 # 20MB in bytes
UPLOAD_DIR=public/uploads

# App
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com
```

---

## 📊 Performance Considerations

### Database Optimization
1. **Indexes:** Kritik query'ler için index'ler tanımlandı
2. **Connection Pooling:** Prisma default (10 connections)
3. **Query Optimization:** N+1 problem'i önlemek için `include` kullanımı

### Caching Strategy
- Redis ile session caching
- API response caching (GET endpoints için 5 dakika)
- Pole list caching (sık değişmez)

### Frontend Optimization
- Code splitting (React.lazy)
- Image lazy loading
- Harita marker clustering (>100 pole olursa)
- TanStack Query ile client-side caching

---

## 🔒 Security Measures

### Authentication
- ✅ bcrypt password hashing (salt rounds: 10)
- ✅ JWT token with secret
- ✅ Token expiration (8 hours)
- ✅ HTTPS enforce (production)

### Authorization
- ✅ Role-based middleware
- ✅ Permission checking on every endpoint
- ✅ Resource ownership validation

### Input Validation
- ✅ Zod schema validation (frontend + backend)
- ✅ SQL injection protection (Prisma ORM)
- ✅ XSS protection (React default escaping)
- ✅ File upload validation (type + size)

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

app.post('/api/auth/login', loginLimiter, loginController);
```

---

## 📝 Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 | UI Framework |
| | Vite | Build tool |
| | React Router v6 | Routing |
| | Zustand | State management |
| | TanStack Query | Data fetching |
| | Tailwind CSS | Styling |
| | Shadcn/ui | UI components |
| | React Leaflet | Maps |
| | React Hook Form + Zod | Forms & validation |
| **Backend** | Node.js 20+ | Runtime |
| | Express.js | Web framework |
| | Prisma | ORM |
| | JWT + Passport.js | Authentication |
| | Multer | File upload |
| | Bull | Job queue |
| | Nodemailer | Email |
| **Database** | PostgreSQL 15 | Primary DB |
| | PostGIS | Spatial extension |
| | Redis 7 | Cache + Queue |
| **DevOps** | Railway/Render | Hosting |
| | Git | Version control |

---

## ✅ Architecture Checklist

- [x] High-level system diagram
- [x] Authentication/authorization flow
- [x] Database schema (ERD)
- [x] API endpoint design
- [x] File storage strategy
- [x] Notification system architecture
- [x] Workflow state machine
- [x] Deployment architecture
- [x] Performance considerations
- [x] Security measures
- [x] Technology stack finalized

---

**Doküman Sonu**

*Bu architecture document, 03 Şubat 2026 tarihinde tamamlanmıştır.*
