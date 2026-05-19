## Today Meeting Demo Runbook (Backend + DB Connected)

This runbook helps you demonstrate the full walletless flow today:
1) Create investment intent
2) Get transfer reference
3) Upload proof
4) Ops review and approve

### Prerequisites
- Backend running (`node server.js`) with DB connected
- Frontend pointing to backend via `VITE_API_URL`
- At least one valid user and property in DB

### 1) Health check

```powershell
curl http://localhost:5000/api/health
```

Expected: `{"status":"ok","database":"connected"}`

### 2) Find demo user and property

```powershell
curl http://localhost:5000/api/users
curl http://localhost:5000/api/properties
```

Pick one `UserID` and one `PropertyID`.

### 3) Create investment intent

```powershell
curl -X POST http://localhost:5000/api/investment-intents ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":1,\"propertyId\":1,\"amount\":5000,\"currency\":\"USD\"}"
```

Capture `referenceCode` from response.

### 4) Upload proof (base64)

Use a tiny sample text as proof for demo:

```powershell
$proof = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("demo bank transfer proof"))
curl -X POST http://localhost:5000/api/investment-intents/INR-REPLACE-ME/proof ^
  -H "Content-Type: application/json" ^
  -d "{\"proofBase64\":\"$proof\",\"fileName\":\"transfer-proof.txt\",\"mimeType\":\"text/plain\"}"
```

Replace `INR-REPLACE-ME` with your `referenceCode`.

### 5) Show user intent list

```powershell
curl http://localhost:5000/api/user/1/intents
```

### 6) Ops queue and manual approval

```powershell
curl http://localhost:5000/api/ops/investment-intents

curl -X POST http://localhost:5000/api/ops/investment-intents/INR-REPLACE-ME/review ^
  -H "Content-Type: application/json" ^
  -d "{\"action\":\"approve\",\"reviewerName\":\"Ops Admin\",\"notes\":\"Transfer matched with bank statement\"}"
```

### 7) Re-check user intent status

```powershell
curl http://localhost:5000/api/user/1/intents
```

You should now see workflow status updated to `Approved` and transaction status updated to `Completed`.

---
## Endpoints added for demo
- `POST /api/investment-intents`
- `POST /api/investment-intents/:reference/proof`
- `GET /api/user/:userId/intents`
- `GET /api/ops/investment-intents`
- `POST /api/ops/investment-intents/:reference/review`

## Notes for security follow-up
- Current proof upload endpoint accepts base64 for speed; move to multipart upload + malware scanning post-demo.
- Lock ops endpoints behind role-based auth before production.
- Move uploads to cloud storage (S3/Blob) before handling real funds.
