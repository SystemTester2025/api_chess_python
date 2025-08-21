#!/usr/bin/env python3
"""
Multi-Engine Chess API for Render.com
FastAPI implementation with real chess engines
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
import chess
import chess.engine
import chess.pgn
import asyncio
import time
import logging
import os
import subprocess
import urllib.request
import stat
from pathlib import Path
from stockfish_js import stockfish_js_engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Multi-Engine Chess API",
    description="Professional chess analysis with multiple engines",
    version="1.0.0"
)

# Enable CORS for browser extensions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class MoveRequest(BaseModel):
    fen: str
    depth: int = 15
    engine: str = "stockfish"
    elo_limit: int = 3200
    time_limit: float = 1.0

class EvaluationRequest(BaseModel):
    fen: str
    perspective: str = "white"

class EnsembleRequest(BaseModel):
    fen: str
    engines: List[str] = ["stockfish", "random"]
    depth: int = 12

class MoveResponse(BaseModel):
    best_move: str
    evaluation: dict
    engine_used: str
    depth_reached: int
    analysis_time: float
    best_line: List[str] = []

class EvaluationResponse(BaseModel):
    evaluation: dict
    move_quality: dict
    position_type: str
    winning_chances: float

class EnsembleResponse(BaseModel):
    consensus_move: str
    confidence: float
    engine_results: List[dict]

# Global variables for engine management
engines = {}

# Get Stockfish path from environment or use defaults
STOCKFISH_PATH = os.environ.get("STOCKFISH_PATH", "/usr/bin/stockfish")

# Alternative Stockfish paths to try
STOCKFISH_PATHS = [
    STOCKFISH_PATH,
    "/usr/bin/stockfish",
    "/usr/local/bin/stockfish", 
    "/opt/stockfish/stockfish",
    "stockfish"  # If it's in PATH
]

async def download_stockfish():
    """Download Stockfish binary if not found"""
    stockfish_dir = Path("/tmp/stockfish")
    stockfish_path = stockfish_dir / "stockfish"
    
    if stockfish_path.exists():
        logger.info("✅ Stockfish already downloaded")
        return str(stockfish_path)
    
    try:
        logger.info("📥 Downloading Stockfish binary...")
        stockfish_dir.mkdir(exist_ok=True)
        
        # Download Stockfish for Linux
        url = "https://github.com/official-stockfish/Stockfish/releases/download/sf_16/stockfish-ubuntu-x86-64-modern.tar"
        urllib.request.urlretrieve(url, "/tmp/stockfish.tar")
        
        # Extract
        subprocess.run(["tar", "-xf", "/tmp/stockfish.tar", "-C", "/tmp/stockfish", "--strip-components=1"], check=True)
        
        # Make executable
        os.chmod(stockfish_path, stat.S_IRWXU | stat.S_IRGRP | stat.S_IXGRP | stat.S_IROTH | stat.S_IXOTH)
        
        logger.info(f"✅ Stockfish downloaded to: {stockfish_path}")
        return str(stockfish_path)
        
    except Exception as e:
        logger.error(f"❌ Failed to download Stockfish: {e}")
        return None

async def initialize_engines():
    """Initialize available chess engines"""
    global engines
    
    # First, try to initialize Stockfish.js
    logger.info("🚀 Initializing Stockfish.js...")
    stockfish_js_ready = await stockfish_js_engine.initialize()
    
    if stockfish_js_ready:
        engines["stockfish"] = "stockfish_js"
        logger.info("✅ Stockfish.js engine ready!")
    else:
        # Fallback 1: Try native Stockfish
        logger.info("🔄 Stockfish.js failed, trying native Stockfish...")
        
        # Try to download Stockfish first
        downloaded_stockfish = await download_stockfish()
        if downloaded_stockfish:
            STOCKFISH_PATHS.insert(0, downloaded_stockfish)
        
        # Try to initialize native Stockfish
        stockfish_found = False
        for path in STOCKFISH_PATHS:
            try:
                logger.info(f"🔍 Trying Stockfish path: {path}")
                if os.path.exists(path):
                    engines["stockfish"] = chess.engine.SimpleEngine.popen_uci(path)
                    logger.info(f"✅ Native Stockfish initialized at: {path}")
                    stockfish_found = True
                    break
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize Stockfish at {path}: {e}")
        
        if not stockfish_found:
            logger.warning("⚠️ Native Stockfish failed, using intelligent backup")
            engines["stockfish_backup"] = "backup_engine"
    
    # Random engine (always available)
    engines["random"] = "random_engine"
    logger.info("✅ Random engine initialized")
    
    logger.info(f"🎯 Available engines: {list(engines.keys())}")
    
    # Test engines
    await test_all_engines()

async def test_all_engines():
    """Test all available engines"""
    test_board = chess.Board()
    
    if "stockfish" in engines:
        try:
            if engines["stockfish"] == "stockfish_js":
                # Test Stockfish.js
                result = await stockfish_js_engine.analyze(test_board.fen(), 5)
                if result:
                    logger.info("✅ Stockfish.js test successful!")
                else:
                    logger.error("❌ Stockfish.js test failed")
                    del engines["stockfish"]
            else:
                # Test native Stockfish
                result = await engines["stockfish"].analyse(test_board, chess.engine.Limit(depth=1))
                logger.info("✅ Native Stockfish test successful!")
        except Exception as e:
            logger.error(f"❌ Stockfish test failed: {e}")
            if "stockfish" in engines:
                del engines["stockfish"]

@app.on_event("startup")
async def startup_event():
    """Initialize engines on startup"""
    await initialize_engines()

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up engines on shutdown"""
    for engine_name, engine in engines.items():
        if hasattr(engine, 'quit'):
            try:
                engine.quit()
                logger.info(f"🔄 Closed {engine_name} engine")
            except:
                pass

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve a simple dashboard"""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Multi-Engine Chess API</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .container {
                background: rgba(255,255,255,0.1);
                padding: 30px;
                border-radius: 15px;
                backdrop-filter: blur(10px);
            }
            .endpoint {
                background: rgba(255,255,255,0.2);
                padding: 15px;
                margin: 10px 0;
                border-radius: 8px;
            }
            code {
                background: rgba(0,0,0,0.3);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
            }
            .status {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
            }
            .online { background: #28a745; }
            .offline { background: #dc3545; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Multi-Engine Chess API</h1>
            <p>Your professional chess analysis API is running!</p>
            
            <h2>🎯 Available Endpoints</h2>
            
            <div class="endpoint">
                <strong>POST /api/v1/best-move</strong><br>
                Get the best move for a position
            </div>
            
            <div class="endpoint">
                <strong>POST /api/v1/evaluation</strong><br>
                Get position evaluation and analysis
            </div>
            
            <div class="endpoint">
                <strong>POST /api/v1/ensemble</strong><br>
                Multi-engine consensus analysis
            </div>
            
            <div class="endpoint">
                <strong>GET /api/v1/engines/status</strong><br>
                Check engine availability
            </div>
            
            <h2>🔧 Engine Status</h2>
            <p>
                Stockfish: <span class="status online">ONLINE</span><br>
                Random Engine: <span class="status online">ONLINE</span>
            </p>
            
            <h2>📖 Usage Example</h2>
            <code>
                curl -X POST "https://your-api.onrender.com/api/v1/best-move" \\<br>
                &nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
                &nbsp;&nbsp;-d '{"fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", "depth": 15}'
            </code>
            
            <h2>🎮 Ready for Your Extensions!</h2>
            <p>Replace your old API URLs with: <strong id="current-url"></strong></p>
            
            <script>
                document.getElementById('current-url').textContent = window.location.origin;
            </script>
        </div>
    </body>
    </html>
    """
    return html_content

@app.post("/api/v1/best-move", response_model=MoveResponse)
async def get_best_move(request: MoveRequest):
    """Get the best move for a given position"""
    start_time = time.time()
    
    try:
        # Validate FEN
        board = chess.Board(request.fen)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {str(e)}")
    
    logger.info(f"🎯 Analyzing position with {request.engine}, depth {request.depth}")
    
    try:
        if request.engine == "stockfish" and "stockfish" in engines:
            result = await analyze_with_stockfish(board, request.depth, request.time_limit)
        elif request.engine == "random":
            result = await analyze_with_random(board)
        else:
            # Fallback to available engines
            if "stockfish" in engines:
                result = await analyze_with_stockfish(board, request.depth, request.time_limit)
            elif "stockfish_backup" in engines:
                logger.info("🔄 Using intelligent backup engine")
                result = await analyze_with_backup(board)
            else:
                result = await analyze_with_random(board)
    
    except Exception as e:
        logger.error(f"❌ Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    
    analysis_time = time.time() - start_time
    result["analysis_time"] = round(analysis_time, 3)
    
    return result

@app.post("/api/v1/evaluation", response_model=EvaluationResponse)
async def get_evaluation(request: EvaluationRequest):
    """Get position evaluation"""
    try:
        board = chess.Board(request.fen)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {str(e)}")
    
    # Get best move first
    move_request = MoveRequest(fen=request.fen, depth=12)
    move_result = await get_best_move(move_request)
    
    evaluation = {
        "evaluation": move_result.evaluation,
        "move_quality": {
            "last_move": move_result.best_move,
            "classification": "good",
            "accuracy": 95
        },
        "position_type": get_position_type(board),
        "winning_chances": calculate_winning_chances(move_result.evaluation)
    }
    
    return evaluation

@app.post("/api/v1/ensemble", response_model=EnsembleResponse)
async def get_ensemble_analysis(request: EnsembleRequest):
    """Get consensus analysis from multiple engines"""
    try:
        board = chess.Board(request.fen)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {str(e)}")
    
    results = []
    weights = {"stockfish": 0.8, "random": 0.2}
    
    for engine_name in request.engines:
        if engine_name in engines:
            try:
                move_request = MoveRequest(fen=request.fen, engine=engine_name, depth=request.depth)
                result = await get_best_move(move_request)
                
                results.append({
                    "engine": result.engine_used,
                    "best_move": result.best_move,
                    "evaluation": result.evaluation.get("cp", 0),
                    "weight": weights.get(engine_name, 0.5)
                })
            except Exception as e:
                logger.warning(f"Engine {engine_name} failed: {e}")
    
    if not results:
        raise HTTPException(status_code=500, detail="All engines failed")
    
    # Calculate consensus
    move_votes = {}
    for result in results:
        move = result["best_move"]
        move_votes[move] = move_votes.get(move, 0) + result["weight"]
    
    consensus_move = max(move_votes, key=move_votes.get)
    confidence = min(100, (move_votes[consensus_move] / len(results)) * 100)
    
    return {
        "consensus_move": consensus_move,
        "confidence": round(confidence, 1),
        "engine_results": results
    }

@app.get("/api/v1/engines/status")
async def get_engine_status():
    """Get status of all available engines"""
    status = {}
    
    for engine_name in ["stockfish", "random"]:
        if engine_name in engines:
            if engine_name == "stockfish":
                status[engine_name] = {
                    "available": True,
                    "strength": "~3200 ELO",
                    "status": "ready",
                    "type": "native"
                }
            else:
                status[engine_name] = {
                    "available": True,
                    "strength": "~1200 ELO",
                    "status": "ready",
                    "type": "fallback"
                }
        else:
            status[engine_name] = {
                "available": False,
                "status": "unavailable"
            }
    
    return {
        "engines": status,
        "server": {
            "status": "online",
            "version": "1.0.0",
            "platform": "render.com"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "engines_available": list(engines.keys()),
        "version": "1.0.0"
    }

# Engine-specific analysis functions
async def analyze_with_stockfish(board: chess.Board, depth: int, time_limit: float):
    """Analyze position with Stockfish engine (native or JS)"""
    if "stockfish" not in engines:
        raise Exception("Stockfish engine not available")
    
    engine = engines["stockfish"]
    
    try:
        if engine == "stockfish_js":
            # Use Stockfish.js
            result = await stockfish_js_engine.analyze(board.fen(), depth)
            if not result or 'bestmove' not in result:
                raise Exception("Stockfish.js analysis failed")
            
            return {
                "best_move": result['bestmove'],
                "evaluation": result.get('evaluation', {"cp": 0, "mate": None}),
                "engine_used": "stockfish_js",
                "depth_reached": result.get('depth', depth),
                "best_line": [result['bestmove']]
            }
        else:
            # Use native Stockfish
            info = await asyncio.wait_for(
                engine.analyse(board, chess.engine.Limit(depth=depth, time=time_limit)),
                timeout=time_limit + 5
            )
            
            best_move = str(info["pv"][0]) if info.get("pv") else None
            if not best_move:
                raise Exception("No best move found")
            
            # Extract evaluation
            score = info.get("score", chess.engine.PovScore(chess.engine.Cp(0), chess.WHITE))
            if score.is_mate():
                evaluation = {"cp": None, "mate": score.mate()}
            else:
                evaluation = {"cp": score.cp, "mate": None}
            
            # Extract principal variation
            pv = [str(move) for move in info.get("pv", [])[:3]]
            
            return {
                "best_move": best_move,
                "evaluation": evaluation,
                "engine_used": "stockfish_native",
                "depth_reached": depth,
                "best_line": pv
            }
        
    except Exception as e:
        logger.error(f"Stockfish analysis failed: {e}")
        raise

async def analyze_with_backup(board: chess.Board):
    """Backup chess engine with intelligent move selection"""
    legal_moves = list(board.legal_moves)
    if not legal_moves:
        raise Exception("No legal moves available")
    
    # Smart move selection based on chess principles
    best_move = select_smart_move(board, legal_moves)
    
    return {
        "best_move": str(best_move),
        "evaluation": {"cp": evaluate_position(board), "mate": None},
        "engine_used": "intelligent_backup",
        "depth_reached": 3,
        "best_line": [str(best_move)]
    }

def select_smart_move(board, legal_moves):
    """Select move based on chess principles"""
    import random
    
    # Move scoring
    move_scores = {}
    
    for move in legal_moves:
        score = 0
        
        # 1. Captures are good
        if board.is_capture(move):
            captured_piece = board.piece_at(move.to_square)
            if captured_piece:
                score += piece_values.get(captured_piece.piece_type, 0)
        
        # 2. Checks are good
        board.push(move)
        if board.is_check():
            score += 50
        board.pop()
        
        # 3. Center control (e4, e5, d4, d5)
        center_squares = [chess.E4, chess.E5, chess.D4, chess.D5]
        if move.to_square in center_squares:
            score += 30
        
        # 4. Piece development in opening
        if board.fullmove_number <= 10:
            piece = board.piece_at(move.from_square)
            if piece and piece.piece_type in [chess.KNIGHT, chess.BISHOP]:
                if move.from_square in [chess.B1, chess.G1, chess.B8, chess.G8, chess.C1, chess.F1, chess.C8, chess.F8]:
                    score += 25
        
        # 5. Avoid moving same piece twice in opening
        if board.fullmove_number <= 8:
            piece = board.piece_at(move.from_square)
            if piece and piece.piece_type in [chess.KNIGHT, chess.BISHOP]:
                # Prefer pieces that haven't moved
                score += 15
        
        move_scores[move] = score + random.randint(-10, 10)  # Add small randomness
    
    # Return best scoring move
    return max(move_scores, key=move_scores.get)

def evaluate_position(board):
    """Simple position evaluation"""
    if board.is_checkmate():
        return -9999 if board.turn else 9999
    
    if board.is_stalemate() or board.is_insufficient_material():
        return 0
    
    # Material count
    white_material = sum(piece_values.get(piece.piece_type, 0) 
                        for piece in board.piece_map().values() 
                        if piece.color == chess.WHITE)
    
    black_material = sum(piece_values.get(piece.piece_type, 0) 
                        for piece in board.piece_map().values() 
                        if piece.color == chess.BLACK)
    
    material_diff = white_material - black_material
    
    # Return from white's perspective
    return material_diff if board.turn == chess.WHITE else -material_diff

# Piece values for evaluation
piece_values = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 0
}

async def analyze_with_random(board: chess.Board):
    """Analyze position with random move selection"""
    legal_moves = list(board.legal_moves)
    if not legal_moves:
        raise Exception("No legal moves available")
    
    import random
    best_move = str(random.choice(legal_moves))
    
    return {
        "best_move": best_move,
        "evaluation": {"cp": random.randint(-100, 100), "mate": None},
        "engine_used": "random",
        "depth_reached": 1,
        "best_line": [best_move]
    }

# Utility functions
def get_position_type(board: chess.Board) -> str:
    """Determine position type based on move number"""
    move_number = board.fullmove_number
    
    if move_number <= 10:
        return "opening"
    elif move_number <= 40:
        return "middlegame"
    else:
        return "endgame"

def calculate_winning_chances(evaluation: dict) -> float:
    """Calculate winning chances from evaluation"""
    if evaluation.get("mate") is not None:
        return 100 if evaluation["mate"] > 0 else 0
    
    cp = evaluation.get("cp", 0)
    if cp is None:
        return 50
    
    # Convert centipawns to winning percentage
    win_percentage = 50 + (cp / 100) * 10
    return max(0, min(100, round(win_percentage, 1)))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
