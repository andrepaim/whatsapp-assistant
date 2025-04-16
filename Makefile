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
	mkdir -p $(DATA_DIR) $(AUTH_DIR)
	docker run -d --name $(CONTAINER_NAME) \
		-v $(DATA_DIR):/app/data \
		-v $(AUTH_DIR):/app/.wwebjs_auth \
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
