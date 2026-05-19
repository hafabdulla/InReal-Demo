# InReal Backend API Setup

## Quick Start (2 Steps)

### 1. Update `.env` File
Edit the `.env` file in the project root and add your SQL Server credentials:

```env
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=InReal_Demo
DB_USER=sa
DB_PASSWORD=YourPasswordHere
API_PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 2. Run Both Servers

**Terminal 1 - Backend (API):**
```bash
npm run server
```

You'll see:
```
✓ Database connection pool initialized
🚀 InReal API Server running on http://localhost:5000
```

**Terminal 2 - Frontend (React):**
```bash
npm run dev
```

You'll see:
```
VITE v4.4.5  ready in X ms
➜  Local:   http://localhost:3000
```

---

## API Endpoints (Ready to Use)

### Health Check
```bash
GET http://localhost:5000/api/health
```

### Properties
```bash
# Get all properties
GET http://localhost:5000/api/properties

# Get single property
GET http://localhost:5000/api/properties/1
```

### Authentication
```bash
# Login with email (demo users below)
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "sarah.chen@email.com"
}
```

### User Portfolio
```bash
# Get user's investment portfolio
GET http://localhost:5000/api/user/1/portfolio

# Get user's distribution history
GET http://localhost:5000/api/user/1/distributions
```

### Dashboard
```bash
# Get dashboard stats
GET http://localhost:5000/api/dashboard/stats

# Get top investors (default: 10)
GET http://localhost:5000/api/dashboard/top-investors?limit=10

# Get property metrics
GET http://localhost:5000/api/dashboard/property-metrics?propertyId=1
```

### Admin
```bash
# Get all users
GET http://localhost:5000/api/users
```

---

## Demo Login Credentials

Try these emails (no password required for demo):

| Email | Name | Country | Status |
|-------|------|---------|--------|
| sarah.chen@email.com | Sarah Chen | Singapore | Verified ✓ |
| james.smith@email.com | James Smith | UAE | Verified ✓ |
| michael.johnson@email.com | Michael Johnson | USA | Verified ✓ |
| aisha.mohammed@email.com | Aisha Mohammed | UAE | Verified ✓ |
| david.lee@email.com | David Lee | Malaysia | Verified ✓ |
| priya.kumar@email.com | Priya Kumar | Thailand | Pending ⏳ |

---

## How to Test Endpoints

### Using curl
```bash
# Get all properties
curl http://localhost:5000/api/properties

# Get dashboard stats
curl http://localhost:5000/api/dashboard/stats

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah.chen@email.com"}'
```

### Using VS Code REST Client Extension
Create a file `api-test.http`:
```http
### Get all properties
GET http://localhost:5000/api/properties

### Get dashboard stats
GET http://localhost:5000/api/dashboard/stats

### Login user
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "sarah.chen@email.com"
}

### Get user portfolio (UserID 1 = Sarah)
GET http://localhost:5000/api/user/1/portfolio

### Get user distributions
GET http://localhost:5000/api/user/1/distributions
```

Then click "Send Request" on each line.

---

## Connecting Frontend to API

Your React components can now fetch from the API:

```javascript
// Example: Fetch properties in a React component
import { useEffect, useState } from 'react';

export function PropertyList() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/properties')
      .then(res => res.json())
      .then(data => {
        setProperties(data.data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      {properties.map(prop => (
        <div key={prop.PropertyID}>
          <h3>{prop.PropertyName}</h3>
          <p>{prop.City}, {prop.Country}</p>
          <p>Yield: {prop.ProjectedAnnualYield}%</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot connect to server" | Check DB_SERVER in .env matches your SQL Server instance |
| "ERR_CONNECT_REFUSED" on API | Verify `npm run server` is running on port 5000 |
| "ENOENT .env file" | Create `.env` file in project root with DB config |
| CORS errors in browser | Check FRONTEND_URL in .env matches React host |
| Database errors in console | Run `01-create-schema.sql` and `02-seed-demo-data.sql` first |

---

## Environment Variables Reference

```env
# Database
DB_SERVER       # SQL Server instance (e.g., localhost\SQLEXPRESS)
DB_NAME         # Database name (e.g., InReal_Demo)
DB_USER         # SQL Server user (e.g., sa)
DB_PASSWORD     # SQL Server password

# Server
API_PORT        # Port for backend (default: 5000)
FRONTEND_URL    # React frontend URL (for CORS)
NODE_ENV        # development or production
```

---

## Production Deployment Notes

Before deploying to production:

1. **Use Azure SQL Database** instead of local SQL Server
2. **Add authentication** (JWT tokens) in POST endpoints
3. **Implement request validation** for all inputs
4. **Add rate limiting** to prevent abuse
5. **Use environment-specific secrets** (Azure Key Vault, AWS Secrets Manager)
6. **Enable HTTPS** in production
7. **Add logging** (Winston, Pino)
8. **Implement error handling** with try/catch blocks

---

## Next Steps

1. ✓ Database is running (InReal_Demo)
2. ✓ API server is built (server.js)
3. ✓ Packages installed (express, cors, dotenv)
4. ⏳ **Start both servers** (`npm run server` + `npm run dev`)
5. ⏳ **Test API** at http://localhost:5000/api/properties
6. ⏳ **Connect React components** to API endpoints
7. ⏳ **Build dashboard UI** using API data

---

## Support

For questions about:
- **Database schema:** See `/database/README.md`
- **Stored procedures:** See `/database/03-stored-procedures.sql`
- **Test queries:** See `/database/04-quick-reference-queries.sql`
- **Frontend components:** Check `/src/components/`

---

**Created:** May 5, 2026
**Status:** Ready for Demo
