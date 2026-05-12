#!/bin/bash
# Fix pip SSL on macOS - set SSL_CERT_FILE to system keychain
cd /Users/rgj/.openclaw/workspace/projects/xiuxian-games/backend
source venv/bin/activate

# Try to get certifi path from system Python
CERT=$(python3 -c "
try:
    import certifi
    print(certifi.where())
except:
    # Fallback to macOS system keychain
    print('/Library/Python/3.12/site-packages/certifi/cacert.pem')
" 2>/dev/null)

# Or use the system CA bundle
if [ -f "/etc/ssl/cert.pem" ]; then
    export SSL_CERT_FILE="/etc/ssl/cert.pem"
elif [ -f "$CERT" ]; then
    export SSL_CERT_FILE="$CERT"
fi

echo "Using SSL_CERT_FILE=$SSL_CERT_FILE"

# Install pip with SSL bypass first
python3 -m ensurepip --default-pip 2>/dev/null || true
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org --trusted-host upload.pypi.org -r requirements.txt 2>&1 | tail -15
