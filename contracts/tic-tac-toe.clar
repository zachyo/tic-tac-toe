;; Enhanced Tic Tac Toe Contract with Stats and Timeouts

;; The Game ID to use for the next game
(define-data-var latest-game-id uint u0)

;; Timeout duration in blocks (approximately 24 hours = 144 blocks assuming 10 min per block)
(define-constant TIMEOUT_BLOCKS u144)

;; Game data structure with timestamp
(define-map games 
    uint ;; Key (Game ID)
    { ;; Value (Game Tuple)
        player-one: principal,
        player-two: (optional principal),
        is-player-one-turn: bool,
        bet-amount: uint,
        board: (list 9 uint),
        winner: (optional principal),
        last-move-block: uint,
        created-at: uint
    }
)

;; Player statistics
(define-map player-stats
    principal ;; Key (Player address)
    { ;; Value (Stats tuple)
        total-games: uint,
        wins: uint,
        losses: uint,
        total-staked: uint,
        total-won: uint
    }
)

;; Global game history for leaderboard
(define-map global-games
    uint ;; Key (Game ID)
    {
        player-one: principal,
        player-two: principal,
        winner: (optional principal),
        bet-amount: uint,
        created-at: uint,
        finished-at: uint
    }
)

;; Helper function to get or create player stats
(define-private (get-player-stats (player principal))
    (default-to 
        { total-games: u0, wins: u0, losses: u0, total-staked: u0, total-won: u0 }
        (map-get? player-stats player)
    )
)

;; Helper function to update player stats
(define-private (update-player-stats (player principal) (is-winner bool) (bet-amount uint) (total-winnings uint))
    (let (
        (current-stats (get-player-stats player))
        (new-stats (merge current-stats {
            total-games: (+ (get total-games current-stats) u1),
            wins: (if is-winner (+ (get wins current-stats) u1) (get wins current-stats)),
            losses: (if is-winner (get losses current-stats) (+ (get losses current-stats) u1)),
            total-staked: (+ (get total-staked current-stats) bet-amount),
            total-won: (+ (get total-won current-stats) total-winnings)
        }))
    )
    (map-set player-stats player new-stats)
))

(define-private (validate-move (board (list 9 uint)) (move-index uint) (move uint))
    (let (
        ;; Validate that the move is being played within range of the board
        (index-in-range (and (>= move-index u0) (< move-index u9)))
        ;; Validate that the move is either an X or an O
        (x-or-o (or (is-eq move u1) (is-eq move u2)))
        ;; Validate that the cell the move is being played on is currently empty
        (empty-spot (is-eq (unwrap! (element-at? board move-index) false) u0))
    )
    ;; All three conditions must be true for the move to be valid
    (and (is-eq index-in-range true) (is-eq x-or-o true) empty-spot)
))

(define-constant THIS_CONTRACT (as-contract tx-sender))
(define-constant ERR_MIN_BET_AMOUNT u100)
(define-constant ERR_INVALID_MOVE u101)
(define-constant ERR_GAME_NOT_FOUND u102)
(define-constant ERR_GAME_CANNOT_BE_JOINED u103)
(define-constant ERR_NOT_YOUR_TURN u104)
(define-constant ERR_GAME_TIMED_OUT u105)
(define-constant ERR_CANNOT_CANCEL_YET u106)
(define-constant ERR_NOT_AUTHORIZED_TO_CANCEL u107)

(define-public (create-game (bet-amount uint) (move-index uint) (move uint))
    (let (
        (game-id (var-get latest-game-id))
        (starting-board (list u0 u0 u0 u0 u0 u0 u0 u0 u0))
        (game-board (unwrap! (replace-at? starting-board move-index move) (err ERR_INVALID_MOVE)))
        (current-block stacks-block-height)
        (game-data {
            player-one: contract-caller,
            player-two: none,
            is-player-one-turn: false,
            bet-amount: bet-amount,
            board: game-board,
            winner: none,
            last-move-block: current-block,
            created-at: current-block
        })
    )

    (asserts! (> bet-amount u0) (err ERR_MIN_BET_AMOUNT))
    (asserts! (is-eq move u1) (err ERR_INVALID_MOVE))
    (asserts! (validate-move starting-board move-index move) (err ERR_INVALID_MOVE))

    (try! (stx-transfer? bet-amount contract-caller THIS_CONTRACT))
    (map-set games game-id game-data)
    (var-set latest-game-id (+ game-id u1))

    (print { action: "create-game", data: game-data})
    (ok game-id)
))

(define-public (join-game (game-id uint) (move-index uint) (move uint))
    (let (
        (original-game-data (unwrap! (map-get? games game-id) (err ERR_GAME_NOT_FOUND)))
        (original-board (get board original-game-data))
        (game-board (unwrap! (replace-at? original-board move-index move) (err ERR_INVALID_MOVE)))
        (current-block stacks-block-height)
        (game-data (merge original-game-data {
            board: game-board,
            player-two: (some contract-caller),
            is-player-one-turn: true,
            last-move-block: current-block
        }))
    )

    (asserts! (is-none (get player-two original-game-data)) (err ERR_GAME_CANNOT_BE_JOINED))
    (asserts! (is-eq move u2) (err ERR_INVALID_MOVE))
    (asserts! (validate-move original-board move-index move) (err ERR_INVALID_MOVE))

    (try! (stx-transfer? (get bet-amount original-game-data) contract-caller THIS_CONTRACT))
    (map-set games game-id game-data)

    (print { action: "join-game", data: game-data})
    (ok game-id)
))

;; Check if a game has timed out
(define-private (is-timed-out (last-move-block uint))
    (>= (- stacks-block-height last-move-block) TIMEOUT_BLOCKS)
)

;; Cancel a timed-out game
(define-public (cancel-timed-out-game (game-id uint))
    (let (
        (game-data (unwrap! (map-get? games game-id) (err ERR_GAME_NOT_FOUND)))
        (player-one (get player-one game-data))
        (player-two (get player-two game-data))
        (bet-amount (get bet-amount game-data))
        (is-player-one-turn (get is-player-one-turn game-data))
        (waiting-player (if is-player-one-turn 
                           (unwrap! player-two (err ERR_GAME_NOT_FOUND))
                           player-one))
    )

    ;; Ensure game has timed out
    (asserts! (is-timed-out (get last-move-block game-data)) (err ERR_CANNOT_CANCEL_YET))
    ;; Ensure caller is the waiting player
    (asserts! (is-eq contract-caller waiting-player) (err ERR_NOT_AUTHORIZED_TO_CANCEL))
    ;; Ensure game hasn't ended yet
    (asserts! (is-none (get winner game-data)) (err ERR_INVALID_MOVE))
    ;; Ensure both players have joined
    (asserts! (is-some player-two) (err ERR_GAME_CANNOT_BE_JOINED))

    ;; Return funds to both players
    (try! (as-contract (stx-transfer? bet-amount tx-sender player-one)))
    (try! (as-contract (stx-transfer? bet-amount tx-sender (unwrap! player-two (err ERR_GAME_NOT_FOUND)))))

    ;; Update game to mark as cancelled (winner = none but remove from active games)
    (map-delete games game-id)

    ;; Record in global games as cancelled
    (map-set global-games game-id {
        player-one: player-one,
        player-two: (unwrap! player-two (err ERR_GAME_NOT_FOUND)),
        winner: none,
        bet-amount: bet-amount,
        created-at: (get created-at game-data),
        finished-at: stacks-block-height
    })

    (print { action: "cancel-timed-out-game", game-id: game-id, cancelled-by: waiting-player })
    (ok true)
))

(define-private (is-line (board (list 9 uint)) (a uint) (b uint) (c uint)) 
    (let (
        (a-val (unwrap! (element-at? board a) false))
        (b-val (unwrap! (element-at? board b) false))
        (c-val (unwrap! (element-at? board c) false))
    )
    (and (is-eq a-val b-val) (is-eq a-val c-val) (not (is-eq a-val u0)))
))

(define-private (has-won (board (list 9 uint))) 
    (or
        (is-line board u0 u1 u2) ;; Row 1
        (is-line board u3 u4 u5) ;; Row 2
        (is-line board u6 u7 u8) ;; Row 3
        (is-line board u0 u3 u6) ;; Column 1
        (is-line board u1 u4 u7) ;; Column 2
        (is-line board u2 u5 u8) ;; Column 3
        (is-line board u0 u4 u8) ;; Left to Right Diagonal
        (is-line board u2 u4 u6) ;; Right to Left Diagonal
    )
)

;; Check if board is full (draw condition)
(define-private (is-board-full (board (list 9 uint)))
    (is-eq (len (filter is-zero board)) u0)
)

(define-private (is-zero (n uint))
    (is-eq n u0)
)

(define-public (play (game-id uint) (move-index uint) (move uint))
    (let (
        (original-game-data (unwrap! (map-get? games game-id) (err ERR_GAME_NOT_FOUND)))
        (original-board (get board original-game-data))
        (is-player-one-turn (get is-player-one-turn original-game-data))
        (player-one (get player-one original-game-data))
        (player-two (unwrap! (get player-two original-game-data) (err ERR_GAME_NOT_FOUND)))
        (player-turn (if is-player-one-turn player-one player-two))
        (expected-move (if is-player-one-turn u1 u2))
        (game-board (unwrap! (replace-at? original-board move-index move) (err ERR_INVALID_MOVE)))
        (is-now-winner (has-won game-board))
        (is-draw (and (not is-now-winner) (is-board-full game-board)))
        (current-block stacks-block-height)
        (bet-amount (get bet-amount original-game-data))
        (total-pot (* u2 bet-amount))
        (game-data (merge original-game-data {
            board: game-board,
            is-player-one-turn: (not is-player-one-turn),
            winner: (if is-now-winner (some player-turn) none),
            last-move-block: current-block
        }))
    )

    (asserts! (is-eq player-turn contract-caller) (err ERR_NOT_YOUR_TURN))
    (asserts! (is-eq move expected-move) (err ERR_INVALID_MOVE))
    (asserts! (validate-move original-board move-index move) (err ERR_INVALID_MOVE))

    ;; Handle game completion
    (if (or is-now-winner is-draw)
        (begin
            ;; Record in global games
            (map-set global-games game-id {
                player-one: player-one,
                player-two: player-two,
                winner: (if is-now-winner (some player-turn) none),
                bet-amount: bet-amount,
                created-at: (get created-at original-game-data),
                finished-at: current-block
            })
            
            (if is-now-winner
                (begin
                    ;; Winner takes all
                    (try! (as-contract (stx-transfer? total-pot tx-sender player-turn)))
                    ;; Update winner stats
                    (update-player-stats player-turn true bet-amount total-pot)
                    ;; Update loser stats
                    (update-player-stats (if (is-eq player-turn player-one) player-two player-one) false bet-amount u0)
                )
                (begin
                    ;; Draw: return bets to both players
                    (try! (as-contract (stx-transfer? bet-amount tx-sender player-one)))
                    (try! (as-contract (stx-transfer? bet-amount tx-sender player-two)))
                    ;; Update both players' stats as losses (or you could track draws separately)
                    (update-player-stats player-one false bet-amount bet-amount)
                    (update-player-stats player-two false bet-amount bet-amount)
                )
            )
            
            ;; Remove from active games
            (map-delete games game-id)
        )
        ;; Game continues
        (map-set games game-id game-data)
    )

    (print {action: "play", data: game-data})
    (ok game-id)
))

;; Read-only functions
(define-read-only (get-game (game-id uint))
    (map-get? games game-id)
)

(define-read-only (get-latest-game-id)
    (var-get latest-game-id)
)

(define-read-only (get-player-statistics (player principal))
    (map-get? player-stats player)
)

(define-read-only (get-global-game (game-id uint))
    (map-get? global-games game-id)
)

;; Calculate win percentage (returns percentage * 100 to avoid decimals)
(define-read-only (get-win-percentage (player principal))
    (let (
        (stats (get-player-stats player))
        (total-games (get total-games stats))
        (wins (get wins stats))
    )
    (if (is-eq total-games u0)
        u0
        (/ (* wins u10000) total-games) ;; Returns percentage * 100 (e.g., 7500 = 75.00%)
    )
))

;; Get leaderboard data for a player (only if they have wins)
(define-read-only (get-leaderboard-entry (player principal))
    (let (
        (stats (get-player-stats player))
        (win-pct (get-win-percentage player))
    )
    (if (> (get wins stats) u0)
        (some {
            player: player,
            total-games: (get total-games stats),
            wins: (get wins stats),
            losses: (get losses stats),
            win-percentage: win-pct,
            total-won: (get total-won stats)
        })
        none
    )
))

;; Check if a game can be cancelled due to timeout
(define-read-only (can-cancel-game (game-id uint))
    (match (map-get? games game-id)
        game-data (and 
            (is-timed-out (get last-move-block game-data))
            (is-none (get winner game-data))
            (is-some (get player-two game-data))
        )
        false
    )
)