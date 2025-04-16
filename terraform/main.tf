# WhatsApp Assistant - GCP Cloud Run Deployment

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.0.0"
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Load variables from .env file
locals {
  env_vars = { for line in compact(split("\n", file("${path.module}/../.env"))) :
    split("=", line)[0] => join("=", slice(split("=", line), 1, length(split("=", line))))
  }
  
  # Extract values with defaults
  llm_provider       = lookup(local.env_vars, "LLM_PROVIDER", var.llm_provider)
  llm_model          = lookup(local.env_vars, "LLM_MODEL", var.llm_model)
  llm_api_base       = lookup(local.env_vars, "LLM_API_BASE", var.llm_api_base)
  chat_history_limit = lookup(local.env_vars, "CHAT_HISTORY_LIMIT", tostring(var.chat_history_limit))
}

resource "google_cloud_run_service" "whatsapp_assistant" {
  name     = "whatsapp-assistant"
  location = var.region

  template {
    spec {
      containers {
        image = var.image

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }

        env {
          name  = "LLM_PROVIDER"
          value = local.llm_provider
        }

        env {
          name  = "LLM_MODEL"
          value = local.llm_model
        }

        env {
          name  = "LLM_API_BASE"
          value = local.llm_api_base
        }

        env {
          name = "LLM_API_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.llm_api_key.secret_id
              key  = "latest"
            }
          }
        }

        env {
          name  = "CHAT_HISTORY_LIMIT"
          value = local.chat_history_limit
        }

        volume_mounts {
          name       = "data"
          mount_path = "/app/data"
        }

        volume_mounts {
          name       = "auth"
          mount_path = "/app/.wwebjs_auth"
        }
      }

      volumes {
        name = "data"
        persistent_disk {
          disk_name = google_filestore_instance.whatsapp_data.name
          fs_type   = "ext4"
          read_only = false
        }
      }

      volumes {
        name = "auth"
        persistent_disk {
          disk_name = google_filestore_instance.whatsapp_auth.name
          fs_type   = "ext4"
          read_only = false
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  # IAM configuration - allow public access
  depends_on = [google_secret_manager_secret_iam_binding.llm_api_key_access]
}

resource "google_filestore_instance" "whatsapp_data" {
  name     = "whatsapp-data"
  tier     = "BASIC_HDD"
  location = var.region

  file_shares {
    name        = "whatsapp_data"
    capacity_gb = 1024
  }

  networks {
    network = "default"
    modes   = ["MODE_IPV4"]
  }
}

resource "google_filestore_instance" "whatsapp_auth" {
  name     = "whatsapp-auth"
  tier     = "BASIC_HDD"
  location = var.region

  file_shares {
    name        = "whatsapp_auth"
    capacity_gb = 1024
  }

  networks {
    network = "default"
    modes   = ["MODE_IPV4"]
  }
}

resource "google_secret_manager_secret" "llm_api_key" {
  secret_id = "llm-api-key"
  
  replication {
    automatic = true
  }
}

# Create secret version from .env file
resource "google_secret_manager_secret_version" "llm_api_key_version" {
  secret      = google_secret_manager_secret.llm_api_key.id
  secret_data = lookup(local.env_vars, "LLM_API_KEY", "")
}

resource "google_secret_manager_secret_iam_binding" "llm_api_key_access" {
  secret_id = google_secret_manager_secret.llm_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  members   = [
    "serviceAccount:${var.service_account}"
  ]
}

# IAM policy to allow unauthenticated access to the Cloud Run service
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.whatsapp_assistant.name
  location = google_cloud_run_service.whatsapp_assistant.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}