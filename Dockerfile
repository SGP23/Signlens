FROM python:3.11-slim

# Install system libraries required by MediaPipe and OpenCV
# MediaPipe requires: libGLESv2.so.2 (GLES), libEGL.so.1 (EGL), libGL.so.1
# We install the full Mesa packages (not just virtual/meta packages) to ensure
# the actual .so files are present in the container.
RUN apt-get update && apt-get install -y \
    libgles2 \
    libegl1 \
    libgl1 \
    libglvnd0 \
    libglib2.0-0 \
    libx11-6 \
    && rm -rf /var/lib/apt/lists/* \
    && ldconfig \
    && echo "=== Verifying required libraries ===" \
    && ldconfig -p | grep -i glesv2 \
    && ldconfig -p | grep -i egl \
    && echo "=== All libraries found ==="

WORKDIR /opt/render/project/src

# Copy and install Python dependencies
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the full project
COPY . .

# Set working directory to backend for uvicorn
WORKDIR /opt/render/project/src/backend

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
