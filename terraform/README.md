# Terraform Deployment for WhatsApp Assistant

This directory contains Terraform configurations to deploy the WhatsApp Assistant application to Google Cloud Run.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) installed
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and configured
- A Google Cloud project with billing enabled
- Docker image of the application pushed to Google Container Registry

## Configuration

1. Copy the example variables file:
   ```
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` to set your GCP project ID and other preferences

3. Create a service account for the Cloud Run service:
   ```
   gcloud iam service-accounts create whatsapp-assistant --display-name="WhatsApp Assistant Service Account"
   ```

4. Create and populate the API key secret:
   ```
   echo -n "your-llm-api-key" | gcloud secrets create llm-api-key --data-file=-
   ```

## Deployment

Initialize Terraform:
```
terraform init
```

Plan your deployment:
```
terraform plan
```

Apply the configuration:
```
terraform apply
```

After deployment, the terminal will display deployment instructions with next steps.

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

## Environment Variables

All application configuration is managed through environment variables defined in the terraform configuration, including:
- LLM provider and model selection
- API endpoints
- Chat history settings

## Cleanup

To remove all resources:
```
terraform destroy
```