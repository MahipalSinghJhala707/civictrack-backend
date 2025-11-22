# S3 Upload Troubleshooting Guide

## Common Error: "The request signature we calculated does not match the signature you provided"

This error typically occurs when there's a mismatch in AWS credentials or configuration. Here's how to fix it:

### 1. Check AWS Credentials

Verify your `.env` file has the correct AWS credentials:

```env
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_ACL=public-read
AWS_S3_BASE_URL=  # Optional: Custom CDN URL
```

### 2. Verify Credentials Are Correct

- **AWS_ACCESS_KEY_ID**: Should be a 20-character alphanumeric string
- **AWS_SECRET_ACCESS_KEY**: Should be a 40-character string
- **AWS_REGION**: Should match your S3 bucket's region (e.g., `us-east-1`, `ap-south-1`)

### 3. Check IAM Permissions

Your AWS credentials need these S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### 4. Check Server Clock

Signature errors can also occur if your server's clock is incorrect. Ensure your server time is synchronized:

```bash
# Check server time
date

# Sync time (Linux)
sudo ntpdate -s time.nist.gov
# Or use timedatectl
sudo timedatectl set-ntp true
```

### 5. Verify Bucket Region

Make sure `AWS_REGION` matches your bucket's actual region. You can check this in AWS Console.

### 6. Test Credentials

You can test your credentials using AWS CLI:

```bash
aws s3 ls s3://your-bucket-name --region us-east-1
```

If this fails, your credentials are invalid.

### 7. Check for Extra Spaces

Sometimes credentials have trailing spaces. Make sure there are no spaces in your `.env` file:

```env
# Wrong
AWS_ACCESS_KEY_ID= AKIAIOSFODNN7EXAMPLE 

# Correct
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
```

### 8. Regenerate Credentials

If all else fails, regenerate your AWS access keys:
1. Go to AWS IAM Console
2. Users → Select your user → Security credentials
3. Create new access key
4. Update `.env` file with new credentials

## Current Behavior

**Note**: With the latest fixes, reports will **still be created** even if S3 upload fails. Images are optional. You'll see warning logs, but the report creation will succeed.

To make reports require images, you would need to add validation that checks if both `uploadedImageUrls` and `sanitizedProvidedUrls` are empty, but currently the system allows reports without images.

