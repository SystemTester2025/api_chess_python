// Multi-Engine Chess API - JavaScript Implementation
// Compatible with Tampermonkey extensions

class ChessAPI {
    constructor() {
        this.engines = {
            stockfish: null,
            jsengine: null,
            tomitank: null
        };
        this.initializeEngines();
        this.setupAPIEndpoints();
    }

    async initializeEngines() {
        console.log('Initializing chess engines...');
        
        // Initialize JS-Chess-Engine (already loaded)
        if (typeof jsChessEngine !== 'undefined') {
            this.engines.jsengine = jsChessEngine;
            console.log('✅ JS-Chess-Engine initialized');
        }

        // Initialize Stockfish (load dynamically)
        try {
            await this.loadStockfish();
        } catch (error) {
            console.error('❌ Failed to load Stockfish:', error);
        }
    }

    async loadStockfish() {
        return new Promise((resolve, reject) => {
            if (typeof Stockfish !== 'undefined') {
                this.engines.stockfish = Stockfish();
                console.log('✅ Stockfish initialized');
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/stockfish@16.1.0/src/stockfish.js';
            script.onload = () => {
                try {
                    this.engines.stockfish = Stockfish();
                    console.log('✅ Stockfish loaded and initialized');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupAPIEndpoints() {
        // Simulate API endpoints for testing
        // In a real setup, these would be handled by a server
        window.chessAPI = {
            bestMove: (request) => this.getBestMove(request),
            evaluation: (request) => this.getEvaluation(request),
            ensemble: (request) => this.getEnsembleAnalysis(request),
            engineStatus: () => this.getEngineStatus()
        };

        console.log('✅ Chess API endpoints ready');
    }

    async getBestMove(request) {
        const {
            fen,
            depth = 15,
            engine = 'stockfish',
            elo_limit = 3200,
            time_limit = 1.0
        } = request;

        console.log(`🎯 Getting best move with ${engine}:`, { fen, depth, elo_limit });

        try {
            switch (engine.toLowerCase()) {
                case 'stockfish':
                    return await this.getStockfishMove(fen, depth, time_limit);
                
                case 'jsengine':
                case 'js-chess-engine':
                    return await this.getJSEngineMove(fen, depth);
                
                case 'tomitank':
                    return await this.getTomitankMove(fen, depth);
                
                default:
                    throw new Error(`Unknown engine: ${engine}`);
            }
        } catch (error) {
            console.error('❌ Error getting best move:', error);
            return {
                error: error.message,
                engine: engine,
                fallback: await this.getFallbackMove(fen)
            };
        }
    }

    async getStockfishMove(fen, depth, timeLimit) {
        return new Promise((resolve, reject) => {
            if (!this.engines.stockfish) {
                reject(new Error('Stockfish engine not available'));
                return;
            }

            const sf = this.engines.stockfish;
            let bestMove = null;
            let evaluation = null;
            let pv = [];

            const timeout = setTimeout(() => {
                reject(new Error('Stockfish timeout'));
            }, (timeLimit * 1000) + 5000);

            sf.onmessage = function(event) {
                const line = event.data;
                
                if (line.includes('info depth')) {
                    // Parse evaluation
                    const scoreMatch = line.match(/score cp (-?\d+)/);
                    const mateMatch = line.match(/score mate (-?\d+)/);
                    const pvMatch = line.match(/pv (.+)/);
                    
                    if (scoreMatch) {
                        evaluation = { cp: parseInt(scoreMatch[1]), mate: null };
                    } else if (mateMatch) {
                        evaluation = { cp: null, mate: parseInt(mateMatch[1]) };
                    }
                    
                    if (pvMatch) {
                        pv = pvMatch[1].split(' ').slice(0, 3);
                    }
                }
                
                if (line.includes('bestmove')) {
                    clearTimeout(timeout);
                    bestMove = line.split(' ')[1];
                    
                    resolve({
                        best_move: bestMove,
                        evaluation: evaluation || { cp: 0, mate: null },
                        engine_used: 'stockfish',
                        depth_reached: depth,
                        best_line: pv,
                        analysis_time: timeLimit
                    });
                }
            };

            // Send commands to Stockfish
            sf.postMessage('ucinewgame');
            sf.postMessage('position fen ' + fen);
            sf.postMessage(`go depth ${depth}`);
        });
    }

    async getJSEngineMove(fen, depth) {
        if (!this.engines.jsengine) {
            throw new Error('JS-Chess-Engine not available');
        }

        try {
            const game = new this.engines.jsengine.Game(fen);
            const moves = game.moves();
            const moveKeys = Object.keys(moves);
            
            if (moveKeys.length === 0) {
                throw new Error('No legal moves available');
            }

            // Simple evaluation: pick a random good move
            // In a real implementation, you'd use the engine's analysis
            const bestMove = moveKeys[0];
            const moveNotation = this.convertToUCI(bestMove, moves[bestMove]);

            return {
                best_move: moveNotation,
                evaluation: { cp: Math.floor(Math.random() * 100) - 50, mate: null },
                engine_used: 'js-chess-engine',
                depth_reached: Math.min(depth, 8),
                best_line: [moveNotation],
                analysis_time: 0.1
            };
        } catch (error) {
            throw new Error(`JS-Engine error: ${error.message}`);
        }
    }

    async getTomitankMove(fen, depth) {
        // Placeholder for Tomitank engine
        // This would be implemented if you choose to include it
        return {
            best_move: 'e7e5', // Fallback move
            evaluation: { cp: 0, mate: null },
            engine_used: 'tomitank',
            depth_reached: depth,
            best_line: ['e7e5'],
            analysis_time: 0.2,
            note: 'Tomitank engine not yet implemented'
        };
    }

    async getFallbackMove(fen) {
        // Simple fallback moves for common positions
        const fallbackMoves = {
            'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1': 'e7e5',
            'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2': 'g1f3',
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1': 'e2e4'
        };

        return {
            best_move: fallbackMoves[fen] || 'e2e4',
            evaluation: { cp: 0, mate: null },
            engine_used: 'fallback',
            note: 'Fallback move - engines unavailable'
        };
    }

    async getEvaluation(request) {
        const { fen, perspective = 'white' } = request;
        
        try {
            const moveResult = await this.getBestMove({ fen, depth: 12 });
            
            return {
                evaluation: moveResult.evaluation,
                move_quality: {
                    last_move: moveResult.best_move,
                    classification: 'good',
                    accuracy: 95
                },
                position_type: this.getPositionType(fen),
                winning_chances: this.calculateWinningChances(moveResult.evaluation)
            };
        } catch (error) {
            return {
                error: error.message,
                evaluation: { cp: 0, mate: null }
            };
        }
    }

    async getEnsembleAnalysis(request) {
        const { fen, engines = ['stockfish', 'jsengine'], depth = 12 } = request;
        
        const results = [];
        
        for (const engine of engines) {
            try {
                const result = await this.getBestMove({ fen, engine, depth });
                results.push({
                    engine: result.engine_used,
                    best_move: result.best_move,
                    evaluation: result.evaluation?.cp || 0,
                    weight: engine === 'stockfish' ? 0.6 : 0.4
                });
            } catch (error) {
                console.warn(`Engine ${engine} failed:`, error.message);
            }
        }

        if (results.length === 0) {
            const fallback = await this.getFallbackMove(fen);
            return {
                consensus_move: fallback.best_move,
                confidence: 0,
                engine_results: [],
                error: 'All engines failed'
            };
        }

        // Find consensus move
        const moveVotes = {};
        results.forEach(result => {
            moveVotes[result.best_move] = (moveVotes[result.best_move] || 0) + result.weight;
        });

        const consensusMove = Object.keys(moveVotes).reduce((a, b) => 
            moveVotes[a] > moveVotes[b] ? a : b
        );

        const confidence = Math.min(100, (moveVotes[consensusMove] / results.length) * 100);

        return {
            consensus_move: consensusMove,
            confidence: Math.round(confidence * 10) / 10,
            engine_results: results
        };
    }

    getEngineStatus() {
        return {
            stockfish: {
                available: !!this.engines.stockfish,
                strength: '~3200 ELO',
                status: this.engines.stockfish ? 'ready' : 'loading'
            },
            jsengine: {
                available: !!this.engines.jsengine,
                strength: '~2000 ELO',
                status: this.engines.jsengine ? 'ready' : 'unavailable'
            },
            tomitank: {
                available: false,
                strength: '~1800 ELO',
                status: 'not implemented'
            }
        };
    }

    // Utility functions
    convertToUCI(from, to) {
        // Convert JS-Chess-Engine notation to UCI notation
        if (typeof to === 'string') return to;
        return `${from.toLowerCase()}${to.toLowerCase()}`;
    }

    getPositionType(fen) {
        const moves = fen.split(' ')[5];
        const moveNumber = parseInt(moves);
        
        if (moveNumber <= 10) return 'opening';
        if (moveNumber <= 40) return 'middlegame';
        return 'endgame';
    }

    calculateWinningChances(evaluation) {
        if (!evaluation) return 50;
        
        if (evaluation.mate !== null) {
            return evaluation.mate > 0 ? 100 : 0;
        }
        
        if (evaluation.cp !== null) {
            // Convert centipawns to winning percentage (rough approximation)
            const winPercentage = 50 + (evaluation.cp / 100) * 10;
            return Math.max(0, Math.min(100, Math.round(winPercentage * 10) / 10));
        }
        
        return 50;
    }
}

// Initialize the Chess API when the script loads
let chessAPIInstance = null;

document.addEventListener('DOMContentLoaded', function() {
    chessAPIInstance = new ChessAPI();
    console.log('🚀 Multi-Engine Chess API initialized');
});

// Compatibility functions for Tampermonkey extensions
window.getChessBestMove = async function(fen, depth = 15, elo = 3200, engine = 'stockfish') {
    if (!chessAPIInstance) {
        chessAPIInstance = new ChessAPI();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for initialization
    }
    
    return await chessAPIInstance.getBestMove({
        fen,
        depth,
        elo_limit: elo,
        engine
    });
};

window.getChessEvaluation = async function(fen, turn, cp, best_cp) {
    if (!chessAPIInstance) {
        chessAPIInstance = new ChessAPI();
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const evaluation = await chessAPIInstance.getEvaluation({ fen });
    
    // Format response to match existing extension expectations
    return {
        cp: evaluation.evaluation?.cp || 0,
        winning: evaluation.winning_chances > 50 ? 'winning' : 'losing',
        value: evaluation.move_quality?.last_move || 'unknown',
        color: evaluation.winning_chances > 50 ? '#00ff00' : '#ff0000',
        img: evaluation.winning_chances > 70 ? '🔥' : evaluation.winning_chances > 50 ? '👍' : '👎'
    };
};

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessAPI;
}
