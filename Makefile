# WhatsApp Assistant Makefile

# Variables
IMAGE_NAME = whatsapp-assistant
IMAGE_TAG = latest
CONTAINER_NAME = whatsapp-assistant
DATA_DIR = $(shell pwd)/data
AUTH_DIR = $(shell pwd)/.wwebjs_auth

# Include environment variables from .env file if it exists
-include .env

CHAT_HISTORY_LIMIT ?= 20

# Default target
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  install        - Install dependencies"
	@echo "  start          - Run the application locally"
	@echo "  docker-build   - Build Docker image"
	@echo "  docker-run     - Run Docker container"
	@echo "  docker-stop    - Stop Docker container"
	@echo "  docker-logs    - View Docker container logs"
	@echo "  clean          - Remove node_modules"
	@echo "  backup         - Backup WhatsApp session data and chat history"
	@echo "  upload-secrets - Upload secrets from .env file to GitHub"

# Local development
.PHONY: install
install:
	npm install

.PHONY: start
start:
	npm start

# Docker commands
.PHONY: docker-build
docker-build:
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .

.PHONY: docker-run
docker-run:
	mkdir -p $(DATA_DIR) $(AUTH_DIR) $(shell pwd)/.wwebjs_cache
	docker run -d --name $(CONTAINER_NAME) \
		-v $(DATA_DIR):/app/data \
		-v $(AUTH_DIR):/app/.wwebjs_auth \
		-v $(shell pwd)/.wwebjs_cache:/app/.wwebjs_cache \
		-e LLM_PROVIDER=$(LLM_PROVIDER) \
		-e LLM_MODEL=$(LLM_MODEL) \
		-e LLM_API_BASE=$(LLM_API_BASE) \
		-e LLM_API_KEY=$(LLM_API_KEY) \
		-e CHAT_HISTORY_LIMIT=$(CHAT_HISTORY_LIMIT) \
		$(IMAGE_NAME):$(IMAGE_TAG)

.PHONY: docker-stop
docker-stop:
	docker stop $(CONTAINER_NAME)
	docker rm $(CONTAINER_NAME)

.PHONY: docker-logs
docker-logs:
	docker logs -f $(CONTAINER_NAME)

# Utility commands
.PHONY: clean
clean:
	rm -rf node_modules

.PHONY: backup
backup:
	mkdir -p backups
	tar -czf backups/whatsapp-backup-$(shell date +%Y%m%d-%H%M%S).tar.gz data .wwebjs_auth

.PHONY: upload-secrets
upload-secrets:
	@echo "Uploading secrets from .env file to GitHub..."
	@if [ ! -f .env ]; then echo "Error: .env file not found"; exit 1; fi
	@which gh > /dev/null || { echo "Error: GitHub CLI (gh) is not installed. Please install it first."; exit 1; }
	@grep -E "^GCP_PROJECT_ID=" .env | cut -d= -f2- | xargs -I{} gh secret set GCP_PROJECT_ID --body "{}"
	@grep -E "^GCP_SA_KEY=" .env | cut -d= -f2- | xargs -I{} gh secret set GCP_SA_KEY --body "{}"
	@grep -E "^LLM_PROVIDER=" .env | cut -d= -f2- | xargs -I{} gh secret set LLM_PROVIDER --body "{}"
	@grep -E "^LLM_MODEL=" .env | cut -d= -f2- | xargs -I{} gh secret set LLM_MODEL --body "{}"
	@grep -E "^LLM_API_BASE=" .env | cut -d= -f2- | xargs -I{} gh secret set LLM_API_BASE --body "{}"
	@grep -E "^LLM_API_KEY=" .env | cut -d= -f2- | xargs -I{} gh secret set LLM_API_KEY --body "{}"
	@grep -E "^CHAT_HISTORY_LIMIT=" .env | cut -d= -f2- | xargs -I{} gh secret set CHAT_HISTORY_LIMIT --body "{}" || true
	@grep -E "^PUPPETEER_ARGS=" .env | cut -d= -f2- | xargs -I{} gh secret set PUPPETEER_ARGS --body "{}" || true
	@echo "Secrets uploaded successfully"
