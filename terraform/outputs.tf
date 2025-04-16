output "service_url" {
  value = google_cloud_run_service.whatsapp_assistant.status[0].url
}

output "data_volume_name" {
  value = google_filestore_instance.whatsapp_data.name
}

output "auth_volume_name" {
  value = google_filestore_instance.whatsapp_auth.name
}

output "service_account" {
  value = var.service_account
  description = "The service account used by the Cloud Run service"
}

output "deployment_instructions" {
  value = <<-EOT
    Deployment complete! To use your WhatsApp assistant:
    
    1. Make sure the service account exists:
       gcloud iam service-accounts create whatsapp-assistant --display-name="WhatsApp Assistant Service Account"
    
    2. Set the API key secret value:
       echo -n "your-llm-api-key" | gcloud secrets create llm-api-key --data-file=-
    
    3. Visit the Cloud Run service URL: ${google_cloud_run_service.whatsapp_assistant.status[0].url}
    
    4. Scan the QR code with your WhatsApp account to authenticate
  EOT
}
