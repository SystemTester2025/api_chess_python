// ==UserScript==
// @name         KrypBot
// @namespace    http://tampermonkey.net/
// @version      2024-11-15
// @description  try to take over the world!
// @author       You
// @match        https://www.chess.com/play/computer*
// @match       https://www.chess.com/play/*
// @match       https://www.chess.com/game/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    let interval, show_opponent = false, can_interval = true, main_interval = true, show_evaluation = true,
        auto_move, current_color = '#000000', fen, checkfen, cp = 0, best_cp = 0, hint = true, username, Messages = [], msgLen = 0;  // Start with hints enabled
    let chessBot = { elo: 3200, power: 15, status: 1, nature: 1, type: 1, fen: 0, time: 0.3, human_simulation: false, min_time: 0.5, max_time: 3.0 };  // Start with bot enabled
    let selectedEngine = 'stockfish'; // Engine selection

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
                const jelm = $(elm).css({ 'opacity': '0.8', 'border': `4px solid ${current_color}`, 'background': 'rgba(15, 10, 222,0.4)', 'shadow': '0 0 10px rgba(3, 201, 169,0.8)', 'border-radius': '50%' })
                $('#board-play-computer').append(jelm)

                $('#board-single').append(jelm)


                const x = jelm.position().left
                const y = jelm.position().top;
                const w = jelm.outerWidth();      // width including padding & border
                const h = jelm.outerHeight();

                return [(x + w + x) / 2, (y + h + y) / 2];

            }

            const auto_move_piece = function (from, to, board) {
                for (var each = 0; each < board.game.getLegalMoves().length; each++) {
                    if (board.game.getLegalMoves()[each].from == from) {
                        if (board.game.getLegalMoves()[each].to == to) {
                            var move = board.game.getLegalMoves()[each];

                            // Add human-like behavior if enabled
                            if (chessBot.human_simulation) {
                                // Random delay before making the move
                                const delay = Math.random() * (chessBot.max_time - chessBot.min_time) + chessBot.min_time;
                                setTimeout(() => {
                                    // Simulate mouse movement if human simulation is enabled
                                    simulateHumanMove(from, to, board, move);
                                }, delay * 1000);
                            } else {
                                // Use the time setting as a fixed delay when human simulation is off
                                setTimeout(() => {
                                    board.game.move({
                                        ...move,
                                        promotion: 'false',
                                        animate: false,
                                        userGenerated: true
                                    });
                                }, chessBot.time * 1000);
                            }
                        }
                    }
                }
            }

            // Function to simulate human-like mouse movements
            const simulateHumanMove = function (from, to, board, move) {
                // Get the board element
                const boardElement = $('chess-board')[0] || $('wc-chess-board')[0];
                if (!boardElement) return;

                // Get square elements
                const fromSquare = document.querySelector(`.square-${get_number(from[0]) + from[1]}`);
                const toSquare = document.querySelector(`.square-${get_number(to[0]) + to[1]}`);

                if (!fromSquare || !toSquare) {
                    // Fallback to direct move if squares not found
                    board.game.move({
                        ...move,
                        promotion: 'false',
                        animate: false,
                        userGenerated: true
                    });
                    return;
                }

                // Get positions
                const fromRect = fromSquare.getBoundingClientRect();
                const toRect = toSquare.getBoundingClientRect();

                // Create mouse events
                const mousedown = new MouseEvent('mousedown', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: fromRect.left + fromRect.width / 2,
                    clientY: fromRect.top + fromRect.height / 2
                });

                const mousemove = new MouseEvent('mousemove', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: toRect.left + toRect.width / 2,
                    clientY: toRect.top + toRect.height / 2
                });

                const mouseup = new MouseEvent('mouseup', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: toRect.left + toRect.width / 2,
                    clientY: toRect.top + toRect.height / 2
                });

                // Add small random delay to make it more natural
                setTimeout(() => {
                    fromSquare.dispatchEvent(mousedown);

                    // Add slight delay between mouse down and move
                    setTimeout(() => {
                        boardElement.dispatchEvent(mousemove);

                        // Add slight delay before mouse up
                        setTimeout(() => {
                            toSquare.dispatchEvent(mouseup);

                            // Make the actual move
                            board.game.move({
                                ...move,
                                promotion: 'false',
                                animate: true, // Enable animation for human-like feel
                                userGenerated: true
                            });
                        }, 50 + Math.random() * 100);
                    }, 100 + Math.random() * 200);
                }, 50 + Math.random() * 150);
            }

            const create_div = (str1) => {
                try {
                    console.log('🎯 Creating arrow for move:', str1);
                    const target = $('chess-board')[0] || $('wc-chess-board')[0];

                    const a = get_number(str1[0])
                    const b = get_number(str1[2])
                    console.log('🎯 Move squares:', str1.substring(0, 2), str1.substring(2, 4))
                    if (auto_move) {
                        auto_move_piece(str1.substring(0, 2), str1.substring(2, 4), $('chess-board')[0] || $('wc-chess-board')[0])
                    }
                    const first_elm = create_elm(a + str1[1])

                    const last_element = create_elm(b + str1[3])

                    if (target) {
                        console.log('🎯 Found board target, creating SVG arrow');
                        $(target).append(`

        <svg width="100%" height="100%" class='myhigh' style="position: absolute; top: 0; left: 0; z-index: 100;">
          <defs>
            <marker id="arrowhead" markerWidth="12" markerHeight="10"
                    refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill=${current_color} />
            </marker>
          </defs>
          <line x1="${first_elm[0]}" y1="${first_elm[1]}" x2="${last_element[0]}" y2="${last_element[1]}"
                stroke=${current_color} stroke-width="4" marker-end="url(#arrowhead)" />
        </svg>

    `);
                        console.log('🎯 Arrow created successfully');
                    } else {
                        console.log('❌ No board target found for arrow');
                    }


                }
                catch (e) {
                    console.log("an error has occured")
                }

            }



            const main_function = () => {



            }

            async function get_hint() {
                main_interval = false
                try {

                    let continuation


                    $('.my-high').remove()



                    const board = $('chess-board')[0] || $('wc-chess-board')[0];

                    // Check if board and game exist
                    if (!board || !board.game) {
                        console.log('⚠️ Board not ready yet');
                        main_interval = true;
                        return;
                    }

                    const len = $('.myhigh').length
                    const opp_len = $('hishigh').length
                    const my_peice_num = board.game.getPlayingAs()
                    const my_peice = my_peice_num === 1 ? 'white' : 'black'  // Convert number to string
                    const turn = board.game.getTurn()
                    fen = board.game.getFEN()
                    chessBot.fen = board.game.getFEN()

                    console.log('🎮 Player info:', { my_peice_num, my_peice, turn, fen: fen.substring(0, 20) + '...' })

                    // Return early if board state is not ready
                    if (my_peice_num === undefined || turn === undefined) {
                        console.log('⚠️ Board state not ready yet');
                        main_interval = true;
                        return;
                    }

                    console.log('🔧 Bot status:', { hint, can_interval, len });


                    if (board.game.getTurn() == board.game.getPlayingAs()) {
                        $(".myanalysis").remove()

                        if (checkfen !== fen) {
                            console.log("am right there")
                            try {
                                checkfen = fen;
                                console.log('📡 Sending evaluation request:', { fen: fen.substring(0, 20) + '...', perspective: my_peice });
                                const data = await fetch(`${YOUR_API_URL}/api/v1/evaluation`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        fen: fen,
                                        perspective: my_peice
                                    })
                                });

                                if (data.ok) {
                                    const resp = await data.json();
                                    console.log(resp);
                                    best_cp = resp.evaluation?.cp || 0;
                                } else {
                                    console.log('⚠️ Evaluation API error:', data.status);
                                }
                            }
                            catch (e) {
                                console.log('⚠️ Evaluation fetch failed:', e)
                            }
                        }


                        if (can_interval && hint) {
                            // Clear any existing arrows first
                            $('.myhigh').remove();
                            console.log('🧹 Cleared old arrows, len was:', len);
                            
                            can_interval = false
                            try {

                                console.log("🎯 Requesting best move with engine:", selectedEngine, "depth:", chessBot.power, "elo:", chessBot.elo);
                                console.log("📋 Sending position FEN:", fen.substring(0, 30) + "...");
                                const data = await fetch(`${YOUR_API_URL}/api/v1/best-move`, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        fen: fen,  // Use current fen, not chessBot.fen
                                        depth: chessBot.power,
                                        elo_limit: chessBot.elo,
                                        engine: selectedEngine
                                    })
                                });

                                if (data.ok) {
                                    const resp = await data.json();
                                    continuation = resp.best_move;
                                    console.log('✅ API Response:', resp);
                                    console.log("🎯 Best move received:", continuation);

                                    if (continuation) {
                                        create_div(continuation);
                                    }
                                } else {
                                    console.log('❌ Best move API error:', data.status);
                                }

                                can_interval = true
                            }



                            catch (e) {
                                console.log("an error has cocured" + e); can_interval = true

                            }


                        }
                    }
                    else {
                        $('.myhigh').remove()
                        if (fen !== checkfen) {
                            const lastMove = board.game.getLastMove().to

                            const finalAalysisMove = String(get_number(lastMove[0]) + String(lastMove[1]))
                            console.log(lastMove, finalAalysisMove)

                            checkfen = fen;
                            try {
                                console.log('📡 Opponent evaluation request:', { fen: fen.substring(0, 20) + '...', perspective: my_peice });
                                const data = await fetch(`${YOUR_API_URL}/api/v1/evaluation`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        fen: fen,
                                        perspective: my_peice
                                    })
                                });

                                if (data.ok) {
                                    const resp = await data.json();
                                    cp = resp.evaluation?.cp || 0;
                                    $('.myanalysis').remove();

                                    if (show_evaluation) {
                                        // Use a simple colored square instead of image
                                        const moveColor = resp.winning_chances > 50 ? '#00ff00' : '#ff0000';
                                        $(board).append(`<div class='myanalysis highlight square-${finalAalysisMove}' data-test-element='highlight' style='background-color:${moveColor};opacity:0.6;border-radius:50%'>
                                     </div>`);
                                    }

                                    $('#evalPosition').text(resp.winning_chances > 50 ? 'Winning' : 'Losing');
                                    $('#evalMove').text(resp.move_quality?.last_move || 'Unknown');
                                    $('#evalMove').css({ "color": resp.winning_chances > 50 ? '#00ff00' : '#ff0000' });
                                } else {
                                    console.log('⚠️ Opponent evaluation API error:', data.status);
                                }
                            }
                            catch (e) {
                                console.log('⚠️ Opponent evaluation fetch failed:', e)
                            }
                        }




                    }

                }
                catch (e) {
                    main_interval = true
                }
                main_interval = true

            }




            //changing the color



            const main_div = $('#board-layout-main')
            main_div.append(`
<div id="personalDiv" style="
  background: linear-gradient(135deg, #121212, #1f1f1f);
  color: #f0e68c;
  border-radius: 14px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.7);
  padding: 25px 35px;
  max-width: 480px;
  font-family: 'Roboto', sans-serif;
  display: flex;
  flex-direction: column;
  gap: 18px;
">

  <section style="display: flex; flex-direction: column; gap: 6px;">
    <p style="font-size: 20px; font-weight: 600; letter-spacing: 0.04em;">Chess Bot Status</p>
    <div style="display: flex; gap: 18px;">
      <label><input checked value='1' type='radio' name='bot-status'> On</label>
      <label><input value='0' type='radio' name='bot-status'> Off</label>
    </div>
  </section>

  <section style="display: flex; flex-direction: column; gap: 6px;">
    <p style="font-size: 20px; font-weight: 600; letter-spacing: 0.04em;">Chess Bot TYPE</p>
    <div style="display: flex; gap: 18px;">
      <label><input checked value='1' type='radio' name='bot-type'> Engine</label>
      <label><input value='0' type='radio' name='bot-type'> Human</label>
    </div>
  </section>

  <section style="display: flex; flex-direction: column; gap: 6px;">
    <p style="font-size: 20px; font-weight: 600; letter-spacing: 0.04em;">Auto Moves</p>
    <div style="display: flex; gap: 18px;">
      <label><input value='1' type='radio' name='bot-move'> On</label>
      <label><input checked value='0' type='radio' name='bot-move'> Off</label>
    </div>
  </section>

  <section style="display: flex; flex-direction: column; gap: 6px;">
    <p style="font-size: 20px; font-weight: 600; letter-spacing: 0.04em;">Evaluation Visibility</p>
    <div style="display: flex; gap: 18px;">
      <label><input checked value='1' type='radio' name='show-eval'> Show</label>
      <label><input value='0' type='radio' name='show-eval'> Hide</label>
    </div>
  </section>


  <section style="display: flex; flex-direction: column; gap: 6px;">
    <p style="font-size: 20px; font-weight: 600; letter-spacing: 0.04em;">Chess Bot Nature</p>
    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
      <label><input checked value='1' type='radio' name='bot-nature'> Comeback</label>
      <label><input value='0' type='radio' name='bot-nature'> Neutral</label>
      <label><input value='-1' type='radio' name='bot-nature'> Defensive</label>
    </div>
  </section>

  <section style="display: flex; flex-direction: column; gap: 6px;">
    <p style="font-size: 20px; font-weight: 600; letter-spacing: 0.04em;">Elo Level</p>
    <div style="display: flex; align-items: center; gap: 15px;">
      <span style="font-size: 14px; min-width: 28px;">800:</span>
      <input id='eloRange' type='range' min='800' max='3200' step='100' value='3200' style="flex-grow:1;">
      <span style="font-size: 14px; min-width: 32px;">3200</span>
    </div>
  </section>

  <section style="display: flex; flex-direction: column; gap: 6px;">
    <p style="font-size: 20px; font-weight: 600; letter-spacing: 0.04em;">Chess Engine</p>
    <select id="engineSelect" style="padding: 8px; border-radius: 4px; background: #2a2a2a; color: #f0e68c; border: 1px solid #444;">
      <option value="stockfish">Stockfish (~3200)</option>
      <option value="ensemble">Multi-Engine</option>
      <option value="random">Random (Test)</option>
    </select>
  </section>

  <section style="display: flex; flex-direction: column; gap: 6px;">
    <p style="font-size: 20px; font-weight: 600; letter-spacing: 0.04em;">Move Mode</p>
    <div style="display: flex; gap: 18px;">
      <label><input value='1' type='radio' name='move-mode'> Human Simulation</label>
      <label><input checked value='0' type='radio' name='move-mode'> Fixed Delay</label>
    </div>
  </section>
  
  <div id="humanSimOptions" style="display: none;">
    <section style="display: flex; flex-direction: column; gap: 6px;">
      <p style="font-size: 20px; font-weight: 600; letter-spacing: 0.04em;">Min Move Time</p>
      <div style="display: flex; align-items: center; gap: 15px;">
        <span style="font-size: 14px; min-width: 48px;">0.5 sec</span>
        <input id='minTimeRange' type='range' min='0.5' max='10' step='0.1' value='0.5' style="flex-grow:1;">
        <span style="font-size: 14px; min-width: 48px;">10 sec</span>
      </div>
    </section>
    
    <section style="display: flex; flex-direction: column; gap: 6px;">
      <p style="font-size: 20px; font-weight: 600; letter-spacing: 0.04em;">Max Move Time</p>
      <div style="display: flex; align-items: center; gap: 15px;">
        <span style="font-size: 14px; min-width: 48px;">1.0 sec</span>
        <input id='maxTimeRange' type='range' min='1.0' max='30' step='0.2' value='3.0' style="flex-grow:1;">
        <span style="font-size: 14px; min-width: 48px;">30 sec</span>
      </div>
    </section>
  </div>
  
  <div id="fixedDelayOptions">
    <section style="display: flex; flex-direction: column; gap: 6px;">
      <p style="font-size: 20px; font-weight: 600; letter-spacing: 0.04em;">Fixed Move Delay</p>
      <div style="display: flex; align-items: center; gap: 15px;">
        <span style="font-size: 14px; min-width: 48px;">0.1 sec</span>
        <input id='timeRange' type='range' min='0.1' max='20' step='0.1' value='0.3' style="flex-grow:1;">
        <span style="font-size: 14px; min-width: 48px;">20 sec</span>
      </div>
    </section>
  </div>
  <section style="display: flex; flex-direction: column; gap: 6px;">
    <p style="font-size: 20px; font-weight: 600; letter-spacing: 0.04em;">Coose COlor</p>
    <div style="display: flex; align-items: center; gap: 15px;">
<input type="color" id="colorPicker"  name="color-changer" value="#000000">

    </div>
  </section>




  <p id='eloShow' style="margin-top: 8px; font-size: 15px; color: #ccc;">Playing on Elo 3200</p>
  
  <div style="background: linear-gradient(45deg, #00ff00, #00cc00); color: black; padding: 8px; border-radius: 5px; text-align: center; font-weight: bold; margin: 10px 0;">
    ✅ USING YOUR OWN API: ${YOUR_API_URL}
  </div>
</div>
`)


            $("body").prepend(`
<div id='evaluation'  style="position: absolute;display:flex;background-color:black;height: auto; width: 300px;right:0; top:20px; padding:30px 10px;flex-direction:column;gap:20px;;z-index:999;">
<div  style='top:4;right:0;width:auto;height:auto;padding:5px 15px;background:black;'>
<span style='font-size:15px;color:white;letter-spacing:1px;font-family:Roboto;color:lightblue'>Your Move :<font style='color:yellow;font-family:Nunito;margin-left:5px;' id='evalMove'>Test</font></span><br>
<span style='font-size:15px;color:white;letter-spacing:1px;font-family:Roboto;color:lightblue'>Your Position:<font style='color:yellow;font-family:Nunito;margin-left:5px;' id='evalPosition'>Test</font></span><br>


</div>

`)
            //user input value




            $("#showConfg").on('click', function () {
                console.log(chessBot)
            })

            $("#personalDiv").on('click', function (e) {
                if (e.target.tagName == "INPUT") {
                    const type_name = e.target.name;
                    const type_value = Number.parseInt(e.target.value);
                    switch (type_name) {
                        case "show-eval":
                            show_evaluation = type_value ? true : false
                            if (type_value) {
                                $('#evaluation').css({ 'display': 'block' })
                            } else {
                                $('#evaluation').css({ 'display': 'none' })
                            }
                            break;



                        case "bot-status":
                            chessBot.status = type_value
                            if (type_value) {

                                hint = true
                            }
                            else {

                                hint = false
                                $(".myhigh").remove()
                            }
                            break;
                        case "bot-move":
                            auto_move = type_value ? true : false

                            break;
                        case "bot-nature":
                            chessBot.nature = type_value

                            break;
                        case "bot-type":
                            chessBot.type = type_value

                            break;

                        default:
                            console.log('none')
                    }
                }
            })


            $('#auto_move').on('click', function () {
                auto_move = this.checked ? true : false

            })

            $("#eloRange").on('change', function () {
                chessBot.elo = Number.parseInt(this.value)
                $('#eloShow').text("playing on Elo" + chessBot.elo)

            })

            // Engine selection handler
            $("#engineSelect").on('change', function () {
                selectedEngine = this.value;
                console.log('Selected engine:', selectedEngine);
            })

            //changing the color
            $("#colorPicker").on('change', function () {
                current_color = this.value
            })

            $("#timeRange").on('change', function () {
                chessBot.time = Number.parseFloat(this.value)
            })

            // Move mode toggle
            $("input[name='move-mode']").on('change', function () {
                chessBot.human_simulation = this.value === '1';

                // Show/hide appropriate options based on mode
                if (chessBot.human_simulation) {
                    $("#humanSimOptions").show();
                    $("#fixedDelayOptions").hide();
                } else {
                    $("#humanSimOptions").hide();
                    $("#fixedDelayOptions").show();
                }
            });

            // Min time range
            $("#minTimeRange").on('change', function () {
                chessBot.min_time = Number.parseFloat(this.value);
                // Ensure max is always greater than min
                if (chessBot.max_time <= chessBot.min_time) {
                    chessBot.max_time = chessBot.min_time + 0.5;
                    $("#maxTimeRange").val(chessBot.max_time);
                }
            });

            // Max time range
            $("#maxTimeRange").on('change', function () {
                chessBot.max_time = Number.parseFloat(this.value);
                // Ensure min is always less than max
                if (chessBot.min_time >= chessBot.max_time) {
                    chessBot.min_time = chessBot.max_time - 0.5;
                    $("#minTimeRange").val(chessBot.min_time);
                }
            });

            //function to add message


            //entering the user inp to data base


            //infinite rendering of messages

            //show eval here



            // Track the last FEN to detect board changes
            let lastFen = '';

            // Check for board state changes every 50ms
            interval = setInterval(async () => {
                if (!main_interval) return;

                const board = $('chess-board')[0] || $('wc-chess-board')[0];
                if (!board) return;

                const currentFen = board.game.getFEN();
                if (currentFen !== lastFen) {
                    lastFen = currentFen;
                    await get_hint();
                }
            }, 50);






















        });
    };


})();
