# AWS setup for Tarajuvva media (S3 only)

No CloudFront, ACM, or Route53 needed. Images are served from the S3 HTTPS URL.

## 1. Create the bucket

1. AWS Console → **S3** → **Create bucket**
2. **Bucket name:** `tarajuvva-media` (if taken, use e.g. `tarajuvva-media-prod`)
3. **AWS Region:** `Asia Pacific (Mumbai) ap-south-1`
4. **Object Ownership:** ACLs disabled (recommended)
5. **Block Public Access:** **uncheck** “Block all public access”  
   (confirm the warning — the shop needs public image URLs)
6. **Bucket Versioning:** Enable (safety net)
7. **Default encryption:** SSE-S3
8. Create bucket

### Bucket policy (public read for objects only)

Bucket → **Permissions** → **Bucket policy** → paste (replace bucket name if different):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::tarajuvva-media/*"
    }
  ]
}
```

### CORS (so the browser can load images from your site)

Bucket → **Permissions** → **CORS** → paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "https://tarajuvva.com",
      "https://www.tarajuvva.com",
      "http://localhost:5173"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 86400
  }
]
```

### Smoke test

Upload any small image as key `test/hello.jpg`, then open:

`https://tarajuvva-media.s3.ap-south-1.amazonaws.com/test/hello.jpg`

It must load in the browser before continuing.

---

## 2. Create the IAM user (for the app)

This user is what the backend uses to **upload** images. It does **not** need CloudFront permissions.

1. AWS Console → **IAM** → **Users** → **Create user**
2. **User name:** `tarajuvva-media-uploader`
3. Do **not** check “Provide user access to the AWS Management Console” (programmatic only)
4. **Next** → **Attach policies directly** → **Create policy** (JSON tab), paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListBucket",
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
      "Resource": "arn:aws:s3:::tarajuvva-media"
    },
    {
      "Sid": "ReadWriteObjects",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": "arn:aws:s3:::tarajuvva-media/*"
    }
  ]
}
```

5. Name the policy `TarajuvvaMediaUploader`, create it, go back to the user wizard, refresh, attach that policy
6. Create user
7. Open the user → **Security credentials** → **Create access key**
8. Use case: **Application running outside AWS**
9. Copy **Access key ID** and **Secret access key** (secret is shown once)

Do **not** attach `AdministratorAccess`. Do **not** grant `s3:DeleteObject` until after the migration soak.

---

## 3. Put keys in `.env` (local staging + later server)

```bash
MEDIA_STORAGE=disk
MEDIA_READ=s3
AWS_REGION=ap-south-1
S3_BUCKET=tarajuvva-media
CDN_BASE_URL=https://tarajuvva-media.s3.ap-south-1.amazonaws.com
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

`CDN_BASE_URL` here is just the public S3 base URL (not CloudFront).

Never commit these keys. On production, add them only to the **server** `backend/.env` (deploy already preserves that file).

---

## 4. Tell the agent when ready

Once the test URL loads and keys are in `.env`, say so. Next steps:

1. Staging migrate (real upload, still `tarajuvva_staging` only)
2. Verify + revert rehearsal
3. Only then production with `--allow-production`
