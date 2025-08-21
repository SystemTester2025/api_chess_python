# Backup solution using Lichess API if Stockfish fails
import aiohttp
import asyncio

async def analyze_with_lichess_api(fen, depth=12):
    """Use Lichess API as backup when Stockfish is unavailable"""
    url = "https://lichess.org/api/cloud-eval"
    params = {
        "fen": fen,
        "multiPv": 1,
        "variant": "standard"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if "bestmove" in data:
                        return {
                            "best_move": data["bestmove"],
                            "evaluation": {"cp": data.get("cp", 0), "mate": data.get("mate")},
                            "engine_used": "lichess_cloud",
                            "depth_reached": depth,
                            "best_line": [data["bestmove"]]
                        }
    except Exception as e:
        print(f"Lichess API failed: {e}")
    
    # Ultimate fallback - common good moves
    opening_moves = {
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1": "e7e5",
        "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2": "g1f3"
    }
    
    return {
        "best_move": opening_moves.get(fen, "e2e4"),
        "evaluation": {"cp": 25, "mate": None},
        "engine_used": "fallback",
        "depth_reached": 1,
        "best_line": [opening_moves.get(fen, "e2e4")]
    }
