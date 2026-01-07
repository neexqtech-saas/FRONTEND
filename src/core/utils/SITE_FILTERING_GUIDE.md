# Site-Based Filtering Guide

Jab koi site select karte hain, to sab API calls automatically us site ke basis par filter ho jayengi.

## Helper Functions

### 1. `addSiteIdToUrl(url, required)`
URL mein automatically `site_id` query parameter add karta hai.

```typescript
import { addSiteIdToUrl } from "../../../core/utils/apiHelpers";

// Example
let url = `${BACKEND_PATH}contacts/${admin_id}`;
url = addSiteIdToUrl(url, false); // Optional site_id
// Result: /api/contacts/123?site_id=456
```

### 2. `getApiUrlWithSite(baseUrl, required)`
Site ID automatically add karta hai (admin role ke liye default required).

```typescript
import { getApiUrlWithSite } from "../../../core/utils/apiHelpers";

// Example
const url = getApiUrlWithSite(`${BACKEND_PATH}employees/${admin_id}`, true);
// Automatically adds ?site_id=456 if site is selected
```

### 3. `addSiteIdToParams(params, required)`
Query parameters object mein `site_id` add karta hai.

```typescript
import { addSiteIdToParams } from "../../../core/utils/apiHelpers";

// Example
const params = addSiteIdToParams({
  page: 1,
  page_size: 20,
  search: "test"
}, false);
// Result: { page: 1, page_size: 20, search: "test", site_id: 456 }
```

## Usage Examples

### Example 1: Simple API Call with Site Filtering

```typescript
import { getAdminIdForApi, getApiUrlWithSite, getAuthHeaders } from "../../../core/utils/apiHelpers";

const fetchData = async () => {
  const admin_id = getAdminIdForApi();
  if (!admin_id) return;
  
  // Site ID automatically added
  const url = getApiUrlWithSite(`${BACKEND_PATH}employees/${admin_id}`, true);
  
  const response = await axios.get(url, getAuthHeaders());
  // Data will be filtered by selected site
};
```

### Example 2: API Call with Multiple Query Parameters

```typescript
import { getAdminIdForApi, addSiteIdToParams, getAuthHeaders } from "../../../core/utils/apiHelpers";

const fetchData = async () => {
  const admin_id = getAdminIdForApi();
  if (!admin_id) return;
  
  // Build params with site_id
  const params = addSiteIdToParams({
    page: currentPage,
    page_size: pageSize,
    search: searchQuery,
    status: statusFilter
  }, true); // site_id required
  
  const url = `${BACKEND_PATH}employees/${admin_id}?${new URLSearchParams(params).toString()}`;
  
  const response = await axios.get(url, getAuthHeaders());
};
```

### Example 3: Check if Site is Selected Before API Call

```typescript
import { hasSelectedSite, getSelectedSiteId, getAdminIdForApi } from "../../../core/utils/apiHelpers";

const fetchData = async () => {
  if (!hasSelectedSite()) {
    toast.error("Please select a site first");
    return;
  }
  
  const admin_id = getAdminIdForApi();
  const site_id = getSelectedSiteId();
  
  const url = `${BACKEND_PATH}data/${admin_id}/${site_id}`;
  // ... rest of API call
};
```

## Important Notes

1. **Site Selection**: Site ID `sessionStorage` mein `selected_site_id` key se store hota hai
2. **Auto-filtering**: Jab site select hota hai, automatically sab API calls us site ke data dikhayengi
3. **Required vs Optional**: 
   - `required: true` - Site ID zaroori hai, nahi to error
   - `required: false` - Site ID optional hai, add hoga agar available ho

## Common Pattern for All Components

```typescript
import { 
  getAdminIdForApi, 
  getApiUrlWithSite, 
  getAuthHeaders,
  hasSelectedSite 
} from "../../../core/utils/apiHelpers";

const MyComponent = () => {
  const fetchData = async () => {
    // 1. Check admin
    const admin_id = getAdminIdForApi();
    if (!admin_id) {
      toast.error("Admin ID not found");
      return;
    }
    
    // 2. Check site (if required)
    if (!hasSelectedSite()) {
      toast.error("Please select a site first");
      return;
    }
    
    // 3. Build URL with site filtering
    const url = getApiUrlWithSite(`${BACKEND_PATH}endpoint/${admin_id}`, true);
    
    // 4. Make API call
    const response = await axios.get(url, getAuthHeaders());
    
    // Data is automatically filtered by selected site
    setData(response.data.data);
  };
};
```

