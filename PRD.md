# Chess API with Multiple Engines - ORD (Operational Requirements Document)

## 1. Project Overview

### Objective
Create a robust chess API that provides best move suggestions from multiple chess engines, replacing the single Stockfish dependency in existing Tampermonkey extensions.

### Current State Analysis
- **Extension 1**: Uses `herolalispro.pythonanywhere.com` with basic Stockfish integration
- **Extension 2**: Uses `sanandre.pythonanywhere.com` with more advanced features
- Both extract FEN positions and request best moves via HTTP APIs

## 2. Technical Architecture

### 2.1 Multi-Engine Support
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Stockfish     │    │     Komodo      │    │   Leela Zero    │
│   (Open Source) │    │   (Commercial)  │    │   (Neural Net)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Engine Manager │
                    │   (Load Balancer)│
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Chess API     │
                    │   (FastAPI)     │
                    └─────────────────┘
```

### 2.2 API Endpoints Design

#### Core Endpoints
```
POST /api/v1/analyze
POST /api/v1/best-move
POST /api/v1/evaluation
GET  /api/v1/engines/status
POST /api/v1/engines/select
```

#### Engine-Specific Endpoints
```
POST /api/v1/stockfish/analyze
POST /api/v1/komodo/analyze
POST /api/v1/leela/analyze
POST /api/v1/ensemble/analyze  # Multiple engines consensus
```

## 3. Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)
1. **Setup FastAPI application**
   - Install dependencies: `fastapi`, `uvicorn`, `python-chess`
   - Create project structure
   - Setup CORS for browser extensions

2. **Stockfish Integration**
   - Install Stockfish engine
   - Create engine wrapper class
   - Implement basic analysis functions

3. **Basic API Endpoints**
   - `/best-move` - Returns best move in UCI format
   - `/evaluation` - Returns position evaluation
   - Health check endpoints

### Phase 2: Multi-Engine Support (Week 3-4)
1. **Engine Manager Development**
   - Abstract engine interface
   - Load balancing between engines
   - Engine health monitoring

2. **Additional Engines**
   - Komodo integration (if licensed)
   - Leela Zero/LC0 integration
   - Engine comparison utilities

3. **Advanced Features**
   - Ensemble analysis (multiple engines)
   - Engine-specific optimizations
   - Caching layer for positions

### Phase 3: Production Features (Week 5-6)
1. **Performance Optimization**
   - Redis caching for analyzed positions
   - Async processing
   - Connection pooling

2. **Monitoring & Analytics**
   - Request logging
   - Performance metrics
   - Error tracking

3. **Security & Rate Limiting**
   - API key authentication
   - Rate limiting per user
   - Input validation

## 4. Technical Specifications

### 4.1 Server Requirements
```yaml
Minimum Specifications:
  - CPU: 4 cores (Intel/AMD)
  - RAM: 8GB DDR4
  - Storage: 20GB SSD
  - Network: 100Mbps upload
  - OS: Ubuntu 20.04+ / CentOS 8+

Recommended Specifications:
  - CPU: 8+ cores
  - RAM: 16GB+ DDR4
  - Storage: 50GB+ NVMe SSD
  - Network: 1Gbps
```

### 4.2 Dependencies
```python
# requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-chess==1.999
stockfish==3.28.0
redis==5.0.1
pydantic==2.5.0
python-multipart==0.0.6
aiohttp==3.9.1
asyncio-mqtt==0.16.1
prometheus-client==0.19.0
```

### 4.3 Environment Configuration
```bash
# .env file
STOCKFISH_PATH=/usr/bin/stockfish
KOMODO_PATH=/opt/komodo/komodo
LEELA_PATH=/opt/leela/lc0
REDIS_URL=redis://localhost:6379
API_KEY_SECRET=your-secret-key
RATE_LIMIT_PER_MINUTE=60
```

## 5. API Documentation

### 5.1 Best Move Endpoint
```http
POST /api/v1/best-move
Content-Type: application/json

{
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "depth": 15,
  "time_limit": 1.0,
  "engine": "stockfish",
  "elo_limit": 2800
}

Response:
{
  "best_move": "e7e5",
  "evaluation": {
    "cp": 25,
    "mate": null,
    "best_line": ["e7e5", "g1f3", "b8c6"]
  },
  "engine_used": "stockfish",
  "analysis_time": 0.85,
  "depth_reached": 15
}
```

### 5.2 Position Evaluation
```http
POST /api/v1/evaluation
Content-Type: application/json

{
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "perspective": "white"
}

Response:
{
  "evaluation": {
    "cp": 25,
    "mate": null,
    "winning_chances": 52.1,
    "position_type": "opening"
  },
  "move_quality": {
    "last_move": "e2e4",
    "classification": "book",
    "accuracy": 100
  }
}
```

### 5.3 Engine Ensemble Analysis
```http
POST /api/v1/ensemble/analyze
Content-Type: application/json

{
  "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
  "engines": ["stockfish", "komodo", "leela"],
  "depth": 12
}

Response:
{
  "consensus_move": "d2d3",
  "confidence": 85.5,
  "engine_results": [
    {
      "engine": "stockfish",
      "best_move": "d2d3",
      "evaluation": 45,
      "weight": 0.4
    },
    {
      "engine": "komodo", 
      "best_move": "d2d3",
      "evaluation": 52,
      "weight": 0.3
    },
    {
      "engine": "leela",
      "best_move": "f1e2",
      "evaluation": 38,
      "weight": 0.3
    }
  ]
}
```

## 6. Engine Specifications

### 6.1 Stockfish Configuration
```python
stockfish_config = {
    "Threads": 4,
    "Hash": 2048,  # MB
    "UCI_Elo": 2800,
    "Skill Level": 20,
    "Minimum Thinking Time": 1000,  # ms
    "Slow Mover": 84
}
```

### 6.2 Leela Zero Configuration
```python
leela_config = {
    "nodes": 10000,
    "threads": 4,
    "gpu": True,
    "weights": "latest.pb.gz",
    "backend": "cudnn"
}
```

## 7. Deployment Strategy

### 7.1 Docker Deployment
```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    stockfish \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Leela Zero
RUN wget https://github.com/LeelaChessZero/lc0/releases/download/v0.30.0/lc0-v0.30.0-linux-cpu-openblas.tar.gz \
    && tar -xzf lc0-v0.30.0-linux-cpu-openblas.tar.gz \
    && mv lc0 /usr/local/bin/

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 7.2 Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-chess-api.com;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # CORS headers for browser extensions
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    }
}
```

## 8. Extension Integration

### 8.1 Updated Extension Endpoints
Replace existing API calls in extensions:

**Old (Extension 1):**
```javascript
const data = await fetch(`https://herolalispro.pythonanywhere.com/chessapi/enginePost/?fen=${fen}&depth=${power}&elo=${elo}`)
```

**New:**
```javascript
const data = await fetch(`https://your-chess-api.com/api/v1/best-move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        fen: fen,
        depth: power,
        elo_limit: elo,
        engine: 'stockfish'  // or 'ensemble'
    })
})
```

### 8.2 Extension Enhancements
Add engine selection UI:
```javascript
// Add to extension UI
const engineSelect = document.createElement('select');
engineSelect.innerHTML = `
    <option value="stockfish">Stockfish</option>
    <option value="komodo">Komodo</option>
    <option value="leela">Leela Zero</option>
    <option value="ensemble">Best Consensus</option>
`;
```

## 9. Performance Expectations

### 9.1 Response Times
- **Stockfish (depth 15)**: 0.5-2.0 seconds
- **Leela (10k nodes)**: 1.0-3.0 seconds  
- **Komodo (depth 15)**: 0.8-2.5 seconds
- **Ensemble analysis**: 2.0-5.0 seconds

### 9.2 Concurrent Users
- **Light load**: 50 concurrent requests
- **Medium load**: 200 concurrent requests
- **Heavy load**: 500+ concurrent requests (with caching)

## 10. Monitoring & Maintenance

### 10.1 Health Checks
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "engines": {
            "stockfish": await check_stockfish(),
            "leela": await check_leela(),
            "komodo": await check_komodo()
        },
        "cache": await check_redis(),
        "uptime": get_uptime()
    }
```

### 10.2 Metrics to Track
- Request volume per endpoint
- Average response times per engine
- Error rates and types
- Cache hit/miss ratios
- Engine availability

## 11. Cost Estimation

### 11.1 Server Costs (Monthly)
- **VPS (8 core, 16GB)**: $50-80
- **Domain & SSL**: $15
- **Monitoring tools**: $20
- **Total**: ~$85-115/month

### 11.2 Development Time
- **Phase 1**: 40-60 hours
- **Phase 2**: 60-80 hours
- **Phase 3**: 40-60 hours
- **Total**: 140-200 hours

## 12. Risk Assessment

### 12.1 Technical Risks
- **High CPU usage** during peak times
- **Engine crashes** under heavy load
- **Memory leaks** in long-running processes

### 12.2 Mitigation Strategies
- Implement circuit breakers
- Engine process isolation
- Automatic restart mechanisms
- Comprehensive monitoring

## Next Steps

1. **Setup development environment**
2. **Create basic FastAPI structure**
3. **Implement Stockfish integration**
4. **Test with existing extensions**
5. **Add additional engines**
6. **Deploy to production server**

---

*This document should be reviewed and updated as the project progresses. Estimated completion time: 6-8 weeks for full implementation.*
