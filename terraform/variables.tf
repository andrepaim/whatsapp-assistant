variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region to deploy resources"
  type        = string
  default     = "us-central1"
}

variable "image" {
  description = "The Docker image to deploy"
  type        = string
  default     = "gcr.io/${var.project_id}/whatsapp-assistant:latest"
}

variable "service_account" {
  description = "The service account to use for the Cloud Run service"
  type        = string
  default     = "whatsapp-assistant@${var.project_id}.iam.gserviceaccount.com"
}

variable "llm_provider" {
  description = "The LLM provider to use"
  type        = string
  default     = "openrouter"
}

variable "llm_model" {
  description = "The LLM model to use"
  type        = string
  default     = "openai/gpt4.1-nano"
}

variable "llm_api_base" {
  description = "The LLM API base URL"
  type        = string
  default     = "https://openrouter.ai/api/v1"
}

variable "chat_history_limit" {
  description = "Maximum number of messages to retain in chat history"
  type        = number
  default     = 20
}
