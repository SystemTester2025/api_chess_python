// ==UserScript==
// @name         KrypBot - Your Own API
// @namespace    http://tampermonkey.net/
// @version      2024-12-19-Updated
// @description  Chess bot powered by your own API!
// @author       You
// @match        https://www.chess.com/play/computer*
// @match       https://www.chess.com/play/*
// @match       https://www.chess.com/game/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    let interval, show_opponent = false, power = 15, elo = 3636, can_interval = true, auto_move, current_color = 'yellow', fen, checkfen, cp = 0, best_cp = 0, hint = false, username, Messages = [], msgLen = 0, panelVisible = false, moveDelay = 1500, securityMode = true, randomMoveVariation = true, humanThinkingTime = true, playerTimerInterval = null, showGameTimer = true;
    let selectedEngine = 'stockfish'; // Initialize engine selection at the top

    // YOUR OWN API URL
    const YOUR_API_URL = 'https://api-chess-python.onrender.com';

    if (!localStorage.getItem('username')) {
        username = 'User' + [...Array(9).keys()] // creates [0..99]
            .map(n => n + 1)                        // now [1..100]
            .sort(() => Math.random() - 0.5)       // shuffle
            .slice(0, 5).join('');
    }
    else {
        username = localStorage.getItem('username')


    }
    const script = document.createElement('script');


    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute('src', 'https://code.jquery.com/jquery-3.7.1.js');
    script.setAttribute('integrity', 'sha256-eKhayi8LEQwp4NKxN+CfCh+3qOVUtJn3QNZ0TciWLP4=');
    script.setAttribute('crossorigin', 'anonymous');
    document.body.appendChild(script);

    script.onload = () => {
        $('<link>', {
            rel: 'stylesheet',
            type: 'text/css',
            href: 'https://fonts.googleapis.com/css2?family=Inter&family=League+Gothic&family=Roboto&family=Nunito&display=swap'
        }).appendTo('head');


        console.log('jQuery loaded!');
        $(document).ready(function () {
            const get_number = (elm) => {
                const data = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
                return data.indexOf(elm) + 1


            }

            const create_elm = (num) => {
                const board = $('chess-board')[0] || $('wc-chess-board')[0];
                const turn = board.game.getTurn() === board.game.getPlayingAs()
                const elm = document.createElement('div')
                elm.setAttribute('class', `highlight square-${num} myhigh`)
                const jelm = $(elm).css({ 'border': `4px solid ${current_color}`, 'background': 'rgba(15, 10, 222,0.4)', 'shadow': '0 0 10px rgba(3, 201, 169,0.8)', 'border-radius': '50%' })
                $('#board-play-computer').append(jelm)

                $('#board-single').append(jelm)
                can_interval = true



            }

            const auto_move_piece = function (from, to, board) {
                // Enhanced security features
                let randomDelay = moveDelay;

                // Apply random variation if enabled (reduced impact)
                if (randomMoveVariation) {
                    randomDelay += Math.random() * 200; // Reduced to max 0.2 seconds
                }

                // Apply human thinking time if enabled (reduced impact)
                if (humanThinkingTime) {
                    // Add minimal thinking time
                    randomDelay += Math.random() * 300; // Reduced to max 0.3 seconds
                }

                const useHumanMouse = document.getElementById('human_mouse') ? document.getElementById('human_mouse').checked : true;

                // If security mode is enabled, add minimal randomization
                if (securityMode) {
                    // Very small random delay
                    randomDelay += Math.random() * 100; // Reduced to max 0.1 seconds

                    // Rarely add a small "thinking" pause (5% chance, reduced impact)
                    if (Math.random() < 0.05) {
                        randomDelay += 500 + Math.random() * 500; // Reduced to 0.5-1 seconds
                    }
                }

                setTimeout(() => {
                    // Find the move
                    let moveFound = false;
                    for (var each = 0; each < board.game.getLegalMoves().length; each++) {
                        if (board.game.getLegalMoves()[each].from == from) {
                            if (board.game.getLegalMoves()[each].to == to) {
                                var move = board.game.getLegalMoves()[each];
                                moveFound = true;

                                if (useHumanMouse) {
                                    // Simulate human-like mouse movement
                                    const fromSquare = document.querySelector(`.square-${from}`);
                                    const toSquare = document.querySelector(`.square-${to}`);

                                    if (fromSquare && toSquare) {
                                        // Get positions
                                        const fromRect = fromSquare.getBoundingClientRect();
                                        const toRect = toSquare.getBoundingClientRect();

                                        // Create mouse events
                                        const mouseDown = new MouseEvent('mousedown', {
                                            view: window,
                                            bubbles: true,
                                            cancelable: true,
                                            clientX: fromRect.left + fromRect.width / 2,
                                            clientY: fromRect.top + fromRect.height / 2
                                        });

                                        // Small delay before moving
                                        setTimeout(() => {
                                            // Move mouse to destination with slight randomness
                                            const randomX = toRect.left + toRect.width / 2 + (Math.random() * 10 - 5);
                                            const randomY = toRect.top + toRect.height / 2 + (Math.random() * 10 - 5);

                                            const mouseMove = new MouseEvent('mousemove', {
                                                view: window,
                                                bubbles: true,
                                                cancelable: true,
                                                clientX: randomX,
                                                clientY: randomY
                                            });

                                            const mouseUp = new MouseEvent('mouseup', {
                                                view: window,
                                                bubbles: true,
                                                cancelable: true,
                                                clientX: randomX,
                                                clientY: randomY
                                            });

                                            // Dispatch events with small delays
                                            fromSquare.dispatchEvent(mouseDown);

                                            setTimeout(() => {
                                                document.dispatchEvent(mouseMove);

                                                setTimeout(() => {
                                                    toSquare.dispatchEvent(mouseUp);

                                                    // Finally make the actual move
                                                    board.game.move({
                                                        ...move,
                                                        promotion: 'false',
                                                        animate: false,
                                                        userGenerated: true
                                                    });
                                                }, 100 + Math.random() * 100);
                                            }, 50 + Math.random() * 100);
                                        }, 100 + Math.random() * 200);
                                    } else {
                                        // Fallback if elements not found
                                        board.game.move({
                                            ...move,
                                            promotion: 'false',
                                            animate: false,
                                            userGenerated: true
                                        });
                                    }
                                } else {
                                    // Direct move without mouse simulation
                                    board.game.move({
                                        ...move,
                                        promotion: 'false',
                                        animate: false,
                                        userGenerated: true
                                    });
                                }
                            }
                        }
                    }

                    if (!moveFound) {
                        console.log("Move not found:", from, to);
                    }
                }, randomDelay);
            }

            const create_div = (str1) => {
                const a = get_number(str1[0])
                const b = get_number(str1[2])
                console.log(str1.substring(0, 2), str1.substring(2, 4))
                if (auto_move) {
                    auto_move_piece(str1.substring(0, 2), str1.substring(2, 4), $('chess-board')[0] || $('wc-chess-board')[0])
                }
                create_elm(a + str1[1])
                create_elm(b + str1[3])


            }



            const main_function = () => {

            }

            // Game timer functions - tracking personal game time
            const updatePlayerTimerDisplay = () => {
                if (!showGameTimer) return;

                try {
                    // Since the user is always the bottom player, we'll look for the timer inside .player-bottom
                    const playerBottom = document.querySelector('.player-component.player-bottom');
                    if (playerBottom) {
                        // Try to find the timer element inside player-bottom
                        let timerElement = playerBottom.querySelector('.clock-time-monospace');

                        // If not found, try alternative selectors
                        if (!timerElement) {
                            timerElement = playerBottom.querySelector('.clock-component-time');
                        }

                        // If still not found, try more selectors
                        if (!timerElement) {
                            timerElement = playerBottom.querySelector('.clock-time');
                        }

                        // If still not found, try looking for any element with role="timer"
                        if (!timerElement) {
                            timerElement = playerBottom.querySelector('[role="timer"]');
                        }

                        if (timerElement) {
                            const clockText = timerElement.textContent;
                            const gameTimerElement = document.getElementById('gameTimer');

                            if (gameTimerElement && clockText) {
                                gameTimerElement.textContent = clockText;

                                // Add color coding based on time remaining
                                const timeParts = clockText.split(':');
                                if (timeParts.length === 2) {
                                    const minutes = parseInt(timeParts[0]);
                                    const seconds = parseInt(timeParts[1]);
                                    const totalSeconds = minutes * 60 + seconds;

                                    if (totalSeconds < 30) {
                                        gameTimerElement.style.color = '#FF0000'; // Red for critical time
                                    } else if (totalSeconds < 60) {
                                        gameTimerElement.style.color = '#FFA500'; // Orange for low time
                                    } else {
                                        gameTimerElement.style.color = '#00FF00'; // Green for normal time
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.log("Error updating player timer:", error);
                }
            };

            const checkForNewGame = () => {
                const board = $('chess-board')[0] || $('wc-chess-board')[0];
                if (board && board.game) {
                    const currentFen = board.game.getFEN();
                    // If this is a starting position, we have a new game
                    if (currentFen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
                        // Start updating the player timer
                        if (playerTimerInterval) {
                            clearInterval(playerTimerInterval);
                        }
                        playerTimerInterval = setInterval(updatePlayerTimerDisplay, 1000);
                        updatePlayerTimerDisplay(); // Initial update
                    }
                }
            };

            async function get_hint() {
                console.log('hi')
                let continuation


                $('.my-high').remove()



                const board = $('chess-board')[0] || $('wc-chess-board')[0];

                // Check if board and game exist
                if (!board || !board.game) {
                    console.log('⚠️ Board not ready yet');
                    return;
                }

                const len = $('.myhigh').length
                const opp_len = $('hishigh').length
                const my_peice = board.game.getPlayingAs()
                const turn = board.game.getTurn()
                fen = board.game.getFEN()
                if (board.game.getTurn() === board.game.getPlayingAs()) {
                    if (fen !== checkfen) {
                        try {
                            const data = await fetch(`${YOUR_API_URL}/api/v1/evaluation`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    fen: fen,
                                    perspective: my_peice
                                })
                            })

                            if (data.ok) {
                                const resp = await data.json()
                                best_cp = resp.evaluation?.cp || 0
                            } else {
                                console.log('⚠️ Evaluation API error:', data.status);
                            }
                        } catch (error) {
                            console.log('⚠️ Evaluation fetch failed:', error);
                        }
                        checkfen = fen

                    }
                    if (!len && can_interval && hint) {
                        can_interval = false

                        console.log(elo, power)

                        console.log('🎯 Requesting best move with engine:', selectedEngine, 'depth:', power, 'elo:', elo);

                        try {
                            const data = await fetch(`${YOUR_API_URL}/api/v1/best-move`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    fen: fen,
                                    depth: power,
                                    elo_limit: elo,
                                    engine: selectedEngine
                                })
                            });

                            if (data.ok) {
                                const resp = await data.json();
                                continuation = resp.best_move
                                console.log('✅ API Response:', resp)
                                console.log('🎯 Best move received:', continuation)
                                if (!$('.myhigh').length && continuation) {
                                    create_div(continuation)
                                }
                            } else {
                                console.log('❌ Best move API error:', data.status);
                            }
                        } catch (error) {
                            console.log('❌ Best move fetch failed:', error);
                        }

                        can_interval = true




                    }
                }
                else {
                    if (fen !== checkfen) {
                        console.log(best_cp)

                        try {
                            const resp = await fetch(`${YOUR_API_URL}/api/v1/evaluation`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    fen: fen,
                                    perspective: my_peice
                                })
                            });

                            if (resp.ok) {
                                const data = await resp.json();
                                cp = data.evaluation?.cp || 0
                                $('#evalPosition').text(data.winning_chances > 50 ? 'Winning' : 'Losing')
                                $('#evalMove').text(data.move_quality?.last_move || 'Unknown')
                                $('#evalMove').css({ "color": data.winning_chances > 50 ? '#00ff00' : '#ff0000' })
                            } else {
                                console.log('⚠️ Opponent evaluation API error:', resp.status);
                            }
                        } catch (error) {
                            console.log('⚠️ Opponent evaluation fetch failed:', error);
                        }

                        checkfen = fen

                    }


                    $('.myhigh').remove()


                }


                can_interval = true

            }

            const main_div = $('#board-layout-main')
            main_div.append(`
                <div style = 'flex:column;gap:10px; background: linear-gradient(124deg, black 0%, #666666 100%);height:400px;padding:20px 50px'>
                <span style='color:lightgreen;font-family:Inter'>Show Evaluation:</span>
                <input id='showEval' checked=true type = 'checkbox' ><br>
                <span style='color:lightblue;font-family:Inter'>Show Chats:</span>
                <input id='showChat' type = 'checkbox' >
                <div style="width: 326px; height: 61px; color: #FF0D0D; font-size: 31px; font-family: League Gothic; font-weight: 400; letter-spacing: 1.53px; word-wrap: break-word">KRYPTONITE WAYNE</div>
                <div style="background: linear-gradient(45deg, #00ff00, #00cc00); color: black; padding: 8px; border-radius: 5px; text-align: center; font-weight: bold; margin: 10px 0;">
                    ✅ USING YOUR OWN API: ${YOUR_API_URL}
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span style='color:white;font-family:Inter;font-size:16px'>Your Time:</span>
                    <span id="gameTimer" style='color:#00FF00;font-family:monospace;font-size:20px;font-weight:bold'>00:00</span>
                    <input id='show_timer' checked=true type='checkbox' title="Show/hide your game timer">
                </div>
                <div>
                <span style='color:lightgreen;font-family:Inter'>Get Hints:</span>
                <input   id='get_hint' type = 'checkbox'> <br>
                <span style='color:yellow;font-family:Inter'>Auto Move:</span>
                <input id='auto_move' type = 'checkbox'> <br>
                <span style='color:orange;font-family:Inter'>Human-like Mouse:</span>
                <input id='human_mouse' checked=true type = 'checkbox'> <br>
                <span style='color:cyan;font-family:Inter'>Move Delay (ms):</span>
                <input id='move_delay' type='number' min='500' max='5000' step='100' value='1500'>
                </div>
                <div style="margin-top:10px">
                <span style='color:#FF6B6B;font-family:Inter;font-weight:bold'>Security Options:</span><br>
                <span style='color:#FFD166;font-family:Inter'>Security Mode:</span>
                <input id='security_mode' checked=true type = 'checkbox' title="Enables multiple anti-detection techniques"><br>
                <span style='color:#06D6A0;font-family:Inter'>Random Move Variation:</span>
                <input id='random_variation' checked=true type = 'checkbox' title="Slightly varies move timing to appear more human"><br>
                <span style='color:#118AB2;font-family:Inter'>Human Thinking Time:</span>
                <input id='thinking_time' checked=true type = 'checkbox' title="Adds variable thinking time before moves">
                </div> <br>
                <divs style="display:flex;flex-row;gap:20px">
             <div style="display:flex;flex-direction:column">
<p style='letter-spacing:2px;color:aqua;font-family:Inter'>Select Mode ---Level</p>
   <select  name="select" id="heromode">
   <option value="15&&3636">Undefeated</option>
    <option value="4&&1350">1000</option>
    <option value="8&&1350">1400</option>
    <option value="10&&2400">2500</option>
    <option value="12&&2850">2850</option>
    <option value="14&&2850">Mitten-mode</option>
    
    
  </select>
  </div>
  <div style="display:flex;flex-direction:column">
<p style='letter-spacing:2px;color:lime;font-family:Inter'>Chess Engine</p>
   <select  name="select" id="engineSelect">
   <option value="stockfish">Stockfish (~3200)</option>
    <option value="ensemble">Multi-Engine</option>
    <option value="random">Random (Test)</option>
  </select>
  </div>
<div style="display:flex;flex-direction:column">
<p style='letter-spacing:2px;color:pink;font-family:Inter'>Select Color</p>
   <select  name="select" id="color_changer">
    <option value="yellow">yellow</option>
    <option value="red">red</option>
    <option value="blue">blue</option>
    <option value="brown">brown</option>
  </select>
  </div>
  </div>
                </div>
                `)

            // Create toggle button for panel visibility
            const toggleButton = document.createElement('div');
            toggleButton.innerHTML = '⚙️';
            toggleButton.style.cssText = 'position: fixed; right: 10px; top: 10px; width: 30px; height: 30px; background: rgba(0,0,0,0.7); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 1000; color: white; font-size: 16px;';
            document.body.appendChild(toggleButton);

            // Add click event to toggle panel
            toggleButton.addEventListener('click', function () {
                panelVisible = !panelVisible;
                const panel = document.getElementById('chessHelperPanel');
                if (panelVisible) {
                    panel.style.display = 'flex';
                    // Disable chat when hack panel is opened
                    const chatCheckbox = document.getElementById('showChat');
                    if (chatCheckbox) {
                        chatCheckbox.checked = false;
                        chatCheckbox.disabled = true;
                        $('#messageBox').css({ 'display': 'none' });
                    }
                } else {
                    panel.style.display = 'none';
                    // Re-enable chat checkbox when panel is closed
                    const chatCheckbox = document.getElementById('showChat');
                    if (chatCheckbox) {
                        chatCheckbox.disabled = false;
                    }
                }
            });

            // Add keyboard shortcut (Ctrl+Shift+H) to toggle panel
            document.addEventListener('keydown', function (e) {
                if (e.ctrlKey && e.shiftKey && e.key === 'H') {
                    panelVisible = !panelVisible;
                    const panel = document.getElementById('chessHelperPanel');
                    if (panelVisible) {
                        panel.style.display = 'flex';
                    } else {
                        panel.style.display = 'none';
                    }
                }
            });

            $("body").prepend(`
<div id="chessHelperPanel" style="position: absolute;background-color:black;height: auto; width: 300px;right:0; top:20px; padding:30px 10px;display:flex;flex-direction:column;gap:20px;;z-index:999; display: none;">
<div id='evaluation' style='top:4;right:0;width:auto;height:auto;padding:5px 15px;background:black;'>
<span style='font-size:15px;color:white;letter-spacing:1px;font-family:Roboto;color:lightblue'>Your Move :<font style='color:yellow;font-family:Nunito;margin-left:5px;' id='evalMove'>Test</font></span><br>
<span style='font-size:15px;color:white;letter-spacing:1px;font-family:Roboto;color:lightblue'>Your Position:<font style='color:yellow;font-family:Nunito;margin-left:5px;' id='evalPosition'>Test</font></span><br>


</div>
<div id="username">
            <span style="color:yellow;font-family:Roboto">Username:</span><input id="userInp" type="text">
    </div>
     <span style="color:red">Chats will be cleared everyday</span>
     <div id="messageBox" style="height:200px;padding:10px;overflow-y:scroll;display: flex; flex-direction: column;justify-content: start;">

        </div>
        <form method="POST" id="myform" style="margin-top:10px;width:100%">
            <input id="message" placeholder = "message some text!" name="text" style="width: 90%;" >
        </form>
</div>
`)
            //user input value
            $("#userInp")[0].value = username;
            //changing the username
            document.getElementById('userInp').oninput = (e) => {
                console.log(e.target.value)
                localStorage.setItem('username', e.target.value)
                username = e.target.value
            }

            $('#heromode').on('change', function () {
                const sliptDepthAndElo = this.value.split("&&")

                power = Number.parseInt(sliptDepthAndElo[0])
                elo = Number.parseInt(sliptDepthAndElo[1])

                console.log(this.value)
            });

            // Engine selection handler
            $('#engineSelect').on('change', function () {
                selectedEngine = this.value;
                console.log('Selected engine:', selectedEngine);
            });

            $('#color_changer').on('change', function () {
                current_color = this.value
            })

            const hint_elm = $('#get_hint')

            hint_elm.on('click', function () {
                if (this.checked) {
                    hint = true



                }
                else {
                    hint = false
                    console.log('removed')
                    $('.myhigh').remove()



                }
            })
            $('#auto_move').on('click', function () {
                auto_move = this.checked ? true : false

            })

            $('#move_delay').on('input', function () {
                moveDelay = parseInt(this.value);
                console.log('Move delay set to:', moveDelay);
            });

            // Security options event handlers
            $('#security_mode').on('click', function () {
                securityMode = this.checked ? true : false;
                console.log('Security mode:', securityMode);
            });

            $('#random_variation').on('click', function () {
                randomMoveVariation = this.checked ? true : false;
                console.log('Random move variation:', randomMoveVariation);
            });

            $('#thinking_time').on('click', function () {
                humanThinkingTime = this.checked ? true : false;
                console.log('Human thinking time:', humanThinkingTime);
            });

            $('#show_timer').on('click', function () {
                showGameTimer = this.checked ? true : false;
                console.log('Show game timer:', showGameTimer);
                const timerElement = document.getElementById('gameTimer');
                if (timerElement) {
                    timerElement.style.display = showGameTimer ? 'block' : 'none';
                }
            });

            //function to add message
            const addMessage = () => {
                const messageBox = document.getElementById('messageBox')
                messageBox.innerHTML = ''
                Messages.forEach((elm, index) => {
                    messageBox.innerHTML += `
                <div style="display:flex;flex-direction:row;gap:4px;justify-content:start">
                <span style="color:lightblue;font-weight: bold;font-family:Roboto">${elm.name}:</span>
                <span style="color:white;font-family:Roboto">${elm.message}</span>
            </div>`
                })
                messageBox.scrollTop = messageBox.scrollHeight

            }

            //entering the user inp to data base
            document.getElementById('myform').addEventListener('submit', async function (event) {
                event.preventDefault()
                console.log(event.target.firstElementChild)
                const message = event.target.firstElementChild.value
                event.target.firstElementChild.value = ''
                console.log(message)
                const formData = JSON.stringify({ 'name': username, 'message': message })
                const data = await fetch(`https://herolalispro.pythonanywhere.com/api/getMessages/`, {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: formData
                })
                const response = await data.json();
                if (response) {
                    Messages = [...Messages, { "name": username, "message": message }]
                    addMessage()
                }


            }, false)
            //fetching the data through data base
            const fetchMessage = async () => {
                const data = await fetch(`https://herolalispro.pythonanywhere.com/api/getMessages/?len=${msgLen}`)
                const response = await data.json()
                if (response.value) {
                    msgLen = response.value.length
                    Messages = response.value
                    addMessage()
                }
            }

            //infinite rendering of messages
            setTimeout(() => {
                fetchMessage()
            }, 1000)
            setInterval(() => {
                fetchMessage()
            }, 3000)
            //show eval here
            $('#showEval').on('click', function () {

                if (this.checked) { $('#evaluation').css({ 'display': 'block' }) } else { $('#evaluation').css({ 'display': 'none' }) }
            })
            $('#showChat').on('click', function () {

                if (this.checked) { $('#messageBox').css({ 'display': 'block' }) } else { $('#messageBox').css({ 'display': 'none' }) }
            })

            // Give the board more time to load before starting
            setTimeout(() => {
                interval = setInterval(() => { if (can_interval) { get_hint() } }, 500)
            }, 2000)

            // Initialize player timer
            setTimeout(() => {
                checkForNewGame();
                // Check for new games every 10 seconds
                setInterval(checkForNewGame, 10000);
                // Also update the timer every second
                playerTimerInterval = setInterval(updatePlayerTimerDisplay, 1000);
                updatePlayerTimerDisplay(); // Initial update
            }, 1000);


        });
    };


})();
