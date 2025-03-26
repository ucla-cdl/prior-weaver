# Use Python image
FROM python:3.10-slim

# Set working directory
WORKDIR /prior-elicitation-tool

# Copy files
COPY requirements.txt requirements.txt
COPY main.py main.py

# Install dependencies
RUN pip install -r requirements.txt

# Expose port 8080 (required by Cloud Run)
EXPOSE 8080

# Run FastAPI with Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
