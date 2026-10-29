.PHONY: help install dev build start clean

help:
	@echo "Available commands for Unified Multimodal Attendance Agent:"
	@echo "  make install        Install unified full-stack Next.js dependencies"
	@echo "  make dev            Run unified full-stack dev server on http://localhost:3000"
	@echo "  make build          Build optimized production application"
	@echo "  make start          Start production server on http://localhost:3000"
	@echo "  make clean          Clean build artifacts"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

clean:
	rm -rf .next
