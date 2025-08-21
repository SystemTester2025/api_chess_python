# 🚀 Multi-Engine Chess API

A powerful chess analysis API that supports multiple engines and can be deployed on any web hosting platform, including Namecheap shared hosting.

## 🎯 Features

- **Multiple Chess Engines**: Stockfish.js, JS-Chess-Engine, and more
- **Browser Compatible**: Works directly in web browsers
- **REST API**: Clean endpoints for integration
- **Tampermonkey Ready**: Drop-in replacement for existing extensions
- **Easy Deployment**: Works on shared hosting (no VPS required)

## 📁 Files Overview

### Core Files
- `index.html` - Main dashboard and testing interface
- `chess-api.js` - JavaScript chess engine implementation
- `api-server.php` - PHP server for shared hosting compatibility
- `README.md` - This documentation

### Key Features
- ✅ **Stockfish.js** - Professional strength (~3200 ELO)
- ✅ **JS-Chess-Engine** - Lightweight engine (~2000 ELO)
- ✅ **Ensemble Analysis** - Consensus from multiple engines
- ✅ **Position Evaluation** - Comprehensive position analysis
- ✅ **Browser-based** - No server installations required

## 🚀 Quick Deployment

### Option 1: Namecheap Shared Hosting (Recommended)

1. **Upload files to your hosting**:
   ```
   public_html/
   ├── index.html
   ├── chess-api.js
   ├── api-server.php
   └── README.md
   ```

2. **Configure URL rewriting** (create `.htaccess`):
   ```apache
   RewriteEngine On
   RewriteRule ^api/(.*)$ api-server.php [QSA,L]
   ```

3. **Test your API**: Visit `https://yourdomain.com`

### Option 2: Any Web Hosting

Simply upload all files to your web root directory. The API will work immediately!

## 🔧 API Endpoints

### Get Best Move
```http
POST /api/best-move
Content-Type: application/json

{
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "depth": 15,
  "engine": "stockfish",
  "elo_limit": 2800
}
```

**Response:**
```json
{
  "best_move": "e7e5",
  "evaluation": {
    "cp": 25,
    "mate": null
  },
  "engine_used": "stockfish",
  "depth_reached": 15,
  "analysis_time": 0.85
}
```

### Get Position Evaluation
```http
POST /api/evaluation
Content-Type: application/json

{
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "perspective": "white"
}
```

### Ensemble Analysis
```http
POST /api/ensemble
Content-Type: application/json

{
  "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
  "engines": ["stockfish", "jsengine"],
  "depth": 12
}
```

### Engine Status
```http
GET /api/engines/status
```

## 🔄 Updating Your Tampermonkey Extensions

Replace your existing API calls with your new API:

### Before (Extension 1):
```javascript
const data = await fetch(`https://herolalispro.pythonanywhere.com/chessapi/enginePost/?fen=${fen}&depth=${power}&elo=${elo}`)
```

### After:
```javascript
const data = await fetch(`https://yourdomain.com/api/best-move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        fen: fen,
        depth: power,
        elo_limit: elo,
        engine: 'stockfish'
    })
})
```

## 🎮 Available Engines

### 1. Stockfish.js
- **Strength**: ~3200 ELO
- **Type**: Professional engine (JavaScript port)
- **Best for**: Serious analysis, tournament play

### 2. JS-Chess-Engine
- **Strength**: ~2000 ELO
- **Type**: Lightweight JavaScript engine
- **Best for**: Quick analysis, educational use

### 3. Ensemble Mode
- **Combines**: Multiple engines for consensus
- **Confidence**: Weighted voting system
- **Best for**: Critical positions, double-checking

## 🧪 Testing Your API

1. **Open** `https://yourdomain.com` in your browser
2. **Click** test buttons to verify engines work
3. **Check** the response format matches your extensions
4. **Update** your Tampermonkey scripts with the new URL

## 🔧 Customization

### Adding New Engines

Edit `chess-api.js` and add your engine:

```javascript
async getCustomEngineMove(fen, depth) {
    // Your engine implementation
    return {
        best_move: 'e2e4',
        evaluation: { cp: 25, mate: null },
        engine_used: 'custom',
        depth_reached: depth
    };
}
```

### Adjusting Engine Weights

In ensemble analysis, modify weights in `api-server.php`:

```php
$weights = [
    'stockfish' => 0.7,  // 70% weight
    'jsengine' => 0.3    // 30% weight
];
```

## 📊 Performance

### Response Times
- **Stockfish.js**: 0.5-2.0 seconds (depth 15)
- **JS-Engine**: 0.1-0.5 seconds (depth 10)
- **Ensemble**: 1.0-3.0 seconds (multiple engines)

### Concurrent Users
- **Shared Hosting**: 10-50 concurrent requests
- **VPS**: 100+ concurrent requests

## 🔒 Security Features

- **CORS enabled** for browser extensions
- **Input validation** for FEN strings
- **Rate limiting** (can be added)
- **Error handling** with fallback moves

## 🐛 Troubleshooting

### Common Issues

**1. API not responding**
- Check file permissions (755 for directories, 644 for files)
- Verify PHP is enabled on your hosting
- Check error logs in cPanel

**2. CORS errors**
- Ensure `Access-Control-Allow-Origin: *` headers are set
- Check browser console for specific errors

**3. Engine not loading**
- Verify internet connection (engines load from CDN)
- Check browser console for JavaScript errors
- Try refreshing the page

**4. Slow responses**
- Reduce analysis depth in requests
- Use lighter engines (JS-Engine instead of Stockfish)
- Check hosting provider performance

### Debug Mode

Add `?debug=1` to your URL to see detailed logs:
```
https://yourdomain.com/?debug=1
```

## 🔄 Updating

To update the API:

1. **Backup** your current files
2. **Upload** new versions
3. **Clear** browser cache
4. **Test** functionality

## 💡 Advanced Usage

### Custom Engine Selection

Your extensions can now choose engines dynamically:

```javascript
// Use Stockfish for serious games
const strongMove = await getMove(fen, 'stockfish', 15);

// Use JS-Engine for quick hints
const quickMove = await getMove(fen, 'jsengine', 8);

// Use ensemble for critical positions
const consensusMove = await getMove(fen, 'ensemble', 12);
```

### Position-Based Engine Selection

```javascript
function selectBestEngine(fen) {
    const moveNumber = parseInt(fen.split(' ')[5]);
    
    if (moveNumber <= 10) return 'jsengine';      // Opening
    if (moveNumber <= 40) return 'stockfish';    // Middlegame
    return 'ensemble';                           // Endgame
}
```

## 📈 Future Enhancements

- [ ] Add Leela Zero integration
- [ ] Implement caching for analyzed positions
- [ ] Add opening book database
- [ ] Create mobile-friendly interface
- [ ] Add game analysis features
- [ ] Implement user accounts and preferences

## 🤝 Support

If you need help:

1. **Check** the troubleshooting section
2. **Review** browser console for errors
3. **Test** with the built-in testing interface
4. **Verify** all files uploaded correctly

## 📄 License

This project is open source. Feel free to modify and distribute.

---

**🎯 Ready to dominate chess.com with your own multi-engine API!**

Replace those old APIs and enjoy the power of multiple chess engines working together.
