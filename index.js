let canvas = null
let ctx = null

window.addEventListener('load', () => {
	if (typeof window.orientation !== 'undefined') {
  		document.getElementById('error').style.display = "block"
	} else {
  		document.getElementById('arcade').style.display = "block";
		canvas = document.getElementById('gameboard');
		if (canvas.getContext) {
			ctx = canvas.getContext('2d');
			main();
			document.getElementById('gameboard').addEventListener("click", () => {
				if (run) {
					run = false
				} else {
					run = true
					lastRender = 0
					window.requestAnimationFrame(loop)
				}
			});
		}
	}
	
});

let pressedKeys = [];
window.addEventListener("keydown", (e) => {
	pressedKeys[e.keyCode] = true;
	
	if (e.keyCode == 16) {
		if (run) {
			run = false
		} else {
			run = true
			lastRender = 0
			window.requestAnimationFrame(loop)
		}
	}
	
});

window.addEventListener('keyup', (e) => {
	pressedKeys[e.keyCode] = false;
});







const WIDTH = 900
const HEIGHT = 650
const FPS = 60
let PADDLE_WIDTH = 180
let MIN_PADDLE_WIDTH = PADDLE_WIDTH / 2
let PADDLE_HEIGHT = 16
let BALL_RADIUS = 11
let BUBBLE_RADIUS = 25
const MAX_BUBBLE_POINTS = 6
const BUFFER = 4
const START_VELOCITY = 5.5
const MAX_VELOCITY = 10
let BUBBLE_FREQUENCY = 70  // odds out of 100 of bubble appearing
let ODDS_GET_BAD_BUBBLE_START = 0  // out of 100
let INCREASE_BAD_BUBBLE_ODDS_RATE = 2
const DISPLAY_BUBBLE_GRADE = false
const BUBBLE_WAIT_TIME = 7
const BAD_BUBBLE_START_SCORE = BUBBLE_WAIT_TIME + 5
const MAX_BAD_BUBBLE_ODDS = 45
const DIFFICULTY_MULT = 80 / 10000  // 0.0080
// DIFFICULTY_MULT becomes the PERCENT of the original paddle width that it gets shrunk by
// It is multiplied by a constant in SPEEDUP_AMOUNT to set that speedup rate, but while
// keeping it linked to the shrink amount
// With DIFFICULTY_MULT set to 0.0075 it takes about a minute && a half for things to get wild
// With DIFFICULTY_MULT set to 0.010 it takes about a minute
const SHRINKING_PADDLE = true
const SHRINK_AMOUNT = PADDLE_WIDTH * DIFFICULTY_MULT
const SPEEDUP = true
const SPEEDUP_AMOUNT = DIFFICULTY_MULT * 10
const TRAINING_WHEELS_TIME = 7
// TRAINING_WHEELS_TIME is the amount of scores you make before shrinking && speedup begin

let run = false
let started = false
let bubble_tutorial_shown = false

const GAME_FONT = "DIN Condensed"
let FONT = '55px ' + GAME_FONT
let MID_FONT = '30px ' + GAME_FONT
let SMALL_FONT = '20px ' + GAME_FONT
let BUBBLE_FONT = `${BUBBLE_RADIUS}px ${GAME_FONT}`

let DEFAULT_DARK_COLOR = 'rgb(36, 23, 12)'
let DEFAULT_DARK_COLOR_TRANS = 'rgba(36, 23, 12, 0.5)'
let BACKGROUND_COLOR = 'rgb(254, 251, 234)'

let THEME_SONG = new Audio('Assets/Gravy Waltz.mp3')
THEME_SONG.volume = 0.25
THEME_SONG.loop = true
let HIT_BAD_BUBBLE = new Audio('Assets/Roblox Death Sound.mp3')
HIT_BAD_BUBBLE.volume = 0.3
let PADDLE_HIT_SOUND = new Audio('Assets/Kick Drum.mp3')
PADDLE_HIT_SOUND.volume = 0.8
let MISSED_SOUND = new Audio('Assets/Swish.mp3')
MISSED_SOUND.volume = 0.5
let NEW_HIGH_SCORE = new Audio('Assets/New High Score, Dude.mp3')
NEW_HIGH_SCORE.volume = 0.65
let CHACHING = new Audio('Assets/Cha Ching.mp3')
CHACHING.volume = 0.10
let BUBBLE_POP_SOUNDS = []
let bubble_pop_filenames = ["pops_1.1.wav", "pops_1.3.wav", "pops_1.6.wav", "pops_1.8.wav", "pops_1.10.wav", "pops_1.12.wav", "pops_1.13.wav", "pops_2.1.wav", "pops_2.3.wav", "pops_2.5.wav", "pops_2.9.wav", "pops_2.13.wav", "pops_2.14.wav"]

for (let i = 0; i < bubble_pop_filenames.length; i++) {
	BUBBLE_POP_SOUNDS.push(new Audio('Assets/Bubble Pop Sounds/' + bubble_pop_filenames[i]))
}

function ball_start_x_vel() {
	if (Math.random() > 0.5) {
		return 0.5
	} else {
		return -0.5
	}
}

class Paddle {
	constructor(x, y, width, height, color) {
		this.x = x
		this.y = y
		this.width = width
		this.height = height
		this.color = color
		this.VEL = START_VELOCITY
	}
	draw() {
		ctx.beginPath()
		ctx.fillStyle = this.color
		ctx.fillRect(this.x, this.y, this.width, this.height)
	}
	move(direction) {
		this.x = this.x + this.VEL * direction
	}
}

class Bubble_Residue {
	constructor(x, y) {
		this.x = x
		this.y = y
		this.lives = 5  // frames
		this.id = null
		this.offset = 2
		this.armLength = this.lives * 3
	}
	draw() {
		this.armLength = this.lives * 3
		ctx.beginPath();
		ctx.strokeStyle = 'rgb(127, 127, 127)'
		// top left
		ctx.moveTo(this.x - this.offset, this.y - this.offset);
		ctx.lineTo(this.x - this.armLength, this.y - this.armLength);
		// top right
		ctx.moveTo(this.x + this.offset, this.y - this.offset);
		ctx.lineTo(this.x + this.armLength, this.y - this.armLength);
		// bottom left
		ctx.moveTo(this.x - this.offset, this.y + this.offset);
		ctx.lineTo(this.x - this.armLength, this.y + this.armLength);
		// bottom right
		ctx.moveTo(this.x + this.offset, this.y + this.offset);
		ctx.lineTo(this.x + this.armLength, this.y + this.armLength);
		
		ctx.stroke();
	}
}

class Bubble_Residues {
	constructor() {
		this.array = []
		this.total_residues = 0
	}

	add(residue) {
		this.total_residues++
		residue.id = this.total_residues
		this.array.push(residue)
	}

	remove(residue) {
		for (let i = 0; i < this.array.length; i++) {
			if (this.array[i].id === residue.id) {
				this.array.splice(i, 1)
			}
		}
	}
}

class Bubbles {

	constructor() {
		this.array = []
		this.total_bubbles = 0
	}

	add(bubble) {
		this.total_bubbles++
		bubble.id = this.total_bubbles
		this.array.push(bubble)
	}

	remove(bubble) {
		for (let i = 0; i < this.array.length; i++) {
			if (this.array[i].id === bubble.id) {
				this.array.splice(i, 1)
			}
		}
	}

	reset() {
		this.bubble_array = []
		this.total_bubbles = 0
	}
}

class Bubble {
	constructor(x, y, radius, is_good) {
		this.x = x
		this.y = y
		this.radius = radius
		this.points = MAX_BUBBLE_POINTS
		this.id = null
		this.is_good = is_good
		if (is_good) {
			this.color = `rgb(${90 * (this.points / MAX_BUBBLE_POINTS)}, ${220 * (this.points / MAX_BUBBLE_POINTS)}, ${240 * (this.points / MAX_BUBBLE_POINTS)})`
		}
		else {
			this.color = `rgb(${240 * (this.points / MAX_BUBBLE_POINTS)}, ${100 * (this.points / MAX_BUBBLE_POINTS)}, ${220 * (this.points / MAX_BUBBLE_POINTS)})`
		}
	}

	darken_color() {
		if (this.is_good) {
			this.color = `rgb(${90 * (this.points / MAX_BUBBLE_POINTS)}, ${220 * (this.points / MAX_BUBBLE_POINTS)}, ${240 * (this.points / MAX_BUBBLE_POINTS)})`
		}
		else {
			this.color = `rgb(${240 * (this.points / MAX_BUBBLE_POINTS)}, ${100 * (this.points / MAX_BUBBLE_POINTS)}, ${220 * (this.points / MAX_BUBBLE_POINTS)})`
		}
	}

	draw() {
		let display_points = this.is_good ? this.points + "" : `-${this.points}`
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
		ctx.font = BUBBLE_FONT
		ctx.fillStyle = this.color
		ctx.fill();
		ctx.fillStyle = 'white'
		if (this.is_good) {
			ctx.fillText(this.points, this.x - 4, this.y + 6);
		} else {
			ctx.fillText(`-${this.points}`, this.x - 9, this.y + 6);
		}
		
	}

	collide(ball) {
		if (!(
			ball.x - ball.radius <= this.x + this.radius
			&& ball.x + ball.radius >= this.x - this.radius
		)) {
			return false
		}
		if (!(
			ball.y - ball.radius <= this.y + this.radius
			&& ball.y - ball.radius >= this.y - this.radius
		)) {
			return false
		}
		// else
		return true
	}
}

class Ball {
	constructor(x, y, radius, color) {
		this.x = x
		this.y = y
		this.radius = radius
		this.color = color
		this.VEL = START_VELOCITY
		this.x_vel = ball_start_x_vel()
		this.y_vel = -this.VEL
	}
	move() {
		this.x += this.x_vel
		this.y += this.y_vel
	}
	set_vel(x_vel, y_vel) {
		this.x_vel = x_vel
		this.y_vel = y_vel
	}
	draw() {
		ctx.beginPath()
		ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI)
		ctx.fillStyle = DEFAULT_DARK_COLOR
		ctx.fill();
	}
}

function getUserInput() {
	let clicked = false;
	window.addEventListener('click', () => {
		clicked = true;
	});
	while (!clicked) {
		ctx.fillStyle = BACKGROUND_COLOR
		ctx.fillRect(0, 0, WIDTH, HEIGHT)
		let text = "CLICK ANYWHERE TO START"
		ctx.fillStyle = DEFAULT_DARK_COLOR
		ctx.font = FONT
		ctx.fillText(text, WIDTH / 2, HEIGHT / 2)
	}
}

function draw(
	paddleTop,
	paddleBottom,
	ball,
	bubbles,
	bubble_residues,
	score,
	odds_get_bad_bubble,
	first_round,
	high_score,
	bubble_grade,
	best_bubble_grade,
	total_bubbles
) {
	ctx.fillStyle = BACKGROUND_COLOR
	ctx.fillRect(0, 0, WIDTH, HEIGHT)
	paddleTop.draw()
	paddleBottom.draw()
	for (let i = 0; i < bubbles.array.length; i++) {
		bubbles.array[i].draw()
	}
	for (let i = 0; i < bubble_residues.array.length; i++) {
		bubble_residues.array[i].draw()
	}
	ball.draw()

	// Score
	let display_score = "SCORE: " + score
	ctx.fillStyle = DEFAULT_DARK_COLOR_TRANS
	ctx.font = FONT
	ctx.fillText(display_score,
		PADDLE_HEIGHT + BUFFER * 2,
		HEIGHT - BUFFER * 2 - PADDLE_HEIGHT - 30) // - display_score.get_height() * 2

	if (DISPLAY_BUBBLE_GRADE) {
		ctx.font = MID_FONT
		ctx.fillStyle = DEFAULT_DARK_COLOR_TRANS
		bubble_grade_text = `BUBBLE GRADE: ${bubble_grade}%`
		ctx.fillText(bubble_grade_text,
			PADDLE_HEIGHT + BUFFER * 2,
			HEIGHT - BUFFER * 3 - PADDLE_HEIGHT) // - bubble_grade_text.get_height()

		ctx.font = SMALL_FONT
		ctx.fillStyle = DEFAULT_DARK_COLOR_TRANS
		display_best_bubble_grade = `BEST BUBBLE GRADE: ${best_bubble_grade}%`
		ctx.fillText(display_best_bubble_grade,
			PADDLE_HEIGHT + BUFFER * 2,
			PADDLE_HEIGHT + BUFFER * 2) // + display_best_bubble_grade.get_height() * 1.5
	}

	ctx.font = SMALL_FONT
	ctx.fillStyle = DEFAULT_DARK_COLOR_TRANS
	display_high_score = "HIGH SCORE: " + high_score
	ctx.fillText(display_high_score,
		PADDLE_HEIGHT + BUFFER * 2,
		PADDLE_HEIGHT + BUFFER * 2 + 15)

	// Tutorial
	ctx.font = SMALL_FONT
	ctx.fillStyle = DEFAULT_DARK_COLOR
	let A_D = "Use A and D to move"
	let L_R = "Use Left and Right Arrow to move"
	if (score <= 3 && first_round) {
		ctx.fillText(A_D,
			WIDTH / 2 - 65, // - A_D.get_width() / 2
			PADDLE_HEIGHT + (BUFFER * 3) + 15 // 
		)
		ctx.fillText(L_R,
			WIDTH / 2 - 104, // - L_R.get_width() / 2
			HEIGHT - PADDLE_HEIGHT - (BUFFER * 3) //  - A_D.get_height()
		)
	}
	
	ctx.font = MID_FONT
	ctx.fillStyle = DEFAULT_DARK_COLOR_TRANS
	bubble_tut = "Pop bubbles to get points!"
    if (!bubble_tutorial_shown && 1 <= total_bubbles && total_bubbles <= 4) {
    	ctx.fillText(bubble_tut,
			WIDTH / 2 - 100,
			HEIGHT / 2)
		if (total_bubbles == 4) bubble_tutorial_shown = true
    }
        
}

function degrees_to_radians(degrees) {
	return degrees * (Math.PI / 180);
}

function ball_collision(ball, paddleTop, paddleBottom) {
	// check wall collisions
	if (ball.x - BALL_RADIUS <= 0) {
		ball.x++
		ball.set_vel(ball.x_vel * -1, ball.y_vel)
	}
	if (ball.x + BALL_RADIUS >= WIDTH) {
		ball.x--
		ball.set_vel(ball.x_vel * -1, ball.y_vel)
	}
	// check paddle side collisions
	if ((ball.x - BALL_RADIUS <= paddleBottom.x + paddleBottom.width && ball.x - BALL_RADIUS > paddleBottom.x) 
		&& (ball.y >= paddleBottom.y && ball.y <= paddleBottom.y + paddleBottom.height)) {
		ball.x++
		ball.set_vel(ball.x_vel * -1, ball.y_vel)
		console.log("sidehit")
	}
	if ((ball.x - BALL_RADIUS <= paddleTop.x + paddleTop.width && ball.x - BALL_RADIUS > paddleTop.x) 
		&& (ball.y >= paddleTop.y && ball.y <= paddleTop.y + paddleTop.height)) {
		ball.x++
		ball.set_vel(ball.x_vel * -1, ball.y_vel)
		console.log("sidehit")
	}
	if ((ball.x + BALL_RADIUS >= paddleBottom.x && ball.x + BALL_RADIUS < paddleBottom.x + paddleBottom.width) 
		&& (ball.y >= paddleBottom.y && ball.y <= paddleBottom.y + paddleBottom.height)) {
		ball.x--
		ball.set_vel(ball.x_vel * -1, ball.y_vel)
		console.log("sidehit")
	}
	if ((ball.x + BALL_RADIUS >= paddleTop.x && ball.x + BALL_RADIUS < paddleTop.x + paddleTop.width) 
		&& (ball.y >= paddleTop.y && ball.y <= paddleTop.y + paddleTop.height)) {
		ball.x--
		ball.set_vel(ball.x_vel * -1, ball.y_vel)
		console.log("sidehit")
	}

}

function ball_bottom_paddle_collision(ball, paddleBottom, score) {
	if (!(ball.x <= paddleBottom.x + paddleBottom.width && ball.x >= paddleBottom.x)) {
		return [score, false]
	}
	if (!(ball.y + ball.radius >= paddleBottom.y)) {
		return [score, false]
	}
	
	
	let paddle_center = paddleBottom.x + paddleBottom.width / 2
	let distance_to_center = ball.x - paddle_center

	let percent_width = distance_to_center / paddleBottom.width
	let angle = percent_width * 110
	let angle_radians = degrees_to_radians(angle)

	let x_vel = Math.sin(angle_radians) * ball.VEL
	let y_vel = Math.cos(angle_radians) * ball.VEL * -1

	ball.set_vel(x_vel, y_vel)

	return [score + 1, true]
}

function ball_top_paddle_collision(ball, paddleTop, score, paddleCollision) {
	if (!(ball.x <= paddleTop.x + paddleTop.width && ball.x >= paddleTop.x)) {
		if (paddleCollision) {
			return [score, true]
		}
		else {
			return [score, false]
			// this is bad design, need to combine these paddle collision functions
		}
	}
	if (!(ball.y - ball.radius <= paddleTop.y + paddleTop.height)) {
		if (paddleCollision) {
			return [score, true]
		}
		else {
			return [score, false]
		}
	}
	let paddle_center = paddleTop.x + paddleTop.width / 2
	let distance_to_center = ball.x - paddle_center

	let percent_width = distance_to_center / paddleTop.width
	let angle = percent_width * 110
	let angle_radians = degrees_to_radians(angle)

	let x_vel = Math.sin(angle_radians) * ball.VEL
	let y_vel = Math.cos(angle_radians) * ball.VEL

	ball.set_vel(x_vel, y_vel)

	return [score + 1, true]
}

function get_new_bubble_coords(bubbles) {
	let new_x = 0
	let new_y = 0
	let collisions = true
	while (collisions) {
		collisions = false
		new_x = randomFloat(BUBBLE_RADIUS + BUFFER, WIDTH - BUBBLE_RADIUS - BUFFER)
		new_y = randomFloat(BUBBLE_RADIUS + BUFFER * 2 + PADDLE_HEIGHT, HEIGHT - BUFFER * 2 - PADDLE_HEIGHT - BUBBLE_RADIUS)
		for (let i = 0; i < bubbles.array.length; i++) {
			if (Math.hypot(bubbles.array[i].x - new_x, bubbles.array[i].y - new_y) <= BUBBLE_RADIUS * 2) {
				collisions = true
				break
			}
		}
		if (collisions) {
			continue
		} else {
			break
		}
	}

	return [new_x, new_y]
}

function randomFloat(min, max) {
	return Math.random() * (max - min) + min;
}

function main() {
	
	let paddle_x = WIDTH / 2 - PADDLE_WIDTH / 2
	let paddle_y = HEIGHT - PADDLE_HEIGHT - BUFFER
	let paddleBottom = new Paddle(
		paddle_x, paddle_y, PADDLE_WIDTH, PADDLE_HEIGHT, DEFAULT_DARK_COLOR
	)
	let paddleTop = new Paddle(
		paddle_x, BUFFER, PADDLE_WIDTH, PADDLE_HEIGHT, DEFAULT_DARK_COLOR
	)
	let ball = new Ball(WIDTH / 2, HEIGHT / 2, BALL_RADIUS, DEFAULT_DARK_COLOR)
	// ball starts going bottom to top

	let bubbles = new Bubbles()
	let bubble_residues = new Bubble_Residues()
	let total_bubbles = 0
	let popped_bubles = 0
	let bubble_grade = 0
	let odds_get_bad_bubble = ODDS_GET_BAD_BUBBLE_START
	let first_round = true
	let high_score = 0
	let best_bubble_grade = 0

	function reset() {
		paddleBottom.x = paddle_x
		paddleBottom.y = paddle_y
		paddleTop.x = paddle_x
		paddleTop.y = BUFFER
		paddleBottom.width = PADDLE_WIDTH
		paddleBottom.VEL = START_VELOCITY
		paddleTop.width = PADDLE_WIDTH
		paddleTop.VEL = START_VELOCITY
		ball.x = WIDTH / 2
		ball.y = BUFFER * 5 + PADDLE_HEIGHT * 3
		ball.VEL = START_VELOCITY
		bubbles = new Bubbles()
	}
	let score = 0

	draw(
		paddleTop,
		paddleBottom,
		ball,
		bubbles,
		bubble_residues,
		score,
		odds_get_bad_bubble,
		first_round,
		high_score,
		bubble_grade,
		best_bubble_grade,
		total_bubbles
	)
	
	function update(progress) {
		if (!started) {
			THEME_SONG.play()
			started = true
		}	

		let paddleCollision = false
		for (let i = 0; i < bubble_residues.array.length; i++) {
			bubble_residues.array[i].lives--
			if (bubble_residues.array[i].lives == 0) {
				bubble_residues.remove(bubble_residues.array[i])
			}
		}

		if (pressedKeys[37] && paddleBottom.x - paddleBottom.VEL >= 0) {
			paddleBottom.move(-1)
		}
		if (pressedKeys[39] && paddleBottom.x + paddleBottom.width + paddleBottom.VEL <= WIDTH) {
			paddleBottom.move(1)
		}
		if (pressedKeys[65] && paddleTop.x - paddleTop.VEL >= 0) {
			paddleTop.move(-1)
		}
		if (pressedKeys[68] && paddleTop.x + paddleTop.width + paddleTop.VEL <= WIDTH) {
			paddleTop.move(1)
		}

		ball.move()
		ball_collision(ball, paddleTop, paddleBottom)

		let returnValues = ball_bottom_paddle_collision(ball, paddleBottom, score)
		score = returnValues[0]
		paddleCollision = returnValues[1]
		returnValues = ball_top_paddle_collision(ball, paddleTop, score, paddleCollision)
		score = returnValues[0]
		paddleCollision = returnValues[1]



		if (paddleCollision) {
			PADDLE_HIT_SOUND.play()
			if (score > TRAINING_WHEELS_TIME) {
				if (SHRINKING_PADDLE && paddleTop.width >= MIN_PADDLE_WIDTH) {
					if (paddleTop.width - SHRINK_AMOUNT < MIN_PADDLE_WIDTH) {
						paddleTop.width = MIN_PADDLE_WIDTH
						paddleBottom.width = MIN_PADDLE_WIDTH
					}
					else {
						paddleTop.width -= SHRINK_AMOUNT
						paddleBottom.width -= SHRINK_AMOUNT
					}
				}
				if (SPEEDUP && paddleTop.VEL <= MAX_VELOCITY) {
					paddleTop.VEL += SPEEDUP_AMOUNT
					paddleBottom.VEL += SPEEDUP_AMOUNT
					ball.VEL += SPEEDUP_AMOUNT
				}
			}
		}

		// Time for bubbles
		if (score > BUBBLE_WAIT_TIME) {
			for (let i = 0; i < bubbles.array.length; i++) {
				if (bubbles.array[i].collide(ball)) {
					if (bubbles.array[i].is_good) {
						if (bubbles.array[i].points == MAX_BUBBLE_POINTS) {
							CHACHING.play()
						}
						else {
							BUBBLE_POP_SOUNDS[[Math.floor(Math.random()*BUBBLE_POP_SOUNDS.length)]].play()
						}
						score += bubbles.array[i].points
						popped_bubles++
					}
					else {
						HIT_BAD_BUBBLE.play()
						score -= bubbles.array[i].points
					}

					bubble_residues.add(new Bubble_Residue(bubbles.array[i].x, bubbles.array[i].y))
					bubbles.remove(bubbles.array[i])
				}
			}

			if (paddleCollision) {
				for (let i = 0; i < bubbles.array.length; i++) {
					bubbles.array[i].points--
					if (bubbles.array[i].points <= 0) {
						bubbles.remove(bubbles.array[i])
					}
					else {
						bubbles.array[i].darken_color()
					}
				}
				if (randomFloat(1, 100) <= BUBBLE_FREQUENCY) {
					let returnArray = get_new_bubble_coords(bubbles)
					let new_x = returnArray[0]
					let new_y = returnArray[1]
					let is_good = true
					if (
						score > BAD_BUBBLE_START_SCORE
						&& randomFloat(1, 100) <= odds_get_bad_bubble
					) {
						is_good = false
					}
					if (is_good) {
						total_bubbles++
					}
					new_bubble = new Bubble(
						new_x,
						new_y,
						BUBBLE_RADIUS,
						is_good,
					)
					bubbles.add(new_bubble)
				}
			}
		}
		if (paddleCollision) {
			if (score > BAD_BUBBLE_START_SCORE) {
				odds_get_bad_bubble += Math.min(
					INCREASE_BAD_BUBBLE_ODDS_RATE,
					MAX_BAD_BUBBLE_ODDS - odds_get_bad_bubble,
				)
			}
		}
		if (popped_bubles > 0 && total_bubbles > 0) {
			bubble_grade = Math.round(popped_bubles / total_bubbles * 100)
		}

		// If you lose...
		//ball.y > paddleBottom.y + (paddleBottom.height / 2) || ball.y < paddleTop.y + (paddleTop.height / 2)
		if (ball.y - ball.radius > HEIGHT || ball.y + ball.radius < 0) {
			reset()
			first_round = false
			MISSED_SOUND.play()
			if (score > high_score) {
				NEW_HIGH_SCORE.play()
				high_score = score
			}
			if (bubble_grade > best_bubble_grade) {
				best_bubble_grade = bubble_grade
			}

			// wait 3 seconds
			let start = Date.now(),
				now = start;
			while (now - start < 3000) {
				now = Date.now();
			}
			odds_get_bad_bubble = ODDS_GET_BAD_BUBBLE_START
			total_bubbles = 0
			popped_bubles = 0
			bubble_grade = 0
			ball.x = paddleBottom.x + paddleBottom.width / 2
			ball.y = paddleBottom.y - BALL_RADIUS
			if (ball.y - ball.radius >= HEIGHT) {
				ball.y = paddleBottom.y - BALL_RADIUS
				ball.set_vel(ball_start_x_vel(), ball.VEL * -1)
			}
			else {
				ball.y = paddleTop.y + BALL_RADIUS + paddleTop.height
				ball.set_vel(ball_start_x_vel(), 5)
			}
			score = 0
		}
		draw(
			paddleTop,
			paddleBottom,
			ball,
			bubbles,
			bubble_residues,
			score,
			odds_get_bad_bubble,
			first_round,
			high_score,
			bubble_grade,
			best_bubble_grade,
			total_bubbles
		)
	}

	function loop(timestamp) {
		if (run) {
			let progress = timestamp - lastRender

			update(progress)

			lastRender = timestamp
		}
		window.requestAnimationFrame(loop)
	}

	let lastRender = 0
	window.requestAnimationFrame(loop)
}
