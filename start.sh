#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Limited Stock Product Drop System${NC}"
echo -e "${BLUE}Docker Setup & Run${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${YELLOW}Starting all services...${NC}\n"

# Check if containers are already running
if docker ps --format '{{.Names}}' | grep -q limited-stock; then
    echo -e "${YELLOW}Some containers are already running. Stopping them...${NC}"
    docker-compose down
fi

# Build and start all services
echo -e "${BLUE}Building and starting containers...${NC}\n"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Check if all services are running
echo -e "\n${BLUE}Checking service status...${NC}\n"

if docker ps --format '{{.Names}}' | grep -q limited-stock-postgres; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
fi

if docker ps --format '{{.Names}}' | grep -q limited-stock-backend; then
    echo -e "${GREEN}✅ Backend API is running${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
fi

if docker ps --format '{{.Names}}' | grep -q limited-stock-frontend; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Access the application:${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "  Backend:  ${GREEN}http://localhost:3000${NC}"
echo -e "  Database: ${GREEN}localhost:5432${NC}\n"

echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  View logs:           ${GREEN}docker-compose logs -f${NC}"
echo -e "  View backend logs:   ${GREEN}docker-compose logs -f backend${NC}"
echo -e "  View frontend logs:  ${GREEN}docker-compose logs -f frontend${NC}"
echo -e "  Stop all services:   ${GREEN}docker-compose down${NC}"
echo -e "  Restart services:    ${GREEN}docker-compose restart${NC}\n"

echo -e "${YELLOW}Test credentials:${NC}"
echo -e "  Email:    ${GREEN}test@test.com${NC}"
echo -e "  Password: ${GREEN}password123${NC}\n"
