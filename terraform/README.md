# Terraform Deployment for WhatsApp Assistant

This directory contains Terraform configurations to deploy the WhatsApp Assistant application to Google Cloud Run.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) installed
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and configured
- A Google Cloud project with billing enabled
- Docker image of the application pushed to Google Container Registry
- `.env` file in the root directory with your configuration

## Configuration

1. Make sure your `.env` file in the project root contains all necessary variables:
   ```
   LLM_PROVIDER=openrouter
   LLM_MODEL=openai/gpt4.1-nano
   LLM_API_BASE=https://openrouter.ai/api/v1
   LLM_API_KEY=your-api-key
   CHAT_HISTORY_LIMIT=20
   ```

2. Create a service account for the Cloud Run service (if deploying manually):
   ```
   gcloud iam service-accounts create whatsapp-assistant --display-name="WhatsApp Assistant Service Account"
   ```

## Deployment

Initialize Terraform:
```
make tf-init
```

Plan your deployment:
```
make tf-plan
```

Apply the configuration:
```
make tf-apply
```

After deployment, the terminal will display deployment instructions with next steps.

## How It Works

- Terraform automatically reads variables from your `.env` file
- API keys are securely stored in Google Secret Manager
- Configuration is applied to the Cloud Run service as environment variables
- All values in the `.env` file will override the defaults in variables.tf

## Accessing the Application

After deployment, the Cloud Run service URL will be displayed in the outputs. You'll need to:

1. Navigate to the service URL
2. Scan the QR code with WhatsApp to authenticate

## Persistent Storage

The deployment includes two Filestore instances:
- `whatsapp-data`: Stores conversation history
- `whatsapp-auth`: Stores WhatsApp Web authentication data

## IAM Configuration

The deployment configures the following IAM permissions:

- The Cloud Run service account has access to the Secret Manager secret
- The Cloud Run service allows unauthenticated access

## Cleanup

To remove all resources:
```
make tf-destroy
```