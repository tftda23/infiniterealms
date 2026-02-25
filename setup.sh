#!/bin/bash

# ============================================
# Infinite Realms - Setup Script
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║        Infinite Realms - Setup Script     ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ============================================
# Check for Homebrew (macOS)
# ============================================
check_homebrew() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if ! command -v brew &> /dev/null; then
            echo -e "${YELLOW}Homebrew not found. Installing...${NC}"
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        else
            echo -e "${GREEN}✓ Homebrew found${NC}"
        fi
    fi
}

# ============================================
# Check/Install PostgreSQL
# ============================================
setup_postgres() {
    echo -e "
${BLUE}[1/5] Checking PostgreSQL...${NC}"

    if command -v psql &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL is installed${NC}"
    else
        echo -e "${YELLOW}PostgreSQL not found. Installing...${NC}"

        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install postgresql@15
            brew services start postgresql@15

            # Add to PATH if needed
            echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
            export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update
            sudo apt-get install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
        else
            echo -e "${RED}Unsupported OS. Please install PostgreSQL manually.${NC}"
            exit 1
        fi

        echo -e "${GREEN}✓ PostgreSQL installed${NC}"
    fi

    # Ensure PostgreSQL is running
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql@15 2>/dev/null || true
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start postgresql 2>/dev/null || true
    fi
}

# ============================================
# Create Database
# ============================================
create_database() {
    echo -e "
${BLUE}[2/5] Setting up database...${NC}"

    DB_NAME="dndsolo"

    # Check if database exists
    if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        echo -e "${GREEN}✓ Database '$DB_NAME' already exists${NC}"
    else
        echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
        createdb "$DB_NAME" 2>/dev/null || {
            # If createdb fails, try with postgres user (Linux)
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                sudo -u postgres createdb "$DB_NAME"
            else
                echo -e "${RED}Failed to create database. Please create it manually:${NC}"
                echo "  createdb dndsolo"
                exit 1
            fi
        }
        echo -e "${GREEN}✓ Database created${NC}"
    fi

    # Run schema setup
    echo -e "${YELLOW}Setting up database schema...${NC}"
    if [ -f "$SCRIPT_DIR/scripts/setup-schema.sql" ]; then
        psql -d "$DB_NAME" -f "$SCRIPT_DIR/scripts/setup-schema.sql" 2>&1 | tail -5
        echo -e "${GREEN}✓ Database schema created${NC}"
    else
        echo -e "${YELLOW}⚠ Schema file not found, will setup via app${NC}"
    fi
}

# ============================================
# Create/Update .env.local
# ============================================
setup_env() {
    echo -e "
${BLUE}[3/5] Setting up environment...${NC}"

    ENV_FILE="$SCRIPT_DIR/.env.local"
    DB_USER=$(whoami)
    ENCRYPTION_KEY_VALUE=""
    DATABASE_URL_LINE=""
    NODE_ENV_LINE=""

    # Create .env.local if it doesn't exist
    if [ ! -f "$ENV_FILE" ]; then
        touch "$ENV_FILE"
        echo -e "${GREEN}✓ Created empty .env.local${NC}"
    fi

    # Read existing .env.local if it exists
    if [ -f "$ENV_FILE" ]; then
        while IFS= read -r line; do
            if [[ "$line" =~ ^DATABASE_URL= ]]; then
                DATABASE_URL_LINE="$line"
            elif [[ "$line" =~ ^NODE_ENV= ]]; then
                NODE_ENV_LINE="$line"
            elif [[ "$line" =~ ^ENCRYPTION_KEY= ]]; then
                ENCRYPTION_KEY_VALUE=$(echo "$line" | cut -d'=' -f2)
            fi
        done < "$ENV_FILE"
    fi

    # Ensure DATABASE_URL is set
    if [ -z "$DATABASE_URL_LINE" ]; then
        DATABASE_URL_LINE="DATABASE_URL=postgresql://${DB_USER}@localhost:5432/dndsolo"
        echo -e "${YELLOW}  Added default DATABASE_URL to .env.local${NC}"
    else
        echo -e "${GREEN}✓ DATABASE_URL already set${NC}"
    fi

    # Ensure ENCRYPTION_KEY is set
    if [ -z "$ENCRYPTION_KEY_VALUE" ]; then
        NEW_KEY=$(openssl rand -hex 32)
        ENCRYPTION_KEY_LINE="ENCRYPTION_KEY=$NEW_KEY"
        echo -e "${YELLOW}  Generated and added ENCRYPTION_KEY to .env.local${NC}"
        echo -e "${YELLOW}  IMPORTANT: Keep your ENCRYPTION_KEY secure and private!${NC}"
    else
        ENCRYPTION_KEY_LINE="ENCRYPTION_KEY=$ENCRYPTION_KEY_VALUE"
        echo -e "${GREEN}✓ ENCRYPTION_KEY already set${NC}"
    fi

    # Ensure NODE_ENV is set
    if [ -z "$NODE_ENV_LINE" ]; then
        NODE_ENV_LINE="NODE_ENV=development"
        echo -e "${YELLOW}  Added default NODE_ENV to .env.local${NC}"
    else
        echo -e "${GREEN}✓ NODE_ENV already set${NC}"
    fi

    # Write the updated .env.local file
    cat > "$ENV_FILE" << EOF
# Database connection
${DATABASE_URL_LINE}

# Encryption key for API tokens (32-byte hex string)
${ENCRYPTION_KEY_LINE}

# Node environment
${NODE_ENV_LINE}
EOF

    echo -e "${GREEN}✓ .env.local updated${NC}"
}

# ============================================
# Install Node dependencies
# ============================================
install_deps() {
    echo -e "
${BLUE}[4/5] Installing dependencies...${NC}"

    # Check for Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}Node.js not found. Installing...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install node
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
    fi

    echo -e "Node version: $(node --version)"
    echo -e "npm version: $(npm --version)"

    # Install dependencies
    npm install

    echo -e "${GREEN}✓ Dependencies installed${NC}"
}

# ============================================
# Start the server
# ============================================
start_server() {
    echo -e "
${BLUE}[5/5] Starting development server...${NC}"

    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════╗"
    echo "║            Setup Complete!                ║"
    echo "╠═══════════════════════════════════════════╣"
    echo "║                                           ║"
    echo "║  Starting server at http://localhost:3000 ║"
    echo "║                                           ║"
    echo "║  Next steps:                              ║"
    echo "║  1. Create a campaign                     ║"
    echo "║  2. Add your OpenAI API key in Settings  ║"
    echo "║  3. Start adventuring!                    ║"
    echo "║                                           ║"
    echo "║  Press Ctrl+C to stop the server         ║"
    echo "╚═══════════════════════════════════════════╝"
    echo -e "${NC}"

    npm run dev
}

# ============================================
# Main
# ============================================
main() {
    check_homebrew
    setup_postgres
    create_database
    setup_env
    install_deps
    start_server
}

# Run main function
main
