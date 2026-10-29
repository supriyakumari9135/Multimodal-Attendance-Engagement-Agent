.PHONY: help install backend frontend test test-backend seed clean

help:
	@echo "Available commands:"
	@echo "  make install        Install both backend and frontend dependencies"
	@echo "  make backend        Run FastAPI backend server on port 8000"
	@echo "  make frontend       Run Next.js frontend dev server on port 3000"
	@echo "  make test           Run automated backend tests"
	@echo "  make seed           Seed deterministic demo data"

install:
	python -m venv venv
	.\venv\Scripts\pip install -r backend/requirements.txt
	cd frontend && npm install

backend:
	.\venv\Scripts\uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

frontend:
	cd frontend && npm run dev

test:
	.\venv\Scripts\pytest backend/tests/test_api.py -v

seed:
	.\venv\Scripts\python scripts/seed_demo.py

clean:
	rm -rf frontend/.next frontend/node_modules backend/__pycache__ .pytest_cache

