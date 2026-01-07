# API URL Configuration Guide

## Overview
सभी API calls अब एक common configuration file से manage होती हैं। आप आसानी से localhost या किसी भी दूसरे URL को set कर सकते हैं।

## Configuration File
`src/environment.tsx` में API base URL configure करें:

```typescript
// Default: http://127.0.0.1:8000
// Production के लिए environment variable use करें:
// REACT_APP_API_BASE_URL=https://api.example.com
```

## Usage

### 1. Import BACKEND_PATH
```typescript
import { BACKEND_PATH, API_BASE_URL, MEDIA_URL } from '../../../core/utils/apiHelpers';
```

### 2. Use in API Calls
```typescript
// पहले (hardcoded):
const url = `http://127.0.0.1:8000/api/contacts/`;

// अब (configurable):
const url = `${BACKEND_PATH}contacts/`;
```

## Available Exports

- `BACKEND_PATH`: API base path with `/api/` suffix (e.g., `http://127.0.0.1:8000/api/`)
- `API_BASE_URL`: Base URL without `/api/` (e.g., `http://127.0.0.1:8000`)
- `MEDIA_URL`: Media files URL (e.g., `http://127.0.0.1:8000/media/`)

## Environment Variables

Production में URL change करने के लिए:

1. `.env` file बनाएं:
```
REACT_APP_API_BASE_URL=https://api.yourdomain.com
```

2. या build time पर:
```bash
REACT_APP_API_BASE_URL=https://api.yourdomain.com npm run build
```

## Files Updated

✅ API Utility Files:
- `feature-module/payroll/structure/utils/api.ts`
- `feature-module/payroll/payslip-generator/utils/api.ts`
- `feature-module/payroll/payroll-settings/utils/api.ts`
- `feature-module/payroll/professional-tax-rules/utils/api.ts`

✅ Component Files (Partial):
- `feature-module/crm/contact/index.tsx`
- `feature-module/crm/visit/*.tsx` (all files)
- `feature-module/crm/task/CreateModal.tsx`
- `feature-module/hrm/leave-applications/*.tsx`

## Remaining Files

अभी भी कुछ files में hardcoded URLs हैं। उन्हें भी update करना होगा:
- Task-related files
- Invoice files
- Expense files
- HRM files (leaves, holidays, shifts, etc.)
- Asset management files

## Migration Pattern

1. Import add करें:
```typescript
import { BACKEND_PATH } from '../../../core/utils/apiHelpers';
```

2. Replace URLs:
```typescript
// Before
`http://127.0.0.1:8000/api/endpoint/`

// After
`${BACKEND_PATH}endpoint/`
```

3. Media URLs के लिए:
```typescript
// Before
`http://127.0.0.1:8000/media/path`

// After
`${MEDIA_URL}path`
```

