import pygame
import math
import random
import os
import math
from time import sleep

pygame.mixer.pre_init(44100, -16, 2, 32)
pygame.mixer.init()
pygame.init()

WIDTH, HEIGHT = 900, 650
win = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Solitairey Pong")

FPS = 60
PADDLE_WIDTH = 180
MIN_PADDLE_WIDTH = PADDLE_WIDTH / 2
PADDLE_HEIGHT = 16
BALL_RADIUS = 11
BUBBLE_RADIUS = 25
MAX_BUBBLE_POINTS = 6
BUFFER = 4
START_VELOCITY = 5.5
MAX_VELOCITY = 10
BUBBLE_FREQUENCY = 65  # odds out of 100 of bubble appearing
ODDS_GET_BAD_BUBBLE_START = 0  # out of 100
INCREASE_BAD_BUBBLE_ODDS_RATE = 2
DISPLAY_BUBBLE_GRADE = False
BUBBLE_WAIT_TIME = 7
# BUBBLE WAIT TIME is also how long it waits to start shrinking the paddle and speeding up
BAD_BUBBLE_START_SCORE = BUBBLE_WAIT_TIME + 5
MAX_BAD_BUBBLE_ODDS = 50
PADDLE_TUT_TIME = 3
DIFFICULTY_MULT = 75 / 10000  # 0.0080
# DIFFICULTY_MULT becomes the PERCENT of the original paddle width that it gets shrunk by
# It is multiplied by a constant in SPEEDUP_AMOUNT to set that speedup rate, but while
# keeping it linked to the shrink amount
# With DIFFICULTY_MULT set to 0.0075 it takes about a minute and a half for things to get wild
# With DIFFICULTY_MULT set to 0.010 it takes about a minute
SHRINKING_PADDLE = True
SHRINK_AMOUNT = PADDLE_WIDTH * DIFFICULTY_MULT
SPEEDUP = True
SPEEDUP_AMOUNT = DIFFICULTY_MULT * 10


pygame.mixer.init()

THEME_SONG = pygame.mixer.Sound(os.path.join("Assets", "Gravy Waltz.mp3"))
THEME_SONG.set_volume(0.25)
HIT_BAD_BUBBLE = pygame.mixer.Sound(os.path.join("Assets", "Roblox Death Sound.mp3"))
HIT_BAD_BUBBLE.set_volume(0.3)
PADDLE_HIT_SOUND = pygame.mixer.Sound(os.path.join("Assets", "Kick Drum.mp3"))
PADDLE_HIT_SOUND.set_volume(0.8)
MISSED_SOUND = pygame.mixer.Sound(os.path.join("Assets", "Swish.mp3"))
MISSED_SOUND.set_volume(0.5)
NEW_HIGH_SCORE = pygame.mixer.Sound(os.path.join("Assets", "New High Score, Dude.mp3"))
NEW_HIGH_SCORE.set_volume(0.65)
CHACHING = pygame.mixer.Sound(os.path.join("Assets", "Cha Ching.mp3"))
CHACHING.set_volume(0.10)
BUBBLE_POP_SOUNDS = []


for _ in range(2):  # twice to change the ratio of bubbles to farts
    for filename in os.listdir(os.path.join("Assets", "Bubble Pop Sounds")):
        if filename.startswith("."):
            continue
        BUBBLE_POP_SOUNDS.append(
            pygame.mixer.Sound(os.path.join("Assets", "Bubble Pop Sounds", filename))
        )

GAME_FONT = "DIN Condensed"
FONT = pygame.font.SysFont(GAME_FONT, 55)
MID_FONT = pygame.font.SysFont(GAME_FONT, 30)
SMALL_FONT = pygame.font.SysFont(GAME_FONT, 20)
BUBBLE_FONT = pygame.font.SysFont(GAME_FONT, BUBBLE_RADIUS)
DEFAULT_DARK_COLOR = (36, 23, 12)
BACKGROUND_COLOR = (254, 251, 234)

# This returns a pygame surface of the bubble pop residue image
# I'm returning a new one everytime so I can shrink it while it disappears
# This may not be necessary
def get_new_pop_image():
    return pygame.transform.rotate(
        pygame.transform.scale(
            pygame.image.load(os.path.join("Assets", "sprite grey.png")),
            (BUBBLE_RADIUS * 2, BUBBLE_RADIUS * 2),
        ),
        45,
    )


def ball_start_x_vel():
    return random.choice([0.5, -0.5])


class Paddle:
    VEL = START_VELOCITY

    def __init__(self, x, y, width, height, color):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.color = color

    def draw(self, win):
        pygame.draw.rect(
            win, self.color, (self.x, self.y, self.width, self.height), 4, 3
        )

    def move(self, direction=1):
        self.x = self.x + self.VEL * direction


class Bubble_Residue:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.lives = 5  # frames
        self.image = get_new_pop_image()

    def draw(self, win):
        win.blit(
            self.image,
            (
                self.x - self.image.get_width() / 2,
                self.y - self.image.get_height() / 2,
            ),
        )
        self.image = pygame.transform.smoothscale(
            self.image, (self.image.get_width() * 0.8, self.image.get_height() * 0.8)
        )


class Bubble:
    def __init__(self, x, y, radius, is_good):
        self.x = x
        self.y = y
        self.radius = radius
        self.points = MAX_BUBBLE_POINTS

        self.is_good = is_good
        if is_good:
            self.color = (
                0,
                240 * (self.points / MAX_BUBBLE_POINTS),
                240 * (self.points / MAX_BUBBLE_POINTS),
            )
        else:
            self.color = (
                240 * (self.points / MAX_BUBBLE_POINTS),
                0,
                240 * (self.points / MAX_BUBBLE_POINTS),
            )

    def darken_color(self):
        if self.is_good:
            self.color = (
                0,
                240 * (self.points / MAX_BUBBLE_POINTS),
                240 * (self.points / MAX_BUBBLE_POINTS),
            )
        else:
            self.color = (
                240 * (self.points / MAX_BUBBLE_POINTS),
                0,
                240 * (self.points / MAX_BUBBLE_POINTS),
            )

    def draw(self, win):
        display_points = str(self.points)
        if not self.is_good:
            display_points = "-" + display_points
        pygame.draw.circle(win, self.color, (self.x, self.y), self.radius)
        bubble_points_label = BUBBLE_FONT.render(display_points, 1, "white")
        win.blit(
            bubble_points_label,
            (
                self.x - bubble_points_label.get_width() / 2,
                self.y - bubble_points_label.get_height() / 2,
            ),
        )

    def collide(self, ball):
        if not (
            ball.x - ball.radius <= self.x + self.radius
            and ball.x + ball.radius >= self.x - self.radius
        ):
            return False
        if not (
            ball.y - ball.radius <= self.y + self.radius
            and ball.y - ball.radius >= self.y - self.radius
        ):
            return False

        return True


class Ball:
    VEL = START_VELOCITY

    def __init__(self, x, y, radius, color):
        self.x = x
        self.y = y
        self.radius = radius
        self.color = color
        self.x_vel = ball_start_x_vel()
        self.y_vel = -self.VEL

    def move(self):
        self.x += self.x_vel
        self.y += self.y_vel

    def set_vel(self, x_vel, y_vel):
        self.x_vel = x_vel
        self.y_vel = y_vel

    def draw(self, win):
        pygame.draw.circle(win, self.color, (self.x, self.y), self.radius)


def draw(
    win,
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
    total_bubbles,
):
    win.fill(BACKGROUND_COLOR)
    paddleTop.draw(win)
    paddleBottom.draw(win)
    for bubble in bubbles:
        bubble.draw(win)
    for item in bubble_residues:
        item.draw(win)
    ball.draw(win)

    # Score
    display_score = FONT.render("SCORE: " + str(score), 1, DEFAULT_DARK_COLOR)
    display_score.set_alpha(128)
    win.blit(
        display_score,
        (
            PADDLE_HEIGHT + BUFFER * 2,
            HEIGHT - BUFFER * 2 - PADDLE_HEIGHT - display_score.get_height() * 2,
        ),
    )
    if DISPLAY_BUBBLE_GRADE:
        display_bubble_grade = MID_FONT.render(
            f"BUBBLE GRADE: {bubble_grade}%", 1, DEFAULT_DARK_COLOR
        )
        display_bubble_grade.set_alpha(127)
        win.blit(
            display_bubble_grade,
            (
                PADDLE_HEIGHT + BUFFER * 2,
                HEIGHT - BUFFER * 3 - PADDLE_HEIGHT - display_bubble_grade.get_height(),
            ),
        )
        display_best_bubble_grade = SMALL_FONT.render(
            f"BEST BUBBLE GRADE: {best_bubble_grade}%", 1, DEFAULT_DARK_COLOR
        )
        display_best_bubble_grade.set_alpha(127)
        win.blit(
            display_best_bubble_grade,
            (
                PADDLE_HEIGHT + BUFFER * 2,
                PADDLE_HEIGHT
                + BUFFER * 2
                + display_best_bubble_grade.get_height() * 1.5,
            ),
        )

    display_high_score = SMALL_FONT.render(
        "HIGH SCORE: " + str(high_score), 1, DEFAULT_DARK_COLOR
    )
    display_high_score.set_alpha(127)
    win.blit(
        display_high_score, (PADDLE_HEIGHT + BUFFER * 2, PADDLE_HEIGHT + BUFFER * 2)
    )

    # Tutorial
    A_D = SMALL_FONT.render("Use A and D to move", 1, DEFAULT_DARK_COLOR)
    L_R = SMALL_FONT.render("Use Left and Right Arrow to move", 1, DEFAULT_DARK_COLOR)
    if score <= PADDLE_TUT_TIME and first_round:
        win.blit(A_D, (WIDTH / 2 - A_D.get_width() / 2, PADDLE_HEIGHT + (BUFFER * 2)))
        win.blit(
            L_R,
            (
                WIDTH / 2 - L_R.get_width() / 2,
                HEIGHT - PADDLE_HEIGHT - (BUFFER * 2) - A_D.get_height(),
            ),
        )

    bubble_tut = MID_FONT.render("Pop bubbles to get points!", 1, DEFAULT_DARK_COLOR)
    bubble_tut.set_alpha(128)
    if first_round and 1 <= total_bubbles <= 4:
        win.blit(
            bubble_tut,
            (
                WIDTH // 2 - bubble_tut.get_width() // 2,
                HEIGHT // 2 - bubble_tut.get_height() // 2,
            ),
        )

    pygame.display.update()


def ball_collision(ball):
    if ball.x - BALL_RADIUS <= 0:
        ball.x += 1
        ball.set_vel(ball.x_vel * -1, ball.y_vel)
    if ball.x + BALL_RADIUS >= WIDTH:
        ball.x -= 1
        ball.set_vel(ball.x_vel * -1, ball.y_vel)


def ball_bottom_paddle_collision(ball, paddleBottom, score):
    if not (ball.x <= paddleBottom.x + paddleBottom.width and ball.x >= paddleBottom.x):
        return score, False
    if not (ball.y + ball.radius >= paddleBottom.y):
        return score, False

    paddle_center = paddleBottom.x + paddleBottom.width / 2
    distance_to_center = ball.x - paddle_center

    percent_width = distance_to_center / paddleBottom.width
    angle = percent_width * 110
    angle_radians = math.radians(angle)

    x_vel = math.sin(angle_radians) * ball.VEL
    y_vel = math.cos(angle_radians) * ball.VEL * -1

    ball.set_vel(x_vel, y_vel)

    return score + 1, True


def ball_top_paddle_collision(ball, paddleTop, score, paddleCollision):
    if not (ball.x <= paddleTop.x + paddleTop.width and ball.x >= paddleTop.x):
        if paddleCollision:
            return score, True
        else:
            return (
                score,
                False,
            )
            # this is bad design, need to combine these paddle collision functions
    if not (ball.y - ball.radius <= paddleTop.y + paddleTop.height):
        if paddleCollision:
            return score, True
        else:
            return score, False

    paddle_center = paddleTop.x + paddleTop.width / 2
    distance_to_center = ball.x - paddle_center

    percent_width = distance_to_center / paddleTop.width
    angle = percent_width * 110
    angle_radians = math.radians(angle)

    x_vel = math.sin(angle_radians) * ball.VEL
    y_vel = math.cos(angle_radians) * ball.VEL

    ball.set_vel(x_vel, y_vel)

    return score + 1, True


def get_new_bubble_coords(bubbles):
    new_x = 0
    new_y = 0
    collision = True
    while collision:
        new_x = random.randint(BUBBLE_RADIUS + BUFFER, WIDTH - BUBBLE_RADIUS - BUFFER)
        new_y = random.randint(
            BUBBLE_RADIUS + BUFFER * 2 + PADDLE_HEIGHT,
            HEIGHT - BUFFER * 2 - PADDLE_HEIGHT - BUBBLE_RADIUS,
        )

        for bubble in bubbles:
            if math.hypot(bubble.x - new_x, bubble.y - new_y) <= BUBBLE_RADIUS * 2:
                collision = True
                break
        else:
            collision = False

    return new_x, new_y


def main():
    THEME_SONG.play(-1)
    clock = pygame.time.Clock()
    paddle_x = WIDTH / 2 - PADDLE_WIDTH / 2
    paddle_y = HEIGHT - PADDLE_HEIGHT - BUFFER
    paddleBottom = Paddle(
        paddle_x, paddle_y, PADDLE_WIDTH, PADDLE_HEIGHT, DEFAULT_DARK_COLOR
    )
    paddleTop = Paddle(
        paddle_x, BUFFER, PADDLE_WIDTH, PADDLE_HEIGHT, DEFAULT_DARK_COLOR
    )
    ball = Ball(WIDTH / 2, HEIGHT - HEIGHT // 3, BALL_RADIUS, DEFAULT_DARK_COLOR)
    # ball starts going bottom to top

    bubbles = []
    bubble_residues = []
    total_bubbles = 0
    popped_bubles = 0
    bubble_grade = 0
    odds_get_bad_bubble = ODDS_GET_BAD_BUBBLE_START
    first_round = True
    high_score = 0
    best_bubble_grade = 0

    def reset():
        paddleBottom.x = paddle_x
        paddleBottom.y = paddle_y
        paddleTop.x = paddle_x
        paddleTop.y = BUFFER
        paddleBottom.width = PADDLE_WIDTH
        paddleBottom.VEL = START_VELOCITY
        paddleTop.width = PADDLE_WIDTH
        paddleTop.VEL = START_VELOCITY
        ball.x = WIDTH / 2
        ball.y = paddle_y - BALL_RADIUS - 1
        ball.VEL = START_VELOCITY
        bubbles.clear()

    score = 0
    run = True
    draw(
        win,
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
        total_bubbles,
    )
    # Countdown
    for i in range(3, 0, -1):
        countdown = FONT.render(str(i), 1, DEFAULT_DARK_COLOR)
        win.blit(
            countdown,
            (
                WIDTH / 2 - countdown.get_width() / 2,
                HEIGHT / 2 - countdown.get_height() / 2,
            ),
        )
        pygame.display.update()
        pygame.time.delay(1000)
        draw(
            win,
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
            total_bubbles,
        )

    # odds out of a 100, starts here and increases if you so desire
    while run:

        clock.tick(FPS)
        paddleCollision = False

        for item in bubble_residues:
            item.lives -= 1
            if item.lives == 0:
                bubble_residues.remove(item)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                run = False
                break

        keys = pygame.key.get_pressed()

        if keys[pygame.K_LEFT] and paddleBottom.x - paddleBottom.VEL >= 0:
            paddleBottom.move(-1)
        if (
            keys[pygame.K_RIGHT]
            and paddleBottom.x + paddleBottom.width + paddleBottom.VEL <= WIDTH
        ):
            paddleBottom.move(1)
        if keys[pygame.K_a] and paddleTop.x - paddleTop.VEL >= 0:
            paddleTop.move(-1)
        if keys[pygame.K_d] and paddleTop.x + paddleTop.width + paddleTop.VEL <= WIDTH:
            paddleTop.move(1)

        ball.move()
        ball_collision(ball)
        score, paddleCollision = ball_bottom_paddle_collision(ball, paddleBottom, score)
        score, paddleCollision = ball_top_paddle_collision(
            ball, paddleTop, score, paddleCollision
        )

        if paddleCollision:
            PADDLE_HIT_SOUND.play()
            if score > BUBBLE_WAIT_TIME:
                if SHRINKING_PADDLE and paddleTop.width >= MIN_PADDLE_WIDTH:
                    if paddleTop.width - SHRINK_AMOUNT < MIN_PADDLE_WIDTH:
                        paddleTop.width = MIN_PADDLE_WIDTH
                        paddleBottom.width = MIN_PADDLE_WIDTH
                    else:
                        paddleTop.width -= SHRINK_AMOUNT
                        paddleBottom.width -= SHRINK_AMOUNT
                if SPEEDUP and paddleTop.VEL <= MAX_VELOCITY:
                    paddleTop.VEL += SPEEDUP_AMOUNT
                    paddleBottom.VEL += SPEEDUP_AMOUNT
                    ball.VEL += SPEEDUP_AMOUNT

        # Time for bubbles
        if score > BUBBLE_WAIT_TIME:
            for bubble in bubbles:
                if bubble.collide(ball):
                    if bubble.is_good:
                        if bubble.points == MAX_BUBBLE_POINTS:
                            CHACHING.play()
                        else:
                            random.choice(BUBBLE_POP_SOUNDS[:]).play()
                        score += bubble.points
                        popped_bubles += 1
                    else:
                        HIT_BAD_BUBBLE.play()
                        score -= bubble.points

                    bubbles.remove(bubble)
                    bubble_residues.append(Bubble_Residue(bubble.x, bubble.y))

            if paddleCollision:
                for bubble in bubbles:
                    bubble.points -= 1
                    if bubble.points <= 0:
                        bubbles.remove(bubble)
                    else:
                        bubble.darken_color()
                if random.randint(1, 100) <= BUBBLE_FREQUENCY:
                    new_x, new_y = get_new_bubble_coords(bubbles)
                    is_good = True
                    if (
                        score > BAD_BUBBLE_START_SCORE
                        and random.randint(1, 100) <= odds_get_bad_bubble
                    ):
                        is_good = False
                    if is_good:
                        total_bubbles += 1
                    new_bubble = Bubble(
                        new_x,
                        new_y,
                        BUBBLE_RADIUS,
                        is_good,
                    )
                    bubbles.append(new_bubble)
        if paddleCollision:
            if score > BAD_BUBBLE_START_SCORE:
                odds_get_bad_bubble += min(
                    INCREASE_BAD_BUBBLE_ODDS_RATE,
                    MAX_BAD_BUBBLE_ODDS - odds_get_bad_bubble,
                )
        if popped_bubles > 0 and total_bubbles > 0:
            bubble_grade = round(popped_bubles / total_bubbles * 100)

        # If you lose...
        if ball.y - ball.radius >= HEIGHT or ball.y + ball.radius <= 0:
            reset()
            first_round = False
            MISSED_SOUND.play()
            if score > high_score:
                NEW_HIGH_SCORE.play()
                high_score = score
            if bubble_grade > best_bubble_grade:
                best_bubble_grade = bubble_grade

            pygame.time.delay(3000)
            odds_get_bad_bubble = ODDS_GET_BAD_BUBBLE_START
            total_bubbles = 0
            popped_bubles = 0
            bubble_grade = 0
            ball.x = paddleBottom.x + paddleBottom.width / 2
            ball.y = paddleBottom.y - BALL_RADIUS
            if ball.y - ball.radius >= HEIGHT:
                ball.y = paddleBottom.y - BALL_RADIUS
                ball.set_vel(ball_start_x_vel(), ball.VEL * -1)
            else:
                ball.y = paddleTop.y + BALL_RADIUS + paddleTop.height
                ball.set_vel(ball_start_x_vel(), 5)
            score = 0

        draw(
            win,
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
            total_bubbles,
        )

    pygame.mixer.quit()
    pygame.quit()
    quit()


if __name__ == "__main__":
    main()
